'use client';

import { useMemo, useCallback } from 'react';
import type { Player } from '@/types';
import { useEnrichedPlayers, useHoldings, useAllOpenOrders, useAllOpenBuyOrders } from '@/lib/queries';
import { useActiveIpos, useAnnouncedIpos, useRecentlyEndedIpos } from '@/features/market/queries/ipos';
import { useTrendingPlayers } from '@/features/market/queries/trending';
import { useAllPriceHistories } from '@/features/market/queries/priceHist';
import { useWatchlist } from '@/features/market/queries/watchlist';
import { useIncomingOffers } from '@/features/market/queries/offers';
import { useMarketStore } from '@/features/market/store/marketStore';

export function useMarketData(userId: string | undefined) {
  const tab = useMarketStore(s => s.tab);

  // ── Core queries (always loaded) ──
  const { data: enrichedPlayers = [], isLoading: playersLoading, isError: playersError } = useEnrichedPlayers(userId);
  const { data: ipoList = [] } = useActiveIpos();
  const { data: holdings = [] } = useHoldings(userId);
  const { data: watchlistEntries = [] } = useWatchlist(userId);
  const { data: recentOrders = [] } = useAllOpenOrders();
  const { data: incomingOffers = [] } = useIncomingOffers(userId);

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
  const floorMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of players) {
      m.set(p.id, p.listings.length > 0 ? Math.min(...p.listings.map(l => l.price)) : p.prices.floor ?? p.prices.referencePrice ?? 0);
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
    holdings, ipoList, watchlistEntries, recentOrders, incomingOffers,
    announcedIpos, endedIpos, trending, buyOrders, priceHistMap,
    playerMap, floorMap, watchlistMap, mySquadPlayers, getFloor,
  };
}
