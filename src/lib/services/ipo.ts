import { supabase } from '@/lib/supabaseClient';
import { mapRpcError } from '@/lib/services/trading';
import { notifText } from '@/lib/notifText';
import type { DbIpo } from '@/types';

// ============================================
// Types
// ============================================

type CreateIpoResult = {
  success: boolean;
  error?: string;
  ipo_id?: string;
  status?: string;
  starts_at?: string;
  ends_at?: string;
};

type UpdateIpoStatusResult = {
  success: boolean;
  error?: string;
  ipo_id?: string;
  new_status?: string;
};

type IpoBuyResult = {
  success: boolean;
  error?: string;
  trade_id?: string;
  total_cost?: number;
  new_balance?: number;
  quantity?: number;
  price_per_dpc?: number;
  source?: 'ipo';
  user_total_purchased?: number;
  ipo_remaining?: number;
};

// ============================================
// IPO Queries
// ============================================

/** All active IPOs (open or early_access, not yet expired) */
export async function getActiveIpos(): Promise<DbIpo[]> {
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .in('status', ['open', 'early_access'])
    .gt('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIpo[];
}

/** Active IPO for a specific player */
export async function getIpoForPlayer(playerId: string): Promise<DbIpo | null> {
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('player_id', playerId)
    .in('status', ['open', 'early_access', 'announced'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DbIpo | null;
}

/** How many DPCs a user already bought in a specific IPO */
export async function getUserIpoPurchases(userId: string, ipoId: string): Promise<number> {
  const { data, error } = await supabase
    .from('ipo_purchases')
    .select('quantity')
    .eq('ipo_id', ipoId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0);
}

/** Buy from IPO via RPC — all users can buy, followers/subscribers get early access */
export async function buyFromIpo(
  userId: string,
  ipoId: string,
  quantity: number,
  playerId?: string
): Promise<IpoBuyResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('invalidQuantity');
  if (quantity > 300) throw new Error('maxQuantityExceeded');

  // Defense-in-depth: liquidation + club admin check (DB RPC also checks)
  if (playerId) {
    const { data: pl } = await supabase.from('players').select('is_liquidated').eq('id', playerId).maybeSingle();
    if (pl?.is_liquidated) throw new Error('playerLiquidated');

    const { isRestrictedFromTrading } = await import('@/lib/services/trading');
    const restricted = await isRestrictedFromTrading(userId, playerId);
    if (restricted) throw new Error('clubAdminRestricted');
  }

  const { data, error } = await supabase.rpc('buy_from_ipo', {
    p_user_id: userId,
    p_ipo_id: ipoId,
    p_quantity: quantity,
  });

  if (error) throw new Error(mapRpcError(error.message));
  if (!data) return { success: false, error: 'No response from server' };
  const result = data as IpoBuyResult;
  // Activity log (always fires for audit trail, regardless of success)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'ipo_buy', 'trading', { ipoId, quantity, playerId });
  }).catch(err => console.error('[IPO] Activity log failed:', err));
  if (result.success) {
    // Gamification: achievements fire-and-forget
    import('@/lib/services/social').then(({ checkAndUnlockAchievements }) =>
      checkAndUnlockAchievements(userId)
    ).catch(err => console.error('[IPO] Achievement check failed:', err));
    // Fire-and-forget: referral reward (triggers on first trade by referred user)
    import('@/lib/services/referral').then(({ triggerReferralReward }) => {
      triggerReferralReward(userId);
    }).catch(err => console.error('[IPO] Referral reward failed:', err));
    // Mission progress: daily trade + weekly trades + daily buy (IPO is also a buy)
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_trade_2', 'weekly_trade_5', 'daily_buy_1']);
    }).catch(err => console.error('[IPO] Mission tracking failed:', err));
    // Notification: IPO purchase confirmed (fire-and-forget)
    import('@/lib/services/notifications').then(({ createNotification }) => {
      createNotification(userId, 'ipo_purchase', `${quantity}x Scout Card gekauft`, undefined, ipoId, 'ipo');
    }).catch(err => console.error('[IPO] Purchase notification failed:', err));
  }
  return result;
}

// ============================================
// IPO Management (Admin)
// ============================================

/** Create a new IPO via RPC */
export async function createIpo(params: {
  userId: string;
  playerId: string;
  priceCents: number;
  totalOffered: number;
  maxPerUser?: number;
  durationDays?: number;
  startImmediately?: boolean;
}): Promise<CreateIpoResult> {
  const { data, error } = await supabase.rpc('create_ipo', {
    p_user_id: params.userId,
    p_player_id: params.playerId,
    p_price: params.priceCents,
    p_total_offered: params.totalOffered,
    p_max_per_user: params.maxPerUser ?? 50,
    p_duration_days: params.durationDays ?? 14,
    p_start_immediately: params.startImmediately ?? false,
  });

  if (error) throw new Error(error.message);
  return data as CreateIpoResult;
}

/** Update IPO status via RPC */
export async function updateIpoStatus(
  userId: string,
  ipoId: string,
  newStatus: string
): Promise<UpdateIpoStatusResult> {
  const { data, error } = await supabase.rpc('update_ipo_status', {
    p_user_id: userId,
    p_ipo_id: ipoId,
    p_new_status: newStatus,
  });

  if (error) throw new Error(error.message);

  // Notify club followers when IPO goes live (batched insert, capped at 500)
  if (newStatus === 'open') {
    (async () => {
      try {
        const { data: ipo } = await supabase.from('ipos').select('player_id').eq('id', ipoId).maybeSingle();
        if (!ipo) return;
        const { data: player } = await supabase.from('players').select('first_name, last_name, club_id').eq('id', ipo.player_id).maybeSingle();
        if (!player?.club_id) return;
        const { data: followers } = await supabase.from('club_followers').select('user_id').eq('club_id', player.club_id).limit(500);
        if (followers && followers.length > 0) {
          const { createNotificationsBatch } = await import('@/lib/services/notifications');
          const name = `${player.first_name} ${player.last_name}`;
          await createNotificationsBatch(
            followers.map((f) => ({
              userId: f.user_id,
              type: 'new_ipo_available' as const,
              title: notifText('newIpoTitle'),
              body: notifText('newIpoBody', { name }),
              referenceId: ipo.player_id,
              referenceType: 'player',
            }))
          );
        }
      } catch (err) { console.error('[IPO] new_ipo_available notification failed:', err); }
    })();
  }

  return data as UpdateIpoStatusResult;
}

/** Recently ended IPOs (last 30 days) for "Beendet" section */
export async function getRecentlyEndedIpos(): Promise<DbIpo[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('status', 'ended')
    .gte('ends_at', thirtyDaysAgo)
    .order('ends_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIpo[];
}

/** Announced IPOs for "Demnächst" section */
export async function getAnnouncedIpos(): Promise<DbIpo[]> {
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('status', 'announced')
    .order('starts_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIpo[];
}

/** Get all IPOs for a club's players (by club name — legacy) */
export async function getIposByClub(clubName: string): Promise<DbIpo[]> {
  const { data: clubPlayers, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('club', clubName);

  if (playersError) throw new Error(playersError.message);
  if (!clubPlayers || clubPlayers.length === 0) return [];

  const playerIds = clubPlayers.map(p => p.id);

  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .in('player_id', playerIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIpo[];
}

/** Get all IPOs for a club's players (by club_id) */
export async function getIposByClubId(clubId: string): Promise<DbIpo[]> {
  const { data: clubPlayers, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('club_id', clubId);

  if (playersError) throw new Error(playersError.message);
  if (!clubPlayers || clubPlayers.length === 0) return [];

  const playerIds = clubPlayers.map(p => p.id);

  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .in('player_id', playerIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIpo[];
}
