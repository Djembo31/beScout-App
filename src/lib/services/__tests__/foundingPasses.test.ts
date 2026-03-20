import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/foundingPasses', () => ({
  compareTiers: (a: string, b: string) => {
    const rank: Record<string, number> = { fan: 0, scout: 1, pro: 2, founder: 3 };
    return (rank[a] ?? 0) - (rank[b] ?? 0);
  },
}));

import {
  getUserFoundingPasses, getHighestPass, grantFoundingPass,
  getFoundingPassCounts, hasFoundingPass,
} from '../foundingPasses';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getUserFoundingPasses', () => {
  it('returns passes sorted by created_at desc', async () => {
    const passes = [
      { id: 'fp1', tier: 'founder', created_at: '2025-02-01' },
      { id: 'fp2', tier: 'scout', created_at: '2025-01-01' },
    ];
    mockTable('user_founding_passes', passes);
    expect(await getUserFoundingPasses('u1')).toEqual(passes);
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('user_founding_passes', null, { message: 'err' });
    expect(await getUserFoundingPasses('u1')).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when null data', async () => {
    mockTable('user_founding_passes', null);
    expect(await getUserFoundingPasses('u1')).toEqual([]);
  });
});

describe('getHighestPass', () => {
  it('returns the highest-tier pass', async () => {
    mockTable('user_founding_passes', [
      { id: 'fp1', tier: 'scout', created_at: '2025-01-01' },
      { id: 'fp2', tier: 'founder', created_at: '2025-02-01' },
      { id: 'fp3', tier: 'fan', created_at: '2025-03-01' },
    ]);
    const result = await getHighestPass('u1');
    expect(result?.tier).toBe('founder');
  });

  it('returns null when no passes', async () => {
    mockTable('user_founding_passes', []);
    expect(await getHighestPass('u1')).toBeNull();
  });
});

describe('grantFoundingPass', () => {
  it('grants pass via RPC', async () => {
    mockRpc('grant_founding_pass', {
      ok: true, pass_id: 'fp-new', bcredits_granted: 50000, new_balance: 150000,
    });
    const result = await grantFoundingPass('u1', 'pro', 9900, 'stripe-pi-123');
    expect(result).toEqual({
      ok: true, passId: 'fp-new', bcreditsGranted: 50000, newBalance: 150000,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('grant_founding_pass', {
      p_user_id: 'u1', p_tier: 'pro', p_price_eur_cents: 9900, p_payment_reference: 'stripe-pi-123',
    });
  });

  it('passes null for missing payment reference', async () => {
    mockRpc('grant_founding_pass', { ok: true, pass_id: 'fp-2' });
    await grantFoundingPass('u1', 'fan', 2900);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('grant_founding_pass', expect.objectContaining({
      p_payment_reference: null,
    }));
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('grant_founding_pass', null, { message: 'err' });
    expect(await grantFoundingPass('u1', 'founder', 29900)).toEqual({ ok: false, error: 'err' });
    consoleSpy.mockRestore();
  });

  it('returns error when RPC returns ok=false', async () => {
    mockRpc('grant_founding_pass', { ok: false, error: 'Already has founder pass' });
    expect(await grantFoundingPass('u1', 'founder', 29900)).toEqual({ ok: false, error: 'Already has founder pass' });
  });
});

describe('getFoundingPassCounts', () => {
  it('counts by tier', async () => {
    mockTable('user_founding_passes', [
      { tier: 'fan' }, { tier: 'fan' }, { tier: 'scout' }, { tier: 'pro' }, { tier: 'founder' },
    ]);
    const result = await getFoundingPassCounts();
    expect(result.total).toBe(5);
    expect(result.byTier).toEqual({ fan: 2, scout: 1, pro: 1, founder: 1 });
  });

  it('returns zeros on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('user_founding_passes', null, { message: 'err' });
    const result = await getFoundingPassCounts();
    expect(result.total).toBe(0);
    consoleSpy.mockRestore();
  });

  it('ignores unknown tiers', async () => {
    mockTable('user_founding_passes', [{ tier: 'vip' }]);
    expect((await getFoundingPassCounts()).total).toBe(0);
  });
});

describe('hasFoundingPass', () => {
  it('returns true when user has pass', async () => {
    mockTable('user_founding_passes', null, null, 2);
    expect(await hasFoundingPass('u1')).toBe(true);
  });

  it('returns false when no passes', async () => {
    mockTable('user_founding_passes', null, null, 0);
    expect(await hasFoundingPass('u1')).toBe(false);
  });

  it('returns false on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('user_founding_passes', null, { message: 'err' });
    expect(await hasFoundingPass('u1')).toBe(false);
    consoleSpy.mockRestore();
  });
});
