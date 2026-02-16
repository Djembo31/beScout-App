import { supabase } from '@/lib/supabaseClient';
import { cached, invalidatePollData } from '@/lib/cache';
import type { DbCommunityPoll, CommunityPollWithCreator } from '@/types';

const TWO_MIN = 2 * 60 * 1000;

// ============================================
// Community Polls (Bezahlte Umfragen)
// ============================================

export async function getCommunityPolls(clubId?: string): Promise<CommunityPollWithCreator[]> {
  const cacheKey = clubId ? `communityPolls:${clubId}` : 'communityPolls:all';
  return cached(cacheKey, async () => {
    let query = supabase
      .from('community_polls')
      .select('*')
      .order('created_at', { ascending: false });
    if (clubId) query = query.eq('club_id', clubId);
    const { data, error } = await query;

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    const polls = data as DbCommunityPoll[];

    // Fetch creator profiles
    const creatorIds = Array.from(new Set(polls.map(p => p.created_by)));
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .in('id', creatorIds);
    if (pErr) throw new Error(pErr.message);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    return polls.map(poll => {
      const creator = profileMap.get(poll.created_by);
      return {
        ...poll,
        creator_handle: creator?.handle ?? 'unknown',
        creator_display_name: creator?.display_name ?? null,
        creator_avatar_url: creator?.avatar_url ?? null,
      };
    });
  }, TWO_MIN);
}

export async function getUserPollVotedIds(userId: string): Promise<Set<string>> {
  return cached(`pollVotedIds:${userId}`, async () => {
    const { data, error } = await supabase
      .from('community_poll_votes')
      .select('poll_id')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return new Set((data ?? []).map(r => r.poll_id));
  }, TWO_MIN);
}

export type CastPollVoteResult = {
  success: boolean;
  error?: string;
  total_votes?: number;
  cost?: number;
  creator_share?: number;
};

export async function castCommunityPollVote(
  userId: string,
  pollId: string,
  optionIndex: number
): Promise<CastPollVoteResult> {
  const { data, error } = await supabase.rpc('cast_community_poll_vote', {
    p_user_id: userId,
    p_poll_id: pollId,
    p_option_index: optionIndex,
  });

  if (error) throw new Error(error.message);
  const result = data as CastPollVoteResult;

  if (result.success) {
    invalidatePollData(userId);
    // Mission tracking
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_vote']);
    }).catch(err => console.error('[Polls] Mission tracking failed:', err));
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'poll_vote', 'community', { pollId, optionIndex });
    }).catch(err => console.error('[Polls] Activity log failed:', err));
    // Fire-and-forget: airdrop score refresh for poll creator
    (async () => {
      try {
        const { data: p } = await supabase.from('community_polls').select('created_by').eq('id', pollId).single();
        if (p) import('@/lib/services/airdropScore').then(m => m.refreshAirdropScore(p.created_by));
      } catch {}
    })();
    // Notify poll creator
    (async () => {
      try {
        const { data: poll } = await supabase
          .from('community_polls')
          .select('created_by, question')
          .eq('id', pollId)
          .single();
        if (poll && poll.created_by !== userId) {
          const { createNotification } = await import('@/lib/services/notifications');
          createNotification(
            poll.created_by,
            'poll_vote',
            'Neue Stimme',
            `Jemand hat bei "${poll.question.slice(0, 60)}" abgestimmt`,
            pollId,
            'poll'
          );
        }
      } catch (err) { console.error('[Polls] Vote notification failed:', err); }
    })();
  }

  return result;
}

export async function createCommunityPoll(params: {
  userId: string;
  question: string;
  description: string | null;
  options: string[];
  costCents: number;
  durationDays: number;
}): Promise<DbCommunityPoll> {
  const optionsJsonb = params.options.map(label => ({ label, votes: 0 }));
  const endsAt = new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('community_polls')
    .insert({
      created_by: params.userId,
      question: params.question,
      description: params.description,
      options: optionsJsonb,
      cost_bsd: params.costCents,
      ends_at: endsAt,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidatePollData(params.userId);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'poll_create', 'community', { pollId: data.id, question: params.question });
  }).catch(err => console.error('[Polls] Activity log failed:', err));
  return data as DbCommunityPoll;
}

export async function cancelCommunityPoll(userId: string, pollId: string): Promise<void> {
  const { error } = await supabase
    .from('community_polls')
    .update({ status: 'cancelled' })
    .eq('id', pollId)
    .eq('created_by', userId)
    .eq('total_votes', 0);

  if (error) throw new Error(error.message);
  invalidatePollData(userId);
}
