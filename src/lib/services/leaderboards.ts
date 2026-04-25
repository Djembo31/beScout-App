/**
 * Leaderboards Service — Slice 199 (2026-04-25)
 *
 * Read-only Aggregat-RPC wrappers fuer Top-Predictors Leaderboard und
 * (zukuenftig weitere read-only Leaderboard-Aggregate).
 *
 * Pattern: Slice 195e — plain JSONB Array Return-Shape, kein Discriminator
 * fuer happy-path. Errors werden via supabase.rpc-Error geworfen.
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Founding-pass-derived user tier. Source: user_founding_passes.tier
 * (highest priority: founder > pro > scout > fan). RPC defaults to 'fan'
 * for users without a founding pass.
 */
export type UserTier = 'fan' | 'scout' | 'pro' | 'founder';

export type TopPredictorEntry = {
  user_id: string;
  handle: string;
  display_name: string | null;
  tier: UserTier;
  predictions_total: number;
  predictions_correct: number;
  hit_rate_pct: number;
  rank: number;
};

/**
 * Top-Predictors Leaderboard.
 *
 * Aggregates predictions GROUP BY user_id (correct/wrong), JOINs profiles,
 * derives tier from highest user_founding_passes.tier. HAVING ≥5 resolved
 * predictions per user. Returns sorted by hit_rate DESC, predictions_total DESC.
 *
 * @param limit  1..100 (RPC clamps internally). Default 10.
 */
export async function getTopPredictorsLeaderboard(
  limit = 10,
): Promise<TopPredictorEntry[]> {
  const { data, error } = await supabase.rpc('get_top_predictors_leaderboard', {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  // RPC returns plain JSONB array (Slice 195e pattern, NOT discriminated union).
  // Empty result: [].
  return (data as TopPredictorEntry[] | null) ?? [];
}
