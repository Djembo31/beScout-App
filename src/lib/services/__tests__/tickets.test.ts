import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import { getUserTickets, getTicketTransactions, creditTickets, spendTickets } from '../tickets';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getUserTickets', () => {
  it('returns ticket balance from RPC (single object)', async () => {
    mockRpc('get_user_tickets', { user_id: 'u1', balance: 100, lifetime_earned: 500 });
    const result = await getUserTickets('u1');
    expect(result).toEqual({ user_id: 'u1', balance: 100, lifetime_earned: 500 });
  });

  it('handles array response', async () => {
    mockRpc('get_user_tickets', [{ user_id: 'u1', balance: 50 }]);
    const result = await getUserTickets('u1');
    expect(result).toEqual({ user_id: 'u1', balance: 50 });
  });

  it('throws on RPC error', async () => {
    mockRpc('get_user_tickets', null, { message: 'err' });
    await expect(getUserTickets('u1')).rejects.toThrow('err');
  });

  it('returns null when no data', async () => {
    mockRpc('get_user_tickets', null);
    expect(await getUserTickets('u1')).toBeNull();
  });
});

describe('getTicketTransactions', () => {
  it('returns transactions', async () => {
    const txns = [{ id: 't1', amount: 10, source: 'daily_login', created_at: '2025-01-01' }];
    mockTable('ticket_transactions', txns);
    expect(await getTicketTransactions('u1')).toEqual(txns);
  });

  it('throws on DB error', async () => {
    mockTable('ticket_transactions', null, { message: 'err' });
    await expect(getTicketTransactions('u1')).rejects.toThrow('err');
  });

  it('returns [] when null data', async () => {
    mockTable('ticket_transactions', null);
    expect(await getTicketTransactions('u1')).toEqual([]);
  });
});

describe('creditTickets', () => {
  it('credits tickets via RPC', async () => {
    mockRpc('credit_tickets', { ok: true, new_balance: 150 });
    const result = await creditTickets('u1', 50, 'daily_login');
    expect(result).toEqual({ ok: true, newBalance: 150 });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('credit_tickets', {
      p_user_id: 'u1', p_amount: 50, p_source: 'daily_login',
      p_reference_id: null, p_description: null,
    });
  });

  it('passes optional params (UUID reference passes through)', async () => {
    mockRpc('credit_tickets', { ok: true, new_balance: 200 });
    const validUuid = '11111111-2222-3333-4444-555555555555';
    await creditTickets('u1', 10, 'mission', validUuid, 'Mission complete');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('credit_tickets', expect.objectContaining({
      p_reference_id: validUuid, p_description: 'Mission complete',
    }));
  });

  // Slice 038: Achievement-Hook in social.ts:522 passed achievement-keys (e.g.
  // 'first_trade') as p_reference_id, but the RPC param is uuid-typed → 22P02 crash.
  // creditTickets now sanitizes non-UUID strings to NULL with a console.warn instead
  // of letting them reach the RPC. Drift-Lock for the regression.
  it('drops non-UUID referenceId with warning (Slice 038 drift-lock)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockRpc('credit_tickets', { ok: true, new_balance: 250 });

    await creditTickets('u1', 25, 'achievement', 'first_trade', 'Achievement: first_trade');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('credit_tickets', expect.objectContaining({
      p_reference_id: null,
      p_description: 'Achievement: first_trade',
    }));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('referenceId "first_trade" is not a UUID'),
    );
    warnSpy.mockRestore();
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('credit_tickets', null, { message: 'RPC fail' });
    expect(await creditTickets('u1', 10, 'daily_login')).toEqual({ ok: false, error: 'RPC fail' });
    consoleSpy.mockRestore();
  });

  it('returns error when RPC returns ok=false', async () => {
    mockRpc('credit_tickets', { ok: false, error: 'Invalid amount' });
    expect(await creditTickets('u1', -5, 'daily_login')).toEqual({ ok: false, error: 'Invalid amount' });
  });

  it('handles null error in failure', async () => {
    mockRpc('credit_tickets', { ok: false });
    const result = await creditTickets('u1', 10, 'daily_login');
    expect(result.error).toBe('Unknown error');
  });
});

describe('spendTickets', () => {
  it('spends tickets via RPC', async () => {
    mockRpc('spend_tickets', { ok: true, new_balance: 85 });
    const result = await spendTickets('u1', 15, 'mystery_box');
    expect(result).toEqual({ ok: true, newBalance: 85 });
  });

  it('returns error on insufficient balance', async () => {
    mockRpc('spend_tickets', { ok: false, error: 'Insufficient tickets' });
    expect(await spendTickets('u1', 999, 'mystery_box')).toEqual({ ok: false, error: 'Insufficient tickets' });
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('spend_tickets', null, { message: 'err' });
    expect(await spendTickets('u1', 10, 'mystery_box')).toEqual({ ok: false, error: 'err' });
    consoleSpy.mockRestore();
  });
});
