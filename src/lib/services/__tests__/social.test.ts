import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/services/tickets', () => ({ creditTickets: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/achievements', () => ({ ACHIEVEMENTS: [] }));

import {
  followUser, unfollowUser, isFollowing,
  getFollowerCount, getFollowingCount,
  getFollowerList, getFollowingList, getFollowingIds,
  getUserStats, refreshUserStats,
  getLeaderboard, getUserAchievements,
  getFollowingFeed,
} from '../social';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// followUser / unfollowUser
// ============================================
describe('followUser', () => {
  it('calls follow_user RPC', async () => {
    mockRpc('follow_user', null);
    await followUser('u1', 'u2');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('follow_user', {
      p_follower_id: 'u1', p_following_id: 'u2',
    });
  });
  it('throws on RPC error', async () => {
    mockRpc('follow_user', null, { message: 'Already following' });
    await expect(followUser('u1', 'u2')).rejects.toThrow('Already following');
  });
});

describe('unfollowUser', () => {
  it('calls unfollow_user RPC', async () => {
    mockRpc('unfollow_user', null);
    await unfollowUser('u1', 'u2');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('unfollow_user', {
      p_follower_id: 'u1', p_following_id: 'u2',
    });
  });
  it('throws on error', async () => {
    mockRpc('unfollow_user', null, { message: 'Not following' });
    await expect(unfollowUser('u1', 'u2')).rejects.toThrow('Not following');
  });
});

// ============================================
// isFollowing
// ============================================
describe('isFollowing', () => {
  it('returns true when follow exists', async () => {
    mockTable('user_follows', { follower_id: 'u1' });
    expect(await isFollowing('u1', 'u2')).toBe(true);
  });
  it('returns false when no follow', async () => {
    mockTable('user_follows', null);
    expect(await isFollowing('u1', 'u2')).toBe(false);
  });
  it('throws on error', async () => {
    mockTable('user_follows', null, { message: 'err' });
    await expect(isFollowing('u1', 'u2')).rejects.toThrow('err');
  });
});

// ============================================
// Counts
// ============================================
describe('getFollowerCount', () => {
  it('returns count', async () => {
    mockTable('user_follows', null, null, 42);
    expect(await getFollowerCount('u1')).toBe(42);
  });
  it('returns 0 when null', async () => {
    mockTable('user_follows', null, null, null);
    expect(await getFollowerCount('u1')).toBe(0);
  });
  it('throws on error', async () => {
    mockTable('user_follows', null, { message: 'err' });
    await expect(getFollowerCount('u1')).rejects.toThrow('err');
  });
});

describe('getFollowingCount', () => {
  it('returns count', async () => {
    mockTable('user_follows', null, null, 10);
    expect(await getFollowingCount('u1')).toBe(10);
  });
  it('throws on error', async () => {
    mockTable('user_follows', null, { message: 'err' });
    await expect(getFollowingCount('u1')).rejects.toThrow('err');
  });
});

// ============================================
// Lists
// ============================================
describe('getFollowerList', () => {
  it('returns enriched follower profiles', async () => {
    // Step 1: follower IDs
    mockTable('user_follows', [{ follower_id: 'u2' }]);
    // Step 2: profiles (parallel)
    mockTable('profiles', [{ id: 'u2', handle: 'bob', display_name: 'Bob', avatar_url: null, level: 3 }]);
    // Step 3: stats (parallel)
    mockTable('user_stats', [{ user_id: 'u2', total_score: 500 }]);

    const result = await getFollowerList('u1');
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe('bob');
    expect(result[0].totalScore).toBe(500);
  });

  it('returns [] when no followers', async () => {
    mockTable('user_follows', []);
    expect(await getFollowerList('u1')).toEqual([]);
  });

  it('returns [] on error', async () => {
    mockTable('user_follows', null, { message: 'err' });
    expect(await getFollowerList('u1')).toEqual([]);
  });
});

describe('getFollowingList', () => {
  it('returns enriched following profiles', async () => {
    mockTable('user_follows', [{ following_id: 'u3' }]);
    mockTable('profiles', [{ id: 'u3', handle: 'charlie', display_name: null, avatar_url: null, level: null }]);
    mockTable('user_stats', []);

    const result = await getFollowingList('u1');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe(1); // defaults to 1
    expect(result[0].totalScore).toBe(0); // no stats
  });

  it('returns [] when not following anyone', async () => {
    mockTable('user_follows', []);
    expect(await getFollowingList('u1')).toEqual([]);
  });
});

// ============================================
// getFollowingIds
// ============================================
describe('getFollowingIds', () => {
  it('returns IDs', async () => {
    mockTable('user_follows', [{ following_id: 'u2' }, { following_id: 'u3' }]);
    expect(await getFollowingIds('u1')).toEqual(['u2', 'u3']);
  });
  it('returns [] when null data', async () => {
    mockTable('user_follows', null);
    expect(await getFollowingIds('u1')).toEqual([]);
  });
  it('throws on error', async () => {
    mockTable('user_follows', null, { message: 'err' });
    await expect(getFollowingIds('u1')).rejects.toThrow('err');
  });
});

// ============================================
// User Stats
// ============================================
describe('getUserStats', () => {
  it('returns user stats', async () => {
    const stats = { user_id: 'u1', total_score: 1500, trades_count: 25, rank: 5 };
    mockTable('user_stats', stats);
    expect(await getUserStats('u1')).toEqual(stats);
  });
  it('returns null when no stats', async () => {
    mockTable('user_stats', null);
    expect(await getUserStats('u1')).toBeNull();
  });
  it('throws on error', async () => {
    mockTable('user_stats', null, { message: 'err' });
    await expect(getUserStats('u1')).rejects.toThrow('err');
  });
});

describe('refreshUserStats', () => {
  it('refreshes via RPC', async () => {
    mockRpc('refresh_my_stats', { user_id: 'u1', total_score: 1600 });
    const result = await refreshUserStats('u1');
    expect(result?.total_score).toBe(1600);
  });
  it('throws on error', async () => {
    mockRpc('refresh_my_stats', null, { message: 'err' });
    await expect(refreshUserStats('u1')).rejects.toThrow('err');
  });
});

// ============================================
// Leaderboard
// ============================================
describe('getLeaderboard', () => {
  it('returns leaderboard with profiles', async () => {
    // Step 1: user_stats
    mockTable('user_stats', [{
      user_id: 'u1', trading_score: 100, manager_score: 200,
      scout_score: 150, total_score: 450, followers_count: 10, rank: 1,
    }]);
    // Step 2: profiles
    mockTable('profiles', [{
      id: 'u1', handle: 'alice', display_name: 'Alice',
      avatar_url: '/alice.png', level: 5, verified: true,
    }]);

    const result = await getLeaderboard(10);
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].handle).toBe('alice');
    expect(result[0].verified).toBe(true);
  });

  it('returns [] when no data', async () => {
    mockTable('user_stats', []);
    expect(await getLeaderboard()).toEqual([]);
  });

  it('throws on stats error', async () => {
    mockTable('user_stats', null, { message: 'err' });
    await expect(getLeaderboard()).rejects.toThrow('err');
  });

  it('throws on profiles error', async () => {
    mockTable('user_stats', [{ user_id: 'u1', rank: 1 }]);
    mockTable('profiles', null, { message: 'profile err' });
    await expect(getLeaderboard()).rejects.toThrow('profile err');
  });

  it('handles missing profile gracefully', async () => {
    mockTable('user_stats', [{ user_id: 'u1', total_score: 100, rank: 1, trading_score: 0, manager_score: 0, scout_score: 0, followers_count: 0 }]);
    mockTable('profiles', []); // no matching profiles
    const result = await getLeaderboard();
    expect(result[0].handle).toBe('unknown');
  });
});

// ============================================
// Achievements
// ============================================
describe('getUserAchievements', () => {
  it('returns achievements', async () => {
    const achievements = [
      { id: 'a1', user_id: 'u1', achievement_key: 'first_trade', unlocked_at: '2025-01-01' },
    ];
    mockTable('user_achievements', achievements);
    expect(await getUserAchievements('u1')).toEqual(achievements);
  });
  it('returns [] when null', async () => {
    mockTable('user_achievements', null);
    expect(await getUserAchievements('u1')).toEqual([]);
  });
  it('throws on error', async () => {
    mockTable('user_achievements', null, { message: 'err' });
    await expect(getUserAchievements('u1')).rejects.toThrow('err');
  });
});

// ============================================
// Following Feed
// ============================================
describe('getFollowingFeed', () => {
  it('returns feed with profile enrichment', async () => {
    // Step 1: getFollowingIds
    mockTable('user_follows', [{ following_id: 'u2' }]);
    // Step 2: activity_log
    mockTable('activity_log', [{
      id: 'al1', user_id: 'u2', action: 'trade_buy', category: 'trading',
      metadata: { playerId: 'p1' }, created_at: '2025-03-01',
    }]);
    // Step 3: profiles
    mockTable('profiles', [{ id: 'u2', handle: 'bob', display_name: 'Bob', avatar_url: null }]);

    const result = await getFollowingFeed('u1');
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe('bob');
    expect(result[0].action).toBe('trade_buy');
  });

  it('returns [] when not following anyone', async () => {
    mockTable('user_follows', []);
    expect(await getFollowingFeed('u1')).toEqual([]);
  });

  it('returns [] when no activity', async () => {
    mockTable('user_follows', [{ following_id: 'u2' }]);
    mockTable('activity_log', []);
    expect(await getFollowingFeed('u1')).toEqual([]);
  });

  it('throws on activity query error', async () => {
    mockTable('user_follows', [{ following_id: 'u2' }]);
    mockTable('activity_log', null, { message: 'err' });
    await expect(getFollowingFeed('u1')).rejects.toThrow('err');
  });
});
