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
  /** Slice 284a: per Stale-Live-Recovery final geschriebene Fixtures. */
  recovered_count?: number;
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
    // Q2-C-Adaptive Pre-Check — Slice 284a (FANT-01-Fix).
    // VORHER (Bug): played_at ±15min AND status IN (scheduled, live) — ein
    // laufendes Match war 15min nach Anstoß AUSSERHALB des Fensters, FT sowieso
    // → live→finished-Transition strukturell unmöglich, Fixtures blieben auf
    // 'live' hängen (2× seit 08.05., Punch-List FANT-02).
    // JETZT (OR): status='live' zählt IMMER (egal wie alt — deckt laufende
    // Matches UND stale-live-Recovery ab); 'scheduled' nur im ±15min-Fenster
    // (Kickoff-Detection, hält die API-Quota klein).
    // ============================================
    const windowStart = new Date(Date.now() - 15 * 60_000).toISOString();
    const windowEnd = new Date(Date.now() + 15 * 60_000).toISOString();

    const { count: liveWindowCount, error: windowErr } = await supabaseAdmin
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .or(
        `status.eq.live,and(status.eq.scheduled,played_at.gte.${windowStart},played_at.lte.${windowEnd})`,
      );

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
    const liveApiIds = new Set(liveFixtures.map((f) => f.fixture.id));

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

    // ============================================
    // Slice 284a (FANT-02/T3) — Stale-Live-Recovery.
    // Der ?live=-Feed liefert beendete Spiele NIE — die finished-Transition
    // braucht einen ID-Lookup. Jedes Fixture, das >4h nach Anstoß noch 'live'
    // ist UND nicht (mehr) im Live-Feed auftaucht, wird per /fixtures?ids=
    // nachgeschlagen und final geschrieben. Heilt auch Alt-Leichen (die 2
    // stuck-live seit 08.05.) beim ersten Lauf. Wenn die API das Fixture gar
    // nicht kennt → 'cancelled' + WARN (Operator-Sicht via cron_sync_log).
    // ============================================
    let recoveredCount = 0;
    let recoveryApiCalls = 0;
    const staleCutoff = new Date(Date.now() - 4 * 60 * 60_000).toISOString();
    const { data: staleLive, error: staleErr } = await supabaseAdmin
      .from('fixtures')
      .select('id, api_fixture_id, played_at, home_club_id')
      .eq('status', 'live')
      .lt('played_at', staleCutoff)
      .not('api_fixture_id', 'is', null);
    if (staleErr) {
      // Recovery ist additiv — Fehler loggen, Haupt-Sync-Ergebnis nicht kippen.
      console.error('[live-score-sync] stale-live query failed:', staleErr.message);
    }
    const staleToRecover = (staleLive ?? []).filter(
      (f) => !liveApiIds.has(f.api_fixture_id as number),
    );
    if (staleToRecover.length > 0) {
      // Lookup-Strategie: league+season+date (Slice-275-Pattern, plan-sicher).
      // ?ids= ist auf API-Football je nach Plan GESPERRT ("Free plans do not
      // have access to the Ids parameter" — live verifiziert 2026-06-12) und
      // lieferte HTTP 200 + leeres response → Recovery lief ins Leere.
      // Gruppierung: (api-league-id, datum) → 1 Call pro Gruppe.
      const homeClubIds = Array.from(new Set(staleToRecover.map((f) => f.home_club_id as string)));
      const { data: clubRows } = await supabaseAdmin
        .from('clubs')
        .select('id, league_id')
        .in('id', homeClubIds);
      const clubToLeague = new Map((clubRows ?? []).map((c) => [c.id as string, c.league_id as string]));
      const leagueApiById = new Map(activeLeagues.map((l) => [l.id, l.apiFootballId]));

      type StaleGroup = { apiLeagueId: number; date: string; items: typeof staleToRecover };
      const groups = new Map<string, StaleGroup>();
      for (const f of staleToRecover) {
        const leagueId = clubToLeague.get(f.home_club_id as string);
        const apiLeagueId = leagueId ? leagueApiById.get(leagueId) : undefined;
        const date = f.played_at ? String(f.played_at).slice(0, 10) : null;
        if (!apiLeagueId || !date) {
          console.warn('[live-score-sync] stale-live ohne League/Date-Mapping — skip:', f.id);
          continue;
        }
        const key = `${apiLeagueId}|${date}`;
        const g = groups.get(key) ?? { apiLeagueId, date, items: [] as typeof staleToRecover };
        g.items.push(f);
        groups.set(key, g);
      }

      const cancelCutoff = Date.now() - 24 * 60 * 60_000;
      for (const group of Array.from(groups.values())) {
        // Saison aus Datum ableiten (API nutzt Start-Jahr: Mai 2026 → season 2025)
        const d = new Date(group.date);
        const season = d.getUTCMonth() + 1 >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
        recoveryApiCalls++;
        const lookup = await apiFetch<{ response: ApiFixtureLive[]; errors?: unknown }>(
          `/fixtures?league=${group.apiLeagueId}&season=${season}&date=${group.date}`,
        );
        const lookupRows = lookup.response ?? [];
        // Review-284a-F-01: API-Football liefert Rate-Limit/Plan-Fehler als HTTP 200
        // mit errors-Body + LEEREM response. Leere Antwort darf NIE als
        // „Fixtures existieren nicht" gewertet werden — Skip + Retry nächster Lauf.
        if (lookupRows.length === 0) {
          console.warn(
            '[live-score-sync] stale-live lookup returned empty response — skipping group (api errors:',
            JSON.stringify(lookup.errors ?? null).slice(0, 200),
            ')',
          );
          continue;
        }
        const byApiId = new Map(lookupRows.map((r) => [r.fixture.id, r]));
        for (const stale of group.items) {
          const apiRow = byApiId.get(stale.api_fixture_id as number);
          if (!apiRow) {
            // API kennt ANDERE Fixtures des Tages, dieses nicht. Cancel erst
            // nach 24h-Cutoff (2-Strike: Daily-Sync hat Vorrang).
            if (!stale.played_at || new Date(stale.played_at).getTime() > cancelCutoff) {
              console.warn('[live-score-sync] stale-live not in API response — waiting for 24h cutoff:', stale.id);
              continue;
            }
            const { error: cancelErr } = await supabaseAdmin
              .from('fixtures')
              .update({ status: 'cancelled', last_live_update_at: new Date().toISOString() })
              .eq('id', stale.id)
              .eq('status', 'live');
            if (cancelErr) {
              console.error('[live-score-sync] stale-live cancel failed:', stale.id, cancelErr.message);
            } else {
              console.warn('[live-score-sync] stale-live unresolvable via API → cancelled:', stale.id);
              recoveredCount++;
            }
            continue;
          }
          const short = apiRow.fixture.status.short;
          const finalStatus = FINISHED_STATUSES.has(short)
            ? 'finished'
            : short === 'PST' || short === 'SUSP' || short === 'INT'
              ? 'postponed'
              : ['CANC', 'ABD', 'AWD', 'WO'].includes(short)
                ? 'cancelled'
                : null; // noch echt live (extremer Sonderfall) → unangetastet
          if (!finalStatus) continue;
          const { error: healErr } = await supabaseAdmin
            .from('fixtures')
            .update({
              status: finalStatus,
              home_score: apiRow.goals.home,
              away_score: apiRow.goals.away,
              minute: null,
              last_live_update_at: new Date().toISOString(),
            })
            .eq('id', stale.id)
            .eq('status', 'live'); // nur den stale-Zustand überschreiben
          if (healErr) {
            console.error('[live-score-sync] stale-live heal failed:', stale.id, healErr.message);
          } else {
            recoveredCount++;
          }
        }
      }
    }

    const totalDuration = Date.now() - runStart;
    const result: LiveSyncResult = {
      success: true,
      skipped: false,
      api_calls: 1 + recoveryApiCalls,
      leagues: activeLeagues.length,
      live_fixtures_count: liveFixtures.length,
      updated_count: updatedCount,
      recovered_count: recoveredCount,
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
