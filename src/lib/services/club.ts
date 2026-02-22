import { supabase } from '@/lib/supabaseClient';
import type { DbTrade, DbClub, ClubWithAdmin, DbClubAdmin, DbClubWithdrawal, ClubBalance, ClubDashboardStats, ClubAdminRole } from '@/types';

// ============================================
// Club Queries
// ============================================

/** Get club by slug (with admin info for current user) */
export async function getClubBySlug(slug: string, userId?: string): Promise<ClubWithAdmin | null> {
  const { data, error } = await supabase.rpc('get_club_by_slug', {
    p_slug: slug,
    p_user_id: userId ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as ClubWithAdmin;
}

/** Get club by ID */
export async function getClubById(clubId: string): Promise<DbClub | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single();
  if (error) return null;
  return data as DbClub;
}

/** Get all clubs */
export async function getAllClubs(): Promise<DbClub[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as DbClub[];
}

/** Get the first club the user is admin of (Pilot: max 1 club) */
export async function getClubAdminFor(userId: string): Promise<{ clubId: string; slug: string; role: ClubAdminRole } | null> {
  const { data, error } = await supabase
    .from('club_admins')
    .select('club_id, role, clubs!club_id(slug)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const clubs = data.clubs as unknown as { slug: string } | { slug: string }[] | null;
  const slug = Array.isArray(clubs) ? clubs[0]?.slug : clubs?.slug;
  if (!slug) return null;
  return { clubId: data.club_id as string, slug, role: data.role as ClubAdminRole };
}

// ============================================
// Club-Prestige (Computed, keine DB)
// ============================================

export type PrestigeTier = 'starter' | 'aktiv' | 'engagiert' | 'vorbildlich';

export type ClubPrestige = {
  score: number;
  tier: PrestigeTier;
  breakdown: { bounties: number; approvedSubmissions: number; votes: number; news: number; followers: number };
};

function getPrestigeTier(score: number): PrestigeTier {
  if (score >= 300) return 'vorbildlich';
  if (score >= 150) return 'engagiert';
  if (score >= 50) return 'aktiv';
  return 'starter';
}

export async function getClubPrestige(clubId: string): Promise<ClubPrestige> {
  const [bountiesResult, approvedResult, votesResult, newsResult, followersResult] = await Promise.allSettled([
    supabase.from('bounties').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
    supabase.from('bounty_submissions').select('id, bounties!inner(club_id)', { count: 'exact', head: true }).eq('status', 'approved').eq('bounties.club_id', clubId),
    supabase.from('club_votes').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'active'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('post_type', 'club_news'),
    supabase.from('club_followers').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
  ]);

  const bounties = bountiesResult.status === 'fulfilled' ? (bountiesResult.value.count ?? 0) : 0;
  const approvedSubmissions = approvedResult.status === 'fulfilled' ? (approvedResult.value.count ?? 0) : 0;
  const votes = votesResult.status === 'fulfilled' ? (votesResult.value.count ?? 0) : 0;
  const news = newsResult.status === 'fulfilled' ? (newsResult.value.count ?? 0) : 0;
  const followers = followersResult.status === 'fulfilled' ? (followersResult.value.count ?? 0) : 0;

  const score = bounties * 15 + approvedSubmissions * 25 + votes * 10 + followers * 1 + news * 5;

  return {
    score,
    tier: getPrestigeTier(score),
    breakdown: { bounties, approvedSubmissions, votes, news, followers },
  };
}

// ============================================
// Club Follower / Follow
// ============================================

/** Anzahl Follower eines Clubs (via club_followers) */
export async function getClubFollowerCount(clubId: string): Promise<number> {
  const { count, error } = await supabase
    .from('club_followers')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId);

  if (error) return 0;
  return count ?? 0;
}

/** Prüft ob der User den Club folgt (via club_followers) */
export async function isUserFollowingClub(userId: string, clubId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('club_followers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('club_id', clubId);

  if (error) return false;
  return (count ?? 0) > 0;
}

/** Follow/Unfollow Club (club_followers + dual-write to profiles.favorite_club_id) */
export async function toggleFollowClub(
  userId: string,
  clubId: string,
  clubName: string,
  follow: boolean
): Promise<void> {
  if (follow) {
    // Check if this is the user's first follow (make it primary)
    const { count: existingCount } = await supabase
      .from('club_followers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const isPrimary = (existingCount ?? 0) === 0;

    const { error } = await supabase
      .from('club_followers')
      .upsert({
        user_id: userId,
        club_id: clubId,
        is_primary: isPrimary,
      }, { onConflict: 'user_id,club_id' });

    if (error) throw new Error(error.message);

    // Dual-write to profiles if primary
    if (isPrimary) {
      await supabase
        .from('profiles')
        .update({ favorite_club: clubName, favorite_club_id: clubId })
        .eq('id', userId);
    }
  } else {
    // Check if this was the primary club
    const { data: follower } = await supabase
      .from('club_followers')
      .select('is_primary')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .single();

    const { error } = await supabase
      .from('club_followers')
      .delete()
      .eq('user_id', userId)
      .eq('club_id', clubId);

    if (error) throw new Error(error.message);

    // If it was primary, clear profiles or assign next club
    if (follower?.is_primary) {
      const { data: nextClub } = await supabase
        .from('club_followers')
        .select('club_id, clubs!club_id(name)')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (nextClub) {
        // Promote next club to primary
        await supabase
          .from('club_followers')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('club_id', nextClub.club_id);

        const clubs = nextClub.clubs as unknown as { name: string } | null;
        await supabase
          .from('profiles')
          .update({ favorite_club: clubs?.name ?? null, favorite_club_id: nextClub.club_id })
          .eq('id', userId);
      } else {
        // No more followed clubs
        await supabase
          .from('profiles')
          .update({ favorite_club: null, favorite_club_id: null })
          .eq('id', userId);
      }
    }
  }

}

/** Batch follow clubs during onboarding (first = primary) */
export async function followClubsBatch(
  userId: string,
  clubIds: string[]
): Promise<void> {
  if (clubIds.length === 0) return;
  const rows = clubIds.map((clubId, i) => ({
    user_id: userId,
    club_id: clubId,
    is_primary: i === 0,
  }));
  const { error } = await supabase
    .from('club_followers')
    .upsert(rows, { onConflict: 'user_id,club_id' });
  if (error) {
    // Retry once
    const { error: retryErr } = await supabase
      .from('club_followers')
      .upsert(rows, { onConflict: 'user_id,club_id' });
    if (retryErr) console.error('[Club] followClubsBatch retry failed:', retryErr.message);
  }
}

/** Get all clubs the user follows */
export async function getUserFollowedClubs(userId: string): Promise<DbClub[]> {
  const { data, error } = await supabase
    .from('club_followers')
    .select('club_id, is_primary, clubs!club_id(*)')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false });

  if (error || !data) return [];
  return data.map((row) => {
    const club = row.clubs as unknown as DbClub;
    return club;
  }).filter(Boolean);
}

/** Get the user's primary club */
export async function getUserPrimaryClub(userId: string): Promise<DbClub | null> {
  const { data, error } = await supabase
    .from('club_followers')
    .select('clubs!club_id(*)')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();

  if (error || !data) return null;
  return data.clubs as unknown as DbClub;
}

/** Set a club as the user's primary club */
export async function setUserPrimaryClub(userId: string, clubId: string): Promise<void> {
  // Unset all primary flags for this user
  await supabase
    .from('club_followers')
    .update({ is_primary: false })
    .eq('user_id', userId);

  // Set new primary
  const { error } = await supabase
    .from('club_followers')
    .update({ is_primary: true })
    .eq('user_id', userId)
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);

  // Dual-write to profiles
  const { data: club } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', clubId)
    .maybeSingle();

  await supabase
    .from('profiles')
    .update({ favorite_club: club?.name ?? null, favorite_club_id: clubId })
    .eq('id', userId);

}

/** Get all clubs with follower + player counts (for discovery page) */
export async function getClubsWithStats(): Promise<Array<DbClub & { follower_count: number; player_count: number }>> {
  const { data: clubs, error } = await supabase
      .from('clubs')
      .select('*')
      .order('name');

  if (error || !clubs) return [];

  // Get follower counts
  const clubIds = clubs.map(c => c.id);
  const { data: followerData } = await supabase
    .from('club_followers')
    .select('club_id')
    .in('club_id', clubIds);

  const followerCounts = new Map<string, number>();
  for (const f of followerData ?? []) {
    followerCounts.set(f.club_id, (followerCounts.get(f.club_id) ?? 0) + 1);
  }

  // Get player counts
  const { data: playerData } = await supabase
    .from('players')
    .select('club_id')
    .in('club_id', clubIds);

  const playerCounts = new Map<string, number>();
  for (const p of playerData ?? []) {
    if (p.club_id) {
      playerCounts.set(p.club_id, (playerCounts.get(p.club_id) ?? 0) + 1);
    }
  }

  return clubs.map(c => ({
    ...(c as DbClub),
    follower_count: followerCounts.get(c.id) ?? 0,
    player_count: playerCounts.get(c.id) ?? 0,
  }));
}

// ============================================
// Club Revenue (Trading Fees)
// ============================================

/** Sum of club_fee from all trades for this club's players */
export async function getClubTradingFees(clubId: string): Promise<{
  totalClubFee: number;
  totalPlatformFee: number;
  totalPbtFee: number;
  tradeCount: number;
}> {
  // Get player IDs for this club
  const { data: playerData } = await supabase
    .from('players')
    .select('id')
    .eq('club_id', clubId);
  if (!playerData || playerData.length === 0) {
    return { totalClubFee: 0, totalPlatformFee: 0, totalPbtFee: 0, tradeCount: 0 };
  }
  const playerIds = playerData.map(p => p.id);

  const { data, error } = await supabase
    .from('trades')
    .select('club_fee, platform_fee, pbt_fee')
    .in('player_id', playerIds);

  if (error || !data) {
    return { totalClubFee: 0, totalPlatformFee: 0, totalPbtFee: 0, tradeCount: 0 };
  }

  return {
    totalClubFee: data.reduce((sum, t) => sum + (t.club_fee ?? 0), 0),
    totalPlatformFee: data.reduce((sum, t) => sum + (t.platform_fee ?? 0), 0),
    totalPbtFee: data.reduce((sum, t) => sum + (t.pbt_fee ?? 0), 0),
    tradeCount: data.length,
  };
}

// ============================================
// Club Activity
// ============================================

/** Letzte Trades für Club-Spieler (by club_id) */
export async function getClubRecentTrades(
  clubId: string,
  limit = 10
): Promise<(DbTrade & { player: { first_name: string; last_name: string; position: string } })[]> {
  // Two-step: first get player IDs, then fetch trades
  // (Supabase .in() subquery syntax crashes in postgrest-js — new Set(queryBuilder) is not iterable)
  const { data: playerData } = await supabase
    .from('players')
    .select('id')
    .eq('club_id', clubId);
  if (!playerData || playerData.length === 0) return [];

  const playerIds = playerData.map(p => p.id);
  const { data: trades, error } = await supabase
    .from('trades')
    .select(`
      *,
      player:players!player_id (
        first_name,
        last_name,
        position
      )
    `)
    .in('player_id', playerIds)
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (trades ?? []) as (DbTrade & { player: { first_name: string; last_name: string; position: string } })[];
}

// ============================================
// Dashboard Stats
// ============================================

/** Club Dashboard Stats v2 (by club_id via SECURITY DEFINER RPC) */
export async function getClubDashboardStats(clubId: string): Promise<ClubDashboardStats> {
  const { data, error } = await supabase.rpc('get_club_dashboard_stats_v2', {
    p_club_id: clubId,
  });
  if (error) throw new Error(error.message);
  return data as ClubDashboardStats;
}

// ============================================
// Admin Functions
// ============================================

/** Check if user is admin of a club */
export async function isClubAdmin(userId: string, clubId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_club_admin', {
    p_user_id: userId,
    p_club_id: clubId,
  });
  if (error) return false;
  return data as boolean;
}

/** Get all admins for a club */
export async function getClubAdmins(clubId: string): Promise<(DbClubAdmin & { handle: string; display_name: string | null })[]> {
  const { data, error } = await supabase
    .from('club_admins')
    .select('*, profiles!user_id(handle, display_name)')
    .eq('club_id', clubId);

  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as { handle: string; display_name: string | null } | null;
    return {
      ...(row as unknown as DbClubAdmin),
      handle: profiles?.handle ?? 'unknown',
      display_name: profiles?.display_name ?? null,
    };
  });
}

/** Add club admin (via RPC — owner only) */
export async function addClubAdmin(
  clubId: string,
  userId: string,
  role: string = 'admin'
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('add_club_admin', {
    p_club_id: clubId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; error?: string };
}

/** Remove club admin (via RPC — owner only) */
export async function removeClubAdmin(
  clubId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('remove_club_admin', {
    p_club_id: clubId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; error?: string };
}

// ============================================
// Active Gameweek
// ============================================

/** Get the active gameweek for a club */
export async function getActiveGameweek(clubId: string): Promise<number> {
  const { data, error } = await supabase
    .from('clubs')
    .select('active_gameweek')
    .eq('id', clubId)
    .single();
  if (error || !data) return 1;
  return (data.active_gameweek as number) ?? 1;
}

/** Set the active gameweek for a club (admin only) */
export async function setActiveGameweek(clubId: string, gw: number): Promise<void> {
  const { error } = await supabase
    .from('clubs')
    .update({ active_gameweek: gw })
    .eq('id', clubId);
  if (error) throw new Error(error.message);
}

/** Update community guidelines for a club */
export async function updateCommunityGuidelines(
  adminId: string,
  clubId: string,
  guidelines: string | null
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('update_community_guidelines', {
    p_admin_id: adminId,
    p_club_id: clubId,
    p_guidelines: guidelines,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; error?: string };
}

// ============================================
// Club Fantasy Settings
// ============================================

export interface ClubFantasySettings {
  fantasy_entry_fee_cents: number;
  fantasy_jurisdiction_preset: 'TR' | 'DE' | 'OTHER';
  fantasy_allow_entry_fees: boolean;
}

/** Get fantasy settings for a club */
export async function getClubFantasySettings(clubId: string): Promise<ClubFantasySettings> {
  const { data, error } = await supabase
    .from('clubs')
    .select('fantasy_entry_fee_cents, fantasy_jurisdiction_preset, fantasy_allow_entry_fees')
    .eq('id', clubId)
    .single();
  if (error || !data) {
    return { fantasy_entry_fee_cents: 0, fantasy_jurisdiction_preset: 'TR', fantasy_allow_entry_fees: false };
  }
  return data as ClubFantasySettings;
}

/** Update fantasy settings for a club (admin only) */
export async function updateClubFantasySettings(clubId: string, settings: Partial<ClubFantasySettings>): Promise<void> {
  const { error } = await supabase
    .from('clubs')
    .update(settings)
    .eq('id', clubId);
  if (error) throw new Error(error.message);
}

// ============================================
// Club Withdrawals
// ============================================

/** Get club balance (earned vs withdrawn) */
export async function getClubBalance(clubId: string): Promise<ClubBalance> {
  const { data, error } = await supabase.rpc('get_club_balance', { p_club_id: clubId });
  if (error) throw new Error(error.message);
  return data as ClubBalance;
}

/** Get withdrawal history for a club */
export async function getClubWithdrawals(clubId: string): Promise<(DbClubWithdrawal & { requester_handle: string })[]> {
  const { data, error } = await supabase
    .from('club_withdrawals')
    .select('*, profiles!requested_by(handle)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as { handle: string } | null;
    return {
      ...(row as unknown as DbClubWithdrawal),
      requester_handle: profiles?.handle ?? 'unbekannt',
    };
  });
}

/** Request a withdrawal */
export async function requestClubWithdrawal(
  clubId: string,
  amountCents: number,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('request_club_withdrawal', {
    p_club_id: clubId,
    p_amount_cents: amountCents,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; error?: string };
}

// ============================================
// Club Fan Analytics
// ============================================

/** Get fan analytics for a club */
export async function getClubFanAnalytics(clubId: string): Promise<{
  activeFans7d: number;
  activeFans30d: number;
  totalFollowers: number;
  topFans: { user_id: string; handle: string; display_name: string | null; trade_count: number; volume_cents: number }[];
  engagementByType: { type: string; count: number }[];
}> {
  // Get player IDs for this club
  const { data: playerData } = await supabase.from('players').select('id').eq('club_id', clubId);
  const playerIds = (playerData ?? []).map(p => p.id);

  // Followers
  const { count: totalFollowers } = await supabase
    .from('club_followers')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId);

  // Active fans 7d (distinct users who traded club players in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let activeFans7d = 0;
  let activeFans30d = 0;
  const topFansMap = new Map<string, { count: number; volume: number }>();

  if (playerIds.length > 0) {
    // Trades in last 7d
    const { data: trades7d } = await supabase
      .from('trades')
      .select('buyer_id, seller_id, price, quantity')
      .in('player_id', playerIds)
      .gte('executed_at', sevenDaysAgo);

    const users7d = new Set<string>();
    for (const t of trades7d ?? []) {
      if (t.buyer_id) users7d.add(t.buyer_id as string);
      if (t.seller_id) users7d.add(t.seller_id as string);
    }
    activeFans7d = users7d.size;

    // Trades in last 30d (+ top fans)
    const { data: trades30d } = await supabase
      .from('trades')
      .select('buyer_id, seller_id, price, quantity')
      .in('player_id', playerIds)
      .gte('executed_at', thirtyDaysAgo);

    const users30d = new Set<string>();
    for (const t of trades30d ?? []) {
      const vol = ((t.price as number) ?? 0) * ((t.quantity as number) ?? 1);
      if (t.buyer_id) {
        users30d.add(t.buyer_id as string);
        const prev = topFansMap.get(t.buyer_id as string) ?? { count: 0, volume: 0 };
        topFansMap.set(t.buyer_id as string, { count: prev.count + 1, volume: prev.volume + vol });
      }
      if (t.seller_id) {
        users30d.add(t.seller_id as string);
        const prev = topFansMap.get(t.seller_id as string) ?? { count: 0, volume: 0 };
        topFansMap.set(t.seller_id as string, { count: prev.count + 1, volume: prev.volume + vol });
      }
    }
    activeFans30d = users30d.size;
  }

  // Top 10 fans by volume
  const sortedFans = Array.from(topFansMap.entries())
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 10);

  let topFans: { user_id: string; handle: string; display_name: string | null; trade_count: number; volume_cents: number }[] = [];
  if (sortedFans.length > 0) {
    const fanIds = sortedFans.map(([id]) => id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name')
      .in('id', fanIds);
    const profileMap = new Map<string, { handle: string; display_name: string | null }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { handle: p.handle, display_name: p.display_name });
    }
    topFans = sortedFans.map(([id, stats]) => ({
      user_id: id,
      handle: profileMap.get(id)?.handle ?? 'unknown',
      display_name: profileMap.get(id)?.display_name ?? null,
      trade_count: stats.count,
      volume_cents: stats.volume,
    }));
  }

  // Engagement by type (last 30d from activity_log)
  const { data: activityData } = await supabase
    .from('activity_log')
    .select('action')
    .eq('category', 'trading')
    .gte('created_at', thirtyDaysAgo);

  const engCounts = new Map<string, number>();
  for (const a of activityData ?? []) {
    const action = a.action as string;
    engCounts.set(action, (engCounts.get(action) ?? 0) + 1);
  }
  const engagementByType = Array.from(engCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    activeFans7d,
    activeFans30d,
    totalFollowers: totalFollowers ?? 0,
    topFans,
    engagementByType,
  };
}
