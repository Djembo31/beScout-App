import { supabase } from '@/lib/supabaseClient';
import type { StreakResult } from '@/types';

/** Record login streak + auto-use shields + auto-claim milestone rewards */
export async function recordLoginStreak(userId: string): Promise<StreakResult> {
  const { data, error } = await supabase.rpc('record_login_streak', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data as StreakResult;
}
