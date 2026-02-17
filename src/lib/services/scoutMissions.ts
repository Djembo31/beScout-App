import { supabase } from '@/lib/supabaseClient';

// ============================================
// Types
// ============================================

export type ScoutMissionDifficulty = 'easy' | 'medium' | 'hard';

export type ScoutMissionCriteria = {
  max_age?: number;
  position?: string;
  min_perf_l5?: number;
  min_goals?: number;
  min_assists?: number;
  min_clean_sheets?: number;
  max_floor_price_cents?: number;
};

export type ScoutMission = {
  id: string;
  title: string;
  description: string;
  criteria: ScoutMissionCriteria;
  rewardCents: number;
  difficulty: ScoutMissionDifficulty;
  minTier: string | null;
};

export type UserScoutMission = {
  id: string;
  missionId: string;
  gameweek: number;
  submittedPlayerId: string | null;
  status: 'active' | 'completed' | 'claimed' | 'expired';
  completedAt: string | null;
  claimedAt: string | null;
};

// ============================================
// Difficulty styles
// ============================================

export const DIFFICULTY_STYLES: Record<ScoutMissionDifficulty, { label: string; color: string; bg: string; border: string }> = {
  easy:   { label: 'Einfach', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  medium: { label: 'Mittel',  color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  hard:   { label: 'Schwer',  color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

// ============================================
// Queries
// ============================================

/** Get all active scout missions */
export async function getScoutMissions(): Promise<ScoutMission[]> {
  const { data, error } = await supabase
    .from('scout_mission_definitions')
    .select('*')
    .eq('active', true)
    .order('difficulty', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    criteria: m.criteria as ScoutMissionCriteria,
    rewardCents: m.reward_cents,
    difficulty: m.difficulty as ScoutMissionDifficulty,
    minTier: m.min_tier,
  }));
}

/** Get user's mission progress for a specific gameweek */
export async function getUserMissionProgress(userId: string, gameweek: number): Promise<UserScoutMission[]> {
  const { data, error } = await supabase
    .from('user_scout_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('gameweek', gameweek);

  if (error) throw new Error(error.message);
  return (data ?? []).map(m => ({
    id: m.id,
    missionId: m.mission_id,
    gameweek: m.gameweek,
    submittedPlayerId: m.submitted_player_id,
    status: m.status as UserScoutMission['status'],
    completedAt: m.completed_at,
    claimedAt: m.claimed_at,
  }));
}

// ============================================
// Mutations
// ============================================

/** Submit a player for a scout mission */
export async function submitScoutMission(
  userId: string,
  missionId: string,
  playerId: string,
  gameweek: number
): Promise<{ success: boolean; error?: string; rewardCents?: number }> {
  const { data, error } = await supabase.rpc('submit_scout_mission', {
    p_user_id: userId,
    p_mission_id: missionId,
    p_player_id: playerId,
    p_gameweek: gameweek,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string; reward_cents?: number };
  return {
    success: result.success,
    error: result.error,
    rewardCents: result.reward_cents,
  };
}

/** Claim reward for a completed scout mission */
export async function claimScoutMissionReward(
  userId: string,
  missionId: string,
  gameweek: number
): Promise<{ success: boolean; error?: string; rewardCents?: number }> {
  const { data, error } = await supabase.rpc('claim_scout_mission_reward', {
    p_user_id: userId,
    p_mission_id: missionId,
    p_gameweek: gameweek,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string; reward_cents?: number };
  return {
    success: result.success,
    error: result.error,
    rewardCents: result.reward_cents,
  };
}
