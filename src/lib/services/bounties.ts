import { supabase } from '@/lib/supabaseClient';
import type {
  DbBounty,
  BountyWithCreator,
  DbBountySubmission,
  BountySubmissionWithUser,
  BountySubmissionWithBounty,
} from '@/types';

// ============================================
// Cache Invalidation (no-op, React Query handles this)
// ============================================

export function invalidateBountyData(_userId?: string, _clubId?: string): void {
  // React Query handles cache invalidation from components
}

// ============================================
// Queries
// ============================================

export async function getBountiesByClub(
  clubId: string,
  currentUserId?: string
): Promise<BountyWithCreator[]> {
  // Auto-close expired bounties (fire-and-forget style, but we await for fresh data)
  await (async () => { await supabase.rpc('auto_close_expired_bounties'); })().catch(err => console.error('[Bounties] Auto-close expired bounties failed:', err));

  const { data, error } = await supabase
    .from('bounties')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const bounties = data as DbBounty[];
  return enrichBounties(bounties, currentUserId);
}

export async function getAllActiveBounties(
  currentUserId?: string,
  clubId?: string
): Promise<BountyWithCreator[]> {
  await (async () => { await supabase.rpc('auto_close_expired_bounties'); })().catch(err => console.error('[Bounties] Auto-close expired bounties failed:', err));

  let query = supabase
    .from('bounties')
    .select('*')
    .eq('status', 'open')
    .gt('deadline_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (clubId) query = query.eq('club_id', clubId);
  const { data, error } = await query;

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const bounties = data as DbBounty[];
  return enrichBounties(bounties, currentUserId);
}

async function enrichBounties(
  bounties: DbBounty[],
  currentUserId?: string
): Promise<BountyWithCreator[]> {
  // Fetch creator profiles
  const creatorIds = Array.from(new Set(bounties.map(b => b.created_by)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', creatorIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  // Fetch player names if any bounty references a player
  const playerIds = bounties.map(b => b.player_id).filter(Boolean) as string[];
  let playerMap = new Map<string, { name: string; position: string }>();
  if (playerIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, position')
      .in('id', playerIds);
    if (players) {
      playerMap = new Map(players.map(p => [p.id, { name: `${p.first_name} ${p.last_name}`, position: p.position }]));
    }
  }

  // Check user submissions
  let userSubmittedIds = new Set<string>();
  if (currentUserId) {
    const { data: subs } = await supabase
      .from('bounty_submissions')
      .select('bounty_id')
      .eq('user_id', currentUserId);
    if (subs) userSubmittedIds = new Set(subs.map(s => s.bounty_id));
  }

  return bounties.map(b => {
    const creator = profileMap.get(b.created_by);
    const player = b.player_id ? playerMap.get(b.player_id) : null;
    return {
      ...b,
      creator_handle: creator?.handle ?? 'unknown',
      creator_display_name: creator?.display_name ?? null,
      creator_avatar_url: creator?.avatar_url ?? null,
      player_name: b.player_id ? (player?.name ?? 'Unbekannter Spieler') : null,
      player_position: player?.position ?? null,
      has_user_submitted: userSubmittedIds.has(b.id),
    };
  });
}

export async function getBountySubmissions(
  bountyId: string
): Promise<BountySubmissionWithUser[]> {
  const { data, error } = await supabase
    .from('bounty_submissions')
    .select('*')
    .eq('bounty_id', bountyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const subs = data as DbBountySubmission[];
  const userIds = Array.from(new Set(subs.map(s => s.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return subs.map(s => {
    const u = profileMap.get(s.user_id);
    return {
      ...s,
      user_handle: u?.handle ?? 'unknown',
      user_display_name: u?.display_name ?? null,
      user_avatar_url: u?.avatar_url ?? null,
    };
  });
}

export async function getUserBountySubmissions(
  userId: string
): Promise<BountySubmissionWithBounty[]> {
  const { data, error } = await supabase
    .from('bounty_submissions')
    .select('*, bounties(title, reward_cents)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return data.map((row: Record<string, unknown>) => {
    const bounty = row.bounties as { title: string; reward_cents: number } | null;
    const { bounties: _, ...sub } = row;
    return {
      ...(sub as unknown as DbBountySubmission),
      bounty_title: bounty?.title ?? '',
      bounty_reward_cents: bounty?.reward_cents ?? 0,
    };
  });
}

// ============================================
// Mutations
// ============================================

export async function createBounty(params: {
  userId: string;
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  rewardCents: number;
  deadlineDays: number;
  maxSubmissions: number;
  playerId?: string;
  position?: string;
}): Promise<DbBounty> {
  const deadlineAt = new Date(Date.now() + params.deadlineDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('bounties')
    .insert({
      club_id: params.clubId,
      club_name: params.clubName,
      created_by: params.userId,
      title: params.title,
      description: params.description,
      reward_cents: params.rewardCents,
      deadline_at: deadlineAt,
      max_submissions: params.maxSubmissions,
      player_id: params.playerId || null,
      position: params.position || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidateBountyData(params.userId, params.clubId);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'bounty_create', 'community', { bountyId: data.id, title: params.title, rewardCents: params.rewardCents });
  }).catch(err => console.error('[Bounties] Activity log failed:', err));
  return data as DbBounty;
}

export async function cancelBounty(userId: string, bountyId: string): Promise<void> {
  const { error } = await supabase
    .from('bounties')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bountyId)
    .eq('created_by', userId)
    .eq('submission_count', 0);

  if (error) throw new Error(error.message);
  invalidateBountyData(userId);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'bounty_cancel', 'community', { bountyId });
  }).catch(err => console.error('[Bounties] Activity log failed:', err));
}

export type SubmitBountyResult = { success: boolean; error?: string; submission_id?: string };

export async function submitBountyResponse(
  userId: string,
  bountyId: string,
  title: string,
  content: string
): Promise<SubmitBountyResult> {
  const { data, error } = await supabase.rpc('submit_bounty_response', {
    p_user_id: userId,
    p_bounty_id: bountyId,
    p_title: title,
    p_content: content,
  });

  if (error) throw new Error(error.message);
  const result = data as SubmitBountyResult;

  if (result.success) {
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'bounty_submit', 'community', { bountyId, title });
    }).catch(err => console.error('[Bounties] Activity log failed:', err));

    // Notification to bounty creator (fire-and-forget)
    (async () => {
      const { createNotification } = await import('@/lib/services/notifications');
      const { data: bounty } = await supabase
        .from('bounties')
        .select('created_by, title')
        .eq('id', bountyId)
        .single();
      if (bounty) {
        await createNotification(
          bounty.created_by,
          'bounty_submission',
          'Neue Einreichung',
          `Jemand hat eine Lösung für "${bounty.title}" eingereicht`,
          bountyId,
          'bounty',
        );
      }
    })().catch(err => console.error('[Bounties] Notification failed:', err));

    // Mission tracking
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_submit_bounty', 'weekly_bounty_complete']);
    }).catch(err => console.error('[Bounties] Mission tracking failed:', err));
  }

  return result;
}

export type ApproveBountyResult = { success: boolean; error?: string; reward?: number };

export async function approveBountySubmission(
  adminId: string,
  submissionId: string,
  feedback?: string
): Promise<ApproveBountyResult> {
  const { data, error } = await supabase.rpc('approve_bounty_submission', {
    p_admin_id: adminId,
    p_submission_id: submissionId,
    p_feedback: feedback || null,
  });

  if (error) throw new Error(error.message);
  const result = data as ApproveBountyResult;

  if (result.success) {
    invalidateBountyData(adminId);
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(adminId, 'bounty_approved', 'community', { submissionId });
    }).catch(err => console.error('[Bounties] Activity log failed:', err));

    // Get submission to notify user
    (async () => {
      const { createNotification } = await import('@/lib/services/notifications');
      const { data: sub } = await supabase
        .from('bounty_submissions')
        .select('user_id, bounty_id, bounties(title)')
        .eq('id', submissionId)
        .single();
      if (sub) {
        const bounty = (sub as Record<string, unknown>).bounties as { title: string } | null;
        await createNotification(
          sub.user_id,
          'bounty_approved',
          'Auftrag genehmigt!',
          `Deine Lösung für "${bounty?.title ?? 'Auftrag'}" wurde angenommen`,
          sub.bounty_id,
          'bounty',
        );
      }
    })().catch(err => console.error('[Bounties] Approve notification failed:', err));

    // Fire-and-forget: airdrop score refresh for submitter
    (async () => {
      try {
        const { data: s } = await supabase.from('bounty_submissions').select('user_id').eq('id', submissionId).single();
        if (s) import('@/lib/services/airdropScore').then(m => m.refreshAirdropScore(s.user_id));
      } catch (err) { console.error('[Bounties] Airdrop score refresh failed:', err); }
    })();

    // Fire-and-forget: refresh stats + check achievements for submitter (and admin)
    (async () => {
      try {
        const { refreshUserStats, checkAndUnlockAchievements } = await import('@/lib/services/social');
        // Submitter gets bounty achievement check
        const { data: subData } = await supabase
          .from('bounty_submissions')
          .select('user_id')
          .eq('id', submissionId)
          .single();
        if (subData) {
          await refreshUserStats(subData.user_id);
          await checkAndUnlockAchievements(subData.user_id);
        }
        // Admin stats too
        await refreshUserStats(adminId);
      } catch (err) { console.error('[Bounties] Stats/achievements refresh failed:', err); }
    })();
  }

  return result;
}

export type RejectBountyResult = { success: boolean; error?: string };

export async function rejectBountySubmission(
  adminId: string,
  submissionId: string,
  feedback?: string
): Promise<RejectBountyResult> {
  const { data, error } = await supabase.rpc('reject_bounty_submission', {
    p_admin_id: adminId,
    p_submission_id: submissionId,
    p_feedback: feedback || null,
  });

  if (error) throw new Error(error.message);
  const result = data as RejectBountyResult;

  if (result.success) {
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(adminId, 'bounty_rejected', 'community', { submissionId });
    }).catch(err => console.error('[Bounties] Activity log failed:', err));
    // Notify user
    (async () => {
      const { createNotification } = await import('@/lib/services/notifications');
      const { data: sub } = await supabase
        .from('bounty_submissions')
        .select('user_id, bounty_id, bounties(title)')
        .eq('id', submissionId)
        .single();
      if (sub) {
        const bounty = (sub as Record<string, unknown>).bounties as { title: string } | null;
        await createNotification(
          sub.user_id,
          'bounty_rejected',
          'Auftrag abgelehnt',
          `Deine Lösung für "${bounty?.title ?? 'Auftrag'}" wurde abgelehnt${feedback ? ': ' + feedback : ''}`,
          sub.bounty_id,
          'bounty',
        );
      }
    })().catch(err => console.error('[Bounties] Reject notification failed:', err));
  }

  return result;
}
