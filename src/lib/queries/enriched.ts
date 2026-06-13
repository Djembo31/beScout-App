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
  // Slice 283: Tab-Gating — /market lädt die volle 4,2-MB-Liste erst wenn der
  // Marktplatz-Tab aktiv ist (Default-Tab portfolio braucht sie nicht).
  options?: { enabled?: boolean },
) {
  const { data: players = [], isLoading: playersLoading, isError: playersError } = usePlayers(options?.enabled ?? true);

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

    // Slice 303 (S7): Floor = EINE Quelle players.floor_price (via prices.floor).
    // Kein Client-Recompute aus orders mehr — recalc_floor_price pflegt floor_price
    // bei jeder Sell-Order/Trade/Cancel mit der Kanon-Formel. listings bleiben nur
    // für die Orderbook-Anzeige (nicht für den Floor).
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
        floor: p.prices.floor ?? p.prices.ipoPrice ?? 0,
      },
      listings,
    };
  });
}
