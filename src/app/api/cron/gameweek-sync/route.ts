import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================
// Constants
// ============================================

const API_BASE = 'https://v3.football.api-sports.io';
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

// ============================================
// API-Football Response Types
// (duplicated from footballData.ts — that module imports supabaseClient)
// ============================================

type ApiFixtureResponse = {
  response: Array<{
    fixture: { id: number; date: string; status: { short: string } };
    teams: { home: { id: number }; away: { id: number } };
    goals: { home: number | null; away: number | null };
  }>;
};

type ApiFixturePlayerResponse = {
  response: Array<{
    team: { id: number };
    players: Array<{
      player: { id: number };
      statistics: Array<{
        games: { minutes: number | null; rating: string | null };
        goals: {
          total: number | null;
          assists: number | null;
          conceded: number | null;
          saves: number | null;
        };
        cards: { yellow: number | null; red: number | null };
      }>;
    }>;
  }>;
};

// ============================================
// Fantasy Points Calculation
// (duplicated from footballData.ts — same formula as simulate_gameweek RPC)
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
// Step Result Tracking
// ============================================

type StepResult = {
  step: string;
  status: 'success' | 'skipped' | 'error';
  details?: Record<string, unknown>;
  duration_ms: number;
};

// ============================================
// GET /api/cron/gameweek-sync
// ============================================

export async function GET(request: Request) {
  const runStart = Date.now();
  const steps: StepResult[] = [];

  // ---- 1. Auth ----
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- 2. Env validation ----
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const leagueId = parseInt(process.env.NEXT_PUBLIC_LEAGUE_ID || '204', 10);
  const season = parseInt(process.env.NEXT_PUBLIC_SEASON || '2025', 10);

  // ---- Helpers ----

  async function apiFetch<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'x-apisports-key': apiKey! },
    });
    if (!res.ok) throw new Error(`API-Football ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  }

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

  async function runStep<T>(
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
  }

  let activeGw = 1;

  try {
    // ---- 3. Get active gameweek ----
    const { result: gwResult } = await runStep('get_active_gw', async () => {
      const { data: clubs } = await supabaseAdmin
        .from('clubs')
        .select('id, active_gameweek')
        .order('active_gameweek', { ascending: true });

      if (!clubs || clubs.length === 0) throw new Error('No clubs found');

      const minGw = Math.min(
        ...clubs.map((c) => (c.active_gameweek as number) ?? 1),
      );
      const clubsAtGw = clubs.filter(
        (c) => (c.active_gameweek as number) === minGw,
      );
      return { gameweek: minGw, clubs: clubsAtGw };
    });

    if (!gwResult) {
      return NextResponse.json(
        { error: 'Failed to get active gameweek', steps },
        { status: 500 },
      );
    }

    activeGw = gwResult.gameweek;
    const clubsToProcess = gwResult.clubs as Array<{
      id: string;
      active_gameweek: number;
    }>;

    await logStep(activeGw, 'get_active_gw', 'success', {
      gameweek: activeGw,
      clubs: clubsToProcess.length,
    });

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

    if (!fixtureCheck || !fixtureCheck.allDone) {
      const info = fixtureCheck ?? { total: 0, finished: 0 };
      await logStep(activeGw, 'check_fixtures', 'skipped', {
        total: info.total,
        finished: info.finished,
      });
      return NextResponse.json({
        skipped: true,
        gameweek: activeGw,
        reason: `Not all fixtures finished (${info.finished}/${info.total})`,
        steps,
      });
    }

    const apiFixData = fixtureCheck.apiData;
    await logStep(activeGw, 'check_fixtures', 'success', {
      total: fixtureCheck.total,
    });

    // ---- 5. Load DB mappings ----
    const { result: mappings } = await runStep('load_mappings', async () => {
      const [fixtureRes, playerRes, clubRes] = await Promise.all([
        supabaseAdmin
          .from('fixtures')
          .select('id, home_club_id, away_club_id, api_fixture_id')
          .eq('gameweek', activeGw)
          .not('api_fixture_id', 'is', null),
        supabaseAdmin
          .from('players')
          .select('id, api_football_id, position')
          .not('api_football_id', 'is', null),
        supabaseAdmin
          .from('clubs')
          .select('id, api_football_id')
          .not('api_football_id', 'is', null),
      ]);

      if (!fixtureRes.data?.length)
        throw new Error('No mapped fixtures for this gameweek');
      if (!playerRes.data?.length) throw new Error('No mapped players');

      return {
        fixtures: fixtureRes.data as Array<{
          id: string;
          home_club_id: string;
          away_club_id: string;
          api_fixture_id: number;
        }>,
        playerMap: new Map(
          playerRes.data.map((p) => [
            p.api_football_id as number,
            { id: p.id as string, position: p.position as string },
          ]),
        ),
        clubMap: new Map(
          (clubRes.data ?? []).map((c) => [
            c.api_football_id as number,
            c.id as string,
          ]),
        ),
      };
    });

    if (!mappings) {
      await logStep(activeGw, 'load_mappings', 'error');
      return NextResponse.json(
        { error: 'Failed to load mappings', gameweek: activeGw, steps },
        { status: 500 },
      );
    }

    await logStep(activeGw, 'load_mappings', 'success', {
      fixtures: mappings.fixtures.length,
      players: mappings.playerMap.size,
      clubs: mappings.clubMap.size,
    });

    // ---- 6. Fetch player stats + compute fantasy points ----
    const { result: statsResult } = await runStep('fetch_stats', async () => {
      const fixtureResults: Array<{
        fixture_id: string;
        home_score: number;
        away_score: number;
      }> = [];
      const playerStats: Array<{
        fixture_id: string;
        player_id: string;
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
      }> = [];

      for (const fixture of mappings.fixtures) {
        const apiStats = await apiFetch<ApiFixturePlayerResponse>(
          `/fixtures/players?fixture=${fixture.api_fixture_id}`,
        );
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
            const ourPlayer = mappings.playerMap.get(pd.player.id);
            if (!ourPlayer) continue;

            const stat = pd.statistics[0];
            if (!stat) continue;

            const minutes = stat.games.minutes ?? 0;
            if (minutes === 0) continue;

            const goals = stat.goals.total ?? 0;
            const assists = stat.goals.assists ?? 0;
            const goalsConceded = stat.goals.conceded ?? 0;
            const yellowCard = (stat.cards.yellow ?? 0) > 0;
            const redCard = (stat.cards.red ?? 0) > 0;
            const saves = stat.goals.saves ?? 0;

            // API-Football rating as primary source
            const rating = stat.games.rating ? parseFloat(stat.games.rating) : null;
            const fantasyPoints = rating
              ? Math.round(rating * 10)
              : calcFantasyPoints(
                  ourPlayer.position,
                  minutes,
                  goals,
                  assists,
                  isCleanSheet && minutes >= 60,
                  goalsConceded,
                  yellowCard,
                  redCard,
                  saves,
                  0,
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
              rating,
            });
          }
        }
      }

      return { fixtureResults, playerStats };
    });

    if (!statsResult) {
      await logStep(activeGw, 'fetch_stats', 'error');
      return NextResponse.json(
        { error: 'Failed to fetch stats', gameweek: activeGw, steps },
        { status: 500 },
      );
    }

    await logStep(activeGw, 'fetch_stats', 'success', {
      fixtures: statsResult.fixtureResults.length,
      playerStats: statsResult.playerStats.length,
    });

    // ---- 7. Import via RPC ----
    const { result: importResult } = await runStep('import_data', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'cron_process_gameweek',
        {
          p_gameweek: activeGw,
          p_fixture_results: statsResult.fixtureResults,
          p_player_stats: statsResult.playerStats,
        },
      );
      if (error) throw new Error(error.message);
      return data as {
        success: boolean;
        fixtures_imported: number;
        stats_imported: number;
        scores_synced: number;
      };
    });

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

    // ---- 8 & 9. Score events ----
    let eventsScored = 0;
    let eventsClosed = 0;

    await runStep('score_events', async () => {
      for (const club of clubsToProcess) {
        const { data: events } = await supabaseAdmin
          .from('events')
          .select('id, status, scored_at, current_entries')
          .eq('club_id', club.id)
          .eq('gameweek', activeGw);

        for (const evt of events ?? []) {
          if (evt.scored_at) continue; // already scored

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
      return { scored: eventsScored, closed: eventsClosed };
    });

    await logStep(activeGw, 'score_events', 'success', {
      scored: eventsScored,
      closed: eventsClosed,
    });

    // ---- 10. Clone events for next GW ----
    const nextGw = activeGw + 1;
    let nextGwEventsCreated = 0;

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
              'name, type, format, entry_fee, prize_pool, max_entries, club_id, created_by, sponsor_name, sponsor_logo',
            )
            .eq('club_id', club.id)
            .eq('gameweek', activeGw);

          if (!templates || templates.length === 0) continue;

          // Derive timing from next GW fixtures
          const { data: nextFixtures } = await supabaseAdmin
            .from('fixtures')
            .select('played_at')
            .eq('gameweek', nextGw);

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
            gameweek: nextGw,
            entry_fee: t.entry_fee,
            prize_pool: t.prize_pool,
            max_entries: t.max_entries,
            club_id: t.club_id,
            created_by: t.created_by,
            sponsor_name: t.sponsor_name,
            sponsor_logo: t.sponsor_logo,
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

      await logStep(activeGw, 'clone_events', 'success', {
        nextGw,
        created: nextGwEventsCreated,
      });
    }

    // ---- 11. Advance active_gameweek ----
    // Direct UPDATE via supabaseAdmin (bypasses RLS, no auth.uid() needed)
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

    await logStep(activeGw, 'advance_gameweek', 'success', {
      from: activeGw,
      to: nextGw,
    });

    // ---- 12. Recalc perf ----
    const { result: perfResult } = await runStep('recalc_perf', async () => {
      const { data, error } = await supabaseAdmin.rpc('cron_recalc_perf');
      if (error) throw new Error(error.message);
      return data as { success: boolean; updated_count: number };
    });

    await logStep(activeGw, 'recalc_perf', 'success', {
      updated: perfResult?.updated_count ?? 0,
    });

    // ---- Summary ----
    const totalDuration = Date.now() - runStart;
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
        next_gw_events_created: nextGwEventsCreated,
        next_gameweek: nextGw,
      },
      totalDuration,
    );

    return NextResponse.json({
      success: true,
      gameweek: activeGw,
      nextGameweek: nextGw,
      duration_ms: totalDuration,
      fixturesImported: importResult?.fixtures_imported ?? 0,
      statsImported: importResult?.stats_imported ?? 0,
      scoresSynced: importResult?.scores_synced ?? 0,
      eventsScored,
      eventsClosed,
      nextGwEventsCreated,
      steps,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    await logStep(activeGw, 'fatal', 'error', { error: err }, Date.now() - runStart);
    return NextResponse.json(
      { error: err, gameweek: activeGw, steps },
      { status: 500 },
    );
  }
}
