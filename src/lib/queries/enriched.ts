'use client';

import { useMemo } from 'react';
import { usePlayers } from './players';
import { useHoldings } from './holdings';
import { useAllOpenOrders } from './orders';
import type { Player, DbOrder } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { centsToBsd } from '@/lib/services/players';

/**
 * Central combinator hook — enriches players with holdings + order data.
 * Replaces the per-page `enrichPlayers()` logic.
 * O(n) via Maps — same algorithm as market/page.tsx.
 */
export function useEnrichedPlayers(userId: string | undefined) {
  const { data: players = [], isLoading: playersLoading, isError: playersError } = usePlayers();
  const { data: holdings = [] } = useHoldings(userId);
  const { data: orders = [] } = useAllOpenOrders();

  const enriched = useMemo(() => {
    if (!players.length) return players;
    return enrichPlayersWithData(players, holdings, orders);
  }, [players, holdings, orders]);

  return { data: enriched, isLoading: playersLoading, isError: playersError };
}

/** Pure enrichment function — testable outside React */
export function enrichPlayersWithData(
  players: Player[],
  holdings: HoldingWithPlayer[],
  orders: DbOrder[],
): Player[] {
  // Build lookup maps — O(n)
  const holdingMap = new Map<string, number>();
  for (const h of holdings) {
    holdingMap.set(h.player_id, (holdingMap.get(h.player_id) ?? 0) + h.quantity);
  }

  const ordersByPlayer = new Map<string, DbOrder[]>();
  for (const o of orders) {
    const arr = ordersByPlayer.get(o.player_id);
    if (arr) arr.push(o);
    else ordersByPlayer.set(o.player_id, [o]);
  }

  return players.map(p => {
    const owned = holdingMap.get(p.id) ?? 0;
    const playerOrders = ordersByPlayer.get(p.id) ?? [];
    const onMarket = playerOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);

    // Floor price from cheapest user order, fallback to ipo_price
    let floorFromOrders: number | undefined;
    if (playerOrders.length > 0) {
      const cheapest = Math.min(...playerOrders.map(o => o.price));
      floorFromOrders = centsToBsd(cheapest);
    }

    const listings = playerOrders.map(o => ({
      id: o.id,
      sellerId: o.user_id,
      sellerName: '',
      price: centsToBsd(o.price),
      qty: o.quantity - o.filled_qty,
      expiresAt: o.expires_at ? new Date(o.expires_at).getTime() : 0,
    }));

    return {
      ...p,
      dpc: { ...p.dpc, owned, onMarket },
      prices: {
        ...p.prices,
        floor: floorFromOrders ?? p.prices.floor ?? p.prices.ipoPrice ?? 0,
      },
      listings,
    };
  });
}
