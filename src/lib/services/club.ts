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

/** Anzahl Follower eines Clubs (profiles.favorite_club_id) */
export async function getClubFollowerCount(clubId: string): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('favorite_club_id', clubId);

  if (error) return 0;
  return count ?? 0;
}

/** Prüft ob der User den Club folgt */
export async function isUserFollowingClub(userId: string, clubId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('favorite_club_id')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  return data.favorite_club_id === clubId;
}

/** Follow/Unfollow Club (dual-write: favorite_club + favorite_club_id) */
export async function toggleFollowClub(
  userId: string,
  clubId: string,
  clubName: string,
  follow: boolean
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      favorite_club: follow ? clubName : null,
      favorite_club_id: follow ? clubId : null,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  invalidate(`profile:${userId}`);
  invalidateClubData(clubId);
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
