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
} from './scoutScores';

export {
  getScoutScores,
  getScoutLeaderboard,
  awardDimensionScore,
  awardDimensionScoreAsync,
  getMedianScore,
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

  if (error) {
    console.error('[Gamification] getScoreRoadClaims error:', error);
    return [];
  }
  return data ?? [];
}

/** Claim a Score Road milestone reward via RPC */
export async function claimScoreRoad(
  userId: string,
  milestone: number,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('claim_score_road', {
    p_user_id: userId,
    p_milestone: milestone,
  });

  if (error) {
    console.error('[Gamification] claimScoreRoad error:', error);
    return { ok: false, error: error.message };
  }
  if (data && typeof data === 'object' && 'error' in data) {
    return { ok: false, error: String(data.error) };
  }
  return { ok: true };
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
  if (error) {
    console.error('[Gamification] getScoreHistory error:', error);
    return [];
  }
  return data ?? [];
}
