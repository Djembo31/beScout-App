import { supabase } from '@/lib/supabaseClient';
import { invalidate } from '@/lib/cache';
import type { StreakResult } from '@/types';

/** Record login streak + auto-claim milestone rewards */
export async function recordLoginStreak(userId: string): Promise<StreakResult> {
  const { data, error } = await supabase.rpc('record_login_streak', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  const result = data as StreakResult;
  // Invalidate wallet if rewards were given
  if (result.rewards_given && result.rewards_given.length > 0) {
    invalidate(`wallet:${userId}`);
    invalidate(`transactions:${userId}`);
  }
  return result;
}
