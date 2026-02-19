import { supabase } from '@/lib/supabaseClient';

// ============================================
// DPC Mastery Service (Level 1-5 per Player)
// ============================================

export type DbDpcMastery = {
  id: string;
  user_id: string;
  player_id: string;
  level: number;
  xp: number;
  hold_days: number;
  fantasy_uses: number;
  content_count: number;
  is_frozen: boolean;
  frozen_at: string | null;
  first_acquired_at: string;
};

export const MASTERY_XP_THRESHOLDS = [0, 50, 150, 350, 700];

export const MASTERY_LEVEL_LABELS = ['', 'Neuling', 'Kenner', 'Experte', 'Meister', 'Legende'];

export function getXpForNextLevel(level: number): number {
  if (level >= 5) return 0;
  return MASTERY_XP_THRESHOLDS[level];
}

/** Get DPC mastery for a specific user + player */
export async function getDpcMastery(userId: string, playerId: string): Promise<DbDpcMastery | null> {
  const { data, error } = await supabase
    .from('dpc_mastery')
    .select('*')
    .eq('user_id', userId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    console.error('[Mastery] getDpcMastery error:', error);
    return null;
  }
  return data;
}

/** Get all mastery entries for a user (sorted by level desc) */
export async function getUserMasteryAll(userId: string): Promise<DbDpcMastery[]> {
  const { data, error } = await supabase
    .from('dpc_mastery')
    .select('*')
    .eq('user_id', userId)
    .eq('is_frozen', false)
    .order('level', { ascending: false })
    .order('xp', { ascending: false });

  if (error) {
    console.error('[Mastery] getUserMasteryAll error:', error);
    return [];
  }
  return data ?? [];
}

/** Award mastery XP via RPC */
export async function awardMasteryXp(
  userId: string,
  playerId: string,
  xp: number,
  source: string,
): Promise<{ ok: boolean; level?: number; leveled_up?: boolean }> {
  const { data, error } = await supabase.rpc('award_mastery_xp', {
    p_user_id: userId,
    p_player_id: playerId,
    p_xp: xp,
    p_source: source,
  });

  if (error) {
    console.error('[Mastery] awardMasteryXp error:', error);
    return { ok: false };
  }
  const result = data as Record<string, unknown> | null;
  return {
    ok: true,
    level: result?.level as number | undefined,
    leveled_up: result?.leveled_up as boolean | undefined,
  };
}

/** Fire-and-forget mastery XP award */
export function awardMasteryXpAsync(userId: string, playerId: string, xp: number, source: string): void {
  awardMasteryXp(userId, playerId, xp, source)
    .catch(err => console.error('[Mastery] async award error:', err));
}
