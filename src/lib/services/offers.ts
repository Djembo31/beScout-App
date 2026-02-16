import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate, invalidateTradeData } from '@/lib/cache';
import type { DbOffer, OfferWithDetails } from '@/types';

const ONE_MIN = 60 * 1000;

// ============================================
// Cache helpers
// ============================================

export function invalidateOfferData(userId?: string): void {
  invalidate('offers:');
  if (userId) {
    invalidate(`wallet:${userId}`);
    invalidate(`holdings:${userId}`);
    invalidate(`transactions:${userId}`);
  }
}

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
  return cached(`offers:incoming:${userId}`, async () => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return enrichOffers((data ?? []) as DbOffer[]);
  }, ONE_MIN);
}

/** Outgoing offers from a user */
export async function getOutgoingOffers(userId: string): Promise<OfferWithDetails[]> {
  return cached(`offers:outgoing:${userId}`, async () => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('sender_id', userId)
      .in('status', ['pending'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return enrichOffers((data ?? []) as DbOffer[]);
  }, ONE_MIN);
}

/** Open bids (no receiver) */
export async function getOpenBids(playerId?: string): Promise<OfferWithDetails[]> {
  return cached(`offers:open:${playerId ?? 'all'}`, async () => {
    let query = supabase
      .from('offers')
      .select('*')
      .is('receiver_id', null)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
    if (playerId) query = query.eq('player_id', playerId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return enrichOffers((data ?? []) as DbOffer[]);
  }, ONE_MIN);
}

/** Offer history for a user (accepted, rejected, countered, expired, cancelled) */
export async function getOfferHistory(userId: string): Promise<OfferWithDetails[]> {
  return cached(`offers:history:${userId}`, async () => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .in('status', ['accepted', 'rejected', 'countered', 'expired', 'cancelled'])
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return enrichOffers((data ?? []) as DbOffer[]);
  }, ONE_MIN);
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
  if (error) throw new Error(error.message);
  const result = data as OfferResult;
  invalidateOfferData(params.senderId);

  // Notify receiver
  if (result.success && params.receiverId) {
    import('@/lib/services/notifications').then(({ createNotification }) => {
      createNotification(params.receiverId!, 'offer_received', 'Neues Angebot', params.message ?? 'Du hast ein neues Angebot erhalten');
    }).catch(err => console.error('[Offers] Side-effect failed:', err));
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
  if (error) throw new Error(error.message);
  const result = data as OfferResult & { trade_price?: number };
  invalidateOfferData(userId);
  invalidateTradeData('', userId);

  // Notify sender
  if (result.success) {
    (async () => {
      try {
        const { data: offer } = await supabase.from('offers').select('sender_id, player_id').eq('id', offerId).single();
        if (offer) {
          invalidateOfferData(offer.sender_id);
          invalidateTradeData(offer.player_id, offer.sender_id);
          const { createNotification } = await import('@/lib/services/notifications');
          await createNotification(offer.sender_id, 'offer_accepted', 'Angebot angenommen', 'Dein Angebot wurde angenommen');
        }
      } catch (err) { console.error('[Offers] Accept notification failed:', err); }
    })();
  }

  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_accept', 'trading', { offerId });
  }).catch(err => console.error('[Offers] Side-effect failed:', err));

  return result;
}

export async function rejectOffer(userId: string, offerId: string): Promise<OfferResult> {
  const { data, error } = await supabase.rpc('reject_offer', {
    p_user_id: userId,
    p_offer_id: offerId,
  });
  if (error) throw new Error(error.message);
  const result = data as OfferResult;
  invalidateOfferData(userId);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_reject', 'trading', { offerId });
  }).catch(err => console.error('[Offers] Activity log failed:', err));

  // Notify sender
  if (result.success) {
    (async () => {
      try {
        const { data: offer } = await supabase.from('offers').select('sender_id').eq('id', offerId).single();
        if (offer) {
          invalidateOfferData(offer.sender_id);
          const { createNotification } = await import('@/lib/services/notifications');
          await createNotification(offer.sender_id, 'offer_rejected', 'Angebot abgelehnt', 'Dein Angebot wurde abgelehnt');
        }
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
  if (error) throw new Error(error.message);
  const result = data as OfferResult;
  invalidateOfferData(userId);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_counter', 'trading', { offerId, newPriceCents });
  }).catch(err => console.error('[Offers] Activity log failed:', err));

  // Notify original sender
  if (result.success) {
    (async () => {
      try {
        const { data: offer } = await supabase.from('offers').select('sender_id').eq('id', offerId).single();
        if (offer) {
          invalidateOfferData(offer.sender_id);
          const { createNotification } = await import('@/lib/services/notifications');
          await createNotification(offer.sender_id, 'offer_countered', 'Gegenangebot', 'Du hast ein Gegenangebot erhalten');
        }
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
  if (error) throw new Error(error.message);
  invalidateOfferData(userId);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'offer_cancel', 'trading', { offerId });
  }).catch(err => console.error('[Offers] Activity log failed:', err));
  return data as OfferResult;
}
