import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError } from '@/lib/supabaseErrors';
import { mapErrorToKey } from '@/lib/errorMessages';
import { notifText } from '@/lib/notifText';
import type { DbOffer, OfferWithDetails } from '@/types';

// ============================================
// Offer enrichment (attach player + profile info)
// ============================================

async function enrichOffers(offers: DbOffer[]): Promise<OfferWithDetails[]> {
  if (offers.length === 0) return [];

  const playerIds = Array.from(new Set(offers.map(o => o.player_id)));
  const userIds = Array.from(new Set([
    ...offers.map(o => o.sender_id),
    ...offers.filter(o => o.receiver_id).map(o => o.receiver_id!),
  ]));

  const [playersRes, profilesRes] = await Promise.allSettled([
    supabase.from('players').select('id, first_name, last_name, position, club').in('id', playerIds),
    supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', userIds),
  ]);

  const players = playersRes.status === 'fulfilled' ? (playersRes.value.data ?? []) : [];
  const profiles = profilesRes.status === 'fulfilled' ? (profilesRes.value.data ?? []) : [];

  const playerMap = new Map(players.map(p => [p.id, p]));
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return offers.map(o => {
    const player = playerMap.get(o.player_id);
    const sender = profileMap.get(o.sender_id);
    const receiver = o.receiver_id ? profileMap.get(o.receiver_id) : null;
    return {
      ...o,
      player_first_name: player?.first_name ?? '',
      player_last_name: player?.last_name ?? '',
      player_position: (player?.position ?? 'MID') as OfferWithDetails['player_position'],
      player_club: player?.club ?? '',
      sender_handle: sender?.handle ?? 'anonym',
      sender_display_name: sender?.display_name ?? null,
      sender_avatar_url: sender?.avatar_url ?? null,
      receiver_handle: receiver?.handle ?? null,
      receiver_display_name: receiver?.display_name ?? null,
    };
  });
}

// ============================================
// Queries
// ============================================

/** Incoming offers for a user */
export async function getIncomingOffers(userId: string): Promise<OfferWithDetails[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, player_id, sender_id, receiver_id, side, price, quantity, status, counter_offer_id, message, expires_at, created_at, updated_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) { logSupabaseError('[Offers] getIncomingOffers', error); throw new Error(mapErrorToKey(error.message)); }
  return enrichOffers((data ?? []) as DbOffer[]);
}

/** Outgoing offers from a user */
export async function getOutgoingOffers(userId: string): Promise<OfferWithDetails[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, player_id, sender_id, receiver_id, side, price, quantity, status, counter_offer_id, message, expires_at, created_at, updated_at')
    .eq('sender_id', userId)
    .in('status', ['pending'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) { logSupabaseError('[Offers] getOutgoingOffers', error); throw new Error(mapErrorToKey(error.message)); }
  return enrichOffers((data ?? []) as DbOffer[]);
}

/**
 * Open public buy bids (offers with no explicit receiver, still pending,
 * not expired). When called from the "Mein Kader → Angebote → Offene
 * Angebote" tab, pass `ownedByUserId` so the result is restricted to
 * players the user actually owns — otherwise the tab shows bids for
 * players the user can't fulfill, and the Accept button used to let the
 * backend create supply out of nothing (until the NULL-guard fix in
 * migration 20260411130000).
 */
export async function getOpenBids(opts: {
  playerId?: string;
  ownedByUserId?: string;
} = {}): Promise<OfferWithDetails[]> {
  const { playerId, ownedByUserId } = opts;

  // Restrict to the user's actually-owned players first. If they own
  // nothing, skip the offers fetch entirely — no bids can be actionable.
  let ownedPlayerIds: string[] | null = null;
  if (ownedByUserId) {
    const { data: holdings, error: holdingsErr } = await supabase
      .from('holdings')
      .select('player_id')
      .eq('user_id', ownedByUserId)
      .gt('quantity', 0);
    if (holdingsErr) { logSupabaseError('[Offers] getOpenBids holdings', holdingsErr); throw new Error(mapErrorToKey(holdingsErr.message)); }
    ownedPlayerIds = (holdings ?? []).map(h => h.player_id as string);
    if (ownedPlayerIds.length === 0) return [];
  }

  let query = supabase
    .from('offers')
    .select('id, player_id, sender_id, receiver_id, side, price, quantity, status, counter_offer_id, message, expires_at, created_at, updated_at')
    .is('receiver_id', null)
    .eq('status', 'pending')
    .eq('side', 'buy')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);
  if (playerId) query = query.eq('player_id', playerId);
  if (ownedPlayerIds) query = query.in('player_id', ownedPlayerIds);
  const { data, error } = await query;
  if (error) { logSupabaseError('[Offers] getOpenBids', error); throw new Error(mapErrorToKey(error.message)); }
  return enrichOffers((data ?? []) as DbOffer[]);
}

/** Offer history for a user (accepted, rejected, countered, expired, cancelled) */
export async function getOfferHistory(userId: string): Promise<OfferWithDetails[]> {
  const offerCols = 'id, player_id, sender_id, receiver_id, side, price, quantity, status, counter_offer_id, message, expires_at, created_at, updated_at';
  const [sentRes, recvRes] = await Promise.allSettled([
    supabase.from('offers').select(offerCols)
      .eq('sender_id', userId)
      .in('status', ['accepted', 'rejected', 'countered', 'expired', 'cancelled'])
      .order('updated_at', { ascending: false }).limit(25),
    supabase.from('offers').select(offerCols)
      .eq('receiver_id', userId)
      .in('status', ['accepted', 'rejected', 'countered', 'expired', 'cancelled'])
      .order('updated_at', { ascending: false }).limit(25),
  ]);
  const sent = sentRes.status === 'fulfilled' ? (sentRes.value.data ?? []) : [];
  const recv = recvRes.status === 'fulfilled' ? (recvRes.value.data ?? []) : [];
  const merged = [...sent, ...recv].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  ).slice(0, 50);
  const data = merged;
  const error = sentRes.status === 'rejected' && recvRes.status === 'rejected'
    ? { message: 'networkError' } : null;
  if (error) throw new Error(mapErrorToKey(error.message));
  return enrichOffers((data ?? []) as DbOffer[]);
}

// ============================================
// Actions
// ============================================

type OfferResult = { success: boolean; error?: string; offer_id?: string };

export async function createOffer(params: {
  senderId: string;
  playerId: string;
  receiverId?: string;
  side: 'buy' | 'sell';
  priceCents: number;
  quantity: number;
  message?: string;
  expiresHours?: number;
}): Promise<OfferResult> {
  // Validate message length to prevent abuse
  if (params.message && params.message.length > 500) {
    return { success: false, error: 'Message too long (max 500 chars)' };
  }
  const { data, error } = await supabase.rpc('create_offer', {
    p_sender_id: params.senderId,
    p_player_id: params.playerId,
    p_receiver_id: params.receiverId ?? null,
    p_side: params.side,
    p_price: params.priceCents,
    p_quantity: params.quantity,
    p_message: params.message ?? null,
    p_expires_hours: params.expiresHours ?? 48,
  });
  if (error) { logSupabaseError('[Offers] RPC error', error); throw new Error(mapErrorToKey(error.message)); }
  const result = data as OfferResult;
  // Notify receiver — fire-and-forget, but await inside to swallow throws (J10 FIX-03 contract)
  if (result.success && params.receiverId) {
    (async () => {
      try {
        const { createNotification } = await import('@/lib/services/notifications');
        await createNotification(params.receiverId!, 'offer_received', notifText('offerReceivedTitle'), params.message ?? notifText('offerReceivedBody'));
      } catch (err) {
        console.error('[Offers] createNotification failed:', err);
      }
    })();
  }

  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.senderId, 'offer_create', 'trading', {
      playerId: params.playerId, side: params.side, price: params.priceCents, receiverId: params.receiverId,
    });
  }).catch(err => console.error('[Offers] Side-effect failed:', err));

  return result;
}

export async function acceptOffer(userId: string, offerId: string): Promise<OfferResult & { trade_price?: number }> {
  const { data, error } = await supabase.rpc('accept_offer', {
    p_user_id: userId,
    p_offer_id: offerId,
  });
  if (error) { logSupabaseError('[Offers] acceptOffer', error); throw new Error(mapErrorToKey(error.message)); }
  const result = data as OfferResult & { trade_price?: number };

  // Notify sender
  if (result.success) {
    (async () => {
      try {
        const { data: offer } = await supabase.from('offers').select('sender_id, player_id').eq('id', offerId).maybeSingle();
        if (!offer) return;
        const { createNotification } = await import('@/lib/services/notifications');
        await createNotification(offer.sender_id, 'offer_accepted', notifText('offerAcceptedTitle'), notifText('offerAcceptedBody'));
      } catch (err) { console.error('[Offers] Accept notification failed:', err); }
    })();
  }

  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_accept', 'trading', { offerId });
  }).catch(err => console.error('[Offers] Side-effect failed:', err));

  if (result.success) {
    // Gamification: achievements fire-and-forget (matches buyFromOrder pattern)
    import('@/lib/services/social').then(({ checkAndUnlockAchievements }) =>
      checkAndUnlockAchievements(userId)
    ).catch(err => console.error('[Offers] Achievement check failed:', err));

    // Fire-and-forget: referral reward (triggers on first trade by referred user)
    import('@/lib/services/referral').then(({ triggerReferralReward }) => {
      triggerReferralReward(userId);
    }).catch(err => console.error('[Offers] Referral reward failed:', err));

    // Mission progress: daily trade + weekly trades (matches buyFromOrder pattern)
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_trade_2', 'weekly_trade_5']);
    }).catch(err => console.error('[Offers] Mission tracking failed:', err));
  }

  return result;
}

export async function rejectOffer(userId: string, offerId: string): Promise<OfferResult> {
  const { data, error } = await supabase.rpc('reject_offer', {
    p_user_id: userId,
    p_offer_id: offerId,
  });
  if (error) { logSupabaseError('[Offers] RPC error', error); throw new Error(mapErrorToKey(error.message)); }
  const result = data as OfferResult;
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_reject', 'trading', { offerId });
  }).catch(err => console.error('[Offers] Activity log failed:', err));

  // Notify sender
  if (result.success) {
    (async () => {
      try {
        const { data: offer } = await supabase.from('offers').select('sender_id').eq('id', offerId).maybeSingle();
        if (!offer) return;
        const { createNotification } = await import('@/lib/services/notifications');
        await createNotification(offer.sender_id, 'offer_rejected', notifText('offerRejectedTitle'), notifText('offerRejectedBody'));
      } catch (err) { console.error('[Offers] Reject notification failed:', err); }
    })();
  }

  return result;
}

export async function counterOffer(userId: string, offerId: string, newPriceCents: number, message?: string): Promise<OfferResult> {
  const { data, error } = await supabase.rpc('counter_offer', {
    p_user_id: userId,
    p_offer_id: offerId,
    p_new_price: newPriceCents,
    p_message: message ?? null,
  });
  if (error) { logSupabaseError('[Offers] RPC error', error); throw new Error(mapErrorToKey(error.message)); }
  const result = data as OfferResult;
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_counter', 'trading', { offerId, newPriceCents });
  }).catch(err => console.error('[Offers] Activity log failed:', err));

  // Notify original sender
  if (result.success) {
    (async () => {
      try {
        const { data: offer } = await supabase.from('offers').select('sender_id').eq('id', offerId).maybeSingle();
        if (!offer) return;
        const { createNotification } = await import('@/lib/services/notifications');
        await createNotification(offer.sender_id, 'offer_countered', notifText('offerCounteredTitle'), notifText('offerCounteredBody'));
      } catch (err) { console.error('[Offers] Counter notification failed:', err); }
    })();
  }

  return result;
}

export async function cancelOffer(userId: string, offerId: string): Promise<OfferResult> {
  const { data, error } = await supabase.rpc('cancel_offer_rpc', {
    p_user_id: userId,
    p_offer_id: offerId,
  });
  if (error) { logSupabaseError('[Offers] cancelOffer', error); throw new Error(mapErrorToKey(error.message)); }
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_cancel', 'trading', { offerId });
  }).catch(err => console.error('[Offers] Activity log failed:', err));
  return data as OfferResult;
}
