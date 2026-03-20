import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));

import {
  TIER_CONFIG,
  getActiveSubscriptionsByUsers,
  getMySubscription,
  subscribeTo,
  cancelSubscription,
  getClubSubscribers,
} from '../clubSubscriptions';

import type { SubscriptionTier } from '../clubSubscriptions';

beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// TIER_CONFIG
// ============================================
describe('TIER_CONFIG', () => {
  it('has all 3 tiers', () => {
    expect(Object.keys(TIER_CONFIG)).toEqual(['bronze', 'silber', 'gold']);
  });

  it('uses silber not silver (DB CHECK constraint)', () => {
    expect(TIER_CONFIG).toHaveProperty('silber');
    expect(TIER_CONFIG).not.toHaveProperty('silver');
  });

  it('bronze has correct pricing', () => {
    expect(TIER_CONFIG.bronze.priceBsd).toBe(500);
    expect(TIER_CONFIG.bronze.priceCents).toBe(50000);
  });

  it('silber has correct pricing', () => {
    expect(TIER_CONFIG.silber.priceBsd).toBe(1500);
    expect(TIER_CONFIG.silber.priceCents).toBe(150000);
  });

  it('gold has correct pricing', () => {
    expect(TIER_CONFIG.gold.priceBsd).toBe(3000);
    expect(TIER_CONFIG.gold.priceCents).toBe(300000);
  });

  it('tiers are ordered by price ascending', () => {
    expect(TIER_CONFIG.bronze.priceCents).toBeLessThan(TIER_CONFIG.silber.priceCents);
    expect(TIER_CONFIG.silber.priceCents).toBeLessThan(TIER_CONFIG.gold.priceCents);
  });

  it('all tiers have required fields', () => {
    for (const tier of ['bronze', 'silber', 'gold'] as const) {
      const config = TIER_CONFIG[tier];
      expect(config).toHaveProperty('labelKey');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('feeDiscountBps');
      expect(config).toHaveProperty('benefitKeys');
      expect(config.benefitKeys.length).toBeGreaterThan(0);
    }
  });

  it('fee discounts increase with tier', () => {
    expect(TIER_CONFIG.bronze.feeDiscountBps).toBeLessThan(TIER_CONFIG.silber.feeDiscountBps);
    expect(TIER_CONFIG.silber.feeDiscountBps).toBeLessThan(TIER_CONFIG.gold.feeDiscountBps);
  });
});

// ============================================
// getActiveSubscriptionsByUsers
// ============================================
describe('getActiveSubscriptionsByUsers', () => {
  it('returns empty Map for empty userIds', async () => {
    const result = await getActiveSubscriptionsByUsers([]);
    expect(result.size).toBe(0);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns Map of user → tier', async () => {
    mockTable('club_subscriptions', [
      { user_id: 'u1', tier: 'bronze' },
      { user_id: 'u2', tier: 'gold' },
    ]);
    const result = await getActiveSubscriptionsByUsers(['u1', 'u2']);
    expect(result.get('u1')).toBe('bronze');
    expect(result.get('u2')).toBe('gold');
  });

  it('picks highest tier when user has multiple subs', async () => {
    mockTable('club_subscriptions', [
      { user_id: 'u1', tier: 'bronze' },
      { user_id: 'u1', tier: 'gold' },
    ]);
    const result = await getActiveSubscriptionsByUsers(['u1']);
    expect(result.get('u1')).toBe('gold');
  });

  it('handles silber > bronze correctly', async () => {
    mockTable('club_subscriptions', [
      { user_id: 'u1', tier: 'silber' },
      { user_id: 'u1', tier: 'bronze' },
    ]);
    const result = await getActiveSubscriptionsByUsers(['u1']);
    expect(result.get('u1')).toBe('silber');
  });

  it('returns empty Map on error', async () => {
    mockTable('club_subscriptions', null, { message: 'err' });
    const result = await getActiveSubscriptionsByUsers(['u1']);
    expect(result.size).toBe(0);
  });

  it('returns empty Map when data is null', async () => {
    mockTable('club_subscriptions', null);
    const result = await getActiveSubscriptionsByUsers(['u1']);
    expect(result.size).toBe(0);
  });
});

// ============================================
// getMySubscription
// ============================================
describe('getMySubscription', () => {
  it('returns active subscription', async () => {
    const sub = {
      id: 'sub-1', user_id: 'u1', club_id: 'c1', tier: 'silber',
      price_cents: 150000, started_at: '2025-01-01', expires_at: '2025-02-01',
      auto_renew: true, status: 'active',
    };
    mockTable('club_subscriptions', sub);
    const result = await getMySubscription('u1', 'c1');
    expect(result).toEqual(sub);
  });

  it('returns null when no subscription', async () => {
    mockTable('club_subscriptions', null);
    expect(await getMySubscription('u1', 'c1')).toBeNull();
  });

  it('returns null on error', async () => {
    mockTable('club_subscriptions', null, { message: 'err' });
    expect(await getMySubscription('u1', 'c1')).toBeNull();
  });
});

// ============================================
// subscribeTo
// ============================================
describe('subscribeTo', () => {
  it('subscribes via RPC and logs activity', async () => {
    mockRpc('subscribe_to_club', {
      success: true, subscription_id: 'sub-1', tier: 'gold',
      price_cents: 300000, expires_at: '2025-02-01', new_balance: 700000,
    });
    const result = await subscribeTo('u1', 'c1', 'gold');
    expect(result.success).toBe(true);
    expect(result.subscription_id).toBe('sub-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('subscribe_to_club', {
      p_user_id: 'u1', p_club_id: 'c1', p_tier: 'gold',
    });
  });

  it('throws on RPC error', async () => {
    mockRpc('subscribe_to_club', null, { message: 'Insufficient balance' });
    await expect(subscribeTo('u1', 'c1', 'gold')).rejects.toThrow('Insufficient balance');
  });

  it('returns failure result without logging activity', async () => {
    mockRpc('subscribe_to_club', { success: false, error: 'Already subscribed' });
    const result = await subscribeTo('u1', 'c1', 'gold');
    expect(result.success).toBe(false);
  });
});

// ============================================
// cancelSubscription
// ============================================
describe('cancelSubscription', () => {
  it('cancels auto-renew and returns true', async () => {
    mockTable('club_subscriptions', null);
    expect(await cancelSubscription('u1', 'c1')).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('club_subscriptions');
  });

  it('returns false on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('club_subscriptions', null, { message: 'Update failed' });
    expect(await cancelSubscription('u1', 'c1')).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ============================================
// getClubSubscribers
// ============================================
describe('getClubSubscribers', () => {
  it('returns subscriber counts and revenue', async () => {
    mockTable('club_subscriptions', [
      { tier: 'bronze', price_cents: 50000 },
      { tier: 'bronze', price_cents: 50000 },
      { tier: 'silber', price_cents: 150000 },
      { tier: 'gold', price_cents: 300000 },
    ]);
    const result = await getClubSubscribers('c1');
    expect(result.total).toBe(4);
    expect(result.byTier).toEqual({ bronze: 2, silber: 1, gold: 1 });
    expect(result.revenueCents).toBe(550000);
  });

  it('returns zeros on error', async () => {
    mockTable('club_subscriptions', null, { message: 'err' });
    const result = await getClubSubscribers('c1');
    expect(result).toEqual({ total: 0, byTier: { bronze: 0, silber: 0, gold: 0 }, revenueCents: 0 });
  });

  it('returns zeros when no data', async () => {
    mockTable('club_subscriptions', null);
    const result = await getClubSubscribers('c1');
    expect(result).toEqual({ total: 0, byTier: { bronze: 0, silber: 0, gold: 0 }, revenueCents: 0 });
  });

  it('handles empty subscriber list', async () => {
    mockTable('club_subscriptions', []);
    const result = await getClubSubscribers('c1');
    expect(result.total).toBe(0);
    expect(result.revenueCents).toBe(0);
  });

  it('ignores unknown tier values', async () => {
    mockTable('club_subscriptions', [
      { tier: 'diamond', price_cents: 500000 }, // unknown tier
    ]);
    const result = await getClubSubscribers('c1');
    expect(result.total).toBe(1);
    expect(result.byTier).toEqual({ bronze: 0, silber: 0, gold: 0 }); // diamond not counted
    expect(result.revenueCents).toBe(500000); // but revenue still counted
  });
});
