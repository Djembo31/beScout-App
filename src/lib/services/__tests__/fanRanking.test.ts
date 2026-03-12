import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseRpc } from '@/test/mocks/supabase';
import { batchRecalculateFanRanks } from '../fanRanking';

describe('batchRecalculateFanRanks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls batch_recalculate_fan_ranks RPC with event ID', async () => {
    const mockResult = { ok: true, recalculated: 5, errors: [] };
    mockSupabaseRpc(mockResult);

    const result = await batchRecalculateFanRanks('event-123');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('batch_recalculate_fan_ranks', {
      p_event_id: 'event-123',
    });
    expect(result).toEqual({ ok: true, recalculated: 5, errors: [] });
  });

  it('returns error on RPC failure', async () => {
    mockSupabaseRpc(null, { message: 'DB error' });

    const result = await batchRecalculateFanRanks('event-123');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('DB error');
  });
});
