import { describe, it, expect, beforeEach } from 'vitest';
import { mockRpc, resetMocks, mockSupabase } from '@/test/mocks/supabase';
import { createUserEvent } from '../events.mutations';

// Slice 397 (E-4b) — Service-Wrapper für create_user_event.
// Soft-Return (kein throw); der Hook (useCreateUserEvent) wirft bei !ok.

const baseParams = {
  userId: 'user-1',
  name: 'Mein Community-Event',
  entryFeeCents: 1000, // 10 Credits
  gameweek: 5,
  locksAt: '2026-07-01T18:00:00.000Z',
  rewardStructure: [
    { rank: 1, pct: 50 },
    { rank: 2, pct: 30 },
    { rank: 3, pct: 20 },
  ],
  minEntries: 2,
  maxEntries: 50,
  leagueId: null,
};

describe('createUserEvent', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns ok + eventId + feeCharged on success', async () => {
    mockRpc('create_user_event', { ok: true, event_id: 'evt-1', fee_charged: 5000 });
    const result = await createUserEvent(baseParams);
    expect(result).toEqual({ ok: true, eventId: 'evt-1', feeCharged: 5000 });
  });

  it('maps params to RPC args (entry fee stays in cents)', async () => {
    mockRpc('create_user_event', { ok: true, event_id: 'evt-2', fee_charged: 0 });
    await createUserEvent(baseParams);
    const call = mockSupabase.rpc.mock.calls.find((c) => c[0] === 'create_user_event');
    expect(call).toBeTruthy();
    expect(call![1]).toMatchObject({
      p_user_id: 'user-1',
      p_name: 'Mein Community-Event',
      p_entry_fee: 1000, // cents, NICHT Credits
      p_gameweek: 5,
      p_locks_at: '2026-07-01T18:00:00.000Z',
      p_min_entries: 2,
      p_max_entries: 50,
      p_league_id: null,
    });
    expect(call![1].p_reward_structure).toEqual(baseParams.rewardStructure);
  });

  it('passes optional min/max as null when omitted', async () => {
    mockRpc('create_user_event', { ok: true, event_id: 'evt-3', fee_charged: 5000 });
    await createUserEvent({ ...baseParams, minEntries: null, maxEntries: null });
    const call = mockSupabase.rpc.mock.calls.find((c) => c[0] === 'create_user_event');
    expect(call![1]).toMatchObject({ p_min_entries: null, p_max_entries: null });
  });

  it('returns the RPC reject code on soft-reject (!ok)', async () => {
    mockRpc('create_user_event', { ok: false, error: 'min_gt_max' });
    const result = await createUserEvent(baseParams);
    expect(result).toEqual({ ok: false, error: 'min_gt_max' });
  });

  it('returns insufficient_balance reject as-is', async () => {
    mockRpc('create_user_event', { ok: false, error: 'insufficient_balance', have: 1000, need: 5000 });
    const result = await createUserEvent(baseParams);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('insufficient_balance');
  });

  it('surfaces a transport error', async () => {
    mockRpc('create_user_event', null, { message: 'network down' });
    const result = await createUserEvent(baseParams);
    expect(result).toEqual({ ok: false, error: 'network down' });
  });
});
