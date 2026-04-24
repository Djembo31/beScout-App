'use client';

import { useMemo } from 'react';
import { usePlayers } from './players';
import type { Player, PublicOrder, DbHolding } from '@/types';
import { centsToBsd } from '@/lib/services/players';

/**
 * Central combinator hook — enriches players with holdings + order data.
 * Slice 123: holdings + orders werden vom Caller injected (entfernt doppelte
 * useHoldings/useAllOpenOrders-Calls — useMarketData bekommt holdings vom
 * get_market_user_dashboard RPC und orders via useAllOpenOrders parallel).
 * O(n) via Maps.
 *
 * Slice 192 type-fix: Accepts `DbHolding[]` (no nested `player` required) —
 * function only reads `player_id` + `quantity`. Previously typed as
 * `HoldingWithPlayer[]` which was a lie because `getMarketUserDashboard`
 * RPC returns DbHolding-shape. See `worklog/reviews/192-review.md` Finding #1.
 */
export function useEnrichedPlayers(
  userId: string | undefined,
  holdings: DbHolding[],
  orders: PublicOrder[],
) {
  const { data: players = [], isLoading: playersLoading, isError: playersError } = usePlayers();

  const enriched = useMemo(() => {
    if (!players.length) return players;
    return enrichPlayersWithData(players, holdings, orders);
  }, [players, holdings, orders]);

  return { data: enriched, isLoading: playersLoading, isError: playersError };
}

/** Pure enrichment function — testable outside React */
export function enrichPlayersWithData(
  players: Player[],
  holdings: DbHolding[],
  orders: PublicOrder[],
): Player[] {
  // Build lookup maps — O(n)
  const holdingMap = new Map<string, number>();
  for (const h of holdings) {
    holdingMap.set(h.player_id, (holdingMap.get(h.player_id) ?? 0) + h.quantity);
  }

  const ordersByPlayer = new Map<string, PublicOrder[]>();
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
      isOwn: o.is_own,
      sellerHandle: o.handle,
      sellerName: o.handle ?? '',
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
