import { supabase } from '@/lib/supabaseClient';
import { ACHIEVEMENTS } from '@/lib/achievements';
import type { DbUserStats, DbUserAchievement, LeaderboardUser, FeedItem } from '@/types';

// ============================================
// Follow / Unfollow
// ============================================

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase.rpc('follow_user', {
    p_follower_id: followerId,
    p_following_id: followingId,
  });
  if (error) throw new Error(error.message);

  // Mission tracking
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(followerId, ['weekly_follow_3']);
  }).catch(err => console.error('[Social] Follow mission tracking failed:', err));
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(followerId, 'follow', 'social', { followingId });
  }).catch(err => console.error('[Social] Follow activity log failed:', err));

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
  }).catch(err => console.error('[Social] Follow notification failed:', err));

  // Fire-and-forget: refresh stats + check achievements for followed user (follower count changed)
  refreshUserStats(followingId)
    .then(() => checkAndUnlockAchievements(followingId))
    .catch(err => console.error('[Social] Follow stats/achievements refresh failed:', err));
  // Fire-and-forget: +2 Analyst for followed user (new follower)
  import('@/lib/services/scoutScores').then(m => {
    m.awardDimensionScoreAsync(followingId, 'analyst', 2, 'new_follower', followerId);
  }).catch(err => console.error('[Social] Follow analyst score failed:', err));
  // Fire-and-forget: airdrop score refresh for followed user
  import('@/lib/services/airdropScore').then(m => m.refreshAirdropScore(followingId)).catch(err => console.error('[Social] Follow airdrop score refresh failed:', err));
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase.rpc('unfollow_user', {
    p_follower_id: followerId,
    p_following_id: followingId,
  });
  if (error) throw new Error(error.message);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(followerId, 'unfollow', 'social', { followingId });
  }).catch(err => console.error('[Social] Unfollow activity log failed:', err));
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

// ============================================
// Follower / Following Counts + Lists
// ============================================

export async function getFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
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
}

/** Get following list with profile details */
export async function getFollowingList(userId: string, limit = 50): Promise<ProfileSummary[]> {
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
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => r.following_id);
}

// ============================================
// User Stats
// ============================================

export async function getUserStats(userId: string): Promise<DbUserStats | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as DbUserStats | null;
}

export async function refreshUserStats(userId: string): Promise<DbUserStats | null> {
  const { data, error } = await supabase.rpc('refresh_user_stats', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data as DbUserStats | null;
}

// ============================================
// Leaderboard
// ============================================

export async function getLeaderboard(limit = 50): Promise<LeaderboardUser[]> {
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
}

// ============================================
// Achievements
// ============================================

export async function getUserAchievements(userId: string): Promise<DbUserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbUserAchievement[];
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

  // Lazy-query sell orders count
  let sellOrderCount = 0;
  if (!unlockedKeys.has('sell_order')) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('side', 'sell');
    sellOrderCount = count ?? 0;
  }

  // Lazy-query verified status
  let isVerified = false;
  if (!unlockedKeys.has('verified')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('verified')
      .eq('id', userId)
      .maybeSingle();
    isVerified = profile?.verified === true;
  }

  // Lazy-query posts count + upvotes received (shared query)
  let postsCount = 0;
  let upvotesReceived = 0;
  if (!unlockedKeys.has('first_post') || !unlockedKeys.has('10_upvotes')) {
    const { data: myPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId);
    postsCount = (myPosts ?? []).length;

    if (!unlockedKeys.has('10_upvotes') && postsCount > 0) {
      const myPostIds = (myPosts ?? []).map(p => p.id as string);
      const { count } = await supabase
        .from('post_votes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', myPostIds)
        .eq('vote_type', 1);
      upvotesReceived = count ?? 0;
    }
  }

  // Lazy-query research posts + research sold
  let researchCount = 0;
  let researchSoldCount = 0;
  if (!unlockedKeys.has('first_research') || !unlockedKeys.has('research_sold')) {
    const { data: myResearch } = await supabase
      .from('research_posts')
      .select('id')
      .eq('user_id', userId);
    researchCount = (myResearch ?? []).length;

    if (!unlockedKeys.has('research_sold') && researchCount > 0) {
      const researchIds = (myResearch ?? []).map(r => r.id as string);
      const { count } = await supabase
        .from('research_unlocks')
        .select('*', { count: 'exact', head: true })
        .in('research_id', researchIds);
      researchSoldCount = count ?? 0;
    }
  }

  // Lazy-query scout_scores for new gamification achievements
  let managerScore = 0;
  let allSilverPlus = false;
  let consecutiveProfits = 0;
  let maxHoldDays = 0;
  let profileCount = Infinity;

  const needsScoutScores = !unlockedKeys.has('gold_standard') || !unlockedKeys.has('complete_scout');
  const needsSmartMoney = !unlockedKeys.has('smart_money');
  const needsDiamondHands = !unlockedKeys.has('diamond_hands');
  const needsFoundingScout = !unlockedKeys.has('founding_scout');
  const needsScoutNetwork = !unlockedKeys.has('scout_network');

  if (needsScoutScores) {
    const { data: scores } = await supabase
      .from('scout_scores')
      .select('trader_score, manager_score, analyst_score')
      .eq('user_id', userId)
      .maybeSingle();
    if (scores) {
      managerScore = scores.manager_score ?? 0;
      allSilverPlus = (scores.trader_score ?? 0) >= 1000
        && (scores.manager_score ?? 0) >= 1000
        && (scores.analyst_score ?? 0) >= 1000;
    }
  }

  if (needsSmartMoney) {
    // Check last 10 trades for consecutive profits
    const { data: recentTrades } = await supabase
      .from('trades')
      .select('price, player_id, buyer_id, seller_id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('executed_at', { ascending: false })
      .limit(10);
    if (recentTrades) {
      let streak = 0;
      for (const t of recentTrades) {
        // Selling at profit = seller gets more than avg_buy_price
        if (t.seller_id === userId) {
          streak++;
        } else {
          break; // Only count consecutive sells (simplified check)
        }
      }
      consecutiveProfits = streak;
    }
  }

  if (needsDiamondHands) {
    const { data: masteryData } = await supabase
      .from('dpc_mastery')
      .select('hold_days')
      .eq('user_id', userId)
      .order('hold_days', { ascending: false })
      .limit(1);
    maxHoldDays = masteryData?.[0]?.hold_days ?? 0;
  }

  if (needsFoundingScout) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    profileCount = count ?? Infinity;
    // Also check if user was among first 50 by created_at
    const { data: earlyUsers } = await supabase
      .from('profiles')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(50);
    const earlyIds = new Set((earlyUsers ?? []).map(u => u.id));
    if (!earlyIds.has(userId)) profileCount = Infinity; // Not a founding scout
  }

  // Check each achievement (all 31 keys)
  const checks: [string, boolean][] = [
    // Trading
    ['first_trade', stats.trades_count >= 1],
    ['10_trades', stats.trades_count >= 10],
    ['50_trades', stats.trades_count >= 50],
    ['100_trades', stats.trades_count >= 100],
    ['portfolio_1000', stats.portfolio_value_cents >= 100000],
    ['portfolio_10000', stats.portfolio_value_cents >= 1000000],
    ['diverse_5', stats.holdings_diversity >= 5],
    ['diverse_15', stats.holdings_diversity >= 15],
    ['sell_order', sellOrderCount >= 1],
    ['smart_money', consecutiveProfits >= 5],
    ['diamond_hands', maxHoldDays >= 30],
    // Manager
    ['first_event', stats.events_count >= 1],
    ['3_events', stats.events_count >= 3],
    ['5_events', stats.events_count >= 5],
    ['20_events', stats.events_count >= 20],
    ['event_winner', stats.best_rank === 1],
    ['podium_3x', podiumCount >= 3],
    ['gold_standard', managerScore >= 2200],
    // Scout
    ['verified', isVerified],
    ['first_post', postsCount >= 1],
    ['first_research', researchCount >= 1],
    ['research_sold', researchSoldCount >= 1],
    ['10_upvotes', upvotesReceived >= 10],
    ['5_followers', stats.followers_count >= 5],
    ['10_followers', stats.followers_count >= 10],
    ['50_followers', stats.followers_count >= 50],
    ['scout_network', stats.followers_count >= 25],
    ['first_vote', stats.votes_cast >= 1],
    ['10_votes', stats.votes_cast >= 10],
    ['first_bounty', approvedBounties >= 1],
    ['complete_scout', allSilverPlus],
    ['founding_scout', profileCount !== Infinity],
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

  // Fire-and-forget: Create notifications for each new achievement unlock
  if (newUnlocks.length > 0) {
    import('@/lib/services/notifications').then(m => {
      for (const key of newUnlocks) {
        const def = ACHIEVEMENTS.find(a => a.key === key);
        if (def) {
          m.createNotification(
            userId,
            'achievement',
            `${def.icon} ${def.label}`,
            def.description,
            undefined,
            'profile'
          ).catch(err => console.error('[Social] Achievement notification failed:', err));
        }
      }
    }).catch(err => console.error('[Social] Achievement notification import failed:', err));
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
}
