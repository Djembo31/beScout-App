/**
 * Cron Health Service (Slice 256 — UI-Sentinel)
 *
 * Anon-readable Detection-Logic für Vercel-Cron-Pipeline-Drift.
 * Spiegelt `scripts/cron-health-check.ts` Layer 2 (DB-state-drift) — Slice 255 Heal-Variante:
 *   Drift = ALLE Fixtures der `leagues.active_gameweek` sind `finished` UND active_gw < max_gameweeks.
 *
 * Wird vom `useCronHealth`-Hook konsumiert um den `StalePipelineBanner` zu rendern.
 * Liest `leagues` + `clubs` + `fixtures` via anon-Supabase (RLS-public-readable).
 *
 * Severity-Gate (Phase 1, D52-Pattern):
 *   Nur HIGH-Drifts (drift >= 2 GW) werden user-facing als `healthy: false` gemeldet.
 *   MEDIUM (drift = 1, mid-weekend Saturday-finished) wird als healthy=true unterdrückt
 *   um Wochenend-Noise zu vermeiden.
 *
 * Graceful-Fail: Bei jedem Service-Error returnt healthy=true, damit ein temporäres
 * Supabase-Problem nicht zu False-Alarm-Banners führt.
 */

import { supabase } from '@/lib/supabaseClient';

export interface CronHealthDrift {
  leagueId: string;
  leagueName: string;
  country: string;
  drift: number;
  dbActiveGw: number;
  maxFinishedGw: number;
}

export interface CronHealthStatus {
  healthy: boolean;
  drifts: CronHealthDrift[];
}

const HEALTHY: CronHealthStatus = { healthy: true, drifts: [] };
const HIGH_DRIFT_THRESHOLD = 2;

export async function getCronHealthStatus(): Promise<CronHealthStatus> {
  try {
    const { data: leagues, error: leagueErr } = await supabase
      .from('leagues')
      .select('id, name, country, active_gameweek, max_gameweeks')
      .eq('is_active', true);

    if (leagueErr || !leagues || leagues.length === 0) {
      return HEALTHY;
    }

    const drifts: CronHealthDrift[] = [];

    for (const league of leagues) {
      const dbActiveGw = league.active_gameweek as number | null;
      const maxGw = league.max_gameweeks as number | null;
      if (dbActiveGw == null || maxGw == null) continue;
      if (dbActiveGw >= maxGw) continue; // Saison-End

      const { data: clubs } = await supabase
        .from('clubs')
        .select('id')
        .eq('league_id', league.id);
      const clubIds = (clubs ?? []).map((c) => c.id as string);
      if (clubIds.length === 0) continue;

      const { data: activeGwFixtures } = await supabase
        .from('fixtures')
        .select('status')
        .in('home_club_id', clubIds)
        .eq('gameweek', dbActiveGw);

      if (!activeGwFixtures || activeGwFixtures.length === 0) continue; // Pre-Season / no fixtures

      const allFinished = activeGwFixtures.every((f) => f.status === 'finished');
      if (!allFinished) continue;

      // ALLE finished + nicht Saison-End → Cron sollte advanced haben.
      // Drift = wie viele GWs ist der Cron hinterher (basierend auf max-finished-fixture-gw).
      const { data: laterFinished } = await supabase
        .from('fixtures')
        .select('gameweek')
        .in('home_club_id', clubIds)
        .eq('status', 'finished')
        .gt('gameweek', dbActiveGw)
        .order('gameweek', { ascending: false })
        .limit(1);

      const maxFinishedGw =
        laterFinished && laterFinished.length > 0
          ? (laterFinished[0].gameweek as number)
          : dbActiveGw;
      const drift = maxFinishedGw - dbActiveGw + 1;

      if (drift >= HIGH_DRIFT_THRESHOLD) {
        drifts.push({
          leagueId: league.id as string,
          leagueName: league.name as string,
          country: league.country as string,
          drift,
          dbActiveGw,
          maxFinishedGw,
        });
      }
    }

    return drifts.length === 0 ? HEALTHY : { healthy: false, drifts };
  } catch {
    // Graceful-fail: any unexpected error → treat as healthy, don't surface false-alarm Banner.
    return HEALTHY;
  }
}
