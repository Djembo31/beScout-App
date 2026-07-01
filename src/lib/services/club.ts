import { supabase } from '@/lib/supabaseClient';
import { logSilentRejects } from '@/lib/observability/silentRejects';
import type { DbTrade, DbClub, ClubWithAdmin, DbClubAdmin, DbClubWithdrawal, ClubBalance, DbTreasuryLedgerEntry, ClubDashboardStats, ClubAdminRole, OperationResult } from '@/types';
import { getLeagueById } from '@/lib/leagues';

/**
 * Slice 326 Wave B: leitet DbClub.league (Display-Name) aus league_id ab.
 * Die DB-Spalte clubs.league wurde gedroppt — league ist jetzt nur noch ein
 * cache-abgeleiteter Anzeigename (League-Cache ready via ClubProvider).
 */
function withLeagueName<T extends { league_id: string | null }>(club: T): T {
  return { ...club, league: getLeagueById(club.league_id)?.name ?? '' };
}

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
    .select('id, slug, name, short, league_id, country, city, stadium, stadium_image_url, logo_url, primary_color, secondary_color, community_guidelines, plan, is_verified, created_at, updated_at')
    .eq('id', clubId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return withLeagueName(data as DbClub);
}

/** Get all clubs */
export async function getAllClubs(): Promise<DbClub[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('id, slug, name, short, league_id, country, city, stadium, stadium_image_url, logo_url, primary_color, secondary_color, community_guidelines, plan, is_verified, created_at, updated_at')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => withLeagueName(c as DbClub));
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
  const prestigeResults = await Promise.allSettled([
    supabase.from('bounties').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
    supabase.from('bounty_submissions').select('id, bounties!inner(club_id)', { count: 'exact', head: true }).eq('status', 'approved').eq('bounties.club_id', clubId),
    supabase.from('community_polls').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'active'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('post_type', 'club_news'),
    supabase.from('club_followers').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
  ]);
  logSilentRejects('club.getClubPrestige', prestigeResults);
  const [bountiesResult, approvedResult, votesResult, newsResult, followersResult] = prestigeResults;

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
// Club League Standing (Slice 149)
// ============================================

export type ClubStanding = {
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  points: number;
  /** Last-5 form string, e.g. "WWDLW" — NULL if not scraped yet */
  form: string | null;
  season: number;
};

/**
 * Aktuelle Liga-Tabellenposition eines Clubs (neueste Saison).
 * Daten kommen vom API-Football /standings Cron (Slice 074).
 * RLS: authenticated SELECT qual=true (public league data).
 */
export async function getClubStanding(clubId: string): Promise<ClubStanding | null> {
  const { data, error } = await supabase
    .from('league_standings')
    .select('rank, played, won, drawn, lost, goals_for, goals_against, goals_diff, points, form, season')
    .eq('club_id', clubId)
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    rank: data.rank,
    played: data.played,
    won: data.won,
    drawn: data.drawn,
    lost: data.lost,
    goalsFor: data.goals_for,
    goalsAgainst: data.goals_against,
    goalsDiff: data.goals_diff,
    points: data.points,
    form: data.form ?? null,
    season: data.season,
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

  // Throw — React Query retries (3x backoff). Silent `return 0` cached fake-success
  // kept club-page showing "0 Fans" forever on transient network errors (Slice 143).
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Prüft ob der User den Club folgt (via club_followers) */
export async function isUserFollowingClub(userId: string, clubId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('club_followers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('club_id', clubId);

  if (error) { console.error('[Club] isUserFollowingClub failed:', error); return false; }
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
        .update({ favorite_club_id: clubId })
        .eq('id', userId);
    }
  } else {
    // Check if this was the primary club
    const { data: follower } = await supabase
      .from('club_followers')
      .select('is_primary')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .maybeSingle();

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
        .select('club_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (nextClub) {
        // Promote next club to primary
        const { error: promoteErr } = await supabase
          .from('club_followers')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('club_id', nextClub.club_id);

        if (promoteErr) throw new Error(`promote next primary failed: ${promoteErr.message}`);

        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ favorite_club_id: nextClub.club_id })
          .eq('id', userId);

        if (profileErr) throw new Error(`profile sync failed: ${profileErr.message}`);
      } else {
        // No more followed clubs
        const { error: clearErr } = await supabase
          .from('profiles')
          .update({ favorite_club_id: null })
          .eq('id', userId);

        if (clearErr) throw new Error(`profile clear failed: ${clearErr.message}`);
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
    if (retryErr) throw new Error(`followClubsBatch retry failed: ${retryErr.message}`);
  }
}

/** Get all clubs the user follows */
export async function getUserFollowedClubs(userId: string): Promise<DbClub[]> {
  const { data, error } = await supabase
    .from('club_followers')
    .select('club_id, is_primary, clubs!club_id(*)')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];
  return data.map((row) => {
    const club = row.clubs as unknown as DbClub;
    return withLeagueName(club);
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
  return withLeagueName(data.clubs as unknown as DbClub);
}

/** Set a club as the user's primary club */
export async function setUserPrimaryClub(userId: string, clubId: string): Promise<void> {
  // Unset all primary flags for this user
  const { error: unsetError } = await supabase
    .from('club_followers')
    .update({ is_primary: false })
    .eq('user_id', userId);

  if (unsetError) {
    console.error(`[Club] setUserPrimaryClub: unset failed (user=${userId}):`, unsetError.message);
  }

  // Set new primary
  const { error } = await supabase
    .from('club_followers')
    .update({ is_primary: true })
    .eq('user_id', userId)
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);

  // Dual-write favorite_club_id to profiles (name is derived from the id via club cache)
  await supabase
    .from('profiles')
    .update({ favorite_club_id: clubId })
    .eq('id', userId);

}

/**
 * Get all clubs with follower + player counts (for discovery page).
 *
 * Chunking: `.limit(10000)` allein reicht nicht — PostgREST/Supabase cappt
 * manche Antworten hart bei ~1000 rows. Fix-Muster aus Slice 079b:
 * `.range(offset, offset+PAGE-1)` in Schleife bis `data.length < PAGE`.
 *
 * @param opts.activeOnly Wenn true, zählt nur Spieler mit `mv_source != 'transfermarkt_stale'`
 *   (analog Slice 083). Default false = Full-Count (backward-compat).
 */
export async function getClubsWithStats(
  opts?: { activeOnly?: boolean }
): Promise<Array<DbClub & { follower_count: number; player_count: number }>> {
  const { data: clubs, error } = await supabase
      .from('clubs')
      .select('id, slug, name, short, league_id, country, city, stadium, stadium_image_url, logo_url, primary_color, secondary_color, community_guidelines, plan, is_verified, created_at, updated_at')
      .order('name');

  if (error) throw new Error(error.message);
  if (!clubs) return [];

  const clubIds = clubs.map(c => c.id);
  const PAGE = 1000;

  // Follower counts — chunked read, explicit error propagation
  const followerCounts = new Map<string, number>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error: fErr } = await supabase
      .from('club_followers')
      .select('club_id')
      .in('club_id', clubIds)
      .range(offset, offset + PAGE - 1);
    if (fErr) throw new Error(`getClubsWithStats followers: ${fErr.message}`);
    const rows = data ?? [];
    for (const f of rows) {
      followerCounts.set(f.club_id, (followerCounts.get(f.club_id) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }

  // Player counts — same pattern, with optional stale-filter
  const playerCounts = new Map<string, number>();
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from('players')
      .select('club_id')
      .in('club_id', clubIds)
      .range(offset, offset + PAGE - 1);
    if (opts?.activeOnly) {
      q = q.neq('mv_source', 'transfermarkt_stale');
    }
    const { data, error: pErr } = await q;
    if (pErr) throw new Error(`getClubsWithStats players: ${pErr.message}`);
    const rows = data ?? [];
    for (const p of rows) {
      if (p.club_id) {
        playerCounts.set(p.club_id, (playerCounts.get(p.club_id) ?? 0) + 1);
      }
    }
    if (rows.length < PAGE) break;
  }

  return clubs.map(c => ({
    ...withLeagueName(c as DbClub),
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
  // Slice 095 Phase 2: SECURITY DEFINER RPC mit club-admin-OR-platform-admin guard
  const { data, error } = await supabase.rpc('rpc_get_club_trading_fees', { p_club_id: clubId });
  if (error || !data) {
    return { totalClubFee: 0, totalPlatformFee: 0, totalPbtFee: 0, tradeCount: 0 };
  }
  const d = data as { totalClubFee: number; totalPlatformFee: number; totalPbtFee: number; tradeCount: number };
  return {
    totalClubFee: d.totalClubFee ?? 0,
    totalPlatformFee: d.totalPlatformFee ?? 0,
    totalPbtFee: d.totalPbtFee ?? 0,
    tradeCount: d.tradeCount ?? 0,
  };
}

// ============================================
// Club Activity
// ============================================

/** Letzte Trades für Club-Spieler (by club_id) — Slice 095 Phase 2: via SECURITY DEFINER RPC */
export type ClubRecentTrade = {
  id: string;
  player_id: string;
  player: { first_name: string; last_name: string; position: string };
  price: number;
  quantity: number;
  executed_at: string;
};

export async function getClubRecentTrades(
  clubId: string,
  limit = 10
): Promise<ClubRecentTrade[]> {
  const { data, error } = await supabase.rpc('rpc_get_club_recent_trades', {
    p_club_id: clubId,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: {
    id: string; player_id: string;
    player_first_name: string; player_last_name: string; player_position: string;
    price: number; quantity: number; executed_at: string;
  }) => ({
    id: r.id,
    player_id: r.player_id,
    player: {
      first_name: r.player_first_name,
      last_name: r.player_last_name,
      position: r.player_position,
    },
    price: r.price,
    quantity: r.quantity,
    executed_at: r.executed_at,
  }));
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
  if (error) {
    console.error(`[Club] isClubAdmin RPC failed (user=${userId}, club=${clubId}):`, error.message);
    return false;
  }
  return data as boolean;
}

/** Get all admins for a club */
export async function getClubAdmins(clubId: string): Promise<(DbClubAdmin & { handle: string; display_name: string | null })[]> {
  const { data, error } = await supabase
    .from('club_admins')
    .select('*, profiles!user_id(handle, display_name)')
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);
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
  return data as OperationResult;
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
  return data as OperationResult;
}

// ============================================
// Active Gameweek
// ============================================

/** Get the active gameweek for a club.
 *  Slice 428: leagues.active_gameweek = SSOT — resolve club → league → leagues.active_gameweek
 *  (clubs.active_gameweek ist frozen/unread, → 428b DROP). Non-throw-Vertrag erhalten
 *  (returns 1 on error) — Consumer (AdminSettings/AdminGameweeks) verlassen sich darauf. */
export async function getActiveGameweek(clubId: string): Promise<number> {
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('league_id')
    .eq('id', clubId)
    .maybeSingle();
  if (clubErr || !club?.league_id) return 1;
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('active_gameweek')
    .eq('id', club.league_id as string)
    .maybeSingle();
  if (leagueErr || !league) return 1;
  return (league.active_gameweek as number) ?? 1;
}

/** Get the active gameweek for a specific league.
 *  Reads from leagues.active_gameweek (Single-Source-of-Truth per league).
 *  Slice 251 Wave 1 Track A: rewrite from clubs MIN-aggregation. */
export async function getLeagueActiveGameweek(leagueId: string | null): Promise<number> {
  if (!leagueId) return 1;
  const { data, error } = await supabase
    .from('leagues')
    .select('active_gameweek')
    .eq('id', leagueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.active_gameweek as number | null | undefined) ?? 1;
}

/** Get the max gameweeks for a specific league (TFF1=34, BL=34, PL=38, etc.).
 *  Slice 251 Wave 1 Track A: replaces hardcoded `<= 38` in callers. */
export async function getLeagueMaxGameweeks(leagueId: string | null): Promise<number> {
  if (!leagueId) return 38;
  const { data, error } = await supabase
    .from('leagues')
    .select('max_gameweeks')
    .eq('id', leagueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.max_gameweeks as number | null | undefined) ?? 38;
}

/** Set the active gameweek for a club (admin only) */
export async function setActiveGameweek(clubId: string, gw: number): Promise<void> {
  const { error } = await supabase.rpc('set_active_gameweek', {
    p_club_id: clubId,
    p_gameweek: gw,
  });
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
  return data as OperationResult;
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
    .maybeSingle();
  if (error || !data) {
    return { fantasy_entry_fee_cents: 0, fantasy_jurisdiction_preset: 'TR', fantasy_allow_entry_fees: false };
  }
  return data as ClubFantasySettings;
}

/** Update fantasy settings for a club (admin only).
 *  Uses SECURITY DEFINER RPC to bypass RLS — guaranteed execution. */
export async function updateClubFantasySettings(clubId: string, settings: Partial<ClubFantasySettings>): Promise<void> {
  const { error } = await supabase.rpc('update_club_fantasy_settings', {
    p_club_id: clubId,
    p_entry_fee_cents: settings.fantasy_entry_fee_cents ?? null,
    p_jurisdiction_preset: settings.fantasy_jurisdiction_preset ?? null,
    p_allow_entry_fees: settings.fantasy_allow_entry_fees ?? null,
  });
  if (error) throw new Error(error.message);
}

// ============================================
// Club Branding
// ============================================

/** Update club branding colors (owner only — verifies caller is club admin) */
export async function updateClubBranding(
  clubId: string,
  branding: { primary_color?: string | null; secondary_color?: string | null }
): Promise<{ success: boolean; error?: string }> {
  // Verify caller is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Verify caller is owner/admin of this club
  const { data: adminRow } = await supabase
    .from('club_admins')
    .select('role')
    .eq('user_id', user.id)
    .eq('club_id', clubId)
    .maybeSingle();

  if (!adminRow || !['owner', 'admin'].includes(adminRow.role)) {
    return { success: false, error: 'Not authorized' };
  }

  // Validate color format (hex only)
  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  if (branding.primary_color && !hexPattern.test(branding.primary_color)) {
    return { success: false, error: 'Invalid primary color format' };
  }
  if (branding.secondary_color && !hexPattern.test(branding.secondary_color)) {
    return { success: false, error: 'Invalid secondary color format' };
  }

  const { error } = await supabase
    .from('clubs')
    .update({ ...branding, updated_at: new Date().toISOString() })
    .eq('id', clubId);

  if (error) return { success: false, error: error.message };
  return { success: true };
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

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as { handle: string } | null;
    return {
      ...(row as unknown as DbClubWithdrawal),
      requester_handle: profiles?.handle ?? 'unbekannt',
    };
  });
}

/** Slice 330b: Kontoauszug (Credits + Debits inkl. CSF) des Club-Treasury. */
export async function getClubTreasuryLedger(
  clubId: string,
  limit = 50,
): Promise<DbTreasuryLedgerEntry[]> {
  const { data, error } = await supabase.rpc('get_club_treasury_ledger', {
    p_club_id: clubId,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbTreasuryLedgerEntry[];
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
  return data as OperationResult;
}

/** Slice 067: Admin-Override fuer Stadium-Image + Logo-URL */
export async function updateClubAssets(params: {
  adminId: string;
  clubId: string;
  stadiumImageUrl?: string | null;
  logoUrl?: string | null;
}): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('update_club_assets', {
    p_admin_id: params.adminId,
    p_club_id: params.clubId,
    p_stadium_image_url: params.stadiumImageUrl ?? null,
    p_logo_url: params.logoUrl ?? null,
  });
  if (error) throw new Error(error.message);
  return data as OperationResult;
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
  // Slice 095 Phase 2: active-fans + top-fans via SECURITY DEFINER RPC
  const { data: fanStats, error: fanErr } = await supabase.rpc('rpc_get_club_fan_stats', { p_club_id: clubId });
  if (fanErr) throw new Error(fanErr.message);
  const stats = (fanStats ?? {}) as {
    activeFans7d: number;
    activeFans30d: number;
    topFans: { user_id: string; handle: string; display_name: string | null; trade_count: number; volume_cents: number }[];
  };

  // Followers (separate table, direct supabase query — club_followers has its own RLS)
  const { count: totalFollowers } = await supabase
    .from('club_followers')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId);

  // Engagement by type (last 30d from activity_log — unchanged)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
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
    activeFans7d: stats.activeFans7d ?? 0,
    activeFans30d: stats.activeFans30d ?? 0,
    totalFollowers: totalFollowers ?? 0,
    topFans: stats.topFans ?? [],
    engagementByType,
  };
}

// ============================================
// Slice 199 K-02 — Most-Owned Players per Club (anonymized aggregate)
// ============================================

export type MostOwnedPlayerRow = {
  player_id: string;
  first_name: string;
  last_name: string;
  shirt_number: number | null;
  position: string;
  image_url: string | null;
  holders_count: number;
  rank: number;
};

/**
 * Slice 199 K-02 — Top-N Spieler eines Clubs nach Anzahl Holder (anonymized).
 * SECURITY DEFINER RPC bypassed RLS (holdings cross-user-aggregate);
 * Output: keine user_ids, nur Counts.
 */
export async function getMostOwnedPlayersPerClub(
  clubId: string,
  limit = 5,
): Promise<MostOwnedPlayerRow[]> {
  const { data, error } = await supabase.rpc('get_most_owned_players_per_club', {
    p_club_id: clubId,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  if (!data) return [];
  if (!Array.isArray(data)) return [];
  return (data as MostOwnedPlayerRow[]).filter(
    (r): r is MostOwnedPlayerRow =>
      typeof r?.player_id === 'string' && typeof r?.holders_count === 'number',
  );
}

// ============================================
// Slice 207 K-02 — Most-Owned Players per Club BATCH (anonymized aggregate)
// ============================================

/**
 * Single row of the batch RPC result. Adds `club_id` (partition-key) and
 * `holders_pct` (relative to total managers of that club) to the Slice 199 row.
 */
export type MostOwnedPlayerBatchRow = MostOwnedPlayerRow & {
  club_id: string;
  holders_pct: number;
};

/**
 * Slice 207 K-02 — Batch Top-N Spieler PRO Club fuer N Clubs in 1 RPC-Call.
 *
 * Identisches Anonymized-Aggregate-Pattern wie Slice 199, nur Multi-Club-Eingabe
 * + zusaetzlicher `holders_pct`-Wert (Anteil der Manager des Clubs).
 *
 * Returns Map<club_id, MostOwnedPlayerBatchRow[]> fuer einfache Konsumption
 * im Frontend (per-Club-Lookup ohne Re-Iteration). Clubs ohne Holdings/Match
 * fehlen im Map — der Caller MUSS Truthy-Check machen vor dem Render.
 *
 * Backwards-compat: `getMostOwnedPlayersPerClub` (Single-Club-RPC, Slice 199)
 * bleibt unangetastet. Caller TransferList + MostOwnedSection nutzen weiterhin
 * den Single-Variant.
 *
 * Edge Cases:
 * - clubIds === [] → leere Map (RPC nicht aufgerufen waere unsauber, also
 *   wir geben leeres Array an die DB; der Hook gated via `enabled`).
 * - RPC-Error → throw (React Query retried).
 * - Result row mit unerwartetem Shape → still gefiltert (defensive parsing).
 */
export async function getMostOwnedPlayersPerClubBatch(
  clubIds: string[],
  limit = 1,
): Promise<Map<string, MostOwnedPlayerBatchRow[]>> {
  const result = new Map<string, MostOwnedPlayerBatchRow[]>();
  if (!Array.isArray(clubIds) || clubIds.length === 0) return result;

  const { data, error } = await supabase.rpc('get_most_owned_players_per_club_batch', {
    p_club_ids: clubIds,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  if (!data) return result;
  if (!Array.isArray(data)) return result;

  const rows = (data as MostOwnedPlayerBatchRow[]).filter(
    (r): r is MostOwnedPlayerBatchRow =>
      typeof r?.club_id === 'string' &&
      typeof r?.player_id === 'string' &&
      typeof r?.holders_count === 'number' &&
      typeof r?.holders_pct === 'number',
  );

  for (const row of rows) {
    const existing = result.get(row.club_id);
    if (existing) {
      existing.push(row);
    } else {
      result.set(row.club_id, [row]);
    }
  }

  return result;
}
