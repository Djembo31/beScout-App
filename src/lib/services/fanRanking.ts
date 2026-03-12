import { supabase } from '@/lib/supabaseClient';
import type { DbFanRanking, FanRankTier } from '@/types';

// ============================================
// Fan Ranking Service
// ============================================

/** Fetch a user's fan ranking for a specific club */
export async function getFanRanking(userId: string, clubId: string): Promise<DbFanRanking | null> {
  const { data, error } = await supabase
    .from('fan_rankings')
    .select('user_id, club_id, rank_tier, csf_multiplier, event_score, dpc_score, abo_score, community_score, streak_score, total_score, calculated_at, created_at')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (error) {
    console.error('[FanRanking] getFanRanking error:', error);
    return null;
  }
  return data as DbFanRanking | null;
}

/** Fetch club fan leaderboard (top fans by total_score) */
export async function getClubFanLeaderboard(
  clubId: string,
  limit = 50,
): Promise<(DbFanRanking & { profile: { username: string; avatar_url: string | null } })[]> {
  const { data, error } = await supabase
    .from('fan_rankings')
    .select('user_id, club_id, rank_tier, csf_multiplier, event_score, dpc_score, abo_score, community_score, streak_score, total_score, calculated_at, created_at, profiles!inner(username, avatar_url)')
    .eq('club_id', clubId)
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[FanRanking] getClubFanLeaderboard error:', error);
    return [];
  }

  // Map the PostgREST join format to our expected shape
  // PostgREST returns `profiles` as object (not array) with !inner join on FK
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(row => ({
    user_id: row.user_id as string,
    club_id: row.club_id as string,
    rank_tier: row.rank_tier as DbFanRanking['rank_tier'],
    csf_multiplier: row.csf_multiplier as number,
    event_score: row.event_score as number,
    dpc_score: row.dpc_score as number,
    abo_score: row.abo_score as number,
    community_score: row.community_score as number,
    streak_score: row.streak_score as number,
    total_score: row.total_score as number,
    calculated_at: row.calculated_at as string,
    created_at: row.created_at as string,
    profile: row.profiles as unknown as { username: string; avatar_url: string | null },
  }));
}

/** Recalculate fan rank via RPC (admin/system action) */
export async function recalculateFanRank(
  userId: string,
  clubId: string,
): Promise<{ ok: boolean; rankTier?: FanRankTier; csfMultiplier?: number; totalScore?: number; error?: string }> {
  const { data, error } = await supabase.rpc('calculate_fan_rank', {
    p_user_id: userId,
    p_club_id: clubId,
  });

  if (error) {
    console.error('[FanRanking] recalculateFanRank error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as {
    ok: boolean;
    rank_tier?: FanRankTier;
    csf_multiplier?: number;
    total_score?: number;
    components?: Record<string, number>;
    error?: string;
  };

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Unknown error' };
  }

  return {
    ok: true,
    rankTier: result.rank_tier,
    csfMultiplier: result.csf_multiplier,
    totalScore: result.total_score,
  };
}

/** Batch recalculate fan ranks for all participants of an event (single DB round-trip) */
export async function batchRecalculateFanRanks(
  eventId: string,
): Promise<{ ok: boolean; recalculated?: number; errors?: string[]; error?: string }> {
  const { data, error } = await supabase.rpc('batch_recalculate_fan_ranks', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('[FanRanking] batchRecalculateFanRanks error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; recalculated: number; errors: string[] };
  return result;
}
