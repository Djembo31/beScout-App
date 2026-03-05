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
