'use client';

import { useMemo, useCallback } from 'react';
import type { Player } from '@/types';
import { computePlayerFloor } from '@/lib/playerMath';
import { useEnrichedPlayers, useAllOpenOrders, useAllOpenBuyOrders } from '@/lib/queries';
import { useMarketUserDashboard } from '@/lib/queries/marketDashboard';
import { useActiveIpos, useAnnouncedIpos, useRecentlyEndedIpos } from '@/features/market/queries/ipos';
import { useTrendingPlayers } from '@/features/market/queries/trending';
import { useAllPriceHistories } from '@/features/market/queries/priceHist';
import { useMarketStore } from '@/features/market/store/marketStore';

export function useMarketData(userId: string | undefined) {
  const tab = useMarketStore(s => s.tab);

  // ── Core queries (always loaded) ──
  const { data: ipoList = [] } = useActiveIpos();
  // Slice 122: 4 per-user queries (holdings + watchlist + incoming_offers + open_bids)
  // in 1 RPC konsolidiert.
  const { data: dashboard } = useMarketUserDashboard(userId);
  const holdings = dashboard?.holdings ?? [];
  const watchlistEntries = dashboard?.watchlist ?? [];
  const incomingOffers = dashboard?.incoming_offers ?? [];
  const openBids = dashboard?.open_bids ?? [];
  const { data: recentOrders = [] } = useAllOpenOrders();
  // Slice 123: useEnrichedPlayers konsumiert holdings+orders als Input (entfernt
  // doppelte useHoldings/useAllOpenOrders-Fetches die vorher race-conditional
  // zu useMarketUserDashboard liefen).
  const { data: enrichedPlayers = [], isLoading: playersLoading, isError: playersError } = useEnrichedPlayers(userId, holdings, recentOrders);

  // ── Tab-gated queries (marktplatz only) ──
  const { data: priceHistMap } = useAllPriceHistories(10, { enabled: tab === 'marktplatz' });
  const { data: announcedIpos = [] } = useAnnouncedIpos({ enabled: tab === 'marktplatz' });
  const { data: endedIpos = [] } = useRecentlyEndedIpos({ enabled: tab === 'marktplatz' });
  const { data: trending = [] } = useTrendingPlayers(8, { enabled: tab === 'marktplatz' });
  const { data: buyOrders = [] } = useAllOpenBuyOrders();

  // ── Derived: merge price histories ──
  const players = useMemo(() => {
    if (!priceHistMap || priceHistMap.size === 0) return enrichedPlayers;
    return enrichedPlayers.map(p => {
      const hist = priceHistMap.get(p.id);
      if (!hist || hist.length < 2) return p;
      return { ...p, prices: { ...p.prices, history7d: hist } };
    });
  }, [enrichedPlayers, priceHistMap]);

  // ── Derived: watchlist map ──
  const watchlistMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const e of watchlistEntries) map[e.playerId] = true;
    return map;
  }, [watchlistEntries]);

  // ── Derived: floor prices ──
  // Canonical chain matches enrichPlayersWithData (enriched.ts):
  //   live-listings Math.min → enriched `prices.floor` → 0.
  // `prices.floor` is always a number post-enrichment (floorFromOrders ??
  // old floor ?? ipoPrice ?? 0), so the secondary fallback is sufficient.
  const floorMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of players) {
      m.set(p.id, computePlayerFloor(p));
    }
    return m;
  }, [players]);

  // ── Derived: player lookup ──
  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  // ── Derived: owned squad ──
  const mySquadPlayers = useMemo(() => {
    return players.filter(p => p.dpc.owned > 0 && !p.isLiquidated);
  }, [players]);

  // ── Helper: get floor price for a player ──
  const getFloor = useCallback((p: Player) => floorMap.get(p.id) ?? 0, [floorMap]);

  return {
    players, playersLoading, playersError,
    holdings, ipoList, watchlistEntries, recentOrders, incomingOffers, openBids,
    announcedIpos, endedIpos, trending, buyOrders, priceHistMap,
    playerMap, floorMap, watchlistMap, mySquadPlayers, getFloor,
  };
}
