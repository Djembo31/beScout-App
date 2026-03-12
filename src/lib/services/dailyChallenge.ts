import { supabase } from '@/lib/supabaseClient';
import type { DbDailyChallenge, DbUserDailyChallenge } from '@/types';

// ============================================
// Daily Challenge Service
// ============================================

/** Fetch today's challenge (correct_option is excluded server-side) */
export async function getTodaysChallenge(): Promise<DbDailyChallenge | null> {
  const { data, error } = await supabase.rpc('get_todays_challenge');

  if (error) {
    console.error('[DailyChallenge] getTodaysChallenge error:', error);
    return null;
  }

  if (!data) return null;

  // Handle both single-row and array responses from Supabase
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  // Validate options array — malformed data must not reach the component
  const challenge = row as DbDailyChallenge;
  if (!Array.isArray(challenge.options)) return null;
  return challenge;
}

/** Submit an answer for today's challenge */
export async function submitDailyChallenge(
  challengeId: string,
  selectedOption: number,
): Promise<{ ok: boolean; isCorrect: boolean | null; ticketsAwarded: number; error?: string }> {
  const { data, error } = await supabase.rpc('submit_daily_challenge', {
    p_challenge_id: challengeId,
    p_selected_option: selectedOption,
  });

  if (error) {
    console.error('[DailyChallenge] submitDailyChallenge error:', error);
    return { ok: false, isCorrect: null, ticketsAwarded: 0, error: error.message };
  }

  const result = data as { ok: boolean; is_correct: boolean | null; tickets_awarded: number; error?: string };

  if (!result.ok) {
    return { ok: false, isCorrect: null, ticketsAwarded: 0, error: result.error ?? 'Unknown error' };
  }

  // Mission tracking (fire-and-forget, auth.uid() used internally by RPC)
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress('', ['complete_challenge', 'daily_activity']);
  }).catch(err => console.error('[DailyChallenge] Mission tracking failed:', err));

  return {
    ok: true,
    isCorrect: result.is_correct,
    ticketsAwarded: result.tickets_awarded,
  };
}

/** Fetch user's challenge history (newest first) */
export async function getUserChallengeHistory(userId: string, limit = 20): Promise<DbUserDailyChallenge[]> {
  const { data, error } = await supabase
    .from('user_daily_challenges')
    .select('id, user_id, challenge_id, selected_option, is_correct, tickets_awarded, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DailyChallenge] getUserChallengeHistory error:', error);
    return [];
  }
  return (data ?? []) as DbUserDailyChallenge[];
}
