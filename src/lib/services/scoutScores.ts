import { supabase } from '@/lib/supabaseClient';
import { getRang, getDimensionLabel, type Dimension } from '@/lib/gamification';

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

/** Award dimension score via RPC */
export async function awardDimensionScore(
  userId: string,
  dimension: Dimension,
  delta: number,
  eventType: string,
  sourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; score_before?: number; score_after?: number; error?: string }> {
  if (delta === 0) return { ok: true };

  const { data, error } = await supabase.rpc('award_dimension_score', {
    p_user_id: userId,
    p_dimension: dimension,
    p_delta: delta,
    p_event_type: eventType,
    p_source_id: sourceId ?? null,
    p_metadata: metadata ?? {},
  });

  if (error) {
    console.error('[ScoutScores] awardDimensionScore error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as Record<string, unknown> | null;
  if (result && result.ok === false) {
    return { ok: false, error: String(result.error) };
  }

  const scoreBefore = result?.score_before as number | undefined;
  const scoreAfter = result?.score_after as number | undefined;

  // Rang-change detection → notification
  if (scoreBefore !== undefined && scoreAfter !== undefined) {
    const rangBefore = getRang(scoreBefore);
    const rangAfter = getRang(scoreAfter);
    if (rangBefore.id !== rangAfter.id) {
      const dimLabel = getDimensionLabel(dimension);
      const isUp = scoreAfter > scoreBefore;
      import('@/lib/services/notifications').then(({ createNotification }) => {
        createNotification(
          userId,
          isUp ? 'rang_up' : 'rang_down',
          isUp
            ? `${dimLabel}: Aufstieg zu ${rangAfter.fullName}!`
            : `${dimLabel}: Abstieg auf ${rangAfter.fullName}`,
          isUp
            ? `Dein ${dimLabel}-Rang ist auf ${rangAfter.fullName} gestiegen. Weiter so!`
            : `Dein ${dimLabel}-Rang ist auf ${rangAfter.fullName} gefallen.`,
        );
      }).catch(err => console.error('[ScoutScores] Rang notification failed:', err));
    }
  }

  return {
    ok: true,
    score_before: scoreBefore,
    score_after: scoreAfter,
  };
}

/** Fire-and-forget wrapper for service-layer calls */
export function awardDimensionScoreAsync(
  userId: string,
  dimension: Dimension,
  delta: number,
  eventType: string,
  sourceId?: string,
): void {
  awardDimensionScore(userId, dimension, delta, eventType, sourceId)
    .catch(err => console.error('[ScoutScores] async award error:', err));
}

// ── Helpers ──

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[1]; // Middle of 3
}

/** Get median score from 3 dimensions */
export function getMedianScore(scores: { trader_score: number; manager_score: number; analyst_score: number }): number {
  return getMedian([scores.trader_score, scores.manager_score, scores.analyst_score]);
}
