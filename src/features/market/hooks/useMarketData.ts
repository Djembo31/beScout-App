'use client';

import { useMemo, useCallback } from 'react';
import type { Player } from '@/types';
import { computePlayerFloor } from '@/lib/playerMath';
import { useEnrichedPlayers, useAllOpenOrders, useAllOpenBuyOrders, usePlayersByIds } from '@/lib/queries';
import { enrichPlayersWithData } from '@/lib/queries/enriched';
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
  // Review-283-F-01: isLoading/isError MÜSSEN destrukturiert werden — bei
  // RPC-Error bliebe `data === undefined` sonst für immer „loading" (endloser
  // Skeleton auf dem Default-Tab + /manager, ohne ErrorState/Retry).
  // Anti-Pattern „Derived-Loading aus data===undefined" (TanStack v5).
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
  } = useMarketUserDashboard(userId);
  const holdings = dashboard?.holdings ?? [];
  const watchlistEntries = dashboard?.watchlist ?? [];
  const incomingOffers = dashboard?.incoming_offers ?? [];
  const openBids = dashboard?.open_bids ?? [];
  const { data: recentOrders = [] } = useAllOpenOrders();
  // Slice 123: useEnrichedPlayers konsumiert holdings+orders als Input (entfernt
  // doppelte useHoldings/useAllOpenOrders-Fetches die vorher race-conditional
  // zu useMarketUserDashboard liefen).
  // Slice 283 W1: volle 4,2-MB-Liste NUR für den Marktplatz-Tab (Slice-282-Klasse:
  // Default-Tab portfolio wurde vom Fetch des anderen Tabs gegated). Gleicher
  // enabled-Mechanismus wie die tab-gated Queries unten.
  const marktplatzActive = tab === 'marktplatz';
  const {
    data: enrichedPlayers = [],
    isLoading: marketListLoading,
    isError: marketListError,
  } = useEnrichedPlayers(userId, holdings, recentOrders, { enabled: marktplatzActive });

  // Slice 283 W1: Portfolio-Pfad — nur die Spieler aus Holdings + Offers/Bids
  // via byIds (Slice-282-Hook), gleiche dbToPlayers+Enrichment-Pipeline →
  // identische Player-Shape (Slice-102-Contract).
  const portfolioIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...holdings.map((h) => h.player_id),
          ...incomingOffers.map((o) => o.player_id),
          ...openBids.map((o) => o.player_id),
        ]),
      ),
    [holdings, incomingOffers, openBids],
  );
  const {
    data: portfolioRaw = [],
    isLoading: portfolioByIdsLoading,
    isError: portfolioByIdsError,
  } = usePlayersByIds(portfolioIds);
  // Review-283-F-01: Dashboard ist Upstream-ID-Quelle UND eigener Failure-Mode.
  const portfolioPlayersError = dashboardError || portfolioByIdsError;
  const portfolioPlayers = useMemo(
    () => (portfolioRaw.length === 0 ? portfolioRaw : enrichPlayersWithData(portfolioRaw, holdings, recentOrders)),
    [portfolioRaw, holdings, recentOrders],
  );
  // 282-F-03-Lehre: Upstream-Loading (dashboard liefert die ids) MUSS in den
  // kombinierten Loading-State, sonst false-window + Skeleton-Oszillation.
  const portfolioLoading = dashboardLoading || (portfolioIds.length > 0 && portfolioByIdsLoading);

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
  // Slice 283: Union aus full-list (wenn marktplatz geladen) + Portfolio-Subset —
  // deckt beide Tabs + TradeSuccessCard ab; Subset-Werte gewinnen (gleiches Enrichment).
  const floorMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of players) m.set(p.id, computePlayerFloor(p));
    for (const p of portfolioPlayers) m.set(p.id, computePlayerFloor(p));
    return m;
  }, [players, portfolioPlayers]);

  // ── Derived: player lookup ──
  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    for (const p of portfolioPlayers) m.set(p.id, p);
    return m;
  }, [players, portfolioPlayers]);

  // ── Derived: owned squad (Slice 283: aus dem Portfolio-Subset) ──
  const mySquadPlayers = useMemo(() => {
    return portfolioPlayers.filter(p => p.dpc.owned > 0 && !p.isLiquidated);
  }, [portfolioPlayers]);

  // ── Helper: get floor price for a player ──
  const getFloor = useCallback((p: Player) => floorMap.get(p.id) ?? 0, [floorMap]);

  return {
    // Slice 283: getrennte Quellen + Loading-States pro Tab.
    players, marketListLoading, marketListError,
    portfolioPlayers, portfolioLoading, portfolioPlayersError,
    holdings, ipoList, watchlistEntries, recentOrders, incomingOffers, openBids,
    announcedIpos, endedIpos, trending, buyOrders, priceHistMap,
    playerMap, floorMap, watchlistMap, mySquadPlayers, getFloor,
  };
}
