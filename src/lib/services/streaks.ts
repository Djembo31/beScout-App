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
