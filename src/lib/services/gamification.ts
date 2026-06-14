import { supabase } from '@/lib/supabaseClient';
import type { Dimension } from '@/lib/gamification';

// ============================================
// Scout Scores Service (3-Dimension Elo System)
// Re-exports from scoutScores.ts + legacy wrappers
// ============================================

export type {
  ScoutScoreRow,
  ScoreHistoryEntry,
  ScoutLeaderboardEntry,
  LigaSeasonRow,
  MonthlyWinnerRow,
} from './scoutScores';

export {
  getScoutScores,
  getScoutLeaderboard,
  getMedianScore,
  getCurrentLigaSeason,
  getMonthlyLigaWinners,
  getFriendsLeaderboard,
  getMonthlyLeaderboard,
  getClubLeaderboard,
} from './scoutScores';

// ============================================
// Score Road Claims (shared across old + new)
// ============================================

export type ScoreRoadClaim = {
  milestone: number;
  claimed_at: string;
};

/** Fetch all claimed Score Road milestones for a user */
export async function getScoreRoadClaims(userId: string): Promise<ScoreRoadClaim[]> {
  const { data, error } = await supabase
    .from('score_road_claims')
    .select('milestone, claimed_at')
    .eq('user_id', userId)
    .order('milestone', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Claim a Score Road milestone reward via RPC */
export async function claimScoreRoad(
  userId: string,
  milestone: number,
): Promise<{ ok: boolean; reward_bsd?: number; error?: string }> {
  const { data, error } = await supabase.rpc('claim_score_road', {
    p_user_id: userId,
    p_milestone: milestone,
  });

  if (error) {
    console.error('[Gamification] claimScoreRoad error:', error);
    return { ok: false, error: error.message };
  }

  // Slice 322: use the RPC's `ok` discriminator (every return path sets it) instead of
  // field-existence. Defensive for this BSD-mint action: null / ok!==true → treat as failure.
  const result = data as { ok?: boolean; error?: string; reward_bsd?: number } | null;
  if (!result || result.ok !== true) {
    return { ok: false, error: result?.error ?? 'claim_failed' };
  }
  return {
    ok: true,
    reward_bsd: result.reward_bsd != null ? Number(result.reward_bsd) : undefined,
  };
}

// ============================================
// Score History for a dimension
// ============================================

export async function getScoreHistory(userId: string, dimension?: Dimension, limit: number = 20) {
  let query = supabase
    .from('score_history')
    .select('id, user_id, dimension, delta, score_before, score_after, event_type, source_id, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (dimension) {
    query = query.eq('dimension', dimension);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
