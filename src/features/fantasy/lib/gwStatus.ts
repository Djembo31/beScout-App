export type GwStatus = 'open' | 'simulated' | 'empty';

/** Structural shape computeGwStatus reads from each event. FantasyEvent satisfies this
 *  (status: EventStatus ⊆ string, scoredAt?: string | null). Decoupled from FantasyEvent
 *  so the helper stays trivially testable + reusable. */
type GwStatusEvent = { status: string; scoredAt?: string | null };

/**
 * Slice 311 (Fantasy-#5): Single source of truth for "is a fixture in a
 * terminal/done state?". A done fixture counts toward GW completion.
 * `cancelled` zählt als done (Spiel findet nie statt — Review-284a-F-04).
 */
export function isFixtureDone(status: string): boolean {
  return status === 'simulated' || status === 'finished' || status === 'cancelled';
}

/**
 * Slice 311 (Fantasy-#5): Single source of truth for "is this gameweek
 * open / done / empty?". Unifies the previously-divergent inline computations
 * in useGameweek (selector) and SpieltagTab (admin/view).
 *
 * Reconciliation (bewusst — die informiertere Interpretation der beiden Vorläufer):
 *  - Vorher useGameweek: `events.length === 0` → 'empty' (ignorierte offene Fixtures).
 *    Jetzt: offene Fixtures ohne Events → 'open' (offene Spiele ≠ leer).
 *  - Vorher SpieltagTab: Events-Branch hatte Zusatz-Guard `simulatedCount > 0`.
 *    Jetzt: alle Events ended/scored = GW done, unabhängig vom Fixture-Fortschritt
 *    (Events sind die Fantasy-Einheit) — matcht useGameweeks Events-Branch.
 */
export function computeGwStatus(input: {
  /** All fixtures of the GW are done (isFixtureDone) AND there is ≥1 fixture. */
  fixturesComplete: boolean;
  /** Total number of fixtures in the GW. */
  fixtureCount: number;
  /** Events of the GW (only status + scoredAt are read). */
  events: ReadonlyArray<GwStatusEvent>;
}): GwStatus {
  // 1. All fixtures done → GW simulated (authoritative, regardless of events).
  if (input.fixturesComplete) return 'simulated';
  // 2. Events exist and ALL ended/scored → simulated (fantasy unit is done).
  if (input.events.length > 0 && input.events.every((e) => e.status === 'ended' || !!e.scoredAt)) {
    return 'simulated';
  }
  // 3. Nothing scheduled at all (no fixtures AND no events) → empty.
  if (input.fixtureCount === 0 && input.events.length === 0) return 'empty';
  // 4. Otherwise → open.
  return 'open';
}
