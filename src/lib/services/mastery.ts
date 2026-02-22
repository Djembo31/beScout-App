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

// award_mastery_xp is REVOKED from PUBLIC — all mastery XP awards now happen via DB triggers
