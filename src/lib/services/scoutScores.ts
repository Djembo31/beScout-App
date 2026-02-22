import { supabase } from '@/lib/supabaseClient';
import type { Dimension } from '@/lib/gamification';

// ============================================
// Scout Scores Service (3-Dimension Elo System)
// ============================================

export type { Dimension } from '@/lib/gamification';

export type ScoutScoreRow = {
  user_id: string;
  trader_score: number;
  manager_score: number;
  analyst_score: number;
  trader_peak: number;
  manager_peak: number;
  analyst_peak: number;
  season_start_trader: number;
  season_start_manager: number;
  season_start_analyst: number;
};

export type ScoreHistoryEntry = {
  id: string;
  user_id: string;
  dimension: Dimension;
  delta: number;
  score_before: number;
  score_after: number;
  event_type: string;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ScoutLeaderboardEntry = {
  user_id: string;
  trader_score: number;
  manager_score: number;
  analyst_score: number;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
};

/** Fetch scout scores for a user */
export async function getScoutScores(userId: string): Promise<ScoutScoreRow | null> {
  const { data, error } = await supabase
    .from('scout_scores')
    .select('user_id, trader_score, manager_score, analyst_score, trader_peak, manager_peak, analyst_peak, season_start_trader, season_start_manager, season_start_analyst')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[ScoutScores] getScoutScores error:', error);
    return null;
  }
  return data;
}

/** Fetch leaderboard by dimension (or overall = median) */
export async function getScoutLeaderboard(
  dimension: Dimension | 'overall' = 'overall',
  limit: number = 20,
): Promise<ScoutLeaderboardEntry[]> {
  const orderCol = dimension === 'overall'
    ? 'trader_score' // We'll sort client-side for median
    : `${dimension}_score`;

  const { data, error } = await supabase
    .from('scout_scores')
    .select('user_id, trader_score, manager_score, analyst_score, profiles!inner(handle, display_name, avatar_url, verified)')
    .order(orderCol, { ascending: false })
    .limit(dimension === 'overall' ? limit * 3 : limit);

  if (error) {
    console.error('[ScoutScores] getScoutLeaderboard error:', error);
    return [];
  }

  const mapped = (data ?? []).map((row: Record<string, unknown>) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id as string,
      trader_score: row.trader_score as number,
      manager_score: row.manager_score as number,
      analyst_score: row.analyst_score as number,
      handle: (profile as Record<string, unknown>)?.handle as string ?? '',
      display_name: (profile as Record<string, unknown>)?.display_name as string | null,
      avatar_url: (profile as Record<string, unknown>)?.avatar_url as string | null,
      verified: (profile as Record<string, unknown>)?.verified as boolean ?? false,
    };
  });

  if (dimension === 'overall') {
    // Sort by median of 3 dimensions
    mapped.sort((a, b) => {
      const medA = getMedian([a.trader_score, a.manager_score, a.analyst_score]);
      const medB = getMedian([b.trader_score, b.manager_score, b.analyst_score]);
      return medB - medA;
    });
    return mapped.slice(0, limit);
  }

  return mapped;
}

// award_dimension_score is REVOKED from PUBLIC — all scoring now happens via DB triggers
// Rang-change notifications are handled inside the award_dimension_score RPC itself

// ── Helpers ──

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[1]; // Middle of 3
}

/** Get median score from 3 dimensions */
export function getMedianScore(scores: { trader_score: number; manager_score: number; analyst_score: number }): number {
  return getMedian([scores.trader_score, scores.manager_score, scores.analyst_score]);
}
