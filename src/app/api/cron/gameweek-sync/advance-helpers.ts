/**
 * Slice 277 — gameweek-sync advance-decision helpers
 *
 * Pure decision logic für advance_gameweek in Skip-Branches.
 * Side-effect-frei — alle DB-Reads erfolgen vorher und werden als Inputs übergeben.
 */

export type AdvanceDecision =
  | { advance: true; nextGw: number; reason: 'advance_due' }
  | { advance: false; reason: 'season_end' | 'no_next_fixtures' | 'invalid_input' };

export type ShouldAdvanceInput = {
  /** Aktueller GW der Liga (leagues.active_gameweek, SSOT seit Slice 428) */
  activeGw: number;
  /** Liga-spezifische maxGameweeks (TFF1=34, BL=34, PL=38, etc.) */
  maxGameweeks: number;
  /** Hat nextGw Fixtures in der DB? (vorab via SELECT count > 0 ermittelt) */
  hasFixturesAtNextGw: boolean;
};

/**
 * Entscheidet ob nach einem Skip-Branch (already_complete oder no_past_fixtures)
 * advance_gameweek durchgeführt werden soll.
 *
 * Slice 277 Pattern:
 * - GW finished/scored UND GW+1 hat fixtures → advance ✓
 * - GW finished UND GW+1 ist Saisonende (nextGw > maxGameweeks) → kein advance
 * - GW finished UND GW+1 leer (z.B. nicht importiert) → kein advance
 *
 * @example
 * const decision = shouldAdvanceAfterSkip({
 *   activeGw: 32,
 *   maxGameweeks: 38,
 *   hasFixturesAtNextGw: true,
 * });
 * // → { advance: true, nextGw: 33, reason: 'advance_due' }
 */
export function shouldAdvanceAfterSkip(input: ShouldAdvanceInput): AdvanceDecision {
  const { activeGw, maxGameweeks, hasFixturesAtNextGw } = input;

  if (!Number.isInteger(activeGw) || activeGw < 1) {
    return { advance: false, reason: 'invalid_input' };
  }
  if (!Number.isInteger(maxGameweeks) || maxGameweeks < 1) {
    return { advance: false, reason: 'invalid_input' };
  }

  const nextGw = activeGw + 1;

  if (nextGw > maxGameweeks) {
    return { advance: false, reason: 'season_end' };
  }

  if (!hasFixturesAtNextGw) {
    return { advance: false, reason: 'no_next_fixtures' };
  }

  return { advance: true, nextGw, reason: 'advance_due' };
}
