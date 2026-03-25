// ============================================
// Shared Football API Module
// ============================================
// Pure functions + types + config — NO Supabase dependency.
// Importable in both client-side (footballData.ts → supabaseClient)
// and server-side (gameweek-sync → supabaseAdmin) contexts.
//
// Provider: api-football.com (RapidAPI)
// TFF 1. Lig League ID: 204 (203 = Süper Lig!)
// Docs: https://www.api-football.com/documentation-v3

// ============================================
// Constants
// ============================================

export const API_BASE = 'https://v3.football.api-sports.io';

const DEFAULT_LEAGUE_ID = 204; // TFF 1. Lig (203 = Süper Lig)
const DEFAULT_SEASON = 2025;

// ============================================
// Config
// ============================================

export function getLeagueId(): number {
  const envVal = process.env.NEXT_PUBLIC_LEAGUE_ID;
  return envVal ? parseInt(envVal, 10) : DEFAULT_LEAGUE_ID;
}

export function getCurrentSeason(): number {
  const envVal = process.env.NEXT_PUBLIC_SEASON;
  return envVal ? parseInt(envVal, 10) : DEFAULT_SEASON;
}

export function getApiKey(): string | null {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_FOOTBALL_KEY ?? null;
  }
  // Server-side: prefer dedicated server key, fallback to public key
  return process.env.API_FOOTBALL_KEY ?? process.env.NEXT_PUBLIC_API_FOOTBALL_KEY ?? null;
}

export function isApiConfigured(): boolean {
  return !!getApiKey();
}

// ============================================
// Fetch
// ============================================

export async function apiFetch<T>(endpoint: string, apiKeyOverride?: string): Promise<T> {
  const key = apiKeyOverride ?? getApiKey();
  if (!key) throw new Error('API-Football key not configured');

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'x-apisports-key': key,
    },
  });

  if (!res.ok) {
    throw new Error(`API-Football ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  return json as T;
}

// ============================================
// API Response Types
// ============================================

export type ApiTeamResponse = {
  response: Array<{
    team: { id: number; name: string; code: string | null; logo: string };
  }>;
};

export type ApiSquadResponse = {
  response: Array<{
    team: { id: number; name: string };
    players: Array<{
      id: number;
      name: string;
      number: number | null;
      position: string;
    }>;
  }>;
};

export type ApiFixtureResponse = {
  response: Array<{
    fixture: { id: number; date: string; status: { short: string } };
    teams: {
      home: { id: number; name: string };
      away: { id: number; name: string };
    };
    goals: { home: number | null; away: number | null };
  }>;
};

export type ApiFixturePlayerResponse = {
  response: Array<{
    team: { id: number; name: string };
    players: Array<{
      player: { id: number; name: string };
      statistics: Array<{
        games: { minutes: number | null; position: string | null; rating: string | null };
        goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null };
        cards: { yellow: number | null; red: number | null };
      }>;
    }>;
  }>;
};

export type ApiLineupPlayer = {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid: string | null;
};

export type ApiFixtureEventsResponse = {
  response: Array<{
    time: { elapsed: number | null; extra: number | null };
    team: { id: number; name: string };
    player: { id: number; name: string };
    assist: { id: number | null; name: string | null };
    type: string;
    detail: string;
    comments: string | null;
  }>;
};

export type ApiLineupsResponse = {
  response: Array<{
    team: { id: number; name: string };
    formation: string | null;
    startXI?: Array<{ player: ApiLineupPlayer }>;
    substitutes?: Array<{ player: ApiLineupPlayer }>;
  }>;
};

// ============================================
// Utils: Position Mapping
// ============================================

export function mapPosition(apiPos: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const p = apiPos.toUpperCase().trim();
  // Short codes from fixtures/players endpoint: G, D, M, F
  if (p === 'G' || p.includes('GOAL')) return 'GK';
  if (p === 'D' || p.includes('DEF')) return 'DEF';
  if (p === 'M' || p.includes('MID')) return 'MID';
  if (p === 'F' || p.includes('ATT') || p.includes('FOR')) return 'ATT';
  console.warn(`[POSITION] Unknown API position "${apiPos}" — defaulting to MID`);
  return 'MID';
}

// ============================================
// Utils: Fantasy Points Calculation
// (Same formula as simulate_gameweek RPC)
// ============================================

export function calcFantasyPoints(
  position: string,
  minutes: number,
  goals: number,
  assists: number,
  cleanSheet: boolean,
  goalsConceded: number,
  yellowCard: boolean,
  redCard: boolean,
  saves: number,
  bonus: number,
): number {
  let pts = 0;

  // Appearance
  if (minutes > 0) pts += 1;
  if (minutes >= 60) pts += 1;

  // Goals
  const pos = position.toUpperCase();
  if (pos === 'GK' || pos === 'DEF') pts += goals * 6;
  else if (pos === 'MID') pts += goals * 5;
  else pts += goals * 4;

  // Assists
  pts += assists * 3;

  // Clean sheet (only DEF/GK, 60+ min)
  if (cleanSheet && minutes >= 60) {
    if (pos === 'GK' || pos === 'DEF') pts += 4;
    else if (pos === 'MID') pts += 1;
  }

  // Goals conceded (GK/DEF)
  if ((pos === 'GK' || pos === 'DEF') && goalsConceded >= 2) {
    pts -= Math.floor(goalsConceded / 2);
  }

  // Cards
  if (yellowCard) pts -= 1;
  if (redCard) pts -= 3;

  // GK saves
  if (pos === 'GK') pts += Math.floor(saves / 3);

  // Bonus
  pts += bonus;

  return Math.max(0, pts);
}

// ============================================
// Utils: Ghost Starter Deduplication
// ============================================
// Structural football guarantee: a team has EXACTLY 11 starters.
// API-Football sometimes uses different player IDs in lineup vs stats endpoints.
// When name-matching fails (nicknames, transliterations), we get ghost entries:
// a starter with 0 minutes + null rating alongside the real stats entry.
//
// This guard catches ALL edge cases regardless of name format — it relies on the
// structural constraint that >11 starters means ghost duplicates exist.

export type PlayerStatEntry = {
  fixture_id: string;
  club_id: string;
  player_id: string | null;
  minutes_played: number;
  rating: number | null;
  is_starter: boolean;
  grid_position: string | null;
  match_position: string | null;
  api_football_player_id: number;
  player_name_api: string;
  [key: string]: unknown; // preserve all other fields
};

/**
 * Grid row → expected position for smart grid transfer.
 * Row 1 = GK, Row 2 = DEF, Row 3 = MID/DEF, Row 4 = MID/ATT, Row 5 = ATT
 */
function gridRowToPosition(grid: string): string | null {
  const parts = grid.split(':');
  if (parts.length !== 2) return null;
  const row = parseInt(parts[0], 10);
  const col = parseInt(parts[1], 10);
  if (isNaN(row) || isNaN(col) || row < 1 || row > 5 || col < 1 || col > 11) {
    console.warn(`[GRID] Invalid grid_position: "${grid}"`);
    return null;
  }
  if (row === 1) return 'GK';
  if (row === 2) return 'DEF';
  if (row === 3) return 'MID';
  if (row === 4) return 'MID';
  if (row === 5) return 'ATT';
  return null;
}

/**
 * Remove ghost starters and transfer their grid_positions to the real entries.
 * Works on a per-fixture, per-club basis.
 *
 * A ghost = is_starter:true, minutes:0, rating:null (lineup-only entry from dual-ID mismatch)
 *
 * This function is idempotent and safe — if there are no ghosts, the data passes through unchanged.
 */
export function deduplicateGhostStarters<T extends PlayerStatEntry>(stats: T[]): T[] {
  // Group by fixture+club
  const groups = new Map<string, T[]>();
  for (const s of stats) {
    const key = `${s.fixture_id}:${s.club_id}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  const result: T[] = [];

  for (const [, clubStats] of Array.from(groups.entries())) {
    const starters = clubStats.filter(s => s.is_starter);

    // No problem — pass through unchanged
    if (starters.length <= 11) {
      result.push(...clubStats);
      continue;
    }

    // Identify ghosts: starters with zero stats (dual-ID lineup-only entries)
    const ghosts = starters.filter(s => s.minutes_played === 0 && s.rating === null);
    const ghostApiIds = new Set(ghosts.map(g => g.api_football_player_id));

    if (ghosts.length === 0) {
      // >11 starters but no ghosts — corrupt API data. Cap at 11 by minutes played.
      console.error(`[DEDUP] >11 starters (${starters.length}) with 0 ghosts for fixture ${clubStats[0]?.fixture_id}, club ${clubStats[0]?.club_id}. Capping at 11 by minutes.`);
      const sorted = [...clubStats].sort((a, b) => {
        if (a.is_starter && !b.is_starter) return -1;
        if (!a.is_starter && b.is_starter) return 1;
        return b.minutes_played - a.minutes_played;
      });
      let starterCount = 0;
      for (const s of sorted) {
        if (s.is_starter && starterCount < 11) {
          starterCount++;
        } else if (s.is_starter) {
          s.is_starter = false; // Demote excess starters
        }
      }
      result.push(...sorted);
      continue;
    }

    // Collect grid positions from ghosts (these are the correct formation positions)
    const availableGrids = ghosts
      .filter(g => g.grid_position)
      .map(g => ({ grid: g.grid_position!, pos: gridRowToPosition(g.grid_position!) }));

    // Remove ghosts
    const cleaned = clubStats.filter(s => !ghostApiIds.has(s.api_football_player_id));

    // Find real players that need promotion (have stats but aren't marked as starters)
    const currentStarters = cleaned.filter(s => s.is_starter);
    const nonStarters = cleaned.filter(s => !s.is_starter && s.minutes_played > 0);
    const needed = 11 - currentStarters.length;

    if (needed > 0 && nonStarters.length > 0) {
      // Sort by minutes played (highest first) — most likely actual starters
      const candidates = [...nonStarters].sort((a, b) => b.minutes_played - a.minutes_played);

      for (let i = 0; i < Math.min(needed, candidates.length); i++) {
        candidates[i].is_starter = true;

        // Transfer grid_position from ghost — match by position compatibility
        if (availableGrids.length > 0) {
          const playerPos = candidates[i].match_position;
          // Try position-compatible grid first
          const matchIdx = playerPos
            ? availableGrids.findIndex(g => g.pos === playerPos)
            : -1;
          const gridIdx = matchIdx >= 0 ? matchIdx : 0;
          candidates[i].grid_position = availableGrids[gridIdx].grid;
          availableGrids.splice(gridIdx, 1);
        }
      }
    }

    result.push(...cleaned);
  }

  return result;
}

// ============================================
// Utils: Name Normalization (Turkish Unicode safe)
// ============================================

/**
 * Normalize text for player name matching — handles Turkish characters.
 * İ→i, ı→i, ş→s, ç→c, ğ→g, ö→o, ü→u, ä→a + strip remaining diacritics.
 * Uses explicit Turkish char replacements before NFD to catch all edge cases.
 */
export function normalizeForMatch(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')    // Turkish dotless ı (not decomposed by NFD)
    .replace(/İ/gi, 'i')   // Turkish capital İ
    .replace(/ş/gi, 's')
    .replace(/ç/gi, 'c')
    .replace(/ğ/gi, 'g')
    .replace(/ö/gi, 'o')
    .replace(/ü/gi, 'u')
    .toLowerCase()
    .trim();
}
