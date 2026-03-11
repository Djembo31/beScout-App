import { supabase } from '@/lib/supabaseClient';
import type { StreakResult } from '@/types';

/** Record login streak + auto-use shields + auto-claim milestone rewards */
export async function recordLoginStreak(userId: string): Promise<StreakResult> {
  const { data, error } = await supabase.rpc('record_login_streak', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);

  const result = data as StreakResult;

  // Fire-and-forget: Credit login tickets based on streak length
  // Day 1-3 = 5 tickets, Day 4-6 = 10 tickets, Day 7+ = 15 tickets
  if (result.ok && !result.already_today) {
    const ticketAmount = result.streak <= 3 ? 5 : result.streak <= 6 ? 10 : 15;
    import('@/lib/services/tickets').then(({ creditTickets }) => {
      creditTickets(userId, ticketAmount, 'daily_login').catch(console.error);
    }).catch(console.error);
  }

  return result;
}
