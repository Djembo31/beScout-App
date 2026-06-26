import { describe, it, expect, beforeEach } from 'vitest';
import { mockRpc, resetMocks, mockSupabase } from '@/test/mocks/supabase';
import { cancelUserEvent, setUserEventCreateFee } from '../events.mutations';

// Slice 399 (E-4b Teil 2) — Service-Wrapper für cancel_user_event + set_user_event_create_fee.
// Soft-Return (kein throw); der Hook wirft bei !ok (→ mapErrorToKey, S393).

describe('cancelUserEvent', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns ok + refundedCount on success', async () => {
    mockRpc('cancel_user_event', { ok: true, refunded_count: 3 });
    const result = await cancelUserEvent('evt-1');
    expect(result).toEqual({ ok: true, refundedCount: 3 });
  });

  it('passes the event id as p_event_id', async () => {
    mockRpc('cancel_user_event', { ok: true, refunded_count: 0 });
    await cancelUserEvent('evt-42');
    const call = mockSupabase.rpc.mock.calls.find((c) => c[0] === 'cancel_user_event');
    expect(call).toBeTruthy();
    expect(call![1]).toEqual({ p_event_id: 'evt-42' });
  });

  it('returns the RPC reject code on soft-reject (!ok)', async () => {
    mockRpc('cancel_user_event', { ok: false, error: 'not_authorized' });
    const result = await cancelUserEvent('evt-1');
    expect(result).toEqual({ ok: false, error: 'not_authorized' });
  });

  it('returns event_not_open reject as-is', async () => {
    mockRpc('cancel_user_event', { ok: false, error: 'event_not_open' });
    const result = await cancelUserEvent('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('event_not_open');
  });

  it('surfaces a transport error', async () => {
    mockRpc('cancel_user_event', null, { message: 'network down' });
    const result = await cancelUserEvent('evt-1');
    expect(result).toEqual({ ok: false, error: 'network down' });
  });
});

describe('setUserEventCreateFee', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns ok + feeCents on success', async () => {
    mockRpc('set_user_event_create_fee', { ok: true, fee_cents: 7500 });
    const result = await setUserEventCreateFee(7500);
    expect(result).toEqual({ ok: true, feeCents: 7500 });
  });

  it('passes the cents amount as p_cents', async () => {
    mockRpc('set_user_event_create_fee', { ok: true, fee_cents: 0 });
    await setUserEventCreateFee(0);
    const call = mockSupabase.rpc.mock.calls.find((c) => c[0] === 'set_user_event_create_fee');
    expect(call).toBeTruthy();
    expect(call![1]).toEqual({ p_cents: 0 });
  });

  it('returns invalid_amount reject as-is', async () => {
    mockRpc('set_user_event_create_fee', { ok: false, error: 'invalid_amount' });
    const result = await setUserEventCreateFee(-1);
    expect(result).toEqual({ ok: false, error: 'invalid_amount' });
  });

  it('returns not_authorized reject as-is', async () => {
    mockRpc('set_user_event_create_fee', { ok: false, error: 'not_authorized' });
    const result = await setUserEventCreateFee(5000);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not_authorized');
  });

  it('surfaces a transport error', async () => {
    mockRpc('set_user_event_create_fee', null, { message: 'boom' });
    const result = await setUserEventCreateFee(5000);
    expect(result).toEqual({ ok: false, error: 'boom' });
  });
});
