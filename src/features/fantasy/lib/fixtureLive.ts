import type { FixtureStatus } from '@/types';

/**
 * Slice 284a (FANT-04) — Staleness-Guard für status='live'.
 *
 * Hintergrund: 2 Fixtures hingen seit 08.05. auf 'live' (Cron-Window-Bug
 * FANT-01) und pulsierten wochenlang als LIVE durch Spieltag/Modal. Die UI
 * darf status='live' nie blind vertrauen: ein Spiel, dessen Anstoß länger
 * als 5h her ist, ist real beendet — egal was die DB (noch) sagt. Der
 * Stale-Live-Recovery-Cron (live-score-sync, Slice 284a) heilt den DB-Zustand
 * binnen ~30min; dieser Guard ist die Defense-in-Depth-Schicht darüber.
 *
 * 5h-Cutoff: 90min Spielzeit + HZ + Verlängerung + Elfmeterschiessen +
 * Unterbrechungen — grosszügig, aber endlich.
 */
const STALE_LIVE_CUTOFF_MS = 5 * 60 * 60 * 1000;

export function isFixtureLive(
  status: FixtureStatus | string | null | undefined,
  playedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (status !== 'live') return false;
  if (!playedAt) return true; // kein Anstoß-Zeitpunkt → DB-Status vertrauen
  return now.getTime() - new Date(playedAt).getTime() < STALE_LIVE_CUTOFF_MS;
}
