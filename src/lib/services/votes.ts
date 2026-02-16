import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbClubVote } from '@/types';

const TWO_MIN = 2 * 60 * 1000;

// ============================================
// Club Votes
// ============================================

export async function getActiveVotes(clubId: string): Promise<DbClubVote[]> {
  return cached(`votes:active:${clubId}`, async () => {
    const { data, error } = await supabase
      .from('club_votes')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DbClubVote[];
  }, TWO_MIN);
}

export async function getAllVotes(clubId: string): Promise<DbClubVote[]> {
  return cached(`votes:all:${clubId}`, async () => {
    const { data, error } = await supabase
      .from('club_votes')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DbClubVote[];
  }, TWO_MIN);
}

export async function getUserVotedIds(userId: string): Promise<Set<string>> {
  return cached(`votedIds:${userId}`, async () => {
    const { data, error } = await supabase
      .from('vote_entries')
      .select('vote_id')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map(r => r.vote_id));
  }, TWO_MIN);
}

export async function castVote(
  userId: string,
  voteId: string,
  optionIndex: number
): Promise<{ success: boolean; total_votes: number; cost: number }> {
  const { data, error } = await supabase.rpc('cast_vote', {
    p_user_id: userId,
    p_vote_id: voteId,
    p_option_index: optionIndex,
  });
  if (error) throw new Error(error.message);
  invalidate('votes:');
  invalidate(`votedIds:${userId}`);
  invalidate(`wallet:${userId}`);
  invalidate(`transactions:${userId}`);
  // Mission tracking
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(userId, ['daily_vote']);
  }).catch(err => console.error('[Votes] Mission tracking failed:', err));
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'club_vote', 'community', { voteId, optionIndex });
  }).catch(err => console.error('[Votes] Activity log failed:', err));
  // Fire-and-forget: refresh stats + check achievements
  import('@/lib/services/social').then(({ refreshUserStats, checkAndUnlockAchievements }) => {
    refreshUserStats(userId)
      .then(() => checkAndUnlockAchievements(userId))
      .catch(() => {});
  }).catch(() => {});
  return data as { success: boolean; total_votes: number; cost: number };
}

export async function createVote(params: {
  userId: string;
  clubId: string;
  clubName: string;
  question: string;
  options: string[];
  costCents: number;
  durationDays: number;
}): Promise<DbClubVote> {
  const optionsJsonb = params.options.map(label => ({ label, votes: 0 }));
  const endsAt = new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('club_votes')
    .insert({
      club_id: params.clubId,
      club_name: params.clubName,
      question: params.question,
      options: optionsJsonb,
      cost_bsd: params.costCents,
      ends_at: endsAt,
      created_by: params.userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidate('votes:');
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'vote_create', 'community', { voteId: data.id, question: params.question });
  }).catch(err => console.error('[Votes] Activity log failed:', err));
  return data as DbClubVote;
}
