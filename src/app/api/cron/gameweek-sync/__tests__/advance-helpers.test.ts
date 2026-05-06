/**
 * Slice 277 — advance-helpers Tests
 * 6 Edge-Cases laut Spec Sektion 7
 */
import { describe, it, expect } from 'vitest';
import { shouldAdvanceAfterSkip } from '../advance-helpers';

describe('shouldAdvanceAfterSkip', () => {
  describe('AC1 — advance fällig (already_complete-Branch)', () => {
    it('Case 1: GW alle finished + GW+1 hat fixtures → advance', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 32,
        maxGameweeks: 38,
        hasFixturesAtNextGw: true,
      });
      expect(decision).toEqual({ advance: true, nextGw: 33, reason: 'advance_due' });
    });
  });

  describe('AC2 — advance fällig (no_past_fixtures-Branch)', () => {
    it('Case 4: GW unfinished aber alle in Zukunft + GW+1 hat fixtures → advance', () => {
      // Identisch zu Case 1 aus Helper-Sicht — Branch-Unterschied ist im Caller
      const decision = shouldAdvanceAfterSkip({
        activeGw: 31,
        maxGameweeks: 38,
        hasFixturesAtNextGw: true,
      });
      expect(decision).toEqual({ advance: true, nextGw: 32, reason: 'advance_due' });
    });
  });

  describe('AC3 — Saisonende-Edge', () => {
    it('Case 3: GW=maxGameweeks finished → KEIN advance, season_end', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 34,
        maxGameweeks: 34, // TFF1 Saisonende
        hasFixturesAtNextGw: false,
      });
      expect(decision).toEqual({ advance: false, reason: 'season_end' });
    });

    it('Saisonende auch bei zufällig gefüllten future-fixtures: nextGw > max → season_end gewinnt', () => {
      // Schutz gegen versehentliche advance auf GW=35 wenn maxGameweeks=34
      const decision = shouldAdvanceAfterSkip({
        activeGw: 34,
        maxGameweeks: 34,
        hasFixturesAtNextGw: true, // hypothetisch — sollte trotzdem season_end
      });
      expect(decision.advance).toBe(false);
      expect(decision.reason).toBe('season_end');
    });
  });

  describe('AC4 — Postponed-Match-Edge (Slice 273 Pattern)', () => {
    it('Case 6: GW finished + GW+1 hat fixtures (auch wenn alter postponed-GW noch scheduled) → advance auf GW+1', () => {
      // PL-Beispiel: activeGw=35 finished, GW=31 hat 1 postponed scheduled, GW=36 hat 10 scheduled
      // Helper kümmert sich nur um nextGw — Postponed-old wird ignoriert (Caller-Verantwortung)
      const decision = shouldAdvanceAfterSkip({
        activeGw: 35,
        maxGameweeks: 38, // PL
        hasFixturesAtNextGw: true, // GW 36 hat fixtures
      });
      expect(decision).toEqual({ advance: true, nextGw: 36, reason: 'advance_due' });
    });
  });

  describe('AC5 — Leere nächste GW', () => {
    it('Case 2: GW alle finished + GW+1 hat KEINE fixtures (noch nicht importiert) → KEIN advance, no_next_fixtures', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 32,
        maxGameweeks: 38,
        hasFixturesAtNextGw: false,
      });
      expect(decision).toEqual({ advance: false, reason: 'no_next_fixtures' });
    });

    it('Case 5: no_past_fixtures-Branch + GW+1 leer → KEIN advance', () => {
      // Identisch — Helper kennt Branch nicht
      const decision = shouldAdvanceAfterSkip({
        activeGw: 31,
        maxGameweeks: 38,
        hasFixturesAtNextGw: false,
      });
      expect(decision.advance).toBe(false);
      expect(decision.reason).toBe('no_next_fixtures');
    });
  });

  describe('Robustness — invalid input', () => {
    it('activeGw=0 → invalid_input', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 0,
        maxGameweeks: 38,
        hasFixturesAtNextGw: true,
      });
      expect(decision).toEqual({ advance: false, reason: 'invalid_input' });
    });

    it('activeGw negative → invalid_input', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: -1,
        maxGameweeks: 38,
        hasFixturesAtNextGw: true,
      });
      expect(decision).toEqual({ advance: false, reason: 'invalid_input' });
    });

    it('maxGameweeks=0 → invalid_input', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 32,
        maxGameweeks: 0,
        hasFixturesAtNextGw: true,
      });
      expect(decision).toEqual({ advance: false, reason: 'invalid_input' });
    });

    it('non-integer activeGw → invalid_input', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 32.5,
        maxGameweeks: 38,
        hasFixturesAtNextGw: true,
      });
      expect(decision).toEqual({ advance: false, reason: 'invalid_input' });
    });
  });

  describe('Boundary — letzter regulärer GW', () => {
    it('activeGw=37 (PL maxGw=38) → advance auf 38', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 37,
        maxGameweeks: 38,
        hasFixturesAtNextGw: true,
      });
      expect(decision).toEqual({ advance: true, nextGw: 38, reason: 'advance_due' });
    });

    it('activeGw=38 (PL maxGw=38) → KEIN advance (Saisonende)', () => {
      const decision = shouldAdvanceAfterSkip({
        activeGw: 38,
        maxGameweeks: 38,
        hasFixturesAtNextGw: false,
      });
      expect(decision).toEqual({ advance: false, reason: 'season_end' });
    });
  });
});
