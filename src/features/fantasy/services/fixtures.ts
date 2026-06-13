import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { DbFixture, Fixture, FixturePlayerStat, FixtureSubstitution, GameweekStatus, SimulateResult, FixtureStatus } from '@/types';

// ============================================
// Queries
// ============================================

/** Load all fixtures for a specific gameweek with club names.
 *  @param leagueId - Optional league filter. When provided, only fixtures for
 *  that league are returned. Omit (or pass undefined/null) for all leagues.
 */
export async function getFixturesByGameweek(gw: number, leagueId?: string | null): Promise<Fixture[]> {
  let query = supabase
    .from('fixtures')
    .select(`
      *,
      home_club:clubs!fixtures_home_club_id_fkey(name, short, primary_color),
      away_club:clubs!fixtures_away_club_id_fkey(name, short, primary_color)
    `)
    .eq('gameweek', gw);

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data, error } = await query.order('created_at');

  if (error) throw new Error(error.message);
  if (!data) return [];

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
      status: row.status as FixtureStatus,
      played_at: row.played_at as string | null,
      home_formation: (row.home_formation as string | null) ?? null,
      away_formation: (row.away_formation as string | null) ?? null,
      created_at: row.created_at as string,
      // Slice 267: Realtime-Live-Score Foundation. Both columns added by
      // migration 20260503120000_slice_267_fixtures_realtime.sql.
      // PostgREST select(*) picks them up automatically — no SELECT_COLS
      // constant to keep in sync (see common-errors PLAYER_SELECT_COLS lesson).
      minute: (row.minute as number | null | undefined) ?? null,
      last_live_update_at: (row.last_live_update_at as string | null | undefined) ?? null,
      home_club_name: home?.name ?? '',
      home_club_short: home?.short ?? '',
      away_club_name: away?.name ?? '',
      away_club_short: away?.short ?? '',
      home_club_primary_color: home?.primary_color ?? null,
      away_club_primary_color: away?.primary_color ?? null,
    };
  });
}

/** Load all fixtures for a specific club (home or away) with club names */
export async function getFixturesByClub(clubId: string): Promise<Fixture[]> {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_club:clubs!fixtures_home_club_id_fkey(name, short, primary_color),
      away_club:clubs!fixtures_away_club_id_fkey(name, short, primary_color)
    `)
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
    .order('gameweek', { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

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
      status: row.status as FixtureStatus,
      played_at: row.played_at as string | null,
      home_formation: (row.home_formation as string | null) ?? null,
      away_formation: (row.away_formation as string | null) ?? null,
      created_at: row.created_at as string,
      // Slice 267: Realtime-Live-Score Foundation (see getFixturesByGameweek).
      minute: (row.minute as number | null | undefined) ?? null,
      last_live_update_at: (row.last_live_update_at as string | null | undefined) ?? null,
      home_club_name: home?.name ?? '',
      home_club_short: home?.short ?? '',
      away_club_name: away?.name ?? '',
      away_club_short: away?.short ?? '',
      home_club_primary_color: home?.primary_color ?? null,
      away_club_primary_color: away?.primary_color ?? null,
    };
  });
}

/** Parse player_name_api into first/last — "Mehmet Yilmaz" → {first: "Mehmet", last: "Yilmaz"} */
function parseApiName(name: string | null): { first: string; last: string } {
  if (!name) return { first: '', last: '' };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/** Map a fixture_player_stats row to FixturePlayerStat with fallbacks for unmatched players */
function mapStatRow(row: Record<string, unknown>): FixturePlayerStat {
  const player = row.player as { first_name: string; last_name: string; position: string; image_url: string | null } | null;
  const club = row.club as { short: string } | null;
  const apiName = parseApiName(row.player_name_api as string | null);

  return {
    id: row.id as string,
    fixture_id: row.fixture_id as string,
    player_id: (row.player_id as string | null) ?? null,
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
    rating: (row.rating as number | null) ?? null,
    match_position: (row.match_position as string | null) ?? null,
    is_starter: (row.is_starter as boolean | null) ?? false,
    grid_position: (row.grid_position as string | null) ?? null,
    api_football_player_id: (row.api_football_player_id as number | null) ?? null,
    player_name_api: (row.player_name_api as string | null) ?? null,
    player_first_name: player?.first_name ?? apiName.first,
    player_last_name: player?.last_name ?? apiName.last,
    player_position: player?.position ?? (row.match_position as string | null) ?? '',
    player_image_url: player?.image_url ?? null,
    club_short: club?.short ?? '',
  };
}

/** Load player stats for a specific fixture (LEFT JOIN for nullable player_id) */
export async function getFixturePlayerStats(fixtureId: string): Promise<FixturePlayerStat[]> {
  // Use !left hint for nullable FK join — cast needed since TS parser doesn't support !left
  const { data, error } = await supabase
    .from('fixture_player_stats')
    .select(
      '*, player:players!fixture_player_stats_player_id_fkey!left(first_name, last_name, position, image_url), club:clubs!fixture_player_stats_club_id_fkey(short)',
    )
    .eq('fixture_id', fixtureId)
    .order('rating', { ascending: false, nullsFirst: false }) as unknown as {
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => mapStatRow(row));
}

/** Get gameweek simulation status for a range */
/**
 * Slice 273 Track B — leagueId-Filter (Per-Tenant-Window, Bug-Klasse Slice 270).
 *
 * Pre-Slice-273: Service aggregierte ALLE Ligen für einen GW. Multi-League-Bug:
 * TR Süper Lig GW32 finished + DE Bundesliga GW32 finished + EN Premier League
 * GW32 finished → `is_complete=true` für alle. Konsument `useGameweek.gwFixtureInfo`
 * zeigte „GW32 simulated" auch bei Liga-Switch wo GW32 noch offen wäre.
 *
 * Slice-273-Fix: leagueId optional, default null = global aggregate (legacy).
 * Konsumenten sollten leagueId durchrouten wenn Per-Liga-Status gewünscht.
 *
 * Backward-Compat: useClubEventsData (admin-tab) nutzt fromGw=1, toGw=38 ohne
 * leagueId → bleibt globale Liste. Spieltag-Page nutzt jetzt leagueId-aware.
 */
export async function getGameweekStatuses(
  fromGw: number,
  toGw: number,
  leagueId?: string | null,
): Promise<GameweekStatus[]> {
  let query = supabase
    .from('fixtures')
    .select('gameweek, status')
    .gte('gameweek', fromGw)
    .lte('gameweek', toGw);

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  if (!data) return [];

  const gwMap = new Map<number, { total: number; simulated: number }>();
  for (const row of data) {
    const gw = row.gameweek as number;
    const existing = gwMap.get(gw) || { total: 0, simulated: 0 };
    existing.total++;
    // Slice 284a: cancelled zählt als komplett (Spiel findet nie statt)
    if (row.status === 'simulated' || row.status === 'finished' || row.status === 'cancelled') existing.simulated++;
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
export async function getGameweekTopScorers(gw: number, limit: number = 5, leagueId?: string | null): Promise<FixturePlayerStat[]> {
  // First get fixture IDs for this gameweek
  // 284d-FANT-05: leagueId-Filter — sonst mischt der Ergebnisse-Tab alle 7 Ligen
  // (gleiche GW-Nummer = rein). Slice-270-Klasse.
  let fixQuery = supabase
    .from('fixtures')
    .select('id')
    .eq('gameweek', gw)
    .in('status', ['simulated', 'finished']);
  if (leagueId) fixQuery = fixQuery.eq('league_id', leagueId);
  const { data: fixtures, error: fixError } = await fixQuery;

  if (fixError) throw new Error(fixError.message);
  if (!fixtures || fixtures.length === 0) return [];

  const fixtureIds = fixtures.map(f => f.id);

  const { data, error } = await supabase
    .from('fixture_player_stats')
    .select(
      '*, player:players!fixture_player_stats_player_id_fkey!left(first_name, last_name, position, image_url), club:clubs!fixture_player_stats_club_id_fkey(short)',
    )
    .in('fixture_id', fixtureIds)
    .not('player_id', 'is', null)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(limit) as unknown as {
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => mapStatRow(row));
}

/** Get GW stats for specific player IDs (for "Deine Spieler" portfolio view) */
export async function getGameweekStatsForPlayers(gw: number, playerIds: string[], leagueId?: string | null): Promise<FixturePlayerStat[]> {
  if (playerIds.length === 0) return [];

  // 284d-FANT-05: leagueId-Filter analog getGameweekTopScorers.
  let fixQuery2 = supabase
    .from('fixtures')
    .select('id')
    .eq('gameweek', gw)
    .in('status', ['simulated', 'finished']);
  if (leagueId) fixQuery2 = fixQuery2.eq('league_id', leagueId);
  const { data: fixtures, error: fixError2 } = await fixQuery2;

  if (fixError2) throw new Error(fixError2.message);
  if (!fixtures || fixtures.length === 0) return [];

  const fixtureIds = fixtures.map(f => f.id);

  const { data, error } = await supabase
    .from('fixture_player_stats')
    .select(
      '*, player:players!fixture_player_stats_player_id_fkey!left(first_name, last_name, position, image_url), club:clubs!fixture_player_stats_club_id_fkey(short)',
    )
    .in('fixture_id', fixtureIds)
    .in('player_id', playerIds)
    .order('rating', { ascending: false, nullsFirst: false }) as unknown as {
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => mapStatRow(row));
}

// ============================================
// Substitutions
// ============================================

/** Load substitution events for a fixture, ordered by minute */
export async function getFixtureSubstitutions(fixtureId: string): Promise<FixtureSubstitution[]> {
  const { data, error } = await supabase
    .from('fixture_substitutions')
    .select(
      '*, player_in:players!fixture_substitutions_player_in_id_fkey!left(first_name, last_name), player_out:players!fixture_substitutions_player_out_id_fkey!left(first_name, last_name)',
    )
    .eq('fixture_id', fixtureId)
    .order('minute', { ascending: true }) as unknown as {
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    const playerIn = row.player_in as { first_name: string; last_name: string } | null;
    const playerOut = row.player_out as { first_name: string; last_name: string } | null;
    const apiInName = (row.player_in_name as string) ?? '';
    const apiOutName = (row.player_out_name as string) ?? '';
    const parseApi = (name: string) => {
      const parts = name.trim().split(/\s+/);
      return parts.length === 1
        ? { first: '', last: parts[0] }
        : { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
    };
    const inParsed = parseApi(apiInName);
    const outParsed = parseApi(apiOutName);

    return {
      id: row.id as string,
      fixture_id: row.fixture_id as string,
      club_id: row.club_id as string,
      minute: row.minute as number,
      extra_minute: (row.extra_minute as number | null) ?? null,
      player_in_id: (row.player_in_id as string | null) ?? null,
      player_out_id: (row.player_out_id as string | null) ?? null,
      player_in_api_id: row.player_in_api_id as number,
      player_out_api_id: row.player_out_api_id as number,
      player_in_name: row.player_in_name as string,
      player_out_name: row.player_out_name as string,
      player_in_first_name: playerIn?.first_name ?? inParsed.first,
      player_in_last_name: playerIn?.last_name ?? inParsed.last,
      player_out_first_name: playerOut?.first_name ?? outParsed.first,
      player_out_last_name: playerOut?.last_name ?? outParsed.last,
    };
  });
}

// ============================================
// Per-Fixture Deadline Locking
// ============================================

export type FixtureDeadline = {
  fixtureId: string;
  playedAt: string | null;
  status: string;
  isLocked: boolean;
  opponentShort: string;
  isHome: boolean;
};

/** Build a Map<clubId, FixtureDeadline> for per-fixture lock checks.
 *  A club's players are locked when their fixture has started (playedAt <= now)
 *  and the fixture is not postponed. */
export async function getFixtureDeadlinesByGameweek(gw: number): Promise<Map<string, FixtureDeadline>> {
  const fixtures = await getFixturesByGameweek(gw);
  const now = new Date();
  const result = new Map<string, FixtureDeadline>();

  for (const f of fixtures) {
    // 284d-FANT-08: isLocked rein played_at-basiert (Server-Gate rpc_save_lineup
    // lockt ab erstem Kickoff der GW). status!=='scheduled' liess bei Cron-Lag
    // die UI faelschlich „editierbar" anzeigen.
    const isLocked = f.played_at != null && new Date(f.played_at) <= now;

    // Home club entry
    result.set(f.home_club_id, {
      fixtureId: f.id,
      playedAt: f.played_at,
      status: f.status,
      isLocked,
      opponentShort: f.away_club_short,
      isHome: true,
    });

    // Away club entry
    result.set(f.away_club_id, {
      fixtureId: f.id,
      playedAt: f.played_at,
      status: f.status,
      isLocked,
      opponentShort: f.home_club_short,
      isHome: false,
    });
  }

  return result;
}

// ============================================
// Manager Data (Minutes + Next Fixture)
// ============================================

/** Get recent minutes played per player (last 5 league GWs, newest-first).
 *  284d-FANT-09: Absolute-Liga-Window via RPC (mirror rpc_get_recent_player_scores)
 *  — vorher globales Top-5-GW-Window über alle Ligen → 34-GW-Ligen sahen leere
 *  Slots (Slice-270-Klasse). RPC liefert JSONB (1000-cap-sicher, Slice-270d). */
export async function getRecentPlayerMinutes(): Promise<Map<string, number[]>> {
  const { data, error } = await supabase.rpc('rpc_get_recent_player_minutes');
  if (error) throw new Error(error.message);
  if (!data) return new Map();

  // JSONB-Array → Map. RPC liefert pro Spieler 5 Slots, newest-first sortiert.
  const rows = data as Array<{ player_id: string; gameweek: number; minutes: number }>;
  if (rows.length === 0) return new Map();

  const result = new Map<string, number[]>();
  for (const row of rows) {
    const arr = result.get(row.player_id) ?? [];
    arr.push(row.minutes);
    result.set(row.player_id, arr);
  }
  return result;
}

/** Per-player recent scores — absolute Liga-Window (Slice 274).
 *
 *  Returnt für jeden aktiven Spieler die letzten 5 Liga-GWs (status=finished|simulated)
 *  als Slot-Array (oldest→newest). Jeder Slot hat:
 *  - `gameweek`: konkrete Liga-GW (NIE null bei aktivem Spieler)
 *  - `score`: number wenn played (0..100, inkl. Cameos), `null` wenn DNP
 *
 *  Slice 274-Refactor: Pre-Slice (270d v2) nutzte per-player Window
 *  (ROW_NUMBER OVER PARTITION BY player_id, last 5 played) → DNP-Spieler
 *  (z.B. langzeitverletzte Stammspieler) zeigten 5 colored Bars aus alten
 *  GWs → User-Verwirrung „on form / 1-2 GWs verpasst" obwohl 5+ GWs verpasst.
 *  Slice 273 hat parallel den active_gameweek-Drift-Bug komplett gefixt
 *  (Liga-Truth aus fixtures, nicht clubs.active_gameweek), wodurch das
 *  damalige Slice-270-Argument („Liga-Lag verbirgt Stammspieler") obsolet wurde.
 *
 *  Cameo-Behandlung (Anil-Decision 2026-05-06): KEIN score-Filter im RPC.
 *  0-Punkte-Cameos (5-7min Einwechslung, 0 pts) sind played → score=0 →
 *  Frontend rendert kleine colored Bar (6px min-h). Pre-Slice-274 verbarg
 *  sie als dashed weil `WHERE score > 0`.
 *
 *  Slice 270d v2 Pattern beibehalten: RPC returns JSONB-Array, kein TABLE-Set
 *  (PostgREST 1000-row cap auf RPCs ignoriert .range()/?limit-Overrides).
 *
 *  RPC-Contract: ORDER BY player_id, gameweek ASC (oldest→newest per player).
 *  Slice 270 Reviewer F-01-Lehre: ORDER-Change würde silent visual breakage.
 *
 *  TanStack-Query select-Pattern (Slice 270b) bleibt:
 *  - useRecentScores → Map<pid, scores[]> (4 Konsumenten)
 *  - useRecentPlayerGameweeks → Map<pid, gws[]> (KaderTab Tooltip)
 *
 *  Returns: Map<playerId, RecentScoreSlot[5]>. Jeder aktive Spieler bekommt
 *  exakt 5 Slots vom Backend. Spieler ohne club_id fehlen ganz in der Map.
 */
export type RecentScoreSlot = { score: number | null; gameweek: number | null };

export async function getRecentPlayerScoresAndGameweeks(): Promise<Map<string, RecentScoreSlot[]>> {
  const { data, error } = await supabase.rpc('rpc_get_recent_player_scores');
  if (error) throw new Error(error.message);
  if (!data) return new Map();

  // JSONB-Array deserialisiert von Supabase-JS bereits zu JS-Array.
  // Slice 274 RPC liefert für jeden aktiven Spieler exakt 5 Slots
  // (Cross-Join Spieler × Liga-Window). score=null = DNP, score>=0 = played.
  const rows = data as Array<{ player_id: string; gameweek: number; score: number | null }>;
  if (rows.length === 0) return new Map();

  const result = new Map<string, RecentScoreSlot[]>();
  for (const row of rows) {
    const arr = result.get(row.player_id) ?? [];
    arr.push({ score: row.score, gameweek: row.gameweek });
    result.set(row.player_id, arr);
  }

  return result;
}

export type NextFixtureInfo = {
  opponentName: string;
  opponentShort: string;
  opponentLogoUrl: string | null;
  isHome: boolean;
  gameweek: number;
  playedAt: string | null;
};

const STALE_SCHEDULED_GRACE_MS = 6 * 60 * 60 * 1000;

/** Get next scheduled fixture for each club. Ignores stale-scheduled rows (played_at more than 6h in the past) to survive sync-lag.
 *
 * Slice 148: Order by played_at ASC (time-truth) not gameweek ASC (number-truth). Prevents
 * inconsistency where a rescheduled fixture with low gameweek but far-future played_at
 * displaces the actual next upcoming fixture. Gameweek as tiebreaker when played_at ties.
 */
export async function getNextFixturesByClub(): Promise<Map<string, NextFixtureInfo>> {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      gameweek, home_club_id, away_club_id, played_at,
      home_club:clubs!fixtures_home_club_id_fkey(name, short, logo_url),
      away_club:clubs!fixtures_away_club_id_fkey(name, short, logo_url)
    `)
    .eq('status', 'scheduled')
    .order('played_at', { ascending: true, nullsFirst: false })
    .order('gameweek', { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return new Map();

  const staleCutoffMs = Date.now() - STALE_SCHEDULED_GRACE_MS;

  const result = new Map<string, NextFixtureInfo>();
  for (const row of data) {
    const playedAt = row.played_at as string | null;
    if (playedAt && new Date(playedAt).getTime() < staleCutoffMs) continue;

    const home = row.home_club as unknown as { name: string; short: string; logo_url: string | null } | null;
    const away = row.away_club as unknown as { name: string; short: string; logo_url: string | null } | null;
    const homeClubId = row.home_club_id as string;
    const awayClubId = row.away_club_id as string;

    if (!result.has(homeClubId)) {
      result.set(homeClubId, {
        opponentName: away?.name ?? '',
        opponentShort: away?.short ?? '',
        opponentLogoUrl: away?.logo_url ?? null,
        isHome: true,
        gameweek: row.gameweek as number,
        playedAt,
      });
    }

    if (!result.has(awayClubId)) {
      result.set(awayClubId, {
        opponentName: home?.name ?? '',
        opponentShort: home?.short ?? '',
        opponentLogoUrl: home?.logo_url ?? null,
        isHome: false,
        gameweek: row.gameweek as number,
        playedAt,
      });
    }
  }

  return result;
}

/** Slice 197e — Get next N scheduled fixtures for a single club (home or away).
 *
 * Used by ClubFixturesStrip on /club/[slug] to display 5-GW-Forward FDR (closes
 * FM-Audit K-01). Same stale-skip logic as getNextFixturesByClub: ignores rows
 * with played_at >6h in the past to survive sync-lag.
 *
 * Order: played_at ASC, gameweek ASC tiebreaker (Slice 148 time-truth pattern).
 */
export async function getNextFixturesForClub(
  clubId: string,
  count = 5,
): Promise<NextFixtureInfo[]> {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      gameweek, home_club_id, away_club_id, played_at,
      home_club:clubs!fixtures_home_club_id_fkey(name, short, logo_url),
      away_club:clubs!fixtures_away_club_id_fkey(name, short, logo_url)
    `)
    .eq('status', 'scheduled')
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
    .order('played_at', { ascending: true, nullsFirst: false })
    .order('gameweek', { ascending: true })
    .limit(Math.max(1, count) * 2); // safety-margin: skipped stale rows

  if (error) throw new Error(error.message);
  if (!data) return [];

  const staleCutoffMs = Date.now() - STALE_SCHEDULED_GRACE_MS;
  const result: NextFixtureInfo[] = [];

  for (const row of data) {
    if (result.length >= count) break;

    const playedAt = row.played_at as string | null;
    if (playedAt && new Date(playedAt).getTime() < staleCutoffMs) continue;

    const home = row.home_club as unknown as { name: string; short: string; logo_url: string | null } | null;
    const away = row.away_club as unknown as { name: string; short: string; logo_url: string | null } | null;
    const homeClubId = row.home_club_id as string;
    const isHome = homeClubId === clubId;
    const opponent = isHome ? away : home;

    result.push({
      opponentName: opponent?.name ?? '',
      opponentShort: opponent?.short ?? '',
      opponentLogoUrl: opponent?.logo_url ?? null,
      isHome,
      gameweek: row.gameweek as number,
      playedAt,
    });
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

// ============================================
// Floor Prices
// ============================================

/** Bulk-fetch floor prices for a list of player IDs.
 *  Returns Map<playerId, floorPriceCents>. Players without DPCs (floor_price=0) are omitted. */
export async function getFloorPricesForPlayers(playerIds: string[]): Promise<Map<string, number>> {
  if (playerIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('players')
    .select('id, floor_price')
    .in('id', playerIds)
    .gt('floor_price', 0);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.id, row.floor_price);
  }
  return map;
}

// ============================================
// Slice 267 — Realtime Live-Score Subscription
// ============================================

/**
 * Subscribe to real-time UPDATE events on `fixtures` for a single league.
 *
 * Pattern-Source: `src/lib/queries/social.ts:46-84` (existing `useFollowingFeed`
 * with `postgres_changes` + Channel-cleanup-via-`removeChannel`).
 *
 * Returns the {@link RealtimeChannel} so the caller (`useLiveFixtures` hook)
 * can register it for cleanup. AC-14 (no memory-leak): caller MUST invoke
 * `supabase.removeChannel(channel)` from useEffect-return when the component
 * unmounts or when the league changes.
 *
 * The `onStatus` callback is the F-08 Polling-Trigger hook: a status of
 * `'CHANNEL_ERROR'` or `'TIMED_OUT'` signals the WS-Channel is degraded
 * and the consumer should fall back to 60s-polling. `'CLOSED'` is normal
 * teardown after `removeChannel`. We intentionally do NOT use
 * `navigator.onLine` (detects WAN, not Channel-state).
 *
 * RLS-Note: `fixtures` is public-readable (sport-data, no PII), so all
 * authenticated/anon clients receive UPDATE events. Filtering happens
 * server-side via `filter: 'league_id=eq.{leagueId}'`. Pre-Migration
 * `league_id IS NULL`-Verify is documented in IMPACT §12 / AC-16.
 *
 * @param leagueId - Supabase `leagues.id` UUID. Filters fixtures by
 *   `league_id=eq.{leagueId}` server-side via PostgREST realtime filter.
 * @param onUpdate - Invoked for every UPDATE event with the new fixture row.
 *   Payload shape is `DbFixture` (matching foundation-Type, includes
 *   `minute` + `last_live_update_at` after Slice 267 migration).
 * @param onStatus - Optional. Invoked with channel-status transitions —
 *   `'SUBSCRIBED'` (healthy), `'CHANNEL_ERROR'` / `'TIMED_OUT'` (degraded —
 *   trigger polling-fallback), `'CLOSED'` (post-teardown).
 * @returns The active RealtimeChannel. Caller is responsible for cleanup.
 *
 * @example
 * useEffect(() => {
 *   if (!leagueId) return;
 *   const channel = subscribeFixtureUpdates(
 *     leagueId,
 *     (fix) => queryClient.setQueryData(qk.fixtures.live(leagueId), updaterFor(fix)),
 *     (status) => { if (status === 'CHANNEL_ERROR') startPolling(); },
 *   );
 *   return () => { supabase.removeChannel(channel); };
 * }, [leagueId]);
 */
export function subscribeFixtureUpdates(
  leagueId: string,
  onUpdate: (fixture: DbFixture) => void,
  onStatus?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`live-fixtures-${leagueId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'fixtures',
        filter: `league_id=eq.${leagueId}`,
      },
      (payload) => {
        const row = payload.new as DbFixture | null;
        if (!row) return;
        onUpdate(row);
      },
    )
    .subscribe((status) => {
      if (onStatus) {
        // Supabase v2 status union covers more values, but we only forward
        // the four documented states. Other states (e.g. 'JOINING') are
        // intermediate and intentionally swallowed.
        if (
          status === 'SUBSCRIBED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          onStatus(status);
        }
      }
    });
  return channel;
}
