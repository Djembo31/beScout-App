import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate, invalidateClubData } from '@/lib/cache';
import type { DbTrade, DbClub, ClubWithAdmin, DbClubAdmin, ClubDashboardStats, ClubAdminRole } from '@/types';

const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Club Queries
// ============================================

/** Get club by slug (with admin info for current user) */
export async function getClubBySlug(slug: string, userId?: string): Promise<ClubWithAdmin | null> {
  return cached(`club:slug:${slug}:${userId ?? ''}`, async () => {
    const { data, error } = await supabase.rpc('get_club_by_slug', {
      p_slug: slug,
      p_user_id: userId ?? null,
    });
    if (error) throw new Error(error.message);
    if (!data) return null;
    return data as ClubWithAdmin;
  }, FIVE_MIN);
}

/** Get club by ID */
export async function getClubById(clubId: string): Promise<DbClub | null> {
  return cached(`club:${clubId}`, async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();
    if (error) return null;
    return data as DbClub;
  }, FIVE_MIN);
}

/** Get all clubs */
export async function getAllClubs(): Promise<DbClub[]> {
  return cached('clubs:all', async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as DbClub[];
  }, FIVE_MIN);
}

/** Get the first club the user is admin of (Pilot: max 1 club) */
export async function getClubAdminFor(userId: string): Promise<{ clubId: string; slug: string; role: ClubAdminRole } | null> {
  return cached(`clubAdminFor:${userId}`, async () => {
    const { data, error } = await supabase
      .from('club_admins')
      .select('club_id, role, clubs!club_id(slug)')
      .eq('user_id', userId)
      .limit(1)
      .single();
    if (error || !data) return null;
    const clubs = data.clubs as unknown as { slug: string } | { slug: string }[] | null;
    const slug = Array.isArray(clubs) ? clubs[0]?.slug : clubs?.slug;
    if (!slug) return null;
    return { clubId: data.club_id as string, slug, role: data.role as ClubAdminRole };
  }, FIVE_MIN);
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

  invalidate(`profile:${userId}`);
  invalidate(`clubFollows:${userId}`);
  invalidateClubData(clubId);
}

/** Get all clubs the user follows */
export async function getUserFollowedClubs(userId: string): Promise<DbClub[]> {
  return cached(`clubFollows:${userId}`, async () => {
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
  }, FIVE_MIN);
}

/** Get the user's primary club */
export async function getUserPrimaryClub(userId: string): Promise<DbClub | null> {
  const { data, error } = await supabase
    .from('club_followers')
    .select('clubs!club_id(*)')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

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
    .single();

  await supabase
    .from('profiles')
    .update({ favorite_club: club?.name ?? null, favorite_club_id: clubId })
    .eq('id', userId);

  invalidate(`profile:${userId}`);
  invalidate(`clubFollows:${userId}`);
}

/** Get all clubs with follower + player counts (for discovery page) */
export async function getClubsWithStats(): Promise<Array<DbClub & { follower_count: number; player_count: number }>> {
  return cached('clubs:withStats', async () => {
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
  }, FIVE_MIN);
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
  return cached(`clubTradingFees:${clubId}`, async () => {
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
  }, FIVE_MIN);
}

// ============================================
// Club Activity
// ============================================

/** Letzte Trades für Club-Spieler (by club_id) */
export async function getClubRecentTrades(
  clubId: string,
  limit = 10
): Promise<(DbTrade & { player: { first_name: string; last_name: string; position: string } })[]> {
  const { data, error } = await supabase
    .from('trades')
    .select(`
      *,
      player:players!player_id (
        first_name,
        last_name,
        position
      )
    `)
    .in('player_id',
      supabase.from('players').select('id').eq('club_id', clubId) as unknown as string[]
    )
    .order('executed_at', { ascending: false })
    .limit(limit);

  // Fallback: if subquery doesn't work, use two-step approach
  if (error) {
    const { data: playerData } = await supabase
      .from('players')
      .select('id')
      .eq('club_id', clubId);
    if (!playerData || playerData.length === 0) return [];

    const playerIds = playerData.map(p => p.id);
    const { data: trades, error: tradeErr } = await supabase
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

    if (tradeErr) return [];
    return (trades ?? []) as (DbTrade & { player: { first_name: string; last_name: string; position: string } })[];
  }

  return (data ?? []) as (DbTrade & { player: { first_name: string; last_name: string; position: string } })[];
}

// ============================================
// Dashboard Stats
// ============================================

/** Club Dashboard Stats v2 (by club_id via SECURITY DEFINER RPC) */
export async function getClubDashboardStats(clubId: string): Promise<ClubDashboardStats> {
  return cached(`clubDashboard:${clubId}`, async () => {
    const { data, error } = await supabase.rpc('get_club_dashboard_stats_v2', {
      p_club_id: clubId,
    });
    if (error) throw new Error(error.message);
    return data as ClubDashboardStats;
  }, FIVE_MIN);
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
  invalidateClubData(clubId);
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
  invalidateClubData(clubId);
  return data as { success: boolean; error?: string };
}

// ============================================
// Active Gameweek
// ============================================

/** Get the active gameweek for a club */
export async function getActiveGameweek(clubId: string): Promise<number> {
  return cached(`club:gw:${clubId}`, async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('active_gameweek')
      .eq('id', clubId)
      .single();
    if (error || !data) return 1;
    return (data.active_gameweek as number) ?? 1;
  }, FIVE_MIN);
}

/** Set the active gameweek for a club (admin only) */
export async function setActiveGameweek(clubId: string, gw: number): Promise<void> {
  const { error } = await supabase
    .from('clubs')
    .update({ active_gameweek: gw })
    .eq('id', clubId);
  if (error) throw new Error(error.message);
  invalidate(`club:gw:${clubId}`);
  invalidate(`club:${clubId}`);
  invalidate(`club:slug:`);
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
  invalidateClubData(clubId);
  invalidate(`club:slug:`);
  return data as { success: boolean; error?: string };
}
