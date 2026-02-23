import { supabase } from '@/lib/supabaseClient';

// ============================================
// Club CRM Service — Fan Segments & Retention
// ============================================

export type FanSegment = {
  id: string;
  label: string;
  count: number;
  icon: string;
};

export type ClubFanProfile = {
  userId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  segment: string;
  tier: string | null;
  holdingsCount: number;
  lastActivity: string | null;
  followedAt: string;
};

export type RetentionMetrics = {
  dau: number;
  wau: number;
  mau: number;
  totalFollowers: number;
  totalSubscribers: number;
};

/** Get fan segments for a club */
export async function getClubFanSegments(clubId: string): Promise<FanSegment[]> {
  // 1) Total followers
  const { count: followerCount } = await supabase
    .from('club_followers')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId);

  // 2) Active subscribers by tier
  const { data: subs } = await supabase
    .from('club_subscriptions')
    .select('tier, user_id')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  const bronze = subs?.filter(s => s.tier === 'bronze').length ?? 0;
  const silber = subs?.filter(s => s.tier === 'silber').length ?? 0;
  const gold = subs?.filter(s => s.tier === 'gold').length ?? 0;
  const totalSubs = bronze + silber + gold;

  // 3) Fans with holdings (traders) — get club player IDs first
  const { data: clubPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('club_id', clubId);
  const playerIds = clubPlayers?.map(p => p.id) ?? [];

  let traderCount = 0;
  if (playerIds.length > 0) {
    const { count } = await supabase
      .from('holdings')
      .select('user_id', { count: 'exact', head: true })
      .in('player_id', playerIds)
      .gt('quantity', 0);
    traderCount = count ?? 0;
  }

  // Free = followers minus subscribers
  const freeCount = Math.max(0, (followerCount ?? 0) - totalSubs);

  return [
    { id: 'all', label: 'Alle Fans', count: followerCount ?? 0, icon: 'users' },
    { id: 'free', label: 'Free Follower', count: freeCount, icon: 'user' },
    { id: 'bronze', label: 'Bronze', count: bronze, icon: 'shield' },
    { id: 'silber', label: 'Silber', count: silber, icon: 'shield' },
    { id: 'gold', label: 'Gold', count: gold, icon: 'crown' },
    { id: 'trader', label: 'DPC-Trader', count: traderCount, icon: 'trending-up' },
  ];
}

/** Get paginated fan list for a club */
export async function getClubFanList(
  clubId: string,
  segment: string = 'all',
  limit: number = 50,
): Promise<ClubFanProfile[]> {
  // Start with followers
  const { data: followers } = await supabase
    .from('club_followers')
    .select('user_id, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!followers || followers.length === 0) return [];

  const userIds = followers.map(f => f.user_id);

  // Get profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', userIds);

  // Get active subscriptions
  const { data: subs } = await supabase
    .from('club_subscriptions')
    .select('user_id, tier')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .in('user_id', userIds);

  // Get holdings counts for club players
  const { data: clubPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('club_id', clubId);
  const playerIds = clubPlayers?.map(p => p.id) ?? [];

  let holdingsMap = new Map<string, number>();
  if (playerIds.length > 0) {
    const { data: holdings } = await supabase
      .from('holdings')
      .select('user_id, quantity')
      .in('player_id', playerIds)
      .in('user_id', userIds)
      .gt('quantity', 0);
    if (holdings) {
      for (const h of holdings) {
        holdingsMap.set(h.user_id, (holdingsMap.get(h.user_id) ?? 0) + h.quantity);
      }
    }
  }

  // Get last activity
  const { data: activities } = await supabase
    .from('activity_log')
    .select('user_id, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(userIds.length);

  const activityMap = new Map<string, string>();
  if (activities) {
    for (const a of activities) {
      if (!activityMap.has(a.user_id)) activityMap.set(a.user_id, a.created_at);
    }
  }

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
  const subMap = new Map(subs?.map(s => [s.user_id, s.tier]) ?? []);
  const followMap = new Map(followers.map(f => [f.user_id, f.created_at]));

  const fans: ClubFanProfile[] = userIds.map(uid => {
    const p = profileMap.get(uid);
    const tier = subMap.get(uid) ?? null;
    const seg = tier ? tier : holdingsMap.has(uid) ? 'trader' : 'free';
    return {
      userId: uid,
      handle: p?.handle ?? 'anonym',
      displayName: p?.display_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
      segment: seg,
      tier,
      holdingsCount: holdingsMap.get(uid) ?? 0,
      lastActivity: activityMap.get(uid) ?? null,
      followedAt: followMap.get(uid) ?? '',
    };
  });

  // Filter by segment
  if (segment !== 'all') {
    return fans.filter(f => {
      if (segment === 'free') return !f.tier && f.holdingsCount === 0;
      if (segment === 'trader') return f.holdingsCount > 0;
      return f.tier === segment;
    });
  }
  return fans;
}

/** Get retention metrics (DAU/WAU/MAU) for a club's followers */
export async function getClubRetentionMetrics(clubId: string): Promise<RetentionMetrics> {
  // Get follower IDs
  const { data: followers, count: totalFollowers } = await supabase
    .from('club_followers')
    .select('user_id', { count: 'exact' })
    .eq('club_id', clubId);

  const userIds = followers?.map(f => f.user_id) ?? [];
  if (userIds.length === 0) {
    return { dau: 0, wau: 0, mau: 0, totalFollowers: 0, totalSubscribers: 0 };
  }

  const now = new Date();
  const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // DAU — distinct users active in last 24h
  const { count: dau } = await supabase
    .from('activity_log')
    .select('user_id', { count: 'exact', head: true })
    .in('user_id', userIds)
    .gte('created_at', day1);

  // WAU — distinct users active in last 7 days
  const { count: wau } = await supabase
    .from('activity_log')
    .select('user_id', { count: 'exact', head: true })
    .in('user_id', userIds)
    .gte('created_at', day7);

  // MAU — distinct users active in last 30 days
  const { count: mau } = await supabase
    .from('activity_log')
    .select('user_id', { count: 'exact', head: true })
    .in('user_id', userIds)
    .gte('created_at', day30);

  // Active subscribers
  const { count: totalSubscribers } = await supabase
    .from('club_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('status', 'active')
    .gt('expires_at', now.toISOString());

  return {
    dau: dau ?? 0,
    wau: wau ?? 0,
    mau: mau ?? 0,
    totalFollowers: totalFollowers ?? 0,
    totalSubscribers: totalSubscribers ?? 0,
  };
}
