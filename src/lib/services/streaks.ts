import { supabase } from '@/lib/supabaseClient';
import type { StreakResult } from '@/types';

/** Record login streak + auto-use shields + auto-claim milestone rewards */
export async function recordLoginStreak(userId: string): Promise<StreakResult> {
  const { data, error } = await supabase.rpc('record_login_streak', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);

  const result = data as StreakResult;

  // Credit login tickets based on compound streak benefits
  // Note: daily_login mission progress is incremented by record_login_streak RPC
  // itself (SECURITY DEFINER calls update_mission_progress internally).
  // Do NOT add a client-side triggerMissionProgress here — would double-count.
  if (result.ok && !result.already_today) {
    const { getStreakBenefits } = await import('@/lib/streakBenefits');
    const benefits = getStreakBenefits(result.streak);
    result.daily_tickets = benefits.dailyTickets;
    import('@/lib/services/tickets').then(({ creditTickets }) => {
      creditTickets(userId, benefits.dailyTickets, 'daily_login').catch(console.error);
    }).catch(console.error);
  }

  return result;
}
