'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { queryClient } from '@/lib/queryClient';
import { getMarketUserDashboard, type MarketUserDashboard } from '@/lib/services/marketDashboard';
import { enrichOffers } from '@/lib/services/offers';
import type { OfferWithDetails } from '@/types';

const ONE_MIN = 60 * 1000;

type EnrichedMarketDashboard = {
  holdings: MarketUserDashboard['holdings'];
  watchlist: MarketUserDashboard['watchlist'];
  incoming_offers: OfferWithDetails[];
  open_bids: OfferWithDetails[];
};

/**
 * Slice 122: Single-roundtrip per-user /market dashboard query.
 *
 * Fetches holdings + watchlist + incoming_offers + open_bids via the
 * `get_market_user_dashboard` RPC (SECURITY DEFINER, AR-44 guarded).
 * Both offer arrays share one enrichment round-trip (players + profiles
 * deduplicated), so net cost is: 1 RPC + 2 enrichment queries = 3 requests,
 * down from 4 separate per-user + 4 enrichment = 8 requests.
 *
 * staleTime 60s = min(holdings 30s, watchlist 2min, offers 1min) — safe
 * floor. Individual hooks on other pages continue to use their own
 * staleTimes via primed cache.
 */
export function useMarketUserDashboard(userId: string | undefined) {
  return useQuery<EnrichedMarketDashboard>({
    queryKey: userId ? qk.marketDashboard.byUser(userId) : ['market-dashboard', 'anon'],
    queryFn: async () => {
      const raw = await getMarketUserDashboard(userId!);
      // Single combined enrichment pass — dedup via enrichOffers' internal
      // Set-based playerIds/userIds, so 2 arrays cost ~1 players + 1 profiles query.
      const combined = await enrichOffers([...raw.incoming_offers, ...raw.open_bids]);
      const incomingCount = raw.incoming_offers.length;
      const enriched: EnrichedMarketDashboard = {
        holdings: raw.holdings,
        watchlist: raw.watchlist,
        incoming_offers: combined.slice(0, incomingCount),
        open_bids: combined.slice(incomingCount),
      };
      primeMarketDashboardCaches(userId!, enriched);
      return enriched;
    },
    enabled: !!userId,
    staleTime: ONE_MIN,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Prime the 3 underlying query caches with enriched data from the dashboard.
 * Runs synchronously inside queryFn so downstream hooks hit warm cache immediately.
 *
 * Slice 192: `qk.holdings.byUser(userId)` is INTENTIONALLY NOT primed here.
 * `getMarketUserDashboard` returns `DbHolding[]` (no nested `player`), but
 * `qk.holdings.byUser` expects `HoldingWithPlayer[]`. Priming with the wrong
 * shape would crash `dbHoldingToUserDpcHolding` mapper on `/market → /fantasy`
 * navigation. `useHoldings()` runs its own query against `getHoldings()`
 * (PostgREST nested-select) to fetch the player-joined shape.
 *
 * Slice 418: `qk.offers.openBids`-Priming entfernt — der einzige Reader
 * (orphan `useOpenBids()` no-arg) wurde gelöscht; BestandView liest `open_bids`
 * direkt aus dem Dashboard-Query-Result, nicht aus diesem Cache.
 */
export function primeMarketDashboardCaches(userId: string, dash: EnrichedMarketDashboard): void {
  // INTENTIONALLY skipping qk.holdings.byUser — see JSDoc above (Slice 192)
  queryClient.setQueryData(qk.watchlist.byUser(userId), dash.watchlist);
  queryClient.setQueryData(qk.offers.incoming(userId), dash.incoming_offers);
}
