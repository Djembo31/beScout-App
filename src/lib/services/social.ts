import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import { ACHIEVEMENTS } from '@/lib/achievements';
import type { DbUserStats, DbUserAchievement, LeaderboardUser, FeedItem } from '@/types';

const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Follow / Unfollow
// ============================================

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase.rpc('follow_user', {
    p_follower_id: followerId,
    p_following_id: followingId,
  });
  if (error) throw new Error(error.message);
  invalidate(`followers:${followingId}`);
  invalidate(`following:${followerId}`);
  invalidate(`isFollowing:${followerId}:${followingId}`);
  invalidate(`userStats:${followingId}`);
  invalidate('leaderboard:');

  // Mission tracking
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(followerId, ['weekly_follow_3']);
  }).catch(() => {});
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(followerId, 'follow', 'social', { followingId });
  }).catch(() => {});

  // Fire-and-forget notification to followed user
  import('@/lib/services/notifications').then(m => {
    m.createNotification(
      followingId,
      'follow',
      'Neuer Follower',
      undefined,
      followerId,
      'profile'
    );
  }).catch(() => {});

  // Fire-and-forget: refresh stats + check achievements for followed user (follower count changed)
  refreshUserStats(followingId)
    .then(() => checkAndUnlockAchievements(followingId))
    .catch(() => {});
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase.rpc('unfollow_user', {
    p_follower_id: followerId,
    p_following_id: followingId,
  });
  if (error) throw new Error(error.message);
  invalidate(`followers:${followingId}`);
  invalidate(`following:${followerId}`);
  invalidate(`isFollowing:${followerId}:${followingId}`);
  invalidate(`userStats:${followingId}`);
  invalidate('leaderboard:');
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(followerId, 'unfollow', 'social', { followingId });
  }).catch(() => {});
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  return cached(`isFollowing:${followerId}:${followingId}`, async () => {
    const { data, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return !!data;
  }, TWO_MIN);
}

// ============================================
// Follower / Following Counts + Lists
// ============================================

export async function getFollowerCount(userId: string): Promise<number> {
  return cached(`followers:${userId}:count`, async () => {
    const { count, error } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }, TWO_MIN);
}

export async function getFollowingCount(userId: string): Promise<number> {
  return cached(`following:${userId}:count`, async () => {
    const { count, error } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }, TWO_MIN);
}

export type ProfileSummary = {
  userId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  totalScore: number;
};

/** Get follower list with profile details */
export async function getFollowerList(userId: string, limit = 50): Promise<ProfileSummary[]> {
  return cached(`followers:${userId}:list`, async () => {
    const { data, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId)
      .limit(limit);
    if (error || !data || data.length === 0) return [];

    const ids = data.map(r => r.follower_id);
    const [profilesRes, statsRes] = await Promise.allSettled([
      supabase.from('profiles').select('id, handle, display_name, avatar_url, level').in('id', ids),
      supabase.from('user_stats').select('user_id, total_score').in('user_id', ids),
    ]);

    const profiles = profilesRes.status === 'fulfilled' ? (profilesRes.value.data ?? []) : [];
    const stats = statsRes.status === 'fulfilled' ? (statsRes.value.data ?? []) : [];
    const statsMap = new Map(stats.map(s => [s.user_id, s.total_score as number]));

    return profiles.map(p => ({
      userId: p.id,
      handle: p.handle,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      level: p.level ?? 1,
      totalScore: statsMap.get(p.id) ?? 0,
    }));
  }, TWO_MIN);
}

/** Get following list with profile details */
export async function getFollowingList(userId: string, limit = 50): Promise<ProfileSummary[]> {
  return cached(`following:${userId}:list`, async () => {
    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
      .limit(limit);
    if (error || !data || data.length === 0) return [];

    const ids = data.map(r => r.following_id);
    const [profilesRes, statsRes] = await Promise.allSettled([
      supabase.from('profiles').select('id, handle, display_name, avatar_url, level').in('id', ids),
      supabase.from('user_stats').select('user_id, total_score').in('user_id', ids),
    ]);

    const profiles = profilesRes.status === 'fulfilled' ? (profilesRes.value.data ?? []) : [];
    const stats = statsRes.status === 'fulfilled' ? (statsRes.value.data ?? []) : [];
    const statsMap = new Map(stats.map(s => [s.user_id, s.total_score as number]));

    return profiles.map(p => ({
      userId: p.id,
      handle: p.handle,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      level: p.level ?? 1,
      totalScore: statsMap.get(p.id) ?? 0,
    }));
  }, TWO_MIN);
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  return cached(`following:${userId}:ids`, async () => {
    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => r.following_id);
  }, TWO_MIN);
}

// ============================================
// User Stats
// ============================================

export async function getUserStats(userId: string): Promise<DbUserStats | null> {
  return cached(`userStats:${userId}`, async () => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as DbUserStats | null;
  }, TWO_MIN);
}

export async function refreshUserStats(userId: string): Promise<DbUserStats | null> {
  const { data, error } = await supabase.rpc('refresh_user_stats', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  invalidate(`userStats:${userId}`);
  invalidate('leaderboard:');
  invalidate(`profile:${userId}`);
  return data as DbUserStats | null;
}

// ============================================
// Leaderboard
// ============================================

export async function getLeaderboard(limit = 50): Promise<LeaderboardUser[]> {
  return cached(`leaderboard:top${limit}`, async () => {
    const { data, error } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        trading_score,
        manager_score,
        scout_score,
        total_score,
        followers_count,
        rank
      `)
      .order('rank', { ascending: true })
      .gt('rank', 0)
      .limit(limit);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    // Fetch profiles for these users
    const userIds = data.map(r => r.user_id);
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, level, verified')
      .in('id', userIds);

    if (pErr) throw new Error(pErr.message);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    return data.map(r => {
      const p = profileMap.get(r.user_id);
      return {
        rank: r.rank,
        userId: r.user_id,
        handle: p?.handle ?? 'unknown',
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        level: p?.level ?? 1,
        verified: p?.verified ?? false,
        totalScore: r.total_score,
        tradingScore: r.trading_score,
        managerScore: r.manager_score,
        scoutScore: r.scout_score,
        followersCount: r.followers_count,
      };
    });
  }, FIVE_MIN);
}

// ============================================
// Achievements
// ============================================

export async function getUserAchievements(userId: string): Promise<DbUserAchievement[]> {
  return cached(`achievements:${userId}`, async () => {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DbUserAchievement[];
  }, FIVE_MIN);
}

export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
  // Get current stats and existing achievements
  const [stats, existing] = await Promise.all([
    getUserStats(userId),
    getUserAchievements(userId),
  ]);

  if (!stats) return [];

  const unlockedKeys = new Set(existing.map(a => a.achievement_key));
  const newUnlocks: string[] = [];

  // Lazy-query podium count (top 3 finishes) only if not yet unlocked
  let podiumCount = 0;
  if (!unlockedKeys.has('podium_3x')) {
    const { count } = await supabase
      .from('lineups')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('rank', 3)
      .not('rank', 'is', null);
    podiumCount = count ?? 0;
  }

  // Lazy-query approved bounty submissions only if not yet unlocked
  let approvedBounties = 0;
  if (!unlockedKeys.has('first_bounty')) {
    const { count } = await supabase
      .from('bounty_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved');
    approvedBounties = count ?? 0;
  }

  // Check each achievement
  const checks: [string, boolean][] = [
    ['first_trade', stats.trades_count >= 1],
    ['10_trades', stats.trades_count >= 10],
    ['50_trades', stats.trades_count >= 50],
    ['100_trades', stats.trades_count >= 100],
    ['portfolio_1000', stats.portfolio_value_cents >= 100000],
    ['portfolio_10000', stats.portfolio_value_cents >= 1000000],
    ['diverse_5', stats.holdings_diversity >= 5],
    ['diverse_15', stats.holdings_diversity >= 15],
    ['first_event', stats.events_count >= 1],
    ['5_events', stats.events_count >= 5],
    ['20_events', stats.events_count >= 20],
    ['event_winner', stats.best_rank === 1],
    ['podium_3x', podiumCount >= 3],
    ['5_followers', stats.followers_count >= 5],
    ['10_followers', stats.followers_count >= 10],
    ['50_followers', stats.followers_count >= 50],
    ['first_vote', stats.votes_cast >= 1],
    ['10_votes', stats.votes_cast >= 10],
    ['first_bounty', approvedBounties >= 1],
  ];

  for (const [key, condition] of checks) {
    if (condition && !unlockedKeys.has(key) && ACHIEVEMENTS.find(a => a.key === key)) {
      const { error } = await supabase
        .from('user_achievements')
        .insert({ user_id: userId, achievement_key: key })
        .select()
        .maybeSingle();
      if (!error) newUnlocks.push(key);
    }
  }

  if (newUnlocks.length > 0) {
    invalidate(`achievements:${userId}`);
  }

  return newUnlocks;
}

// ============================================
// Following Feed
// ============================================

const FEED_ACTIONS = [
  'trade_buy', 'trade_sell', 'research_create', 'post_create',
  'lineup_submit', 'follow', 'bounty_submit', 'bounty_create',
  'offer_create', 'offer_accept', 'poll_create', 'vote_create',
];

export async function getFollowingFeed(userId: string, limit = 15): Promise<FeedItem[]> {
  const followingIds = await getFollowingIds(userId);
  if (followingIds.length === 0) return [];

  return cached(`followingFeed:${userId}`, async () => {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, user_id, action, category, metadata, created_at')
      .in('user_id', followingIds)
      .in('action', FEED_ACTIONS)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    // Get profiles for all unique user IDs
    const userIds = Array.from(new Set(data.map(d => d.user_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    return data.map(d => {
      const profile = profileMap.get(d.user_id);
      return {
        id: d.id,
        userId: d.user_id,
        handle: profile?.handle ?? 'unknown',
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        action: d.action,
        category: d.category,
        metadata: (d.metadata ?? {}) as Record<string, unknown>,
        createdAt: d.created_at,
      };
    });
  }, TWO_MIN);
}
