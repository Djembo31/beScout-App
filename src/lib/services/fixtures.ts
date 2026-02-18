import { supabase } from '@/lib/supabaseClient';
import type { Fixture, FixturePlayerStat, GameweekStatus, SimulateResult } from '@/types';

// ============================================
// Queries
// ============================================

/** Load all fixtures for a specific gameweek with club names */
export async function getFixturesByGameweek(gw: number): Promise<Fixture[]> {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_club:clubs!fixtures_home_club_id_fkey(name, short, primary_color),
      away_club:clubs!fixtures_away_club_id_fkey(name, short, primary_color)
    `)
    .eq('gameweek', gw)
    .order('created_at');

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const home = row.home_club as { name: string; short: string; primary_color: string | null } | null;
    const away = row.away_club as { name: string; short: string; primary_color: string | null } | null;
    return {
      id: row.id as string,
      gameweek: row.gameweek as number,
      home_club_id: row.home_club_id as string,
      away_club_id: row.away_club_id as string,
      home_score: row.home_score as number | null,
      away_score: row.away_score as number | null,
      status: row.status as 'scheduled' | 'simulated' | 'live' | 'finished',
      played_at: row.played_at as string | null,
      created_at: row.created_at as string,
      home_club_name: home?.name ?? '',
      home_club_short: home?.short ?? '',
      away_club_name: away?.name ?? '',
      away_club_short: away?.short ?? '',
      home_club_primary_color: home?.primary_color ?? null,
      away_club_primary_color: away?.primary_color ?? null,
    };
  });
}

/** Load player stats for a specific fixture */
export async function getFixturePlayerStats(fixtureId: string): Promise<FixturePlayerStat[]> {
  const { data, error } = await supabase
    .from('fixture_player_stats')
    .select(`
      *,
      player:players!fixture_player_stats_player_id_fkey(first_name, last_name, position),
      club:clubs!fixture_player_stats_club_id_fkey(short)
    `)
    .eq('fixture_id', fixtureId)
    .order('fantasy_points', { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const player = row.player as { first_name: string; last_name: string; position: string } | null;
    const club = row.club as { short: string } | null;
    return {
      id: row.id as string,
      fixture_id: row.fixture_id as string,
      player_id: row.player_id as string,
      club_id: row.club_id as string,
      minutes_played: row.minutes_played as number,
      goals: row.goals as number,
      assists: row.assists as number,
      clean_sheet: row.clean_sheet as boolean,
      goals_conceded: row.goals_conceded as number,
      yellow_card: row.yellow_card as boolean,
      red_card: row.red_card as boolean,
      saves: row.saves as number,
      bonus: row.bonus as number,
      fantasy_points: row.fantasy_points as number,
      player_first_name: player?.first_name ?? '',
      player_last_name: player?.last_name ?? '',
      player_position: player?.position ?? '',
      club_short: club?.short ?? '',
    };
  });
}

/** Get gameweek simulation status for a range */
export async function getGameweekStatuses(fromGw: number, toGw: number): Promise<GameweekStatus[]> {
  const { data, error } = await supabase
    .from('fixtures')
    .select('gameweek, status')
    .gte('gameweek', fromGw)
    .lte('gameweek', toGw);

  if (error || !data) return [];

  const gwMap = new Map<number, { total: number; simulated: number }>();
  for (const row of data) {
    const gw = row.gameweek as number;
    const existing = gwMap.get(gw) || { total: 0, simulated: 0 };
    existing.total++;
    if (row.status === 'simulated' || row.status === 'finished') existing.simulated++;
    gwMap.set(gw, existing);
  }

  return Array.from(gwMap.entries()).map(([gw, counts]) => ({
    gameweek: gw,
    total: counts.total,
    simulated: counts.simulated,
    is_complete: counts.simulated === counts.total,
  })).sort((a, b) => a.gameweek - b.gameweek);
}

/** Get top scorers for a gameweek */
export async function getGameweekTopScorers(gw: number, limit: number = 5): Promise<FixturePlayerStat[]> {
  // First get fixture IDs for this gameweek
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id')
    .eq('gameweek', gw)
    .in('status', ['simulated', 'finished']);

  if (!fixtures || fixtures.length === 0) return [];

  const fixtureIds = fixtures.map(f => f.id);

  const { data, error } = await supabase
    .from('fixture_player_stats')
    .select(`
      *,
      player:players!fixture_player_stats_player_id_fkey(first_name, last_name, position),
      club:clubs!fixture_player_stats_club_id_fkey(short)
    `)
    .in('fixture_id', fixtureIds)
    .order('fantasy_points', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const player = row.player as { first_name: string; last_name: string; position: string } | null;
    const club = row.club as { short: string } | null;
    return {
      id: row.id as string,
      fixture_id: row.fixture_id as string,
      player_id: row.player_id as string,
      club_id: row.club_id as string,
      minutes_played: row.minutes_played as number,
      goals: row.goals as number,
      assists: row.assists as number,
      clean_sheet: row.clean_sheet as boolean,
      goals_conceded: row.goals_conceded as number,
      yellow_card: row.yellow_card as boolean,
      red_card: row.red_card as boolean,
      saves: row.saves as number,
      bonus: row.bonus as number,
      fantasy_points: row.fantasy_points as number,
      player_first_name: player?.first_name ?? '',
      player_last_name: player?.last_name ?? '',
      player_position: player?.position ?? '',
      club_short: club?.short ?? '',
    };
  });
}

// ============================================
// Manager Data (Minutes + Next Fixture)
// ============================================

/** Get recent minutes played per player (last 5 completed gameweeks) */
export async function getRecentPlayerMinutes(): Promise<Map<string, number[]>> {
  const { data: completedFixtures } = await supabase
    .from('fixtures')
    .select('id, gameweek')
    .in('status', ['simulated', 'finished'])
    .order('gameweek', { ascending: false });

  if (!completedFixtures || completedFixtures.length === 0) return new Map();

  const gameweeks = Array.from(new Set(completedFixtures.map(f => f.gameweek as number)))
    .sort((a, b) => b - a)
    .slice(0, 5);
  const fixtureIds = completedFixtures
    .filter(f => gameweeks.includes(f.gameweek as number))
    .map(f => f.id as string);

  if (fixtureIds.length === 0) return new Map();

  const { data: stats } = await supabase
    .from('fixture_player_stats')
    .select('player_id, minutes_played, fixture_id')
    .in('fixture_id', fixtureIds);

  if (!stats) return new Map();

  const fixtureGwMap = new Map(completedFixtures.map(f => [f.id as string, f.gameweek as number]));
  const playerMinutes = new Map<string, { gw: number; minutes: number }[]>();

  for (const s of stats) {
    const gw = fixtureGwMap.get(s.fixture_id as string) ?? 0;
    const arr = playerMinutes.get(s.player_id as string) ?? [];
    arr.push({ gw, minutes: s.minutes_played as number });
    playerMinutes.set(s.player_id as string, arr);
  }

  const result = new Map<string, number[]>();
  playerMinutes.forEach((arr, playerId) => {
    arr.sort((a, b) => b.gw - a.gw);
    result.set(playerId, arr.map(a => a.minutes));
  });

  return result;
}

/** Recent gameweek scores per player (last 5 completed GWs) — batch query for all players */
export async function getRecentPlayerScores(): Promise<Map<string, number[]>> {
  // Get completed gameweeks with scores
  const { data: scores } = await supabase
    .from('player_gameweek_scores')
    .select('player_id, gameweek, score')
    .order('gameweek', { ascending: false });

  if (!scores || scores.length === 0) return new Map();

  // Get unique gameweeks (last 5)
  const gameweeks = Array.from(new Set(scores.map(s => s.gameweek as number)))
    .sort((a, b) => b - a)
    .slice(0, 5);

  const result = new Map<string, number[]>();
  const filtered = scores.filter(s => gameweeks.includes(s.gameweek as number));

  const playerScores = new Map<string, { gw: number; score: number }[]>();
  for (const s of filtered) {
    const pid = s.player_id as string;
    const arr = playerScores.get(pid) ?? [];
    arr.push({ gw: s.gameweek as number, score: s.score as number });
    playerScores.set(pid, arr);
  }

  playerScores.forEach((arr, playerId) => {
    arr.sort((a, b) => b.gw - a.gw);
    result.set(playerId, arr.map(a => a.score));
  });

  return result;
}

export type NextFixtureInfo = {
  opponentName: string;
  opponentShort: string;
  isHome: boolean;
  gameweek: number;
  playedAt: string | null;
};

/** Get next scheduled fixture for each club */
export async function getNextFixturesByClub(): Promise<Map<string, NextFixtureInfo>> {
  const { data } = await supabase
    .from('fixtures')
    .select(`
      gameweek, home_club_id, away_club_id, played_at,
      home_club:clubs!fixtures_home_club_id_fkey(name, short),
      away_club:clubs!fixtures_away_club_id_fkey(name, short)
    `)
    .eq('status', 'scheduled')
    .order('gameweek', { ascending: true });

  if (!data) return new Map();

  const result = new Map<string, NextFixtureInfo>();
  for (const row of data) {
    const home = row.home_club as unknown as { name: string; short: string } | null;
    const away = row.away_club as unknown as { name: string; short: string } | null;
    const homeClubId = row.home_club_id as string;
    const awayClubId = row.away_club_id as string;

    if (!result.has(homeClubId)) {
      result.set(homeClubId, {
        opponentName: away?.name ?? '',
        opponentShort: away?.short ?? '',
        isHome: true,
        gameweek: row.gameweek as number,
        playedAt: row.played_at as string | null,
      });
    }

    if (!result.has(awayClubId)) {
      result.set(awayClubId, {
        opponentName: home?.name ?? '',
        opponentShort: home?.short ?? '',
        isHome: false,
        gameweek: row.gameweek as number,
        playedAt: row.played_at as string | null,
      });
    }
  }

  return result;
}

// ============================================
// Simulation
// ============================================

/** Simulate a gameweek via RPC */
export async function simulateGameweek(gameweek: number): Promise<SimulateResult> {
  const { data, error } = await supabase.rpc('simulate_gameweek', {
    p_gameweek: gameweek,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as SimulateResult;
}

/** Bridge: sync fixture_player_stats → player_gameweek_scores via RPC */
export async function syncFixtureScores(gameweek: number): Promise<{ success: boolean; synced_count: number; error?: string }> {
  const { data, error } = await supabase.rpc('sync_fixture_scores', {
    p_gameweek: gameweek,
  });

  if (error) {
    return { success: false, synced_count: 0, error: error.message };
  }

  return data as { success: boolean; synced_count: number };
}
