import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';

const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Types
// ============================================

export type PlayerFairValue = {
  playerId: string;
  medianCents: number;
  meanCents: number;
  stdDevCents: number;
  voteCount: number;
  lastCalculatedAt: string;
};

export type UserValuation = {
  id: string;
  playerId: string;
  estimatedCents: number;
  gameweek: number;
  createdAt: string;
};

// ============================================
// Queries
// ============================================

/** Get fair value for a player */
export async function getPlayerFairValue(playerId: string): Promise<PlayerFairValue | null> {
  return cached(`fair-value:${playerId}`, async () => {
    const { data, error } = await supabase
      .from('player_fair_values')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      playerId: data.player_id,
      medianCents: data.median_cents,
      meanCents: data.mean_cents,
      stdDevCents: data.std_dev_cents,
      voteCount: data.vote_count,
      lastCalculatedAt: data.last_calculated_at,
    };
  }, FIVE_MIN);
}

/** Get user's valuation for a player in a given GW */
export async function getUserValuation(userId: string, playerId: string, gameweek: number): Promise<UserValuation | null> {
  return cached(`valuation:${userId}:${playerId}:gw${gameweek}`, async () => {
    const { data, error } = await supabase
      .from('player_valuations')
      .select('*')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .eq('gameweek', gameweek)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: data.id,
      playerId: data.player_id,
      estimatedCents: data.estimated_cents,
      gameweek: data.gameweek,
      createdAt: data.created_at,
    };
  }, FIVE_MIN);
}

// ============================================
// Mutations
// ============================================

/** Submit a valuation */
export async function submitValuation(
  userId: string,
  playerId: string,
  estimatedCents: number,
  gameweek: number
): Promise<{ success: boolean; error?: string; medianCents?: number; voteCount?: number }> {
  const { data, error } = await supabase.rpc('submit_player_valuation', {
    p_user_id: userId,
    p_player_id: playerId,
    p_estimated_cents: estimatedCents,
    p_gameweek: gameweek,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string; median_cents?: number; vote_count?: number };
  if (result.success) {
    invalidate(`fair-value:${playerId}`);
    invalidate(`valuation:${userId}:${playerId}`);
  }
  return {
    success: result.success,
    error: result.error,
    medianCents: result.median_cents,
    voteCount: result.vote_count,
  };
}
