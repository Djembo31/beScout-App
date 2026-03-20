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

  it('returns null on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('get_user_tickets', null, { message: 'err' });
    expect(await getUserTickets('u1')).toBeNull();
    consoleSpy.mockRestore();
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

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('ticket_transactions', null, { message: 'err' });
    expect(await getTicketTransactions('u1')).toEqual([]);
    consoleSpy.mockRestore();
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

  it('passes optional params', async () => {
    mockRpc('credit_tickets', { ok: true, new_balance: 200 });
    await creditTickets('u1', 10, 'mission', 'ref-1', 'Mission complete');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('credit_tickets', expect.objectContaining({
      p_reference_id: 'ref-1', p_description: 'Mission complete',
    }));
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
