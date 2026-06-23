import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockRpc, resetMocks } from '@/test/mocks/supabase';
import { getPlatformTreasuryBalance, getPlatformTreasuryLedger } from '../platformAdmin';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// Slice 357 — Plattform-Treasury (BeScout-Topf)
// ============================================

describe('getPlatformTreasuryBalance', () => {
  it('maps RPC success-shape to camelCase', async () => {
    mockRpc('get_platform_balance', { success: true, balance: 1200, total_in: 1500, total_out: 300 });
    const result = await getPlatformTreasuryBalance();
    expect(result).toEqual({ balance: 1200, totalIn: 1500, totalOut: 300 });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_platform_balance');
  });

  it('defaults missing numeric fields to 0', async () => {
    mockRpc('get_platform_balance', { success: true });
    expect(await getPlatformTreasuryBalance()).toEqual({ balance: 0, totalIn: 0, totalOut: 0 });
  });

  it('throws on RPC transport error', async () => {
    mockRpc('get_platform_balance', null, { message: 'rpc down' });
    await expect(getPlatformTreasuryBalance()).rejects.toThrow('rpc down');
  });

  it('throws on discriminated error-shape (success=false → not silent-cast)', async () => {
    mockRpc('get_platform_balance', { success: false, error: 'not_authorized' });
    await expect(getPlatformTreasuryBalance()).rejects.toThrow('not_authorized');
  });

  it('throws when success flag absent (defensive)', async () => {
    mockRpc('get_platform_balance', { balance: 999 });
    await expect(getPlatformTreasuryBalance()).rejects.toThrow();
  });
});

describe('getPlatformTreasuryLedger', () => {
  it('returns ledger rows and passes default limit', async () => {
    const rows = [{ id: 'l1', direction: 'credit', source: 'trading', amount: 1000, balance_after: 1000, description: null, created_at: '2026-06-24' }];
    mockRpc('get_platform_treasury_ledger', rows);
    const result = await getPlatformTreasuryLedger();
    expect(result).toEqual(rows);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_platform_treasury_ledger', { p_limit: 50 });
  });

  it('passes explicit limit', async () => {
    mockRpc('get_platform_treasury_ledger', []);
    await getPlatformTreasuryLedger(5);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_platform_treasury_ledger', { p_limit: 5 });
  });

  it('returns [] when RPC returns null (empty pot)', async () => {
    mockRpc('get_platform_treasury_ledger', null);
    expect(await getPlatformTreasuryLedger()).toEqual([]);
  });

  it('throws on RPC error', async () => {
    mockRpc('get_platform_treasury_ledger', null, { message: 'boom' });
    await expect(getPlatformTreasuryLedger()).rejects.toThrow('boom');
  });
});
