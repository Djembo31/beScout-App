// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { mockRpc, resetMocks } from '@/test/mocks/supabase';
import { getPlayerPriceChanges7d } from '../players';

/**
 * Slice 268b (D63 Phase 3) — Service-Layer-Heal verification.
 *
 * Bug-class: silent error-swallow per `errors-db.md` "Service Error-Swallowing".
 * Pre-Slice-268: `console.error + return []` — UI showed "0 movers" indistinguishable
 * from real-empty.
 * Post-Slice-268: `throw new Error(error.message)` so React-Query surfaces `isError`
 * and retries. Success-path + null-data fallback unchanged.
 */
describe('getPlayerPriceChanges7d (Slice 268b service-heal)', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns RPC rows on success path', async () => {
    const rows = [
      { player_id: 'p-1', price_7d_ago: 100, price_now: 120, change_abs: 20, change_pct: 20 },
      { player_id: 'p-2', price_7d_ago: 200, price_now: 180, change_abs: -20, change_pct: -10 },
    ];
    mockRpc('get_player_price_changes_7d', rows);

    const result = await getPlayerPriceChanges7d(['p-1', 'p-2'], 5);

    expect(result).toEqual(rows);
    expect(result).toHaveLength(2);
  });

  it('THROWS on RPC error (no more silent return [])', async () => {
    mockRpc('get_player_price_changes_7d', null, { message: 'rpc_failed' });

    await expect(getPlayerPriceChanges7d(['p-1', 'p-2'], 3)).rejects.toThrow('rpc_failed');
  });

  it('returns empty array when RPC data is null (PostgREST quirk, unchanged behavior)', async () => {
    mockRpc('get_player_price_changes_7d', null);

    const result = await getPlayerPriceChanges7d(['p-1'], 3);

    expect(result).toEqual([]);
  });

  it('passes playerIds + limit to RPC unchanged', async () => {
    const rows: unknown[] = [];
    mockRpc('get_player_price_changes_7d', rows);

    await getPlayerPriceChanges7d(['a', 'b', 'c'], 7);

    // RPC was called — mockRpc tracks calls via the underlying vi.fn()
    // (see src/test/mocks/supabase.ts mockSupabase.rpc).
    const { mockSupabase } = await import('@/test/mocks/supabase');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_player_price_changes_7d', {
      p_player_ids: ['a', 'b', 'c'],
      p_limit: 7,
    });
  });

  it('passes p_player_ids = null when playerIds is undefined', async () => {
    mockRpc('get_player_price_changes_7d', []);

    await getPlayerPriceChanges7d(undefined, 20);

    const { mockSupabase } = await import('@/test/mocks/supabase');
    expect(mockSupabase.rpc).toHaveBeenLastCalledWith('get_player_price_changes_7d', {
      p_player_ids: null,
      p_limit: 20,
    });
  });
});
