/**
 * Slice 195d — Bench-Validation Tests (TDD, written from spec only)
 *
 * Spec: worklog/specs/195-fantasy-mechanics-overhaul.md (Sub-Slice 195d)
 *
 * Tests `submitLineup` service forwards bench params to `save_lineup` RPC and
 * surfaces all bench-related validation error keys. Pattern matches existing
 * `lineups.test.ts` (RPC-mocked, asserts on RPC arg-shape + error propagation).
 *
 * Expected migration schema (NOT YET LIVE — these tests should FAIL initially):
 *   lineups.bench_gk UUID NULL
 *   lineups.bench_o1 / bench_o2 / bench_o3 UUID NULL
 *   lineups.bench_order INT[] NOT NULL DEFAULT '{1,2,3}'  (permutation [1,2,3])
 *
 * Expected RPC signature extension:
 *   save_lineup(... existing args ..., p_bench_gk, p_bench_o1, p_bench_o2,
 *               p_bench_o3, p_bench_order)
 *
 * Expected new error keys returned by RPC as { ok: false, error: '<key>' }:
 *   - bench_gk_position_mismatch
 *   - bench_outfield_position_mismatch
 *   - bench_overlaps_starter
 *   - bench_duplicate
 *   - bench_not_in_holdings
 *   - invalid_bench_order
 *
 * TDD-FAIL Mode: All tests asserting on `p_bench_*` RPC args are expected to fail
 * until backend-agent extends the service signature in
 * `src/features/fantasy/services/lineups.mutations.ts`.
 *
 * Run: npx vitest run src/lib/services/__tests__/lineup-bench-validation.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '@/test/mocks/supabase';
import { submitLineup } from '../lineups';

// ---- Module mocks (same as lineups.test.ts) -----------------------------

vi.mock('@/lib/services/fixtures', () => ({
  getFixtureDeadlinesByGameweek: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@/lib/notifText', () => ({
  notifText: vi.fn((key: string) => key),
}));

// ---- Constants -----------------------------------------------------------

const EVENT_ID = 'event-bench-001';
const USER_ID = 'user-bench-001';

// 11 starters that satisfy formation 1-4-3-3 (gk, def1..def4, mid1..mid3, att, att2, att3)
const STARTERS = {
  gk: 'starter-gk',
  def1: 'starter-def1',
  def2: 'starter-def2',
  def3: 'starter-def3',
  def4: 'starter-def4',
  mid1: 'starter-mid1',
  mid2: 'starter-mid2',
  mid3: 'starter-mid3',
  att: 'starter-att1',
  att2: 'starter-att2',
  att3: 'starter-att3',
};

const baseParams = {
  eventId: EVENT_ID,
  userId: USER_ID,
  formation: '1-4-3-3',
  slots: STARTERS,
};

// Helper: typed bench-extension to baseParams (TDD: signature does not yet
// accept these — service-level test verifies they are forwarded).
type SubmitLineupBenchExt = Parameters<typeof submitLineup>[0] & {
  benchGk?: string | null;
  benchO1?: string | null;
  benchO2?: string | null;
  benchO3?: string | null;
  benchOrder?: number[];
};

// ============================================================================
// 1-7: Error-Key Propagation
// ============================================================================
//
// These tests verify that when the RPC returns ok:false with a bench-specific
// error key, the service surfaces it as a thrown Error with matching message.
// Same pattern as lineups.test.ts error-propagation cases.
// ============================================================================

describe('submitLineup — bench validation error propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. throws bench_gk_position_mismatch when bench_gk is not a GK player', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'bench_gk_position_mismatch' },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchGk: 'def-on-bench-gk',
    };

    await expect(submitLineup(params)).rejects.toThrow('bench_gk_position_mismatch');
  });

  it('2. throws bench_outfield_position_mismatch when bench_o1 is a GK', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'bench_outfield_position_mismatch' },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchO1: 'gk-as-bench-outfield',
    };

    await expect(submitLineup(params)).rejects.toThrow('bench_outfield_position_mismatch');
  });

  it('3. throws bench_overlaps_starter when same player_id appears as starter and bench', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'bench_overlaps_starter' },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchO1: STARTERS.def1, // overlap: same player as starter slot_def1
    };

    await expect(submitLineup(params)).rejects.toThrow('bench_overlaps_starter');
  });

  it('4. throws bench_duplicate when bench_o1 == bench_o2', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'bench_duplicate' },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchO1: 'bench-dup-player',
      benchO2: 'bench-dup-player',
    };

    await expect(submitLineup(params)).rejects.toThrow('bench_duplicate');
  });

  it('5. throws bench_not_in_holdings when user does not own the bench player', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'bench_not_in_holdings' },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchO1: 'player-not-owned',
    };

    await expect(submitLineup(params)).rejects.toThrow('bench_not_in_holdings');
  });

  it('6. throws invalid_bench_order when bench_order length != 3', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'invalid_bench_order' },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchOrder: [1, 2], // too short
    };

    await expect(submitLineup(params)).rejects.toThrow('invalid_bench_order');
  });

  it('7. throws invalid_bench_order when bench_order is not a permutation [1,2,3]', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'invalid_bench_order' },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchOrder: [1, 1, 2], // duplicate, not permutation
    };

    await expect(submitLineup(params)).rejects.toThrow('invalid_bench_order');
  });
});

// ============================================================================
// 8-10: Happy-Path RPC Argument Forwarding
// ============================================================================
//
// These tests verify that the service signature accepts new bench params and
// forwards them as p_bench_gk / p_bench_o1..o3 / p_bench_order to the RPC.
//
// CURRENTLY FAIL because submitLineup() in lineups.mutations.ts does not yet
// pass these params (backend-agent will extend it).
// ============================================================================

describe('submitLineup — bench RPC argument forwarding (TDD: expected to FAIL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('8. happy_path_full_bench: passes all 4 bench slots + bench_order to RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: true, lineup_id: 'lineup-bench-1', is_new: true },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchGk: 'bench-gk-player',
      benchO1: 'bench-def-player',
      benchO2: 'bench-mid-player',
      benchO3: 'bench-att-player',
      benchOrder: [1, 2, 3],
    };

    await submitLineup(params);

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'save_lineup',
      expect.objectContaining({
        p_event_id: EVENT_ID,
        p_formation: '1-4-3-3',
        p_bench_gk: 'bench-gk-player',
        p_bench_o1: 'bench-def-player',
        p_bench_o2: 'bench-mid-player',
        p_bench_o3: 'bench-att-player',
        p_bench_order: [1, 2, 3],
      }),
    );
  });

  it('9. happy_path_partial_bench: passes NULL for empty bench slots', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: true, lineup_id: 'lineup-bench-2', is_new: true },
      error: null,
    });

    const params: SubmitLineupBenchExt = {
      ...baseParams,
      benchGk: null,
      benchO1: 'bench-def-only',
      benchO2: null,
      benchO3: null,
      benchOrder: [1, 2, 3],
    };

    await submitLineup(params);

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'save_lineup',
      expect.objectContaining({
        p_bench_gk: null,
        p_bench_o1: 'bench-def-only',
        p_bench_o2: null,
        p_bench_o3: null,
        p_bench_order: [1, 2, 3],
      }),
    );
  });

  it('10. happy_path_no_bench: passes null/default bench params when none provided', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: true, lineup_id: 'lineup-bench-3', is_new: true },
      error: null,
    });

    // Caller provides no bench fields at all — service must still pass
    // explicit bench params (NULL or default [1,2,3]) so RPC signature matches.
    await submitLineup(baseParams);

    const callArgs = (mockSupabase.rpc as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;

    expect(callArgs).toBeDefined();
    expect(callArgs).toHaveProperty('p_bench_gk');
    expect(callArgs).toHaveProperty('p_bench_o1');
    expect(callArgs).toHaveProperty('p_bench_o2');
    expect(callArgs).toHaveProperty('p_bench_o3');
    expect(callArgs).toHaveProperty('p_bench_order');

    // Defaults: all null bench slots, bench_order = [1,2,3] permutation default
    expect(callArgs?.p_bench_gk).toBeNull();
    expect(callArgs?.p_bench_o1).toBeNull();
    expect(callArgs?.p_bench_o2).toBeNull();
    expect(callArgs?.p_bench_o3).toBeNull();
    expect(callArgs?.p_bench_order).toEqual([1, 2, 3]);
  });
});
