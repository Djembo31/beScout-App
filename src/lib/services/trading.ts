import { supabase } from '@/lib/supabaseClient';
import { cached, invalidateTradeData, invalidateSocialData } from '@/lib/cache';
import type { DbOrder, UserTradeWithPlayer, Pos } from '@/types';
import { toPos } from '@/types';

/** Fire-and-forget: refresh user stats + check achievements after a trade */
function triggerStatsRefresh(userId: string): void {
  // Dynamic import to avoid circular deps
  import('@/lib/services/social').then(({ refreshUserStats, checkAndUnlockAchievements }) => {
    refreshUserStats(userId)
      .then(() => checkAndUnlockAchievements(userId))
      .then((newUnlocks: string[]) => {
        if (newUnlocks.length === 0) return;
        // Create notification for each new achievement
        Promise.all([
          import('@/lib/services/notifications'),
          import('@/lib/achievements'),
        ]).then(([{ createNotification }, { getAchievementDef }]) => {
          for (const key of newUnlocks) {
            const def = getAchievementDef(key);
            if (def) {
              createNotification(userId, 'system', `${def.icon} ${def.label}`, def.description);
            }
          }
        }).catch(err => console.error('[Trade] Achievement notification failed:', err));
      })
      .catch(err => console.error('[Trade] Stats refresh failed:', err));
  }).catch(err => console.error('[Trade] Dynamic import failed:', err));
  invalidateSocialData(userId);
}

/** Fire-and-forget: track mission progress after a trade */
function triggerMissions(userId: string, keys: string[]): void {
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(userId, keys);
  }).catch(err => console.error('[Trade] Mission tracking failed:', err));
}

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * 60 * 1000;

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
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Ungültige Menge.');
  // Guard: check if player is liquidated
  const { data: pl } = await supabase.from('players').select('is_liquidated').eq('id', playerId).single();
  if (pl?.is_liquidated) throw new Error('Spieler wurde liquidiert. Trading nicht möglich.');

  const { data, error } = await supabase.rpc('buy_player_dpc', {
    p_user_id: userId,
    p_player_id: playerId,
    p_quantity: quantity,
  });

  if (error) throw new Error(error.message);
  const result = data as TradeResult;
  invalidateTradeData(playerId, userId);
  triggerStatsRefresh(userId);
  triggerMissions(userId, ['daily_buy_1', 'daily_trade_2', 'weekly_trade_5']);
  // Fire-and-forget: airdrop score refresh
  import('@/lib/services/airdropScore').then(m => m.refreshAirdropScore(userId)).catch(err => console.error('[Trade] Airdrop refresh failed:', err));
  // Fire-and-forget: referral reward (triggers on first trade by referred user)
  import('@/lib/services/referral').then(({ triggerReferralReward }) => {
    triggerReferralReward(userId);
  }).catch(err => console.error('[Trade] Referral reward failed:', err));
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'trade_buy', 'trading', { playerId, quantity, source: result.source, price: result.price_per_dpc });
  }).catch(err => console.error('[Trade] Activity log failed:', err));
  // Notify seller if bought from a user order
  if (result.source === 'order' && result.order_id) {
    (async () => {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('user_id')
          .eq('id', result.order_id!)
          .single();
        if (order && order.user_id !== userId) {
          const { data: pl } = await supabase
            .from('players')
            .select('first_name, last_name')
            .eq('id', playerId)
            .single();
          const name = pl ? `${pl.first_name} ${pl.last_name}` : 'Spieler';
          const { createNotification } = await import('@/lib/services/notifications');
          createNotification(
            order.user_id,
            'trade',
            'DPC verkauft',
            `Dein Angebot für ${name} wurde angenommen`,
            playerId,
            'player'
          );
          triggerStatsRefresh(order.user_id);
        }
      } catch (err) { console.error('[Trade] Seller notification failed:', err); }
    })();
  }
  return result;
}

/** Sell-Order erstellen (DPCs zum Verkauf listen) */
export async function placeSellOrder(
  userId: string,
  playerId: string,
  quantity: number,
  priceCents: number
): Promise<TradeResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Ungültige Menge.');
  if (!Number.isInteger(priceCents) || priceCents < 1) throw new Error('Ungültiger Preis.');
  // Guard: check if player is liquidated
  const { data: pl } = await supabase.from('players').select('is_liquidated').eq('id', playerId).single();
  if (pl?.is_liquidated) throw new Error('Spieler wurde liquidiert. Trading nicht möglich.');

  const { data, error } = await supabase.rpc('place_sell_order', {
    p_user_id: userId,
    p_player_id: playerId,
    p_quantity: quantity,
    p_price: priceCents,
  });

  if (error) throw new Error(error.message);
  invalidateTradeData(playerId, userId);
  triggerStatsRefresh(userId);
  triggerMissions(userId, ['daily_sell_1', 'daily_trade_2', 'weekly_trade_5']);
  // Fire-and-forget: airdrop score refresh
  import('@/lib/services/airdropScore').then(m => m.refreshAirdropScore(userId)).catch(err => console.error('[Trade] Airdrop refresh failed:', err));
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'trade_sell', 'trading', { playerId, quantity, priceCents });
  }).catch(err => console.error('[Trade] Activity log failed:', err));
  return data as TradeResult;
}

/** DPCs von einem Sell-Order kaufen */
export async function buyFromOrder(
  buyerId: string,
  orderId: string,
  quantity: number
): Promise<TradeResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Ungültige Menge.');
  const { data, error } = await supabase.rpc('buy_from_order', {
    p_buyer_id: buyerId,
    p_order_id: orderId,
    p_quantity: quantity,
  });

  if (error) throw new Error(error.message);
  const result = data as TradeResult;
  // orderId doesn't give us playerId — invalidate all order/player caches
  invalidateTradeData('', buyerId);
  triggerStatsRefresh(buyerId);
  triggerMissions(buyerId, ['daily_buy_1', 'daily_trade_2', 'weekly_trade_5']);
  // Fire-and-forget: airdrop score refresh
  import('@/lib/services/airdropScore').then(m => m.refreshAirdropScore(buyerId)).catch(err => console.error('[Trade] Airdrop refresh failed:', err));
  // Notify the seller
  (async () => {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id, player_id')
        .eq('id', orderId)
        .single();
      if (order && order.user_id !== buyerId) {
        const { data: pl } = await supabase
          .from('players')
          .select('first_name, last_name')
          .eq('id', order.player_id)
          .single();
        const name = pl ? `${pl.first_name} ${pl.last_name}` : 'Spieler';
        const { createNotification } = await import('@/lib/services/notifications');
        createNotification(
          order.user_id,
          'trade',
          'DPC verkauft',
          `Dein Angebot für ${name} wurde angenommen`,
          order.player_id,
          'player'
        );
        invalidateTradeData(order.player_id, order.user_id);
        triggerStatsRefresh(order.user_id);
      }
    } catch (err) { console.error('[Trade] Seller notification failed:', err); }
  })();
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

  if (error) throw new Error(error.message);
  invalidateTradeData('', userId);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'order_cancel', 'trading', { orderId });
  }).catch(err => console.error('[Trade] Activity log failed:', err));
  return data as TradeResult;
}

// ============================================
// Order Queries
// ============================================

/** Alle aktiven Sell-Orders (fuer Markt-Uebersicht) */
export async function getAllOpenSellOrders(): Promise<DbOrder[]> {
  return cached('orders:all', async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('side', 'sell')
      .in('status', ['open', 'partial'])
      .order('price', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as DbOrder[];
  }, ONE_MIN);
}

/** Aktive Sell-Orders fuer einen Spieler (Orderbook) */
export async function getSellOrders(playerId: string): Promise<DbOrder[]> {
  return cached(`sellOrders:${playerId}`, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('player_id', playerId)
      .eq('side', 'sell')
      .in('status', ['open', 'partial'])
      .order('price', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as DbOrder[];
  }, ONE_MIN);
}

/** Letzte Trades fuer einen Spieler (Preis-History) */
export async function getPlayerTrades(playerId: string, limit = 20) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('player_id', playerId)
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Letzte Trades eines Users (fuer Profil) */
export async function getUserTrades(userId: string, limit = 10): Promise<UserTradeWithPlayer[]> {
  return cached(`userTrades:${userId}:${limit}`, async () => {
    const { data, error } = await supabase
      .from('trades')
      .select('*, player:players!trades_player_id_fkey(first_name, last_name, position)')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
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
  }, TWO_MIN);
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

/** Top traded players in the last 24h */
export async function getTrendingPlayers(limit = 5): Promise<TrendingPlayer[]> {
  return cached(`trending:${limit}`, async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('trades')
      .select('player_id, price, quantity')
      .gte('executed_at', since);

    if (error || !data || data.length === 0) return [];

    // Aggregate by player
    const agg = new Map<string, { count: number; volume: number }>();
    for (const t of data) {
      const prev = agg.get(t.player_id) || { count: 0, volume: 0 };
      prev.count += 1;
      prev.volume += (t.price as number) * (t.quantity as number);
      agg.set(t.player_id, prev);
    }

    // Sort by trade count and take top N
    const sorted = Array.from(agg.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);

    if (sorted.length === 0) return [];

    const playerIds = sorted.map(([id]) => id);
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, position, club, floor_price, price_change_24h')
      .in('id', playerIds);

    const playerMap = new Map((players ?? []).map(p => [p.id, p]));

    return sorted.map(([id, stats]) => {
      const p = playerMap.get(id);
      return {
        playerId: id,
        firstName: p?.first_name ?? '',
        lastName: p?.last_name ?? '',
        position: toPos(p?.position),
        club: p?.club ?? '',
        tradeCount: stats.count,
        totalVolume: stats.volume,
        floorPrice: p?.floor_price ?? 0,
        change24h: Number(p?.price_change_24h ?? 0),
      };
    });
  }, ONE_MIN);
}

/** Bulk load recent trade prices for all players (for sparklines on market page) */
export async function getAllPriceHistories(limit = 10): Promise<Map<string, number[]>> {
  return cached('priceHistories:all', async () => {
    const { data, error } = await supabase
      .from('trades')
      .select('player_id, price, executed_at')
      .order('executed_at', { ascending: false })
      .limit(500);

    if (error || !data) return new Map();

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
  }, ONE_MIN);
}

/** Recent global trades (for live feed on Home) */
export type GlobalTrade = {
  id: string;
  playerId: string;
  playerName: string;
  playerPos: Pos;
  price: number;      // cents
  quantity: number;
  executedAt: string;
  isP2P: boolean;     // true = user-to-user trade (has seller)
};

export async function getRecentGlobalTrades(limit = 10): Promise<GlobalTrade[]> {
  return cached('globalTrades:recent', async () => {
    const { data, error } = await supabase
      .from('trades')
      .select(`
        id, player_id, seller_id, price, quantity, executed_at,
        player:players!trades_player_id_fkey(first_name, last_name, position)
      `)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((t: Record<string, unknown>) => {
      const player = t.player as { first_name?: string; last_name?: string; position?: string } | null;
      return {
        id: t.id as string,
        playerId: t.player_id as string,
        playerName: `${player?.first_name ?? ''} ${player?.last_name ?? ''}`.trim(),
        playerPos: toPos(player?.position),
        price: t.price as number,
        quantity: t.quantity as number,
        executedAt: t.executed_at as string,
        isP2P: !!t.seller_id,
      };
    });
  }, ONE_MIN);
}

/** Get recent trade prices for a player (for sparkline) */
// ============================================
// Top Traders (by 7d volume)
// ============================================

export type TopTrader = {
  userId: string;
  handle: string;
  displayName: string | null;
  tradeCount: number;
  totalVolume: number; // cents
};

export async function getTopTraders(limit = 5): Promise<TopTrader[]> {
  return cached(`topTraders:${limit}`, async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('trades')
      .select('buyer_id, price, quantity')
      .gte('executed_at', since);

    if (error || !data || data.length === 0) return [];

    // Aggregate by buyer
    const agg = new Map<string, { count: number; volume: number }>();
    for (const t of data) {
      const uid = t.buyer_id as string;
      const prev = agg.get(uid) || { count: 0, volume: 0 };
      prev.count += 1;
      prev.volume += (t.price as number) * (t.quantity as number);
      agg.set(uid, prev);
    }

    const sorted = Array.from(agg.entries())
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, limit);

    if (sorted.length === 0) return [];

    const userIds = sorted.map(([id]) => id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name')
      .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    return sorted.map(([id, stats]) => {
      const p = profileMap.get(id);
      return {
        userId: id,
        handle: p?.handle ?? 'anonym',
        displayName: p?.display_name ?? null,
        tradeCount: stats.count,
        totalVolume: stats.volume,
      };
    });
  }, TWO_MIN);
}

// ============================================
// Platform Stats
// ============================================

export type PlatformStats = {
  totalUsers: number;
  trades24h: number;
  volume24h: number; // cents
  activePlayers: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  return cached('platformStats', async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [usersRes, tradesRes, playersRes] = await Promise.allSettled([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trades').select('price').gte('executed_at', since),
      supabase.from('players').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    const totalUsers = usersRes.status === 'fulfilled' ? (usersRes.value.count ?? 0) : 0;
    const tradesData = tradesRes.status === 'fulfilled' ? (tradesRes.value.data ?? []) : [];
    const activePlayers = playersRes.status === 'fulfilled' ? (playersRes.value.count ?? 0) : 0;
    const volume24h = tradesData.reduce((sum, t) => sum + (t.price as number), 0);
    return { totalUsers, trades24h: tradesData.length, volume24h, activePlayers };
  }, TWO_MIN);
}
