import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  apiFetch,
  getCurrentSeason,
  mapPosition,
  normalizeForMatch,
  deduplicateGhostStarters,
  type ApiFixtureResponse,
  type ApiFixturePlayerResponse,
  type ApiLineupsResponse,
  type ApiLineupPlayer,
  type ApiFixtureEventsResponse,
} from '@/lib/footballApi';

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

// ============================================
// Name-Matching (cron-route specific, uses shared normalizeForMatch)
// ============================================

function nameMatchPlayer(
  apiName: string,
  clubPlayers: Array<{ id: string; first_name: string; last_name: string; position: string; shirt_number?: number | null }>,
  shirtNumber?: number,
): { id: string; position: string } | null {
  const normalized = normalizeForMatch(apiName);
  const parts = normalized.split(/\s+/);
  const apiLast = parts[parts.length - 1];

  let bestMatch: { id: string; position: string } | null = null;
  let bestScore = 0;

  for (const p of clubPlayers) {
    const normFirst = normalizeForMatch(p.first_name);
    const normLast = normalizeForMatch(p.last_name);
    let score = 0;

    // Exact last name match
    if (normLast === apiLast) score += 50;
    // Last name contained in API name
    else if (normalized.includes(normLast) && normLast.length >= 3) score += 35;
    // API last part contained in DB last name
    else if (normLast.includes(apiLast) && apiLast.length >= 3) score += 25;

    // First name bonus
    if (parts.length > 1 && normFirst === parts[0]) score += 30;
    else if (normalized.includes(normFirst) && normFirst.length >= 3) score += 15;

    // Shirt-number bonus (strong signal when shirt numbers match)
    if (shirtNumber != null && p.shirt_number != null && p.shirt_number === shirtNumber) score += 25;

    if (score > bestScore && score >= 40) {
      // Check for ambiguity: if another player already matched at similar score, require higher threshold
      if (bestMatch && bestScore > 0 && score - bestScore < 15) {
        // Close match — both candidates similarly named. Require shirt number or first name to decide.
        continue;
      }
      bestScore = score;
      bestMatch = { id: p.id, position: p.position };
    }
  }

  return bestMatch;
}


// ============================================
// Step Result Tracking
// ============================================

type StepResult = {
  step: string;
  status: 'success' | 'skipped' | 'error';
  details?: Record<string, unknown>;
  duration_ms: number;
};

// ============================================
// Types
// ============================================

type ActiveLeague = {
  id: string;
  short: string;
  apiFootballId: number;
};

type LeagueSyncResult = {
  short: string;
  apiFootballId: number;
  gameweek: number;
  status: 'success' | 'skipped' | 'partial' | 'error';
  reason?: string;
  fixturesImported?: number;
  statsImported?: number;
  scoresSynced?: number;
  eventsScored?: number;
  eventsClosed?: number;
  eventsTransitioned?: number;
  nextGwEventsCreated?: number;
  phase?: 'full' | 'partial';
  newlyProcessed?: number;
  nextGameweek?: number;
  duration_ms: number;
  steps: StepResult[];
  error?: string;
};

// ============================================
// GET /api/cron/gameweek-sync
// ============================================

export async function GET(request: Request) {
  const runStart = Date.now();
  const globalSteps: StepResult[] = [];

  // ---- 1. Auth ----
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- 2. Env validation ----
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  if (!process.env.API_FOOTBALL_KEY && !process.env.NEXT_PUBLIC_API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const season = getCurrentSeason();

  // ---- Helpers (shared between global + per-league scopes) ----

  async function logStep(
    gameweek: number,
    step: string,
    status: string,
    details?: Record<string, unknown>,
    durationMs?: number,
  ) {
    try {
      await supabaseAdmin.from('cron_sync_log').insert({
        gameweek,
        step,
        status,
        details: details ?? null,
        duration_ms: durationMs ?? null,
      });
    } catch {
      /* best-effort logging */
    }
  }

  function makeRunStep(steps: StepResult[]) {
    return async function runStep<T>(
      name: string,
      fn: () => Promise<T>,
    ): Promise<{ result: T | null; error: string | null }> {
      const stepStart = Date.now();
      try {
        const result = await fn();
        steps.push({ step: name, status: 'success', duration_ms: Date.now() - stepStart });
        return { result, error: null };
      } catch (e) {
        const err = e instanceof Error ? e.message : 'Unknown error';
        steps.push({
          step: name,
          status: 'error',
          details: { error: err },
          duration_ms: Date.now() - stepStart,
        });
        return { result: null, error: err };
      }
    };
  }

  const runGlobalStep = makeRunStep(globalSteps);

  try {
    // ============================================
    // GLOBAL STEPS (once per cron run, not per-league)
    // ============================================

    // ---- 2b. Auto-expire IPOs past ends_at ----
    await runGlobalStep('expire_ipos', async () => {
      const { data, error } = await supabaseAdmin
        .from('ipos')
        .update({ status: 'ended' })
        .in('status', ['open', 'early_access'])
        .lt('ends_at', new Date().toISOString())
        .select('id');

      if (error) throw new Error(error.message);
      return { expired: data?.length ?? 0 };
    });

    // ---- 2c. Expire stale offers + release locked funds ----
    await runGlobalStep('expire_pending_offers', async () => {
      const { data, error } = await supabaseAdmin.rpc('expire_pending_offers');
      if (error) throw new Error(error.message);
      return data;
    });

    // ---- 2c2. Expire stale orders ----
    await runGlobalStep('expire_pending_orders', async () => {
      const { data, error } = await supabaseAdmin.rpc('expire_pending_orders');
      if (error) throw new Error(error.message);
      return data;
    });

    // ---- 2d. Daily price_change_24h + volume_24h reset ----
    await runGlobalStep('daily_price_volume_reset', async () => {
      const { data, error } = await supabaseAdmin.rpc('daily_price_volume_reset');
      if (error) throw new Error(error.message);
      return data;
    });

    // ---- 2e. Load active leagues ----
    // SOURCE OF TRUTH: Ligen, die Clubs haben + mapped api_football_id.
    // `leagues.is_active` ist in DB teilweise unset (Migration 20260413180000 → false for 6 neue),
    // daher nutzen wir clubs.league_id als Aktivitaets-Signal.
    const { result: activeLeagues } = await runGlobalStep('load_active_leagues', async () => {
      // 1) DISTINCT league_ids that actually have clubs assigned
      const { data: clubLeagueRows, error: clubErr } = await supabaseAdmin
        .from('clubs')
        .select('league_id')
        .not('league_id', 'is', null);
      if (clubErr) throw new Error(clubErr.message);
      const leagueIds = Array.from(
        new Set((clubLeagueRows ?? []).map((r) => r.league_id as string)),
      );
      if (leagueIds.length === 0) throw new Error('No leagues with clubs');

      // 2) Fetch league metadata (only rows with api_football_id mapped)
      const { data: leagueRows, error: leagueErr } = await supabaseAdmin
        .from('leagues')
        .select('id, short, api_football_id')
        .in('id', leagueIds)
        .not('api_football_id', 'is', null);
      if (leagueErr) throw new Error(leagueErr.message);

      const leagues: ActiveLeague[] = (leagueRows ?? [])
        .map((l) => ({
          id: l.id as string,
          short: l.short as string,
          apiFootballId: l.api_football_id as number,
        }))
        // Sanity: ensure both fields are present
        .filter((l) => l.id && l.short && typeof l.apiFootballId === 'number');

      if (leagues.length === 0) {
        throw new Error('No leagues with api_football_id mapped');
      }

      return leagues;
    });

    if (!activeLeagues || activeLeagues.length === 0) {
      return NextResponse.json(
        { error: 'Failed to load active leagues', steps: globalSteps },
        { status: 500 },
      );
    }

    // ============================================
    // PER-LEAGUE PIPELINE
    // ============================================

    const leagueResults = await Promise.all(
      activeLeagues.map((league) => syncLeague(league, season, logStep, makeRunStep)),
    );

    // ============================================
    // GLOBAL SUMMARY
    // ============================================

    const anySuccess = leagueResults.some(
      (r) => r.status === 'success' || r.status === 'partial',
    );
    const anyError = leagueResults.some((r) => r.status === 'error');

    // Aggregate totals for convenience
    const totalsFixtures = leagueResults.reduce((a, r) => a + (r.fixturesImported ?? 0), 0);
    const totalsStats = leagueResults.reduce((a, r) => a + (r.statsImported ?? 0), 0);
    const totalsScores = leagueResults.reduce((a, r) => a + (r.scoresSynced ?? 0), 0);
    const totalsEventsScored = leagueResults.reduce((a, r) => a + (r.eventsScored ?? 0), 0);
    const totalsEventsClosed = leagueResults.reduce((a, r) => a + (r.eventsClosed ?? 0), 0);
    const totalsNextGwEvents = leagueResults.reduce(
      (a, r) => a + (r.nextGwEventsCreated ?? 0),
      0,
    );

    const totalDuration = Date.now() - runStart;
    await logStep(0, 'cron_complete', 'success', {
      leagues: leagueResults.length,
      any_success: anySuccess,
      any_error: anyError,
      total_duration_ms: totalDuration,
      totals_fixtures: totalsFixtures,
      totals_stats: totalsStats,
      totals_scores: totalsScores,
      totals_events_scored: totalsEventsScored,
      totals_events_closed: totalsEventsClosed,
      totals_next_gw_events: totalsNextGwEvents,
    }, totalDuration);

    return NextResponse.json({
      success: anySuccess,
      leagues: leagueResults,
      totals: {
        fixturesImported: totalsFixtures,
        statsImported: totalsStats,
        scoresSynced: totalsScores,
        eventsScored: totalsEventsScored,
        eventsClosed: totalsEventsClosed,
        nextGwEventsCreated: totalsNextGwEvents,
      },
      duration_ms: totalDuration,
      globalSteps,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    await logStep(0, 'fatal', 'error', { error: err }, Date.now() - runStart);
    return NextResponse.json(
      { error: err, globalSteps },
      { status: 500 },
    );
  }
}

// ============================================
// syncLeague(league) — Per-League Pipeline
// ============================================

async function syncLeague(
  league: ActiveLeague,
  season: number,
  logStepFn: (
    gameweek: number,
    step: string,
    status: string,
    details?: Record<string, unknown>,
    durationMs?: number,
  ) => Promise<void>,
  makeRunStepFn: (steps: StepResult[]) => <T>(
    name: string,
    fn: () => Promise<T>,
  ) => Promise<{ result: T | null; error: string | null }>,
): Promise<LeagueSyncResult> {
  const leagueStart = Date.now();
  const steps: StepResult[] = [];
  const runStep = makeRunStepFn(steps);
  const leagueId = league.apiFootballId;
  const leagueShort = league.short;

  // logStep wrapper to inject league_short into details
  const logStep = (
    gameweek: number,
    step: string,
    status: string,
    details?: Record<string, unknown>,
    durationMs?: number,
  ) =>
    logStepFn(
      gameweek,
      step,
      status,
      { league: leagueShort, ...(details ?? {}) },
      durationMs,
    );

  let activeGw = 1;
  // Slice 071: Phase-A skip flag + hoisted allFixturesDone for fall-through path
  let skipPhaseA = false;
  let allFixturesDone = false;

  // Slice 071: Hoist Phase-A artifacts so post-wrap code (integrity, summary, return)
  // bleibt zugriffsfähig auch wenn Phase A geskipped wurde.
  type PlayerStatRow = {
    fixture_id: string;
    player_id: string | null;
    club_id: string;
    minutes_played: number;
    goals: number;
    assists: number;
    clean_sheet: boolean;
    goals_conceded: number;
    yellow_card: boolean;
    red_card: boolean;
    saves: number;
    bonus: number;
    fantasy_points: number;
    rating: number | null;
    match_position: string | null;
    is_starter: boolean;
    grid_position: string | null;
    api_football_player_id: number;
    player_name_api: string;
  };
  type StatsResult = {
    fixtureResults: Array<{ fixture_id: string; home_score: number; away_score: number }>;
    playerStats: PlayerStatRow[];
    allSubstitutions: Array<{
      fixture_id: string; club_id: string; minute: number; extra_minute: number | null;
      player_in_id: string | null; player_out_id: string | null;
      player_in_api_id: number; player_out_api_id: number;
      player_in_name: string; player_out_name: string;
    }>;
    matchedCount: number;
    unmatchedCount: number;
    nameMatchCount: number;
    shirtBridgeCount: number;
    newExternalIds: Array<{ player_id: string; external_id: number }>;
  };
  let statsResult: StatsResult | null = null;
  let importResult: { success: boolean; fixtures_imported: number; stats_imported: number; scores_synced: number } | null = null;
  let dedupedStats: PlayerStatRow[] = [];
  let ghostsRemoved = 0;
  let fixturesToProcess: Array<{ id: string; home_club_id: string; away_club_id: string; api_fixture_id: number }> = [];

  try {
    // ---- 3. Get active gameweek (per league) ----
    const { result: gwResult } = await runStep('get_active_gw', async () => {
      const { data: clubs } = await supabaseAdmin
        .from('clubs')
        .select('id, active_gameweek')
        .eq('league_id', league.id)
        .order('active_gameweek', { ascending: true });

      if (!clubs || clubs.length === 0) throw new Error(`No clubs for league ${leagueShort}`);

      const minGw = Math.min(
        ...clubs.map((c) => (c.active_gameweek as number) ?? 1),
      );
      const clubsAtGw = clubs.filter(
        (c) => (c.active_gameweek as number) === minGw,
      );
      return { gameweek: minGw, clubs: clubsAtGw };
    });

    if (!gwResult) {
      return {
        short: leagueShort,
        apiFootballId: leagueId,
        gameweek: activeGw,
        status: 'error',
        error: 'Failed to get active gameweek',
        duration_ms: Date.now() - leagueStart,
        steps,
      };
    }

    activeGw = gwResult.gameweek;
    const clubsToProcess = gwResult.clubs as Array<{
      id: string;
      active_gameweek: number;
    }>;

    // Fetch ALL clubs of this league (needed for fixture-scoping — fixtures.gameweek is not
    // globally unique across leagues; scope via home_club_id IN leagueClubIds).
    const { data: allLeagueClubRows } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('league_id', league.id);
    const allLeagueClubIds = (allLeagueClubRows ?? []).map((c) => c.id as string);

    await logStep(activeGw, 'get_active_gw', 'success', {
      gameweek: activeGw,
      clubs: clubsToProcess.length,
      league_clubs_total: allLeagueClubIds.length,
    });

    // ---- 3b. Check for processable fixtures (past played_at OR all already finished) ----
    // SCOPED per-league via home_club_id IN allLeagueClubIds
    const { data: unfinishedFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, played_at')
      .eq('gameweek', activeGw)
      .in('home_club_id', allLeagueClubIds)
      .neq('status', 'finished')
      .limit(1);

    if (!unfinishedFixtures || unfinishedFixtures.length === 0) {
      // All fixtures already 'finished' in DB — check if GW finalization is needed
      const { data: unscoredEvents } = await supabaseAdmin
        .from('events')
        .select('id')
        .in('club_id', clubsToProcess.map(c => c.id))
        .eq('gameweek', activeGw)
        .is('scored_at', null)
        .limit(1);

      if (!unscoredEvents || unscoredEvents.length === 0) {
        await logStep(activeGw, 'already_complete', 'skipped', { reason: 'All fixtures finished, all events scored' });
        return {
          short: leagueShort,
          apiFootballId: leagueId,
          gameweek: activeGw,
          status: 'skipped',
          reason: 'GW already fully processed',
          duration_ms: Date.now() - leagueStart,
          steps,
        };
      }
      // Slice 071: Fixtures done but events not scored → skip Phase A, go to Phase B
      // Saves ~1 API-Call/Liga (the /fixtures?...&round=... probe)
      skipPhaseA = true;
      allFixturesDone = true;
      await logStep(activeGw, 'phase_a_skipped', 'skipped', {
        reason: 'all_fixtures_db_finished_only_scoring',
      });
    } else {
      // There are unfinished fixtures — check if any have played_at in the past
      const { data: pastUnfinished } = await supabaseAdmin
        .from('fixtures')
        .select('id')
        .eq('gameweek', activeGw)
        .in('home_club_id', allLeagueClubIds)
        .neq('status', 'finished')
        .lt('played_at', new Date().toISOString())
        .limit(1);

      if (!pastUnfinished || pastUnfinished.length === 0) {
        // All unfinished fixtures are in the future — nothing to sync
        await logStep(activeGw, 'no_past_fixtures', 'skipped', { reason: 'No fixtures past kickoff yet' });
        return {
          short: leagueShort,
          apiFootballId: leagueId,
          gameweek: activeGw,
          status: 'skipped',
          reason: 'No fixtures past kickoff',
          duration_ms: Date.now() - leagueStart,
          steps,
        };
      }
    }

    // ---- Slice 071: wrap Phase A (lines below) — skip when fall-through case set skipPhaseA ----
    if (!skipPhaseA) {

    // ---- 4. Check API fixtures ----
    const { result: fixtureCheck } = await runStep(
      'check_api_fixtures',
      async () => {
        const apiFixData = await apiFetch<ApiFixtureResponse>(
          `/fixtures?league=${leagueId}&season=${season}&round=Regular Season - ${activeGw}`,
        );

        const total = apiFixData.response.length;
        const finished = apiFixData.response.filter((f) =>
          FINISHED_STATUSES.has(f.fixture.status.short),
        ).length;

        return {
          total,
          finished,
          allDone: total > 0 && total === finished,
          apiData: apiFixData,
        };
      },
    );

    if (!fixtureCheck || fixtureCheck.finished === 0) {
      const info = fixtureCheck ?? { total: 0, finished: 0 };
      await logStep(activeGw, 'check_fixtures', 'skipped', {
        total: info.total,
        finished: info.finished,
      });
      return {
        short: leagueShort,
        apiFootballId: leagueId,
        gameweek: activeGw,
        status: 'skipped',
        reason: `No finished fixtures on API (${info.finished}/${info.total})`,
        duration_ms: Date.now() - leagueStart,
        steps,
      };
    }

    const apiFixData = fixtureCheck.apiData;
    allFixturesDone = fixtureCheck.allDone;
    await logStep(activeGw, 'check_fixtures', 'success', {
      total: fixtureCheck.total,
      finished: fixtureCheck.finished,
      allDone: allFixturesDone,
    });

    // ---- 5. Load DB mappings ----
    // Fixtures + players scoped per-league via home_club_id / club_id IN allLeagueClubIds
    const { result: mappings } = await runStep('load_mappings', async () => {
      const [fixtureRes, extIdRes, playerRes, clubExtRes] = await Promise.all([
        supabaseAdmin
          .from('fixtures')
          .select('id, home_club_id, away_club_id, api_fixture_id')
          .eq('gameweek', activeGw)
          .in('home_club_id', allLeagueClubIds)
          .not('api_fixture_id', 'is', null),
        supabaseAdmin
          .from('player_external_ids')
          .select('player_id, external_id')
          .in('source', ['api_football_squad', 'api_football_fixture']),
        supabaseAdmin
          .from('players')
          .select('id, position, first_name, last_name, club_id, shirt_number')
          .in('club_id', allLeagueClubIds),
        supabaseAdmin
          .from('club_external_ids')
          .select('club_id, external_id')
          .eq('source', 'api_football')
          .in('club_id', allLeagueClubIds),
      ]);

      if (!fixtureRes.data?.length)
        throw new Error(`No mapped fixtures for ${leagueShort} GW${activeGw}`);
      if (!extIdRes.data?.length) throw new Error('No mapped players');

      // Build player position lookup
      const posMap = new Map<string, string>();
      for (const p of playerRes.data ?? []) {
        posMap.set(p.id as string, p.position as string);
      }

      // Build club players map for name matching: clubId → players[]
      type ClubPlayerInfo = { id: string; first_name: string; last_name: string; position: string; shirt_number: number | null };
      const clubPlayersMap = new Map<string, ClubPlayerInfo[]>();
      for (const p of playerRes.data ?? []) {
        const cid = p.club_id as string;
        if (!cid) continue;
        const arr = clubPlayersMap.get(cid) ?? [];
        arr.push({
          id: p.id as string,
          first_name: p.first_name as string,
          last_name: p.last_name as string,
          position: p.position as string,
          shirt_number: (p.shirt_number as number | null) ?? null,
        });
        clubPlayersMap.set(cid, arr);
      }

      // Build shirt-number index: clubId → shirtNumber → player
      const clubPlayersByShirtNumber = new Map<string, Map<number, ClubPlayerInfo>>();
      for (const [cid, players] of Array.from(clubPlayersMap.entries())) {
        const snMap = new Map<number, ClubPlayerInfo>();
        for (const p of players) {
          if (p.shirt_number != null) snMap.set(p.shirt_number, p);
        }
        clubPlayersByShirtNumber.set(cid, snMap);
      }

      return {
        fixtures: fixtureRes.data as Array<{
          id: string;
          home_club_id: string;
          away_club_id: string;
          api_fixture_id: number;
        }>,
        playerMap: (() => {
          const m = new Map<number, { id: string; position: string }>();
          for (const ext of extIdRes.data) {
            const numId = parseInt(ext.external_id as string, 10);
            if (isNaN(numId)) continue;
            m.set(numId, {
              id: ext.player_id as string,
              position: posMap.get(ext.player_id as string) ?? 'MID',
            });
          }
          return m;
        })(),
        clubMap: (() => {
          const m = new Map<number, string>();
          for (const ext of (clubExtRes.data ?? [])) {
            const numId = parseInt(ext.external_id as string, 10);
            if (!isNaN(numId)) m.set(numId, ext.club_id as string);
          }
          return m;
        })(),
        clubPlayersMap,
        clubPlayersByShirtNumber,
      };
    });

    if (!mappings) {
      await logStep(activeGw, 'load_mappings', 'error');
      return {
        short: leagueShort,
        apiFootballId: leagueId,
        gameweek: activeGw,
        status: 'error',
        error: 'Failed to load mappings',
        duration_ms: Date.now() - leagueStart,
        steps,
      };
    }

    await logStep(activeGw, 'load_mappings', 'success', {
      fixtures: mappings.fixtures.length,
      players: mappings.playerMap.size,
      clubs: mappings.clubMap.size,
    });

    // ---- 5b. Identify newly finished fixtures (API=FT, DB!=finished) ----
    // Scoped per-league
    const dbFinishedIds = new Set<string>();
    {
      const { data: alreadyFinished } = await supabaseAdmin
        .from('fixtures')
        .select('id')
        .eq('gameweek', activeGw)
        .in('home_club_id', allLeagueClubIds)
        .eq('status', 'finished');
      for (const f of alreadyFinished ?? []) {
        dbFinishedIds.add(f.id as string);
      }
    }

    const finishedApiFixtureIds = new Set(
      apiFixData.response
        .filter(f => FINISHED_STATUSES.has(f.fixture.status.short))
        .map(f => f.fixture.id)
    );

    const newlyFinishedFixtures = mappings.fixtures.filter(f =>
      !dbFinishedIds.has(f.id) && finishedApiFixtureIds.has(f.api_fixture_id)
    );

    if (newlyFinishedFixtures.length === 0 && !allFixturesDone) {
      // No new fixtures to process and GW not complete — skip gracefully
      await logStep(activeGw, 'no_new_fixtures', 'skipped', { alreadyFinished: dbFinishedIds.size, total: mappings.fixtures.length });
      return {
        short: leagueShort,
        apiFootballId: leagueId,
        gameweek: activeGw,
        status: 'partial',
        reason: `No newly finished fixtures (${dbFinishedIds.size}/${mappings.fixtures.length} already done)`,
        duration_ms: Date.now() - leagueStart,
        steps,
      };
    }

    fixturesToProcess = newlyFinishedFixtures;

    // ---- 6. Fetch lineups + player stats (PlayerStatRow type hoisted for Slice 071) ----

    ({ result: statsResult } = await runStep('fetch_stats', async () => {
      const fixtureResults: Array<{
        fixture_id: string;
        home_score: number;
        away_score: number;
      }> = [];
      const playerStats: PlayerStatRow[] = [];
      const allSubstitutions: Array<{
        fixture_id: string;
        club_id: string;
        minute: number;
        extra_minute: number | null;
        player_in_id: string | null;
        player_out_id: string | null;
        player_in_api_id: number;
        player_out_api_id: number;
        player_in_name: string;
        player_out_name: string;
      }> = [];
      let matchedCount = 0;
      let unmatchedCount = 0;
      let nameMatchCount = 0;
      let shirtBridgeCount = 0;
      const newExternalIds: Array<{ player_id: string; external_id: number }> = [];

      for (const fixture of fixturesToProcess) {
        // Fetch lineups, player stats, and events in parallel
        const [lineupsData, apiStats, eventsData] = await Promise.all([
          apiFetch<ApiLineupsResponse>(
            `/fixtures/lineups?fixture=${fixture.api_fixture_id}`,
          ).catch(() => ({ response: [] as ApiLineupsResponse['response'] })),
          apiFetch<ApiFixturePlayerResponse>(
            `/fixtures/players?fixture=${fixture.api_fixture_id}`,
          ),
          apiFetch<ApiFixtureEventsResponse>(
            `/fixtures/events?fixture=${fixture.api_fixture_id}`,
          ).catch(() => ({ response: [] as ApiFixtureEventsResponse['response'] })),
        ]);

        const apiMatch = apiFixData.response.find(
          (f) => f.fixture.id === fixture.api_fixture_id,
        );

        // Collect fixture score
        if (
          apiMatch &&
          apiMatch.goals.home != null &&
          apiMatch.goals.away != null
        ) {
          fixtureResults.push({
            fixture_id: fixture.id,
            home_score: apiMatch.goals.home,
            away_score: apiMatch.goals.away,
          });
        }

        // Build lineup map: apiPlayerId → {isStarter, gridPosition, name}
        // Also build name-based maps for cross-referencing (handles dual-ID mismatches)
        type LineupInfo = { isStarter: boolean; gridPosition: string | null; name: string; apiId: number; shirtNumber: number };
        const lineupMap = new Map<number, LineupInfo>();
        const lineupByName = new Map<string, LineupInfo>();
        // Fuzzy: last-name only map (value = info if unique, null if ambiguous)
        const lineupByLastName = new Map<string, LineupInfo | null>();
        // Shirt-number map for cross-referencing
        const lineupByShirtNumber = new Map<number, LineupInfo>();

        // Store formations on fixture
        const formationUpdates: Record<string, string> = {};

        for (const teamLineup of lineupsData.response) {
          const clubId = mappings.clubMap.get(teamLineup.team.id);
          if (!clubId) continue;

          if (teamLineup.formation) {
            if (clubId === fixture.home_club_id) formationUpdates.home_formation = teamLineup.formation;
            if (clubId === fixture.away_club_id) formationUpdates.away_formation = teamLineup.formation;
          }

          const addToLineupMaps = (entry: { player: ApiLineupPlayer }, info: LineupInfo) => {
            lineupMap.set(entry.player.id, info);
            lineupByName.set(normalizeForMatch(entry.player.name), info);
            // Fuzzy last-name index (null = ambiguous if multiple players share last name)
            const parts = normalizeForMatch(entry.player.name).split(/\s+/);
            const last = parts[parts.length - 1];
            if (last && last.length >= 3) {
              lineupByLastName.set(last, lineupByLastName.has(last) ? null : info);
            }
            // Shirt-number index (overwrite if duplicate — rare edge case)
            if (info.shirtNumber > 0) {
              lineupByShirtNumber.set(info.shirtNumber, info);
            }
          };

          for (const entry of teamLineup.startXI ?? []) {
            addToLineupMaps(entry, {
              isStarter: true,
              gridPosition: entry.player.grid,
              name: entry.player.name,
              apiId: entry.player.id,
              shirtNumber: entry.player.number,
            });
          }
          for (const entry of teamLineup.substitutes ?? []) {
            addToLineupMaps(entry, {
              isStarter: false,
              gridPosition: null,
              name: entry.player.name,
              apiId: entry.player.id,
              shirtNumber: entry.player.number,
            });
          }
        }

        // Save formations
        if (Object.keys(formationUpdates).length > 0) {
          await supabaseAdmin
            .from('fixtures')
            .update(formationUpdates)
            .eq('id', fixture.id);
        }

        // Track which API player IDs we've already processed (from stats)
        const processedApiIds = new Set<number>();

        // Process player stats from both teams
        for (const teamData of apiStats.response) {
          const clubId = mappings.clubMap.get(teamData.team.id);
          if (!clubId) continue;

          const isHome = fixture.home_club_id === clubId;
          const goalsAgainst = apiMatch
            ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
            : 0;
          const isCleanSheet = goalsAgainst === 0;

          for (const pd of teamData.players) {
            const apiPlayerId = pd.player.id;
            processedApiIds.add(apiPlayerId);

            const stat = pd.statistics[0];
            if (!stat) continue;

            const matchPosition = stat.games.position ? mapPosition(stat.games.position) : null;
            const minutes = stat.games.minutes ?? 0;
            // Resolution order: 1) Direct API-ID  2) Shirt-Number Bridge  3) Name fallback
            let lineupInfo = lineupMap.get(apiPlayerId);
            let bridgeMethod: 'direct' | 'shirt_bridge' | 'name' | null = lineupInfo ? 'direct' : null;

            // 2) Shirt-Number Bridge: stats-player → DB player → shirt_number → lineup
            if (!lineupInfo && clubId) {
              const clubPlayers = mappings.clubPlayersMap.get(clubId);
              if (clubPlayers) {
                const dbMatch = nameMatchPlayer(pd.player.name ?? '', clubPlayers, undefined);
                if (dbMatch) {
                  const snMap = mappings.clubPlayersByShirtNumber.get(clubId);
                  const dbPlayer = clubPlayers.find(cp => cp.id === dbMatch.id);
                  if (dbPlayer?.shirt_number != null && snMap) {
                    const byShirt = lineupByShirtNumber.get(dbPlayer.shirt_number);
                    if (byShirt) {
                      lineupInfo = byShirt;
                      bridgeMethod = 'shirt_bridge';
                      shirtBridgeCount++;
                      console.warn(`[SHIRT_BRIDGE] ${pd.player.name}(${apiPlayerId}) → ${byShirt.name}(${byShirt.apiId}) via #${dbPlayer.shirt_number}`);
                    }
                  }
                }
              }
            }

            // 3) Name fallback: exact name → fuzzy last-name → shirt-number fallback
            if (!lineupInfo && pd.player.name) {
              const normalizedName = normalizeForMatch(pd.player.name);
              lineupInfo = lineupByName.get(normalizedName) ?? undefined;
              if (!lineupInfo) {
                const parts = normalizedName.split(/\s+/);
                const last = parts[parts.length - 1];
                if (last && last.length >= 3) {
                  const lastNameMatch = lineupByLastName.get(last);
                  if (lastNameMatch === null) {
                    // Ambiguous (multiple players share last name) — try shirt number as tiebreaker
                    const dbMatch = mappings.clubPlayersMap.get(clubId)
                      ? nameMatchPlayer(pd.player.name ?? '', mappings.clubPlayersMap.get(clubId)!, undefined)
                      : null;
                    const sn = dbMatch ? mappings.clubPlayersMap.get(clubId)?.find(cp => cp.id === dbMatch.id)?.shirt_number : undefined;
                    if (sn != null && lineupByShirtNumber.has(sn)) {
                      lineupInfo = lineupByShirtNumber.get(sn) ?? undefined;
                      if (lineupInfo) console.info(`[NAME_DISAMBIG] "${pd.player.name}" ambiguous last-name "${last}" → resolved via shirt #${sn}`);
                    } else {
                      console.warn(`[NAME_AMBIG] "${pd.player.name}" matches multiple lineup entries for last-name "${last}" — cannot resolve, defaulting to bench`);
                    }
                  } else if (lastNameMatch) {
                    lineupInfo = lastNameMatch;
                  }
                }
              }
              if (lineupInfo) bridgeMethod = 'name';
            }

            // If cross-referenced (not direct), mark lineup API ID as processed to prevent ghost duplicates
            if (lineupInfo && lineupInfo.apiId !== apiPlayerId) {
              processedApiIds.add(lineupInfo.apiId);
            }
            const isStarter = lineupInfo?.isStarter ?? false;
            const gridPosition = lineupInfo?.gridPosition ?? null;

            // Skip bench players with 0 minutes who are NOT in the lineup
            if (minutes === 0 && !lineupInfo) continue;

            // Try to match player: 1) Dual-ID lookup 2) Name match (with shirt bonus) 3) null
            let ourPlayer = mappings.playerMap.get(apiPlayerId);
            const apiPlayerName = lineupInfo?.name ?? pd.player.name ?? `Player ${apiPlayerId}`;

            if (!ourPlayer) {
              // Try name matching within the club squad (pass shirt number for bonus scoring)
              const clubPlayers = mappings.clubPlayersMap.get(clubId);
              if (clubPlayers) {
                const sn = lineupInfo?.shirtNumber ?? undefined;
                ourPlayer = nameMatchPlayer(apiPlayerName, clubPlayers, sn) ?? undefined;
                if (ourPlayer) nameMatchCount++;
              }
            }

            // Auto-reconcile: if matched by name/shirt but API ID differs from known external IDs
            if (ourPlayer && !mappings.playerMap.has(apiPlayerId)) {
              newExternalIds.push({ player_id: ourPlayer.id, external_id: apiPlayerId });
            }

            if (ourPlayer) matchedCount++;
            else unmatchedCount++;

            const position = ourPlayer?.position ?? (matchPosition || 'MID');
            const goals = stat.goals.total ?? 0;
            const assists = stat.goals.assists ?? 0;
            const goalsConceded = stat.goals.conceded ?? 0;
            const yellowCard = (stat.cards.yellow ?? 0) > 0;
            const redCard = (stat.cards.red ?? 0) > 0;
            const saves = stat.goals.saves ?? 0;

            // API rating × 10 = BeScout score (0-100). Null if API provides no rating.
            const apiRating = stat.games.rating ? parseFloat(stat.games.rating) : null;
            const fantasyPoints = apiRating != null ? Math.round(apiRating * 10) : null;

            playerStats.push({
              fixture_id: fixture.id,
              player_id: ourPlayer?.id ?? null,
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
              fantasy_points: fantasyPoints ?? 0,
              rating: apiRating,
              match_position: matchPosition,
              is_starter: isStarter,
              grid_position: gridPosition,
              api_football_player_id: apiPlayerId,
              player_name_api: apiPlayerName,
            });
          }
        }

        // Add lineup players who had NO stats entry (e.g. unused subs)
        for (const teamLineup of lineupsData.response) {
          const clubId = mappings.clubMap.get(teamLineup.team.id);
          if (!clubId) continue;

          const isHome = fixture.home_club_id === clubId;
          const goalsAgainst = apiMatch
            ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
            : 0;
          const isCleanSheet = goalsAgainst === 0;

          const allLineupPlayers = [
            ...(teamLineup.startXI ?? []).map(e => ({ ...e, isStarter: true })),
            ...(teamLineup.substitutes ?? []).map(e => ({ ...e, isStarter: false })),
          ];

          for (const entry of allLineupPlayers) {
            if (processedApiIds.has(entry.player.id)) continue;
            processedApiIds.add(entry.player.id);

            let ourPlayer = mappings.playerMap.get(entry.player.id);
            if (!ourPlayer) {
              const clubPlayers = mappings.clubPlayersMap.get(clubId);
              if (clubPlayers) {
                ourPlayer = nameMatchPlayer(entry.player.name, clubPlayers, entry.player.number) ?? undefined;
                if (ourPlayer) nameMatchCount++;
              }
            }

            // Auto-reconcile: persist newly discovered fixture API IDs
            if (ourPlayer && !mappings.playerMap.has(entry.player.id)) {
              newExternalIds.push({ player_id: ourPlayer.id, external_id: entry.player.id });
            }

            if (ourPlayer) matchedCount++;
            else unmatchedCount++;

            playerStats.push({
              fixture_id: fixture.id,
              player_id: ourPlayer?.id ?? null,
              club_id: clubId,
              minutes_played: 0,
              goals: 0,
              assists: 0,
              clean_sheet: isCleanSheet,
              goals_conceded: 0,
              yellow_card: false,
              red_card: false,
              saves: 0,
              bonus: 0,
              fantasy_points: 0,
              rating: null,
              match_position: entry.player.pos ? mapPosition(entry.player.pos) : null,
              is_starter: entry.isStarter,
              grid_position: entry.isStarter ? entry.player.grid : null,
              api_football_player_id: entry.player.id,
              player_name_api: entry.player.name,
            });
          }
        }

        // Process substitution events
        for (const evt of eventsData.response) {
          if (evt.type !== 'subst') continue;
          if (evt.time?.elapsed == null) continue;
          if (!evt.player?.id || !evt.assist?.id) continue;
          const clubId = mappings.clubMap.get(evt.team.id);
          if (!clubId) continue;

          // In API-Football subst events: player = OUT, assist = IN
          const playerOutApiId = evt.player.id;
          const playerInApiId = evt.assist.id;

          const playerOut = mappings.playerMap.get(playerOutApiId);
          const playerIn = mappings.playerMap.get(playerInApiId);

          allSubstitutions.push({
            fixture_id: fixture.id,
            club_id: clubId,
            minute: evt.time.elapsed,
            extra_minute: evt.time.extra,
            player_in_id: playerIn?.id ?? null,
            player_out_id: playerOut?.id ?? null,
            player_in_api_id: playerInApiId,
            player_out_api_id: playerOutApiId,
            player_in_name: evt.assist.name ?? `Player ${playerInApiId}`,
            player_out_name: evt.player.name ?? `Player ${playerOutApiId}`,
          });
        }
      }

      return { fixtureResults, playerStats, allSubstitutions, matchedCount, unmatchedCount, nameMatchCount, shirtBridgeCount, newExternalIds };
    }));

    if (!statsResult) {
      await logStep(activeGw, 'fetch_stats', 'error');
      return {
        short: leagueShort,
        apiFootballId: leagueId,
        gameweek: activeGw,
        status: 'error',
        error: 'Failed to fetch stats',
        duration_ms: Date.now() - leagueStart,
        steps,
      };
    }

    // Structural dedup: remove ghost starters (dual-ID entries with 0 min, null rating)
    // Uses the football rule that a team has exactly 11 starters — catches ALL edge cases
    dedupedStats = deduplicateGhostStarters(statsResult.playerStats);
    ghostsRemoved = statsResult.playerStats.length - dedupedStats.length;

    await logStep(activeGw, 'fetch_stats', 'success', {
      fixtures: statsResult.fixtureResults.length,
      playerStats: dedupedStats.length,
      matched: statsResult.matchedCount,
      unmatched: statsResult.unmatchedCount,
      nameMatched: statsResult.nameMatchCount,
      shirtBridged: statsResult.shirtBridgeCount,
      ghostsRemoved,
    });

    // ---- 7. Import via RPC ----
    ({ result: importResult } = await runStep('import_data', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'cron_process_gameweek',
        {
          p_gameweek: activeGw,
          p_fixture_results: statsResult!.fixtureResults,
          p_player_stats: dedupedStats,
        },
      );
      if (error) throw new Error(error.message);
      return data as {
        success: boolean;
        fixtures_imported: number;
        stats_imported: number;
        scores_synced: number;
      };
    }));

    await logStep(
      activeGw,
      'import_data',
      importResult ? 'success' : 'error',
      importResult
        ? {
            fixtures: importResult.fixtures_imported,
            stats: importResult.stats_imported,
            scores: importResult.scores_synced,
          }
        : undefined,
    );

    // ---- 7b. Save substitution events ----
    if (statsResult.allSubstitutions.length > 0) {
      const subs = statsResult.allSubstitutions; // local non-null capture for closure
      await runStep('save_substitutions', async () => {
        const { error: subErr } = await supabaseAdmin
          .from('fixture_substitutions')
          .upsert(subs, {
            onConflict: 'fixture_id,club_id,minute,player_in_api_id',
          });
        if (subErr) throw new Error(subErr.message);
        return { saved: subs.length };
      });

      await logStep(activeGw, 'save_substitutions', 'success', {
        count: statsResult.allSubstitutions.length,
      });
    }

    // ---- 7c. Auto-reconcile: persist newly discovered fixture API IDs ----
    if (statsResult.newExternalIds.length > 0) {
      // Deduplicate by player_id (keep first occurrence)
      const seen = new Set<string>();
      const uniqueIds = statsResult.newExternalIds.filter(e => {
        if (seen.has(e.player_id)) return false;
        seen.add(e.player_id);
        return true;
      });

      const { error: reconcileErr } = await supabaseAdmin
        .from('player_external_ids')
        .upsert(
          uniqueIds.map(e => ({
            player_id: e.player_id,
            source: 'api_football_fixture',
            external_id: String(e.external_id),
          })),
          { onConflict: 'player_id,source' },
        );

      if (reconcileErr) {
        console.error(`[AUTO-RECONCILE] Error: ${reconcileErr.message}`);
      }

      await logStep(activeGw, 'auto_reconcile', reconcileErr ? 'error' : 'success', {
        persisted: uniqueIds.length,
        error: reconcileErr?.message,
      });
    }

    if (!allFixturesDone) {
      steps.push({ step: 'phase_b_skipped', status: 'skipped', details: { reason: `${fixtureCheck.finished}/${fixtureCheck.total} finished`, newlyProcessed: fixturesToProcess.length }, duration_ms: 0 });
      await logStep(activeGw, 'phase_b_skipped', 'skipped', {
        finished: fixtureCheck.finished,
        total: fixtureCheck.total,
        newlyProcessed: fixturesToProcess.length,
      });
    }

    } // ---- Slice 071: end of Phase-A wrap ----

    // ============================================
    // PHASE B: GW Finalization (only when ALL fixtures done)
    // ============================================
    let eventsScored = 0;
    let eventsClosed = 0;
    let eventsTransitioned = 0;
    const nextGw = activeGw + 1;
    let nextGwEventsCreated = 0;

    if (allFixturesDone) {
    // ---- 8 & 9. Score events ----

    await runStep('score_events', async () => {
      // Score-coverage guard: skip auto-scoring if no real player data exists
      // (prevents meaningless default-40 scores when API-Football is unavailable)
      // Scoped per-league via player_id IN leaguePlayerIds
      // Get all player IDs for this league first
      const { data: leaguePlayers } = await supabaseAdmin
        .from('players')
        .select('id')
        .in('club_id', allLeagueClubIds);
      const leaguePlayerIds = (leaguePlayers ?? []).map((p) => p.id as string);

      const { count: gwScoreCount } =
        leaguePlayerIds.length > 0
          ? await supabaseAdmin
              .from('player_gameweek_scores')
              .select('*', { count: 'exact', head: true })
              .eq('gameweek', activeGw)
              .in('player_id', leaguePlayerIds)
          : { count: 0 };

      if ((gwScoreCount ?? 0) < 50) {
        console.warn(`[GW-SYNC] [${leagueShort}] Skipping auto-score: only ${gwScoreCount ?? 0} player scores for GW${activeGw} (need ≥50)`);
        return { scored: 0, closed: 0, transitioned: 0, skipped_reason: 'insufficient_scores' };
      }

      // BUG-004 Guard: check if ANY fixture in this GW has actually started
      // Scoped per-league
      const { data: gwFixtures } = await supabaseAdmin
        .from('fixtures')
        .select('status')
        .eq('gameweek', activeGw)
        .in('home_club_id', allLeagueClubIds);
      const hasStartedFixtures = gwFixtures?.some(f => f.status !== 'scheduled') ?? false;

      for (const club of clubsToProcess) {
        const { data: events } = await supabaseAdmin
          .from('events')
          .select('id, status, scored_at, current_entries, locks_at')
          .eq('club_id', club.id)
          .eq('gameweek', activeGw);

        for (const evt of events ?? []) {
          if (evt.scored_at) continue; // already scored

          // Transition registering/late-reg → running before scoring
          // Guard 1: only transition if locks_at has actually passed
          // Guard 2 (BUG-004): only transition if at least one fixture has started
          if (evt.status === 'registering' || evt.status === 'late-reg') {
            if (evt.locks_at && new Date(evt.locks_at) > new Date()) {
              // locks_at not passed yet — keep event open for registration
              continue;
            }
            if (!hasStartedFixtures) {
              // No fixtures have kicked off yet — don't transition to running
              continue;
            }
            await supabaseAdmin
              .from('events')
              .update({ status: 'running' })
              .eq('id', evt.id);
            eventsTransitioned++;
          }

          if ((evt.current_entries ?? 0) === 0) {
            // No entries — close directly
            const { error } = await supabaseAdmin
              .from('events')
              .update({
                status: 'ended',
                scored_at: new Date().toISOString(),
              })
              .eq('id', evt.id);
            if (!error) eventsClosed++;
          } else {
            // Has entries — score via RPC (score_event handles NULL auth.uid())
            const { data, error } = await supabaseAdmin.rpc('score_event', {
              p_event_id: evt.id,
            });
            const result = data as {
              success: boolean;
              error?: string;
            } | null;
            if (!error && result?.success) eventsScored++;
          }
        }
      }
      return { scored: eventsScored, closed: eventsClosed, transitioned: eventsTransitioned };
    });

    await logStep(activeGw, 'score_events', eventsScored + eventsClosed > 0 ? 'success' : 'skipped', {
      scored: eventsScored,
      closed: eventsClosed,
      transitioned: eventsTransitioned,
    });

    // ---- 9a. Recalculate fan rankings for scored event participants ----
    if (eventsScored > 0) {
      await runStep('fan_rank_update', async () => {
        let ranksUpdated = 0;
        for (const club of clubsToProcess) {
          // Get all scored events for this GW
          const { data: scoredEvents } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('club_id', club.id)
            .eq('gameweek', activeGw)
            .not('scored_at', 'is', null);

          if (!scoredEvents || scoredEvents.length === 0) continue;

          // Get unique participants across all scored events
          const eventIds = scoredEvents.map(e => e.id);
          const { data: lineups } = await supabaseAdmin
            .from('lineups')
            .select('user_id')
            .in('event_id', eventIds);

          const uniqueUsers = Array.from(new Set((lineups ?? []).map(l => l.user_id)));

          // Recalculate fan rank for each participant
          for (const uid of uniqueUsers) {
            const { error } = await supabaseAdmin.rpc('calculate_fan_rank', {
              p_user_id: uid,
              p_club_id: club.id,
            });
            if (!error) ranksUpdated++;
          }
        }
        return { ranksUpdated };
      });

      // logStep is handled by runStep — omit duplicate unconditional log
    }

    // ---- 9b. Resolve predictions ----
    // RPC supports service_role via v_is_service_role JWT check (migration 20260314).
    const { result: predResult } = await runStep('resolve_predictions', async () => {
      const { data, error } = await supabaseAdmin.rpc('resolve_gameweek_predictions', {
        p_gameweek: activeGw,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok: boolean; resolved?: number; correct?: number; wrong?: number; error?: string } | null;
      if (!result?.ok) throw new Error(result?.error ?? 'resolve_predictions failed');
      return { resolved: result.resolved, correct: result.correct, wrong: result.wrong };
    });

    await logStep(activeGw, 'resolve_predictions', predResult ? 'success' : 'error', predResult ?? { error: 'resolve_predictions failed' });

    // ---- 9c. SC of the Week ----
    // RPC supports service_role via v_is_service_role JWT check (migration 20260314).
    const { result: dpcResult } = await runStep('sc_of_week', async () => {
      const { data, error } = await supabaseAdmin.rpc('calculate_sc_of_week', {
        p_gameweek: activeGw,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; player_id?: string; error?: string } | null;
      if (!result?.success) throw new Error(result?.error ?? 'dpc_of_week failed');
      return { playerId: result.player_id };
    });

    await logStep(activeGw, 'dpc_of_week', dpcResult ? 'success' : 'error', dpcResult ?? { error: 'dpc_of_week failed' });

    // ---- 10. Clone events for next GW ----
    if (nextGw <= 38) {
      await runStep('clone_events', async () => {
        for (const club of clubsToProcess) {
          // Idempotency check
          const { data: existing } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('club_id', club.id)
            .eq('gameweek', nextGw)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Load current GW events as templates
          const { data: templates } = await supabaseAdmin
            .from('events')
            .select(
              'name, type, format, lineup_size, entry_fee, prize_pool, max_entries, club_id, created_by, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap, is_liga_event',
            )
            .eq('club_id', club.id)
            .eq('gameweek', activeGw);

          if (!templates || templates.length === 0) continue;

          // Derive timing from next GW fixtures (scoped per-league)
          const { data: nextFixtures } = await supabaseAdmin
            .from('fixtures')
            .select('played_at')
            .eq('gameweek', nextGw)
            .in('home_club_id', allLeagueClubIds);

          let startsAt: string;
          let locksAt: string;
          let endsAt: string;

          const fixturesWithTime = (nextFixtures ?? []).filter(
            (f: { played_at: string | null }) => f.played_at,
          );

          if (fixturesWithTime.length > 0) {
            const times = fixturesWithTime.map(
              (f: { played_at: string | null }) =>
                new Date(f.played_at!).getTime(),
            );
            const earliest = Math.min(...times);
            const latest = Math.max(...times);
            startsAt = new Date(earliest).toISOString();
            locksAt = new Date(earliest).toISOString();
            endsAt = new Date(latest + 3 * 60 * 60 * 1000).toISOString();
          } else {
            const farFuture = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString();
            startsAt = farFuture;
            locksAt = farFuture;
            endsAt = farFuture;
          }

          const clones = templates.map((t: Record<string, unknown>) => ({
            name: (t.name as string)
              .replace(/Spieltag \d+/i, `Spieltag ${nextGw}`)
              .replace(/GW\s*\d+/i, `GW ${nextGw}`),
            type: t.type,
            format: t.format,
            lineup_size: t.lineup_size ?? ((t.format as string) === '11er' ? 11 : 7),
            gameweek: nextGw,
            entry_fee: t.entry_fee,
            prize_pool: t.prize_pool,
            max_entries: t.max_entries,
            club_id: t.club_id,
            created_by: t.created_by,
            sponsor_name: t.sponsor_name,
            sponsor_logo: t.sponsor_logo,
            event_tier: t.event_tier,
            tier_bonuses: t.tier_bonuses,
            min_tier: t.min_tier,
            min_subscription_tier: t.min_subscription_tier,
            salary_cap: t.salary_cap,
            is_liga_event: t.is_liga_event ?? false,
            starts_at: startsAt,
            locks_at: locksAt,
            ends_at: endsAt,
            status: 'registering',
            current_entries: 0,
          }));

          const { error } = await supabaseAdmin.from('events').insert(clones);
          if (!error) nextGwEventsCreated += clones.length;
        }
        return { created: nextGwEventsCreated };
      });

      await logStep(activeGw, 'clone_events', nextGwEventsCreated > 0 ? 'success' : 'skipped', {
        nextGw,
        created: nextGwEventsCreated,
      });
    }

    // ---- 11. Advance active_gameweek ----
    // Direct UPDATE via supabaseAdmin (bypasses RLS, no auth.uid() needed)
    // Guard: never advance beyond GW 38
    if (nextGw <= 38) {
      await runStep('advance_gameweek', async () => {
        for (const club of clubsToProcess) {
          const { error } = await supabaseAdmin
            .from('clubs')
            .update({ active_gameweek: nextGw })
            .eq('id', club.id);
          if (error) throw new Error(`Club ${club.id}: ${error.message}`);
        }
        return { from: activeGw, to: nextGw };
      });
    } else {
      steps.push({ step: 'advance_gameweek', status: 'skipped', duration_ms: 0 });
    }

    // logStep for advance_gameweek is tracked via runStep's steps array

    // ---- 12. Recalc perf ----
    const { result: perfResult } = await runStep('recalc_perf', async () => {
      const { data, error } = await supabaseAdmin.rpc('cron_recalc_perf');
      if (error) throw new Error(error.message);
      return data as { success: boolean; perf_updated: number; agg_updated: number };
    });

    await logStep(activeGw, 'recalc_perf', perfResult ? 'success' : 'error', {
      perf_updated: perfResult?.perf_updated ?? 0,
      agg_updated: perfResult?.agg_updated ?? 0,
    });

    } // END Phase B (allFixturesDone)

    // ---- 13. Sync player activity status (per-league) ----
    // Scoped: nur Players dieser Liga, currentGw aus Liga-fixtures
    const { result: statusResult } = await runStep('sync_activity_status', async () => {
      // Get current max finished GW for THIS league
      const { data: maxGwData } = await supabaseAdmin
        .from('fixtures')
        .select('gameweek')
        .in('status', ['FT', 'finished', 'simulated'])
        .in('home_club_id', allLeagueClubIds)
        .order('gameweek', { ascending: false })
        .limit(1)
        .maybeSingle();

      const currentGw = maxGwData?.gameweek ?? 0;
      if (currentGw === 0) return { marked_doubtful: 0, reactivated: 0, current_gw: 0 };

      // Players who haven't appeared in 5+ GWs but are still 'fit' -> mark as 'doubtful'
      // Scoped to this league via club_id
      const { data: updated, error } = await supabaseAdmin
        .from('players')
        .update({ status: 'doubtful' })
        .eq('status', 'fit')
        .in('club_id', allLeagueClubIds)
        .lt('last_appearance_gw', currentGw - 5)
        .gt('matches', 0)  // only players who DID play at some point
        .select('id');

      if (error) throw new Error(error.message);

      // Players who DID appear in the latest GW but aren't 'fit' -> set back to 'fit'
      // Scoped to this league via club_id
      const { data: reactivated, error: err2 } = await supabaseAdmin
        .from('players')
        .update({ status: 'fit' })
        .neq('status', 'fit')
        .in('club_id', allLeagueClubIds)
        .gte('last_appearance_gw', currentGw - 2)  // appeared in last 2 GWs
        .select('id');

      if (err2) throw new Error(err2.message);

      return {
        marked_doubtful: updated?.length ?? 0,
        reactivated: reactivated?.length ?? 0,
        current_gw: currentGw,
      };
    });

    await logStep(activeGw, 'sync_activity_status', statusResult ? 'success' : 'error', {
      marked_doubtful: statusResult?.marked_doubtful ?? 0,
      reactivated: statusResult?.reactivated ?? 0,
    });

    // ---- Integrity Validation ----
    if (statsResult) {
      console.warn(`[INTEGRITY] [${leagueShort}] GW${activeGw} Match Distribution: direct=${statsResult.matchedCount - statsResult.nameMatchCount - statsResult.shirtBridgeCount}, shirt_bridge=${statsResult.shirtBridgeCount}, name=${statsResult.nameMatchCount}, unmatched=${statsResult.unmatchedCount}, ghosts_removed=${ghostsRemoved}`);

      if (statsResult.unmatchedCount > 0) {
        const nullPlayerStats = dedupedStats.filter(s => s.player_id === null);
        console.warn(`[INTEGRITY] [${leagueShort}] ${nullPlayerStats.length} stats with null player_id (unmatched players)`);
      }
    }

    // ---- Summary ----
    const totalDuration = Date.now() - leagueStart;
    await logStep(
      activeGw,
      'complete',
      'success',
      {
        total_duration_ms: totalDuration,
        fixtures_imported: importResult?.fixtures_imported ?? 0,
        stats_imported: importResult?.stats_imported ?? 0,
        scores_synced: importResult?.scores_synced ?? 0,
        events_scored: eventsScored,
        events_closed: eventsClosed,
        events_transitioned: eventsTransitioned,
        next_gw_events_created: nextGwEventsCreated,
        next_gameweek: nextGw,
      },
      totalDuration,
    );

    return {
      short: leagueShort,
      apiFootballId: leagueId,
      gameweek: activeGw,
      status: 'success',
      phase: allFixturesDone ? 'full' : 'partial',
      newlyProcessed: fixturesToProcess.length,
      nextGameweek: allFixturesDone ? nextGw : activeGw,
      duration_ms: totalDuration,
      fixturesImported: importResult?.fixtures_imported ?? 0,
      statsImported: importResult?.stats_imported ?? 0,
      scoresSynced: importResult?.scores_synced ?? 0,
      eventsScored,
      eventsClosed,
      eventsTransitioned,
      nextGwEventsCreated,
      steps,
    };
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[cron] League ${leagueShort} failed:`, err);
    await logStep(activeGw, 'fatal', 'error', { error: err }, Date.now() - leagueStart);
    return {
      short: leagueShort,
      apiFootballId: leagueId,
      gameweek: activeGw,
      status: 'error',
      error: err,
      duration_ms: Date.now() - leagueStart,
      steps,
    };
  }
}
