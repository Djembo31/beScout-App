import { supabase } from '@/lib/supabaseClient';
import type { DbCommunityPoll, CommunityPollWithCreator, CreateCommunityPollParams } from '@/types';

// ============================================
// Community Polls (Bezahlte Umfragen)
// ============================================

export async function getCommunityPolls(clubId?: string): Promise<CommunityPollWithCreator[]> {
  let query = supabase
      .from('community_polls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
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

    // Slice 334: Spieler-Namen auflösen (für Anzeige + Discovery-Suche). Max 50 Polls → max 50 ids, kein Chunking.
    const playerIds = Array.from(new Set(polls.map(p => p.player_id).filter((id): id is string => !!id)));
    const playerMap = new Map<string, { name: string; position: string | null }>();
    if (playerIds.length > 0) {
      const { data: players, error: plErr } = await supabase
        .from('players')
        .select('id, first_name, last_name, position')
        .in('id', playerIds);
      if (plErr) throw new Error(plErr.message);
      for (const pl of players ?? []) {
        playerMap.set(pl.id, {
          name: `${pl.first_name ?? ''} ${pl.last_name ?? ''}`.trim(),
          position: pl.position ?? null,
        });
      }
    }

    return polls.map(poll => {
      const creator = profileMap.get(poll.created_by);
      const player = poll.player_id ? playerMap.get(poll.player_id) : undefined;
      return {
        ...poll,
        creator_handle: creator?.handle ?? 'unknown',
        creator_display_name: creator?.display_name ?? null,
        creator_avatar_url: creator?.avatar_url ?? null,
        player_name: player?.name ?? null,
        player_position: player?.position ?? null,
      };
    });
}

/**
 * Slice 339: Alle Follower-IDs einer Quelle laden — Range-Loop gegen PostgREST-1000-Cap.
 * Club-Poll → club_followers.user_id; User-Poll → user_follows.follower_id (following_id=Creator).
 * Mega-Clubs (polls.md §1: Galatasaray ~35 Mio) > 1000 Follower → unranged .select() würde still
 * nur 1000 benachrichtigen. Exportiert für direkte Unit-Tests der Pagination.
 */
export async function fetchAllFollowerIds(
  source: 'club' | 'user',
  clubId?: string | null,
  userId?: string | null,
): Promise<string[]> {
  const PAGE = 1000;
  const ids: string[] = [];
  if (source === 'club' && clubId) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from('club_followers')
        .select('user_id')
        .eq('club_id', clubId)
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      ids.push(...rows.map(r => r.user_id));
      if (rows.length < PAGE) break;
    }
  } else if (source === 'user' && userId) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId)
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      ids.push(...rows.map(r => r.follower_id));
      if (rows.length < PAGE) break;
    }
  }
  return ids;
}

/**
 * Slice 333: Bezahlte Umfrage erstellen (die fehlende Tür).
 * source='club' → nur Club-Admin, 70% Vote-Einnahmen → Vereins-Treasury (poll_revenue).
 * source='user' → User ab 50 Followern, 70% → Creator-Wallet.
 * RPC verriegelt Identität/Follower-Tor server-seitig (Geld/Security).
 */
export async function createCommunityPoll(params: CreateCommunityPollParams): Promise<string> {
  const { data, error } = await supabase.rpc('create_community_poll', {
    p_user_id: params.userId,
    p_question: params.question,
    p_options: params.options,
    p_cost_bsd: params.costBsd,
    p_duration_days: params.durationDays,
    p_source: params.source,
    p_club_id: params.clubId ?? null,
    p_description: params.description ?? null,
    p_player_id: params.playerId ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; error?: string; poll_id?: string };
  if (!result.success || !result.poll_id) throw new Error(result.error ?? 'poll_create_failed');

  // Activity log (best-effort, wie createVote)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'poll_create', 'community', { pollId: result.poll_id, question: params.question });
  }).catch(err => console.error('[Polls] Activity log failed:', err));

  // Slice 336 (P3a Reichweite): Follower über neue Umfrage benachrichtigen (best-effort, wie createEvent).
  // Club-Poll → Club-Follower (club_followers); User-Poll → eigene Follower (user_follows.following_id=Creator).
  const pollId = result.poll_id;
  (async () => {
    try {
      // Slice 339: Range-Loop gegen PostgREST-1000-Cap (Mega-Club > 1000 Follower).
      const followerIds = await fetchAllFollowerIds(params.source, params.clubId, params.userId);
      if (followerIds.length > 0) {
        const { createNotification } = await import('@/lib/services/notifications');
        const { notifText } = await import('@/lib/notifText');
        const snippet = params.question.slice(0, 60);
        await Promise.all(followerIds.map(uid =>
          createNotification(uid, 'poll_new', notifText('pollNewTitle'), notifText('pollNewBody', { name: snippet }), pollId, 'poll'),
        ));
      }
    } catch (err) { console.error('[Polls] follower notify failed:', err); }
  })();

  return result.poll_id;
}

export async function getUserPollVotedIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('community_poll_votes')
    .select('poll_id')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map(r => r.poll_id));
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
    // Mission tracking (daily_vote via wrapper RPC)
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_vote']);
    }).catch(err => console.error('[Polls] Mission tracking failed:', err));
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'poll_vote', 'community', { pollId, optionIndex });
    }).catch(err => console.error('[Polls] Activity log failed:', err));
    // Poll creator airdrop refresh handled by periodic pg_cron job
    // Notify poll creator (batched to prevent spam from rapid votes)
    (async () => {
      try {
        const { data: poll } = await supabase
          .from('community_polls')
          .select('created_by, question')
          .eq('id', pollId)
          .maybeSingle();
        if (poll && poll.created_by !== userId) {
          const { createBatchedNotification } = await import('@/lib/services/notifications');
          const questionSnippet = poll.question.slice(0, 60);
          createBatchedNotification(
            poll.created_by,
            'poll_vote',
            pollId,
            'poll',
            (count) => count === 1 ? 'Neue Stimme' : `${count} neue Stimmen`,
            (count) => count === 1
              ? `Jemand hat bei "${questionSnippet}" abgestimmt`
              : `${count} Personen haben bei "${questionSnippet}" abgestimmt`,
          );
        }
      } catch (err) { console.error('[Polls] Vote notification failed:', err); }
    })();
  }

  return result;
}

export async function cancelCommunityPoll(userId: string, pollId: string): Promise<void> {
  const { error } = await supabase
    .from('community_polls')
    .update({ status: 'cancelled' })
    .eq('id', pollId)
    .eq('created_by', userId)
    .eq('total_votes', 0);

  if (error) throw new Error(error.message);
}
