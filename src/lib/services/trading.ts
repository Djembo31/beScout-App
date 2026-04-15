import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError } from '@/lib/supabaseErrors';
import { notifText, getRecipientLocale } from '@/lib/notifText';
import type { DbOrder, UserTradeWithPlayer, Pos } from '@/types';
import { toPos } from '@/types';

// ============================================
// Error Mapping
// ============================================

/** Map Supabase/RPC error messages to i18n error keys (errors namespace) */
export function mapRpcError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('insufficient balance') || lower.includes('not enough'))
    return 'insufficientBalance';
  // Early Access / Subscription gate (IPO early_access status, Silber+ required).
  // Matched BEFORE 'subscription required' generic, so Upgrade-CTA key wins.
  if (lower.includes('early access') || lower.includes('subscription required'))
    return 'earlyAccessRequired';
  if (lower.includes('not found') || lower.includes('does not exist'))
    return 'orderNotFound';
  // Liquidation: matches EN 'liquidated' + DE 'liquidiert'. Avoid bare 'liquidation'
  // (notification categories) by requiring either form of the participle.
  if (lower.includes('liquidated') || lower.includes('liquidiert'))
    return 'playerLiquidated';
  if (lower.includes('exceeds') || lower.includes('limit'))
    return 'maxQuantityExceeded';
  if (lower.includes('no open orders') || lower.includes('no matching'))
    return 'noMatchingOrders';
  if (lower.includes('own order'))
    return 'cannotBuyOwn';
  if (lower.includes('ipo_misconfigured'))
    return 'ipoMisconfigured';
  if (lower.includes('club-admin') || lower.includes('club admin'))
    return 'clubAdminRestricted';
  if (lower.includes('permission') || lower.includes('denied') || lower.includes('unauthorized'))
    return 'permissionDenied';
  return 'generic';
}

// ============================================
// Club Admin Trading Restriction (Defense-in-Depth)
// ============================================

/** Check if a user is club admin for the club that owns this player */
export async function isRestrictedFromTrading(userId: string, playerId: string): Promise<boolean> {
  const { data: player } = await supabase.from('players').select('club_id').eq('id', playerId).maybeSingle();
  if (!player?.club_id) return false;
  const { data: admin } = await supabase.from('club_admins').select('id').eq('user_id', userId).eq('club_id', player.club_id).maybeSingle();
  return !!admin;
}

// ============================================
// Types
// ============================================

type TradeResult = {
  success: boolean;
  error?: string;
  trade_id?: string;
  total_cost?: number;
  new_balance?: number;
  quantity?: number;
  price_per_dpc?: number;
  price?: number;
  order_id?: string;
  seller_id?: string;
  buyer_new_balance?: number;
  seller_new_balance?: number;
  source?: 'order' | 'ipo';
  user_total_purchased?: number;
  ipo_remaining?: number;
};

// ============================================
// Trading Operations (via RPC → atomic)
// ============================================

/** Smart Buy: kauft vom guenstigsten Sell-Order oder System-Pool */
export async function buyFromMarket(
  userId: string,
  playerId: string,
  quantity: number
): Promise<TradeResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('invalidQuantity');
  if (quantity > 300) throw new Error('maxQuantityExceeded');
  // Guard: check if player is liquidated
  const { data: pl } = await supabase.from('players').select('is_liquidated').eq('id', playerId).maybeSingle();
  if (!pl) throw new Error('playerNotFound');
  if (pl.is_liquidated) throw new Error('playerLiquidated');

  // Club Admin Trading Restriction (defense-in-depth — DB RPC also checks)
  const restricted = await isRestrictedFromTrading(userId, playerId);
  if (restricted) throw new Error('clubAdminRestricted');

  const { data, error } = await supabase.rpc('buy_player_sc', {
    p_user_id: userId,
    p_player_id: playerId,
    p_quantity: quantity,
  });

  if (error) throw new Error(mapRpcError(error.message));
  if (!data) throw new Error('buy_player_sc returned null');
  const result = data as TradeResult;
  // Activity log (always fires for audit trail, regardless of success)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'trade_buy', 'trading', { playerId, quantity, source: result.source, price: result.price_per_dpc });
  }).catch(err => console.error('[Trade] Activity log failed:', err));
  if (result.success) {
    // Gamification: stats/airdrop handled by DB triggers. Achievements fire-and-forget.
    import('@/lib/services/social').then(({ checkAndUnlockAchievements }) =>
      checkAndUnlockAchievements(userId)
    ).catch(err => console.error('[Trade] Achievement check failed:', err));
    // Fire-and-forget: referral reward (triggers on first trade by referred user)
    import('@/lib/services/referral').then(({ triggerReferralReward }) => {
      triggerReferralReward(userId);
    }).catch(err => console.error('[Trade] Referral reward failed:', err));
    // Notify seller if bought from a user order
    if (result.source === 'order' && result.seller_id && result.seller_id !== userId) {
      const sellerId = result.seller_id;
      (async () => {
        try {
          const loc = await getRecipientLocale(sellerId);
          const { data: pl } = await supabase
            .from('players')
            .select('first_name, last_name')
            .eq('id', playerId)
            .maybeSingle();
          const name = pl ? `${pl.first_name} ${pl.last_name}` : notifText('tradeFallbackPlayer', undefined, loc);
          const { createNotification } = await import('@/lib/services/notifications');
          await createNotification(
            sellerId,
            'trade',
            notifText('tradeSoldTitle', undefined, loc),
            notifText('tradeSoldBody', { name }, loc),
            playerId,
            'player'
          );
        } catch (err) { console.error('[Trade] Seller notification failed:', err); }
      })();
    }
    // Mission progress: buy side (buy, trade count, weekly trades)
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_buy_1', 'daily_trade_2', 'weekly_trade_5']);
    }).catch(err => console.error('[Trading] Mission tracking failed:', err));
  }
  return result;
}

/** Sell-Order erstellen (SCs zum Verkauf listen) */
export async function placeSellOrder(
  userId: string,
  playerId: string,
  quantity: number,
  priceCents: number
): Promise<TradeResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('invalidQuantity');
  if (quantity > 300) throw new Error('maxQuantityExceeded');
  if (!Number.isInteger(priceCents) || priceCents < 1) throw new Error('invalidPrice');
  if (priceCents > 100_000_000) throw new Error('maxPriceExceeded');
  // Price cap validation (frontend guard — DB RPC also enforces).
  // Throw i18n key so consumers can resolve via mapErrorToKey + te() instead of
  // leaking a raw DE/EN string with $SCOUT ticker (see common-errors.md: i18n-Key-Leak).
  const cap = await getPriceCap(playerId);
  if (cap !== null && priceCents > cap) {
    throw new Error('maxPriceExceeded');
  }
  // Guard: check if player is liquidated
  const { data: pl } = await supabase.from('players').select('is_liquidated').eq('id', playerId).maybeSingle();
  if (!pl) throw new Error('playerNotFound');
  if (pl.is_liquidated) throw new Error('playerLiquidated');

  // Club Admin Trading Restriction (defense-in-depth — DB RPC also checks)
  const restricted = await isRestrictedFromTrading(userId, playerId);
  if (restricted) throw new Error('clubAdminRestricted');

  const { data, error } = await supabase.rpc('place_sell_order', {
    p_user_id: userId,
    p_player_id: playerId,
    p_quantity: quantity,
    p_price: priceCents,
  });

  if (error) throw new Error(mapRpcError(error.message));
  if (!data) throw new Error('place_sell_order returned null');
  const result = data as TradeResult;
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'trade_sell', 'trading', { playerId, quantity, priceCents });
  }).catch(err => console.error('[Trade] Activity log failed:', err));
  // Mission progress: sell side (sell, trade count, weekly trades)
  if (result.success) {
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_sell_1', 'daily_trade_2', 'weekly_trade_5']);
    }).catch(err => console.error('[Trading] Mission tracking failed:', err));
  }
  return result;
}

/** SCs von einem Sell-Order kaufen */
export async function buyFromOrder(
  buyerId: string,
  orderId: string,
  quantity: number
): Promise<TradeResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('invalidQuantity');
  if (quantity > 300) throw new Error('maxQuantityExceeded');

  // Club Admin Trading Restriction (defense-in-depth — DB RPC also checks)
  const { data: orderLookup } = await supabase.from('orders').select('player_id').eq('id', orderId).maybeSingle();
  if (orderLookup) {
    const restricted = await isRestrictedFromTrading(buyerId, orderLookup.player_id);
    if (restricted) throw new Error('clubAdminRestricted');
  }

  const { data, error } = await supabase.rpc('buy_from_order', {
    p_buyer_id: buyerId,
    p_order_id: orderId,
    p_quantity: quantity,
  });

  if (error) throw new Error(mapRpcError(error.message));
  if (!data) throw new Error('buy_from_order returned null');
  const result = data as TradeResult;
  // Activity log (always fires for audit trail, regardless of success)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(buyerId, 'trade_buy_order', 'trading', { orderId, quantity });
  }).catch(err => console.error('[Trade] Activity log failed:', err));
  if (result.success) {
    // Gamification: achievements fire-and-forget
    import('@/lib/services/social').then(({ checkAndUnlockAchievements }) =>
      checkAndUnlockAchievements(buyerId)
    ).catch(err => console.error('[Trade] Achievement check failed:', err));
    // Fire-and-forget: referral reward (triggers on first trade by referred user)
    import('@/lib/services/referral').then(({ triggerReferralReward }) => {
      triggerReferralReward(buyerId);
    }).catch(err => console.error('[Trade] Referral reward failed:', err));
    // Notify the seller
    (async () => {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('user_id, player_id')
          .eq('id', orderId)
          .maybeSingle();
        if (order && order.user_id !== buyerId) {
          const loc = await getRecipientLocale(order.user_id);
          const { data: pl } = await supabase
            .from('players')
            .select('first_name, last_name')
            .eq('id', order.player_id)
            .maybeSingle();
          const name = pl ? `${pl.first_name} ${pl.last_name}` : notifText('tradeFallbackPlayer', undefined, loc);
          const { createNotification } = await import('@/lib/services/notifications');
          await createNotification(
            order.user_id,
            'trade',
            notifText('tradeSoldTitle', undefined, loc),
            notifText('tradeSoldBody', { name }, loc),
            order.player_id,
            'player'
          );
        }
      } catch (err) { console.error('[Trade] Seller notification failed:', err); }
    })();
    // Mission progress: daily trade + weekly trades
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(buyerId, ['daily_buy_1', 'daily_trade_2', 'weekly_trade_5']);
    }).catch(err => console.error('[Trading] Mission tracking failed:', err));
  }
  return result;
}

/** Order stornieren */
export async function cancelOrder(
  userId: string,
  orderId: string
): Promise<TradeResult> {
  const { data, error } = await supabase.rpc('cancel_order', {
    p_user_id: userId,
    p_order_id: orderId,
  });

  if (error) throw new Error(mapRpcError(error.message));
  if (!data) throw new Error('cancel_order returned null');
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'order_cancel', 'trading', { orderId });
  }).catch(err => console.error('[Trade] Activity log failed:', err));
  return data as TradeResult;
}

// ============================================
// Order Queries
// ============================================

/** Alle aktiven Sell-Orders (fuer Markt-Uebersicht) — capped, price-sorted so cheapest per player included */
export async function getAllOpenSellOrders(limit = 1000): Promise<{ orders: DbOrder[]; capped: boolean }> {
  const { data, error, count } = await supabase
    .from('orders')
    .select('id, player_id, user_id, side, price, quantity, filled_qty, status, created_at, expires_at', { count: 'exact' })
    .eq('side', 'sell')
    .in('status', ['open', 'partial'])
    .gt('expires_at', new Date().toISOString())
    .order('price', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  const orders = (data ?? []) as DbOrder[];
  return { orders, capped: (count ?? 0) > limit };
}

/** Aktive Sell-Orders fuer einen Spieler (Orderbook) */
export async function getSellOrders(playerId: string): Promise<DbOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, player_id, user_id, side, price, quantity, filled_qty, status, created_at, expires_at')
    .eq('player_id', playerId)
    .eq('side', 'sell')
    .in('status', ['open', 'partial'])
    .gt('expires_at', new Date().toISOString())
    .order('price', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbOrder[];
}

/** Letzte Trades fuer einen Spieler (Preis-History) */
export async function getPlayerTrades(playerId: string, limit = 20) {
  const { data, error } = await supabase
    .from('trades')
    .select('id, player_id, buyer_id, seller_id, buy_order_id, sell_order_id, ipo_id, price, quantity, platform_fee, pbt_fee, club_fee, executed_at')
    .eq('player_id', playerId)
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Letzte Trades eines Users (fuer Profil) */
export async function getUserTrades(userId: string, limit = 10): Promise<UserTradeWithPlayer[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*, player:players!trades_player_id_fkey(first_name, last_name, position)')
    .or(`buyer_id.eq."${userId}",seller_id.eq."${userId}"`)
    .order('executed_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const player = row.player as { first_name?: string; last_name?: string; position?: string } | null;
    return {
      id: row.id as string,
      player_id: row.player_id as string,
      buyer_id: row.buyer_id as string,
      seller_id: row.seller_id as string | null,
      price: row.price as number,
      quantity: row.quantity as number,
      platform_fee: row.platform_fee as number,
      pbt_fee: row.pbt_fee as number,
      club_fee: row.club_fee as number,
      executed_at: row.executed_at as string,
      player_first_name: player?.first_name ?? '',
      player_last_name: player?.last_name ?? '',
      player_position: player?.position ?? 'MID',
    };
  });
}

// ============================================
// Trending Players (most traded 24h)
// ============================================

export type TrendingPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  position: Pos;
  club: string;
  tradeCount: number;
  totalVolume: number;
  floorPrice: number;
  change24h: number;
};

/** Top traded players in the last 24h — DB-aggregated via RPC */
export async function getTrendingPlayers(limit = 5): Promise<TrendingPlayer[]> {
  const { data, error } = await supabase.rpc('rpc_get_trending_players', { p_limit: limit });

  if (error) { logSupabaseError('[Trading] getTrendingPlayers', error); throw new Error(error.message); }
  if (!data || (data as unknown[]).length === 0) return [];

  return (data as Array<{
    player_id: string;
    trade_count: number;
    volume_24h: number;
    first_name: string;
    last_name: string;
    player_position: string;
    club: string;
    floor_price: number;
    price_change_24h: number;
  }>).map(row => ({
    playerId: row.player_id,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    position: toPos(row.player_position),
    club: row.club ?? '',
    tradeCount: Number(row.trade_count),
    totalVolume: Number(row.volume_24h),
    floorPrice: row.floor_price ?? 0,
    change24h: Number(row.price_change_24h ?? 0),
  }));
}

/** Bulk load recent trade prices for all players (for sparklines on market page) */
export async function getAllPriceHistories(limit = 10): Promise<Map<string, number[]>> {
  const { data, error } = await supabase
    .from('trades')
    .select('player_id, price, executed_at')
    .order('executed_at', { ascending: false })
    .limit(200);

  if (error) { logSupabaseError('[Trading] getAllPriceHistories', error); throw new Error(error.message); }
  if (!data) return new Map();

  // Group by player, keep only last N per player (chronological)
  const grouped = new Map<string, number[]>();
  for (const t of data) {
    const arr = grouped.get(t.player_id) || [];
    if (arr.length < limit) arr.push(t.price as number);
    grouped.set(t.player_id, arr);
  }

  // Reverse each to chronological order (ascending)
  grouped.forEach((arr, key) => grouped.set(key, arr.reverse()));
  return grouped;
}

// ============================================
// Buy Orders (Kaufgesuche)
// ============================================

type BuyOrderResult = {
  success: boolean;
  error?: string;
  order_id?: string;
  total_locked?: number;
  new_available?: number;
  unlocked?: number;
};

/**
 * Place a buy order (Kaufgesuch) — locks funds in escrow.
 *
 * Throws i18n keys (e.g. 'invalidQuantity', 'insufficientBalance') so consumers
 * can resolve them via mapErrorToKey + te() instead of receiving raw DE/EN
 * strings (see common-errors.md: i18n-Key-Leak via Service-Errors).
 */
export async function placeBuyOrder(
  userId: string,
  playerId: string,
  quantity: number,
  maxPriceCents: number
): Promise<BuyOrderResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('invalidQuantity');
  if (quantity > 300) throw new Error('maxQuantityExceeded');
  if (!Number.isInteger(maxPriceCents) || maxPriceCents < 1) throw new Error('invalidPrice');

  // Guard: check if player is liquidated
  const { data: pl } = await supabase.from('players').select('is_liquidated').eq('id', playerId).maybeSingle();
  if (!pl) throw new Error('playerNotFound');
  if (pl.is_liquidated) throw new Error('playerLiquidated');

  // Club Admin Trading Restriction (defense-in-depth — DB RPC also checks)
  const restricted = await isRestrictedFromTrading(userId, playerId);
  if (restricted) throw new Error('clubAdminRestricted');

  const { data, error } = await supabase.rpc('place_buy_order', {
    p_user_id: userId,
    p_player_id: playerId,
    p_quantity: quantity,
    p_max_price: maxPriceCents,
  });

  if (error) throw new Error(mapRpcError(error.message));
  if (!data) throw new Error('place_buy_order returned null');

  const result = data as BuyOrderResult;

  if (result.success) {
    // Activity log (fire-and-forget)
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'buy_order_placed', 'trading', {
        player_id: playerId,
        quantity,
        max_price: maxPriceCents,
        order_id: result.order_id,
      });
    }).catch(err => console.error('[Trade] Activity log failed:', err));

    // Mission progress: buy order placed (counts as buy intent)
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_buy_1', 'daily_trade_2', 'weekly_trade_5']);
    }).catch(err => console.error('[Trading] Mission tracking failed:', err));
  }

  return result;
}

/** Cancel a buy order (Kaufgesuch stornieren) — unlocks escrowed funds */
export async function cancelBuyOrder(
  userId: string,
  orderId: string
): Promise<BuyOrderResult> {
  const { data, error } = await supabase.rpc('cancel_buy_order', {
    p_user_id: userId,
    p_order_id: orderId,
  });

  if (error) return { success: false, error: mapRpcError(error.message) };
  if (!data) return { success: false, error: 'No response' };

  const result = data as BuyOrderResult;

  // Activity log (fire-and-forget)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'buy_order_cancelled', 'trading', { orderId });
  }).catch(err => console.error('[Trade] Activity log failed:', err));

  return result;
}

/** All active buy orders (for market overview) — highest bid first */
export async function getAllOpenBuyOrders(playerId?: string): Promise<DbOrder[]> {
  let query = supabase
    .from('orders')
    .select('id, player_id, user_id, side, price, quantity, filled_qty, status, created_at, expires_at')
    .eq('side', 'buy')
    .in('status', ['open', 'partial'])
    .gt('expires_at', new Date().toISOString())
    .order('price', { ascending: false }) // highest bid first
    .limit(500);

  if (playerId) query = query.eq('player_id', playerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbOrder[];
}

// ============================================
// Price Cap (Pricing Architecture)
// ============================================

/** Get price cap for a player (for sell form orientation) */
export async function getPriceCap(playerId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_price_cap', { p_player_id: playerId });
  if (error) { logSupabaseError('[Trading] getPriceCap', error); return null; }
  return data as number;
}

