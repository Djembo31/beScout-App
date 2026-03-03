import { supabase } from '@/lib/supabaseClient';

// ============================================
// API-Football Integration Service
// ============================================
// Provider: api-football.com (RapidAPI)
// TFF 1. Lig League ID: 204 (203 = Süper Lig!)
// Docs: https://www.api-football.com/documentation-v3
// Free Plan: Seasons 2022-2024 only (Pro Plan $19/mo for 2025+)

const API_BASE = 'https://v3.football.api-sports.io';

// League + season config — parametrized for multi-league expansion
const DEFAULT_LEAGUE_ID = 204;  // TFF 1. Lig (203 = Süper Lig)
const DEFAULT_SEASON = 2025;

function getLeagueId(): number {
  const envVal = process.env.NEXT_PUBLIC_LEAGUE_ID;
  return envVal ? parseInt(envVal, 10) : DEFAULT_LEAGUE_ID;
}

function getCurrentSeason(): number {
  const envVal = process.env.NEXT_PUBLIC_SEASON;
  return envVal ? parseInt(envVal, 10) : DEFAULT_SEASON;
}

function getApiKey(): string | null {
  return typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_FOOTBALL_KEY ?? null
    : null;
}

export function isApiConfigured(): boolean {
  return !!getApiKey();
}

async function apiFetch<T>(endpoint: string): Promise<T> {
  const key = getApiKey();
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

type ApiTeamResponse = {
  response: Array<{
    team: { id: number; name: string; code: string | null; logo: string };
  }>;
};

type ApiSquadResponse = {
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

type ApiFixtureResponse = {
  response: Array<{
    fixture: { id: number; date: string; status: { short: string } };
    teams: {
      home: { id: number; name: string };
      away: { id: number; name: string };
    };
    goals: { home: number | null; away: number | null };
  }>;
};

type ApiFixturePlayerResponse = {
  response: Array<{
    team: { id: number; name: string };
    players: Array<{
      player: { id: number; name: string };
      statistics: Array<{
        games: { minutes: number | null; position: string; rating: string | null };
        goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null };
        cards: { yellow: number | null; red: number | null };
      }>;
    }>;
  }>;
};

// ============================================
// Fetchers
// ============================================

export async function fetchApiTeams(): Promise<ApiTeamResponse> {
  return apiFetch<ApiTeamResponse>(`/teams?league=${getLeagueId()}&season=${getCurrentSeason()}`);
}

export async function fetchApiPlayers(teamId: number): Promise<ApiSquadResponse> {
  return apiFetch<ApiSquadResponse>(`/players/squads?team=${teamId}`);
}

export async function fetchApiFixtures(gameweek: number): Promise<ApiFixtureResponse> {
  return apiFetch<ApiFixtureResponse>(
    `/fixtures?league=${getLeagueId()}&season=${getCurrentSeason()}&round=Regular Season - ${gameweek}`
  );
}

export async function fetchApiFixtureStats(fixtureId: number): Promise<ApiFixturePlayerResponse> {
  return apiFetch<ApiFixturePlayerResponse>(`/fixtures/players?fixture=${fixtureId}`);
}

// ============================================
// FPL-Style Fantasy Points Calculation
// (Same formula as simulate_gameweek RPC)
// ============================================

function calcFantasyPoints(
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
// Mapping: API Position → Our Position
// ============================================

/**
 * Normalize text for player name matching — handles Turkish characters
 * İ→i, ı→i, ş→s, ç→c, ğ→g, ö→o, ü→u, ä→a + strip remaining diacritics
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')  // Turkish dotless ı (not decomposed by NFD)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Strip all combining diacritics
    .trim();
}

function mapPosition(apiPos: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const p = apiPos.toUpperCase();
  if (p.includes('GOAL')) return 'GK';
  if (p.includes('DEF')) return 'DEF';
  if (p.includes('MID')) return 'MID';
  if (p.includes('ATT') || p.includes('FOR')) return 'ATT';
  return 'MID';
}

// ============================================
// Team Mapping (Auto-match by name)
// ============================================

export type MappingResult = {
  matched: number;
  unmatched: string[];
  errors: string[];
};

/** Fetch API teams → auto-match to our clubs by name → save api_football_id via RPC */
export async function syncTeamMapping(adminId: string): Promise<MappingResult> {
  const result: MappingResult = { matched: 0, unmatched: [], errors: [] };

  try {
    const apiData = await fetchApiTeams();
    const apiTeams = apiData.response;

    // Load our clubs
    const { data: ourClubs, error } = await supabase
      .from('clubs')
      .select('id, name, short')
      .order('name');

    if (error || !ourClubs) {
      result.errors.push(`DB clubs laden: ${error?.message ?? 'Keine Daten'}`);
      return result;
    }

    const mappings: Array<{ club_id: string; api_football_id: number }> = [];

    for (const apiTeam of apiTeams) {
      const apiName = apiTeam.team.name.toLowerCase().trim();

      // Try exact match, then partial match
      const match = ourClubs.find(c =>
        c.name.toLowerCase().trim() === apiName ||
        apiName.includes(c.name.toLowerCase().trim()) ||
        c.name.toLowerCase().trim().includes(apiName) ||
        (c.short && apiName.includes(c.short.toLowerCase().trim()))
      );

      if (match) {
        mappings.push({ club_id: match.id, api_football_id: apiTeam.team.id });
      } else {
        result.unmatched.push(apiTeam.team.name);
      }
    }

    if (mappings.length > 0) {
      const { data, error: rpcErr } = await supabase.rpc('admin_map_clubs', {
        p_admin_id: adminId,
        p_mappings: mappings,
      });

      const rpcResult = data as { success: boolean; updated_count?: number; error?: string } | null;
      if (rpcErr) {
        result.errors.push(`RPC: ${rpcErr.message}`);
      } else if (rpcResult && !rpcResult.success) {
        result.errors.push(rpcResult.error ?? 'RPC fehlgeschlagen');
      } else {
        result.matched = rpcResult?.updated_count ?? mappings.length;
      }
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return result;
}

/** Fetch API squads for all mapped clubs → auto-match players → save api_football_id via RPC */
export async function syncPlayerMapping(adminId: string): Promise<MappingResult> {
  const result: MappingResult = { matched: 0, unmatched: [], errors: [] };

  try {
    // Get mapped clubs
    const { data: clubs, error } = await supabase
      .from('clubs')
      .select('id, name, api_football_id')
      .not('api_football_id', 'is', null);

    if (error || !clubs || clubs.length === 0) {
      result.errors.push('Keine gemappten Clubs gefunden — zuerst Teams syncen');
      return result;
    }

    const mappings: Array<{ player_id: string; api_football_id: number }> = [];
    // Track which players are already mapped to prevent duplicates
    const mappedPlayerIds = new Set<string>();

    for (const club of clubs) {
      try {
        const apiData = await fetchApiPlayers(club.api_football_id!);
        const squad = apiData.response[0]?.players ?? [];

        // Load our players for this club
        const { data: ourPlayers } = await supabase
          .from('players')
          .select('id, first_name, last_name, shirt_number')
          .eq('club_id', club.id);

        if (!ourPlayers) continue;

        for (const apiPlayer of squad) {
          const apiName = normalizeForMatch(apiPlayer.name);
          const apiNameParts = apiName.split(/\s+/).filter(p => p.length > 0);

          // Collect candidates with confidence scores
          const candidates: Array<{ player: typeof ourPlayers[number]; score: number }> = [];

          for (const p of ourPlayers) {
            const lastName = normalizeForMatch(p.last_name);
            const firstName = normalizeForMatch(p.first_name);
            let score = 0;

            const shirtMatch = apiPlayer.number != null && p.shirt_number === apiPlayer.number;
            const lastNameExact = apiNameParts.some(part => lastName === part);
            const firstNameExact = apiNameParts.some(part => firstName === part || (firstName.length >= 3 && firstName.startsWith(part) && part.length >= 3));

            // Tier 1: Last name exact + shirt number (most reliable) — score 100
            if (shirtMatch && lastNameExact) {
              score = 100;
            }
            // Tier 2: Full name parts match (first + last) — score 80-90
            else if (lastNameExact && firstNameExact) {
              score = shirtMatch ? 90 : 80;
            }
            // Tier 3: Last name exact match only — must be 5+ chars to avoid false positives — score 60-70
            else if (apiNameParts.some(part => part.length >= 5 && lastName === part && lastName.length >= 5)) {
              score = shirtMatch ? 70 : 60;
            }
            // Tier 4: Shirt number + partial last name (min 5 chars, full word boundary) — score 50
            else if (shirtMatch && apiNameParts.some(part =>
              part.length >= 5 && (lastName.startsWith(part) || part.startsWith(lastName)) && lastName.length >= 4
            )) {
              score = 50;
            }

            if (score > 0) {
              candidates.push({ player: p, score });
            }
          }

          if (candidates.length > 0) {
            // Sort by score descending
            candidates.sort((a, b) => b.score - a.score);
            const best = candidates[0];

            // Skip if ambiguous (two top candidates with same score)
            if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
              const names = candidates
                .filter(c => c.score === best.score)
                .map(c => `${c.player.first_name} ${c.player.last_name}`)
                .join(', ');
              result.unmatched.push(`${apiPlayer.name} (${club.name}) — ambiguous: ${names}`);
              continue;
            }

            // Skip if this player ID is already mapped (duplicate target)
            if (mappedPlayerIds.has(best.player.id)) {
              result.unmatched.push(`${apiPlayer.name} (${club.name}) — duplicate target: ${best.player.first_name} ${best.player.last_name}`);
              continue;
            }

            mappings.push({ player_id: best.player.id, api_football_id: apiPlayer.id });
            mappedPlayerIds.add(best.player.id);
          } else {
            result.unmatched.push(`${apiPlayer.name} (${club.name})`);
          }
        }
      } catch (e) {
        result.errors.push(`Club ${club.name}: ${e instanceof Error ? e.message : 'Fehler'}`);
      }
    }

    if (mappings.length > 0) {
      const { data, error: rpcErr } = await supabase.rpc('admin_map_players', {
        p_admin_id: adminId,
        p_mappings: mappings,
      });

      const rpcResult = data as { success: boolean; updated_count?: number; error?: string } | null;
      if (rpcErr) {
        result.errors.push(`RPC: ${rpcErr.message}`);
      } else if (rpcResult && !rpcResult.success) {
        result.errors.push(rpcResult.error ?? 'RPC fehlgeschlagen');
      } else {
        result.matched = rpcResult?.updated_count ?? mappings.length;
      }
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return result;
}

/** Fetch API fixtures for a GW → match to our fixtures via home/away team → save api_fixture_id via RPC */
export async function syncFixtureMapping(adminId: string, gameweek: number): Promise<MappingResult> {
  const result: MappingResult = { matched: 0, unmatched: [], errors: [] };

  try {
    const apiData = await fetchApiFixtures(gameweek);
    const apiFixtures = apiData.response;

    // Load club mapping (api_football_id → our club_id)
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, api_football_id')
      .not('api_football_id', 'is', null);

    if (!clubs || clubs.length === 0) {
      result.errors.push('Keine gemappten Clubs — zuerst Teams syncen');
      return result;
    }

    const apiIdToClub = new Map(clubs.map(c => [c.api_football_id!, c.id as string]));

    // Load our fixtures for this GW
    const { data: ourFixtures } = await supabase
      .from('fixtures')
      .select('id, home_club_id, away_club_id')
      .eq('gameweek', gameweek);

    if (!ourFixtures || ourFixtures.length === 0) {
      result.errors.push(`Keine Fixtures für GW ${gameweek} in DB`);
      return result;
    }

    const mappings: Array<{ fixture_id: string; api_fixture_id: number }> = [];

    for (const apiFix of apiFixtures) {
      const homeClubId = apiIdToClub.get(apiFix.teams.home.id);
      const awayClubId = apiIdToClub.get(apiFix.teams.away.id);

      if (!homeClubId || !awayClubId) {
        result.unmatched.push(`${apiFix.teams.home.name} vs ${apiFix.teams.away.name}`);
        continue;
      }

      const match = ourFixtures.find(f =>
        f.home_club_id === homeClubId && f.away_club_id === awayClubId
      );

      if (match) {
        mappings.push({ fixture_id: match.id, api_fixture_id: apiFix.fixture.id });
      } else {
        result.unmatched.push(`${apiFix.teams.home.name} vs ${apiFix.teams.away.name}`);
      }
    }

    if (mappings.length > 0) {
      const { data, error: rpcErr } = await supabase.rpc('admin_map_fixtures', {
        p_admin_id: adminId,
        p_mappings: mappings,
      });

      const rpcResult = data as { success: boolean; updated_count?: number; error?: string } | null;
      if (rpcErr) {
        result.errors.push(`RPC: ${rpcErr.message}`);
      } else if (rpcResult && !rpcResult.success) {
        result.errors.push(rpcResult.error ?? 'RPC fehlgeschlagen');
      } else {
        result.matched = rpcResult?.updated_count ?? mappings.length;
      }
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return result;
}

// ============================================
// Mapping Status (for Admin Dashboard)
// ============================================

export type MappingStatus = {
  clubsMapped: number;
  clubsTotal: number;
  playersMapped: number;
  playersTotal: number;
  fixturesMapped: number;
  fixturesTotal: number;
};

export async function getMappingStatus(): Promise<MappingStatus> {
  const [clubsRes, playersRes, fixturesRes] = await Promise.allSettled([
    supabase.from('clubs').select('id, api_football_id'),
    supabase.from('players').select('id, api_football_id').limit(1000),
    supabase.from('fixtures').select('id, api_fixture_id'),
  ]);

  const clubs = clubsRes.status === 'fulfilled' ? clubsRes.value.data ?? [] : [];
  const players = playersRes.status === 'fulfilled' ? playersRes.value.data ?? [] : [];
  const fixtures = fixturesRes.status === 'fulfilled' ? fixturesRes.value.data ?? [] : [];

  return {
    clubsTotal: clubs.length,
    clubsMapped: clubs.filter(c => c.api_football_id != null).length,
    playersTotal: players.length,
    playersMapped: players.filter(p => p.api_football_id != null).length,
    fixturesTotal: fixtures.length,
    fixturesMapped: fixtures.filter(f => f.api_fixture_id != null).length,
  };
}

// ============================================
// Import Gameweek (Full Orchestrator)
// ============================================

export type ImportResult = {
  success: boolean;
  fixturesImported: number;
  statsImported: number;
  scoresSynced: number;
  errors: string[];
};

/** Import real match data for a gameweek from API-Football via single RPC */
export async function importGameweek(adminId: string, gameweek: number): Promise<ImportResult> {
  const result: ImportResult = { success: false, fixturesImported: 0, statsImported: 0, scoresSynced: 0, errors: [] };

  try {
    // 1. Load our mapped fixtures for this GW
    const { data: ourFixtures, error: fixErr } = await supabase
      .from('fixtures')
      .select('id, home_club_id, away_club_id, api_fixture_id')
      .eq('gameweek', gameweek)
      .not('api_fixture_id', 'is', null);

    if (fixErr || !ourFixtures || ourFixtures.length === 0) {
      result.errors.push('Keine gemappten Fixtures für diesen Spieltag');
      return result;
    }

    // 2. Build player API ID → our player ID lookup
    const { data: players } = await supabase
      .from('players')
      .select('id, api_football_id, position')
      .not('api_football_id', 'is', null);

    if (!players || players.length === 0) {
      result.errors.push('Keine gemappten Spieler');
      return result;
    }

    const apiPlayerMap = new Map(players.map(p => [p.api_football_id!, { id: p.id as string, position: p.position as string }]));

    // 3. Build club API ID → our club ID lookup
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, api_football_id')
      .not('api_football_id', 'is', null);

    const apiClubMap = new Map((clubs ?? []).map(c => [c.api_football_id!, c.id as string]));

    // 4. Fetch GW fixtures from API once (used for scores)
    const apiFixData = await fetchApiFixtures(gameweek);

    // 5. Collect fixture results + player stats for all fixtures
    const fixtureResults: Array<{ fixture_id: string; home_score: number; away_score: number }> = [];
    const playerStats: Array<{
      fixture_id: string; player_id: string; club_id: string;
      minutes_played: number; goals: number; assists: number;
      clean_sheet: boolean; goals_conceded: number;
      yellow_card: boolean; red_card: boolean;
      saves: number; bonus: number; fantasy_points: number;
    }> = [];

    for (const fixture of ourFixtures) {
      try {
        const apiStats = await fetchApiFixtureStats(fixture.api_fixture_id!);
        const apiMatch = apiFixData.response.find(f => f.fixture.id === fixture.api_fixture_id);

        // Collect fixture score
        if (apiMatch && apiMatch.goals.home != null && apiMatch.goals.away != null) {
          fixtureResults.push({
            fixture_id: fixture.id,
            home_score: apiMatch.goals.home,
            away_score: apiMatch.goals.away,
          });
        }

        // Process player stats from both teams
        for (const teamData of apiStats.response) {
          const clubId = apiClubMap.get(teamData.team.id);
          if (!clubId) continue;

          const isHome = fixture.home_club_id === clubId;
          const goalsAgainst = apiMatch
            ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
            : 0;
          const isCleanSheet = goalsAgainst === 0;

          for (const playerData of teamData.players) {
            const ourPlayer = apiPlayerMap.get(playerData.player.id);
            if (!ourPlayer) continue;

            const stat = playerData.statistics[0];
            if (!stat) continue;

            const minutes = stat.games.minutes ?? 0;
            if (minutes === 0) continue;

            const goals = stat.goals.total ?? 0;
            const assists = stat.goals.assists ?? 0;
            const goalsConceded = stat.goals.conceded ?? 0;
            const yellowCard = (stat.cards.yellow ?? 0) > 0;
            const redCard = (stat.cards.red ?? 0) > 0;
            const saves = stat.goals.saves ?? 0;

            const fantasyPoints = calcFantasyPoints(
              ourPlayer.position, minutes, goals, assists,
              isCleanSheet && minutes >= 60, goalsConceded,
              yellowCard, redCard, saves, 0
            );

            playerStats.push({
              fixture_id: fixture.id,
              player_id: ourPlayer.id,
              club_id: clubId,
              minutes_played: minutes,
              goals,
              assists,
              clean_sheet: isCleanSheet && minutes >= 60,
              goals_conceded: goalsConceded,
              yellow_card: yellowCard,
              red_card: redCard,
              saves,
              bonus: 0,
              fantasy_points: fantasyPoints,
            });
          }
        }
      } catch (e) {
        result.errors.push(`Fixture ${fixture.id}: ${e instanceof Error ? e.message : 'Fehler'}`);
      }
    }

    // 6. Single RPC call: import all data + sync scores
    if (fixtureResults.length > 0 || playerStats.length > 0) {
      const { data, error: rpcErr } = await supabase.rpc('admin_import_gameweek_stats', {
        p_admin_id: adminId,
        p_gameweek: gameweek,
        p_fixture_results: fixtureResults,
        p_player_stats: playerStats,
      });

      const rpcResult = data as {
        success: boolean; fixtures_imported?: number;
        stats_imported?: number; scores_synced?: number; error?: string;
      } | null;

      if (rpcErr) {
        result.errors.push(`RPC: ${rpcErr.message}`);
      } else if (rpcResult && !rpcResult.success) {
        result.errors.push(rpcResult.error ?? 'RPC fehlgeschlagen');
      } else if (rpcResult) {
        result.fixturesImported = rpcResult.fixtures_imported ?? 0;
        result.statsImported = rpcResult.stats_imported ?? 0;
        result.scoresSynced = rpcResult.scores_synced ?? 0;
      }
    }

    result.success = result.errors.length === 0;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return result;
}

/** Check if a gameweek has mapped fixtures (to enable import button) */
export async function hasApiFixtures(gameweek: number): Promise<boolean> {
  const { count, error } = await supabase
    .from('fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('gameweek', gameweek)
    .not('api_fixture_id', 'is', null);

  return !error && (count ?? 0) > 0;
}
