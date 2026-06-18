import { supabase } from '@/lib/supabaseClient';
import type { ClubFanRankThresholds, DbFanRanking, FanRankTier } from '@/types';

/** Platform-default Fan-Rang score thresholds (Slice 347 — fallback when a club has no config). */
export const DEFAULT_FAN_RANK_THRESHOLDS: ClubFanRankThresholds = {
  stammgast: 10,
  ultra: 25,
  legende: 40,
  ehrenmitglied: 55,
  vereinsikone: 70,
};

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

  if (error) throw new Error(error.message);
  return data as DbFanRanking | null;
}

/** Fetch club fan leaderboard (top fans by total_score) */
export async function getClubFanLeaderboard(
  clubId: string,
  limit = 50,
): Promise<(DbFanRanking & { profile: { handle: string; avatar_url: string | null } })[]> {
  const { data, error } = await supabase
    .from('fan_rankings')
    .select('user_id, club_id, rank_tier, csf_multiplier, event_score, dpc_score, abo_score, community_score, streak_score, total_score, calculated_at, created_at, profiles!inner(handle, avatar_url)')
    .eq('club_id', clubId)
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

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
    profile: row.profiles as unknown as { handle: string; avatar_url: string | null },
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

/**
 * Fetch a club's Fan-Rang score thresholds (Slice 347 / FRE-5).
 * Returns resolved values — platform defaults applied server-side when the club has no config row.
 */
export async function getClubFanRankThresholds(clubId: string): Promise<ClubFanRankThresholds> {
  const { data, error } = await supabase.rpc('get_club_fan_rank_thresholds', { p_club_id: clubId });
  if (error) throw new Error(error.message);

  const r = data as Partial<ClubFanRankThresholds> | null;
  if (!r || typeof r.stammgast !== 'number') {
    // Defensive: RPC returned an unexpected shape — fall back to platform defaults.
    return { ...DEFAULT_FAN_RANK_THRESHOLDS };
  }
  return {
    stammgast: r.stammgast,
    ultra: r.ultra ?? DEFAULT_FAN_RANK_THRESHOLDS.ultra,
    legende: r.legende ?? DEFAULT_FAN_RANK_THRESHOLDS.legende,
    ehrenmitglied: r.ehrenmitglied ?? DEFAULT_FAN_RANK_THRESHOLDS.ehrenmitglied,
    vereinsikone: r.vereinsikone ?? DEFAULT_FAN_RANK_THRESHOLDS.vereinsikone,
  };
}

/**
 * Set a club's Fan-Rang score thresholds (Slice 347 / FRE-5).
 * Club-admin only (enforced in the SECURITY DEFINER RPC). Triggers a synchronous
 * recalc of all the club's fan ranks so poll vote weight is never stale.
 * Throws (i18n-key error) on gate/validation failure so the caller can surface it.
 */
export async function setClubFanRankThresholds(
  clubId: string,
  thresholds: ClubFanRankThresholds,
): Promise<{ success: true; recalculated: number }> {
  const { data, error } = await supabase.rpc('set_club_fan_rank_thresholds', {
    p_club_id: clubId,
    p_stammgast: thresholds.stammgast,
    p_ultra: thresholds.ultra,
    p_legende: thresholds.legende,
    p_ehrenmitglied: thresholds.ehrenmitglied,
    p_vereinsikone: thresholds.vereinsikone,
  });
  if (error) throw new Error(error.message);

  const result = data as { success: boolean; error?: string; recalculated?: number };
  if (!result.success) throw new Error(result.error ?? 'rpc_failed');
  return { success: true, recalculated: result.recalculated ?? 0 };
}
