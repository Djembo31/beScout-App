import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withLogger } from '@/lib/observability/apiLogger';
import { logSilentCatch } from '@/lib/observability/silentRejects';
import { apiFetch, type ApiFixtureLive } from '@/lib/footballApi';

/**
 * Slice 267 — Live-Score Cron (Layer 2 of 3-layer architecture).
 *
 * Runs every minute (Vercel Pro `* * * * *`). Pulls live fixtures from
 * API-Football (`/fixtures?live=<league-ids-pipe>`), maps API-status to
 * our internal `FixtureStatus` enum, and UPDATEs the `fixtures` table.
 *
 * Realtime broadcast happens automatically via Postgres Logical Replication
 * (REPLICA IDENTITY FULL + supabase_realtime publication, set up by
 * `20260503120000_slice_267_fixtures_realtime.sql`).
 *
 * Architecture decisions (CEO-approved 2026-05-02):
 *   Q1 — Vercel Cron sub-minute (Pro-Plan-confirmed, context7-verified)
 *   Q2 — C-Adaptive: skip API-call when DB has no live-window
 *        (saves API-Football quota during off-windows)
 *   Q3 — A API-Confirm: status transitions from `scheduled → live → finished`
 *        only when API-Football confirms (no kickoff-time-based phantom-live)
 *   Q4 — G1-strict: score-only realtime, goal-events stay final-stats-only
 *
 * Idempotency-Lock (F-05):
 *   `WHERE status != 'finished'` on UPDATE. Once-finished-always-finished.
 *   Bidirectional-Race excluded (e.g. API flap can't revert finished→live).
 *
 * Quota-Math (Capacity-Sanity Sektion 0):
 *   Worst-case 1440 calls/day (continuous live) = 19% of 7500 daily limit.
 *   Q2-C-Adaptive trims to ~250/day during typical Sa+So windows = 3%.
 *
 * Auth: Bearer ${CRON_SECRET}, identical pattern to `gameweek-sync`.
 */

// API-Football status-short codes that map to our internal enum.
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE']);

type ActiveLeague = {
  id: string;
  short: string;
  apiFootballId: number;
};

type LiveSyncResult = {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  api_calls?: number;
  leagues?: number;
  live_fixtures_count?: number;
  updated_count?: number;
  duration_ms: number;
  error?: string;
};

export const GET = withLogger('cron.live-score-sync', async (request) => {
  const runStart = Date.now();

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

  /** Best-effort cron_sync_log insert. Mirrors gameweek-sync's logStep helper. */
  async function logStep(
    step: string,
    status: 'success' | 'skipped' | 'error',
    details?: Record<string, unknown>,
    durationMs?: number,
  ): Promise<void> {
    try {
      await supabaseAdmin.from('cron_sync_log').insert({
        gameweek: 0, // global step (not GW-scoped); mirrors gameweek-sync `cron_complete`
        step,
        status,
        details: details ?? null,
        duration_ms: durationMs ?? null,
      });
    } catch (err) {
      // Best-effort logging — don't fail the cron because logging failed.
      logSilentCatch('live-score-sync.logStep', err);
    }
  }

  try {
    // ============================================
    // Q2-C-Adaptive Pre-Check
    // Skip API-call when no fixtures are within the live-window.
    // Live-window = played_at ± 15min AND status NOT IN ('finished', 'simulated').
    // ============================================
    const windowStart = new Date(Date.now() - 15 * 60_000).toISOString();
    const windowEnd = new Date(Date.now() + 15 * 60_000).toISOString();

    const { count: liveWindowCount, error: windowErr } = await supabaseAdmin
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .gte('played_at', windowStart)
      .lte('played_at', windowEnd)
      .in('status', ['scheduled', 'live']);

    if (windowErr) {
      const result: LiveSyncResult = {
        success: false,
        error: `live_window_query_failed: ${windowErr.message}`,
        duration_ms: Date.now() - runStart,
      };
      await logStep('live_score_sync', 'error', result, result.duration_ms);
      return NextResponse.json(result, { status: 500 });
    }

    if (!liveWindowCount || liveWindowCount === 0) {
      const result: LiveSyncResult = {
        success: true,
        skipped: true,
        reason: 'no_live_window',
        duration_ms: Date.now() - runStart,
      };
      await logStep('live_score_sync', 'skipped', result, result.duration_ms);
      return NextResponse.json(result);
    }

    // ============================================
    // Load active leagues with api_football_id mapped.
    // SOURCE OF TRUTH: clubs.league_id DISTINCT (mirror gameweek-sync 2e).
    // `leagues.is_active` is unreliable per Slice 251 lesson.
    // ============================================
    const { data: clubLeagueRows, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('league_id')
      .not('league_id', 'is', null);

    if (clubErr) {
      const result: LiveSyncResult = {
        success: false,
        error: `clubs_query_failed: ${clubErr.message}`,
        duration_ms: Date.now() - runStart,
      };
      await logStep('live_score_sync', 'error', result, result.duration_ms);
      return NextResponse.json(result, { status: 500 });
    }

    const leagueIds = Array.from(
      new Set((clubLeagueRows ?? []).map((r) => r.league_id as string)),
    );

    if (leagueIds.length === 0) {
      const result: LiveSyncResult = {
        success: true,
        skipped: true,
        reason: 'no_active_leagues',
        duration_ms: Date.now() - runStart,
      };
      await logStep('live_score_sync', 'skipped', result, result.duration_ms);
      return NextResponse.json(result);
    }

    const { data: leagueRows, error: leagueErr } = await supabaseAdmin
      .from('leagues')
      .select('id, short, api_football_id')
      .in('id', leagueIds)
      .not('api_football_id', 'is', null);

    if (leagueErr) {
      const result: LiveSyncResult = {
        success: false,
        error: `leagues_query_failed: ${leagueErr.message}`,
        duration_ms: Date.now() - runStart,
      };
      await logStep('live_score_sync', 'error', result, result.duration_ms);
      return NextResponse.json(result, { status: 500 });
    }

    const activeLeagues: ActiveLeague[] = (leagueRows ?? [])
      .map((l) => ({
        id: l.id as string,
        short: l.short as string,
        apiFootballId: l.api_football_id as number,
      }))
      .filter((l) => l.id && l.short && typeof l.apiFootballId === 'number');

    if (activeLeagues.length === 0) {
      const result: LiveSyncResult = {
        success: true,
        skipped: true,
        reason: 'no_leagues_with_api_football_id',
        duration_ms: Date.now() - runStart,
      };
      await logStep('live_score_sync', 'skipped', result, result.duration_ms);
      return NextResponse.json(result);
    }

    // ============================================
    // API-Football call — multi-league filter in 1 request.
    // `?live=39-204-78-203-...` returns live fixtures across all leagues.
    // ============================================
    const leagueIdsPipe = activeLeagues.map((l) => l.apiFootballId).join('-');
    const apiResp = await apiFetch<{ response: ApiFixtureLive[] }>(
      `/fixtures?live=${leagueIdsPipe}`,
    );

    const liveFixtures = apiResp.response ?? [];

    // ============================================
    // Per-fixture UPDATE with Idempotency-Lock (F-05).
    // We update one row at a time — `fixtures` is small (~500/season), and
    // serial updates avoid pgBouncer-pool exhaustion. Each UPDATE is idempotent
    // via `.neq('status', 'finished')`.
    // ============================================
    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const apiFix of liveFixtures) {
      const apiStatus = apiFix.fixture.status.short;
      const targetStatus = FINISHED_STATUSES.has(apiStatus)
        ? 'finished'
        : LIVE_STATUSES.has(apiStatus)
        ? 'live'
        : null;

      if (targetStatus === null) {
        // Unknown / pre-match status (TBD, NS, PST, CANC, ABD, AWD, WO, etc.)
        // Skip — neither live nor finished.
        continue;
      }

      const minute = apiFix.fixture.status.elapsed; // CRITICAL: elapsed (not minute) per fantasy.md
      const homeScore = apiFix.goals.home;
      const awayScore = apiFix.goals.away;

      const { data: updatedRows, error: updateErr } = await supabaseAdmin
        .from('fixtures')
        .update({
          status: targetStatus,
          home_score: homeScore,
          away_score: awayScore,
          minute: minute,
          last_live_update_at: nowIso,
        })
        .eq('api_fixture_id', apiFix.fixture.id)
        .neq('status', 'finished') // F-05 Idempotency-Lock — once-finished-always-finished
        .select('id');

      if (updateErr) {
        // Log but continue — one bad row shouldn't kill the whole cron.
        // Pattern: pg_cron Fail-Isolation (Slice 024 B5).
        logSilentCatch('live-score-sync.update', updateErr, {
          api_fixture_id: apiFix.fixture.id,
        });
        continue;
      }

      if (updatedRows && updatedRows.length > 0) {
        updatedCount += updatedRows.length;
      }
    }

    const totalDuration = Date.now() - runStart;
    const result: LiveSyncResult = {
      success: true,
      skipped: false,
      api_calls: 1,
      leagues: activeLeagues.length,
      live_fixtures_count: liveFixtures.length,
      updated_count: updatedCount,
      duration_ms: totalDuration,
    };

    await logStep('live_score_sync', 'success', result, totalDuration);
    return NextResponse.json(result);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    const totalDuration = Date.now() - runStart;
    const result: LiveSyncResult = {
      success: false,
      error: errMsg,
      duration_ms: totalDuration,
    };
    await logStep('live_score_sync', 'error', result, totalDuration);
    return NextResponse.json(result, { status: 500 });
  }
});
