import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';

import { getClubFanSegments, getClubFanList, getClubRetentionMetrics } from '../clubCrm';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// getClubFanSegments
// ============================================
describe('getClubFanSegments', () => {
  it('returns all segments with counts', async () => {
    // Batch 1 (parallel via Promise.all): followers, subs, players
    mockTable('club_followers', null, null, 100); // follower count
    mockTable('club_subscriptions', [
      { tier: 'bronze', user_id: 'u1' },
      { tier: 'silber', user_id: 'u2' },
      { tier: 'gold', user_id: 'u3' },
      { tier: 'gold', user_id: 'u4' },
    ]);
    mockTable('players', [{ id: 'p1' }, { id: 'p2' }]);
    // Batch 2: holdings count
    mockTable('holdings', null, null, 30);

    const result = await getClubFanSegments('c1');
    expect(result).toHaveLength(6);
    expect(result.find(s => s.id === 'all')?.count).toBe(100);
    expect(result.find(s => s.id === 'bronze')?.count).toBe(1);
    expect(result.find(s => s.id === 'silber')?.count).toBe(1);
    expect(result.find(s => s.id === 'gold')?.count).toBe(2);
    expect(result.find(s => s.id === 'trader')?.count).toBe(30);
    // free = total - subs = 100 - 4 = 96
    expect(result.find(s => s.id === 'free')?.count).toBe(96);
  });

  it('handles no players (skips holdings query)', async () => {
    mockTable('club_followers', null, null, 5);
    mockTable('club_subscriptions', []);
    mockTable('players', []);
    // No holdings query should happen
    const result = await getClubFanSegments('c1');
    expect(result.find(s => s.id === 'trader')?.count).toBe(0);
  });

  it('handles null subscriber data', async () => {
    mockTable('club_followers', null, null, 10);
    mockTable('club_subscriptions', null);
    mockTable('players', []);
    const result = await getClubFanSegments('c1');
    expect(result.find(s => s.id === 'free')?.count).toBe(10);
  });
});

// ============================================
// getClubFanList
// ============================================
describe('getClubFanList', () => {
  it('returns fan profiles with segments', async () => {
    // Batch 1: followers + players
    mockTable('club_followers', [{ user_id: 'u1', created_at: '2025-01-01' }]);
    mockTable('players', [{ id: 'p1' }]);
    // Batch 2: profiles, subs, holdings, activities
    mockTable('profiles', [{ id: 'u1', handle: 'alice', display_name: 'Alice', avatar_url: null }]);
    mockTable('club_subscriptions', [{ user_id: 'u1', tier: 'gold' }]);
    mockTable('holdings', [{ user_id: 'u1', quantity: 5 }]);
    mockTable('activity_log', [{ user_id: 'u1', created_at: '2025-03-01' }]);

    const result = await getClubFanList('c1');
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe('alice');
    expect(result[0].tier).toBe('gold');
    expect(result[0].segment).toBe('gold'); // tier takes precedence
    expect(result[0].holdingsCount).toBe(5);
    expect(result[0].lastActivity).toBe('2025-03-01');
  });

  it('returns [] when no followers', async () => {
    mockTable('club_followers', []);
    mockTable('players', []);
    expect(await getClubFanList('c1')).toEqual([]);
  });

  it('returns [] when followers data is null', async () => {
    mockTable('club_followers', null);
    mockTable('players', []);
    expect(await getClubFanList('c1')).toEqual([]);
  });

  it('filters by segment', async () => {
    mockTable('club_followers', [
      { user_id: 'u1', created_at: '2025-01-01' },
      { user_id: 'u2', created_at: '2025-01-02' },
    ]);
    mockTable('players', []);
    mockTable('profiles', [
      { id: 'u1', handle: 'a', display_name: null, avatar_url: null },
      { id: 'u2', handle: 'b', display_name: null, avatar_url: null },
    ]);
    mockTable('club_subscriptions', [{ user_id: 'u1', tier: 'gold' }]);
    mockTable('holdings', null); // holdings result
    mockTable('activity_log', []);

    const result = await getClubFanList('c1', 'gold');
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe('a');
  });

  it('assigns trader segment when user has holdings but no sub', async () => {
    mockTable('club_followers', [{ user_id: 'u1', created_at: '2025-01-01' }]);
    mockTable('players', [{ id: 'p1' }]);
    mockTable('profiles', [{ id: 'u1', handle: 'trader', display_name: null, avatar_url: null }]);
    mockTable('club_subscriptions', []);
    mockTable('holdings', [{ user_id: 'u1', quantity: 3 }]);
    mockTable('activity_log', []);

    const result = await getClubFanList('c1');
    expect(result[0].segment).toBe('trader');
  });
});

// ============================================
// getClubRetentionMetrics
// ============================================
describe('getClubRetentionMetrics', () => {
  it('returns retention metrics', async () => {
    // Followers query (with count)
    mockTable('club_followers', [{ user_id: 'u1' }, { user_id: 'u2' }], null, 2);
    // DAU, WAU, MAU queries + subscribers
    mockTable('activity_log', null, null, 1); // dau
    mockTable('activity_log', null, null, 2); // wau
    mockTable('activity_log', null, null, 2); // mau
    mockTable('club_subscriptions', null, null, 1); // subscribers

    const result = await getClubRetentionMetrics('c1');
    expect(result.totalFollowers).toBe(2);
    expect(result.dau).toBe(1);
    expect(result.wau).toBe(2);
    expect(result.mau).toBe(2);
    expect(result.totalSubscribers).toBe(1);
  });

  it('returns zeros when no followers', async () => {
    mockTable('club_followers', [], null, 0);
    const result = await getClubRetentionMetrics('c1');
    expect(result).toEqual({ dau: 0, wau: 0, mau: 0, totalFollowers: 0, totalSubscribers: 0 });
  });

  it('returns zeros when followers is null', async () => {
    mockTable('club_followers', null, null, null);
    const result = await getClubRetentionMetrics('c1');
    expect(result).toEqual({ dau: 0, wau: 0, mau: 0, totalFollowers: 0, totalSubscribers: 0 });
  });
});
