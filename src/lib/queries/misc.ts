'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getTransactions, getHoldingQty, getPlayerHolderCount, getTradePlayersByIds, getPlayerHoldersConcentration } from '@/lib/services/wallet';
import { getWatcherCount } from '@/lib/services/watchlist';
import { getLeaderboard } from '@/lib/services/social';
import { getPosts } from '@/lib/services/posts';
import { getScoutMissions, getUserMissionProgress } from '@/lib/services/scoutMissions';
import { getClubBySlug, getClubStanding } from '@/lib/services/club';
import { getMySubscription } from '@/lib/services/clubSubscriptions';
import { getPlayerGameweekScores, getPlayerMatchTimeline } from '@/lib/services/scoring';
import { getPbtForPlayer } from '@/lib/services/pbt';
import { getLiquidationEvent } from '@/lib/services/liquidation';
import { getSellOrders } from '@/lib/services/trading';
import { getIpoForPlayer, getFirstIpoPrice, getUserIpoPurchases } from '@/lib/services/ipo';
import { getOpenBids } from '@/lib/services/offers';
import { getWildcardHistory } from '@/features/fantasy/services/wildcards';
import type { PostType } from '@/types';

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

export function useTransactions(
  userId: string | undefined,
  opts: { limit?: number; enabled?: boolean } = {},
) {
  const { limit = 50, enabled = true } = opts;
  return useQuery({
    queryKey: qk.transactions.byUser(userId!, limit),
    queryFn: () => getTransactions(userId!, limit),
    enabled: !!userId && enabled,
    staleTime: TWO_MIN,
  });
}

/** Offset-paginated credit-transaction history. Use for the /transactions page. */
export function useInfiniteTransactions(
  userId: string | undefined,
  pageSize = 50,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: qk.transactions.infinite(userId!, pageSize),
    queryFn: ({ pageParam }) => getTransactions(userId!, pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < pageSize ? undefined : allPages.length * pageSize,
    enabled: !!userId && enabled,
    staleTime: TWO_MIN,
  });
}

/**
 * Slice 201a (FM-6.1): Per-Trade-Player-Map fuer TransactionsPageContent.
 * Liefert Map<trade_id, {player_id, first_name, last_name, image_url}> fuer alle
 * trade_buy/trade_sell-Transactions damit Description klickbar (-> /player/[id])
 * gerendert werden kann.
 *
 * tradeIds-Array MUSS stable referenced sein (sort + uniq) damit query nicht
 * dauernd neu feuert. Caller useMemo um ids zu derivieren.
 */
export function useTradePlayerMap(tradeIds: string[], enabled = true) {
  return useQuery({
    queryKey: qk.transactions.tradePlayers(tradeIds),
    queryFn: () => getTradePlayersByIds(tradeIds),
    enabled: enabled && tradeIds.length > 0,
    staleTime: FIVE_MIN, // Trade-Player-Mapping aendert sich nicht (trades append-only)
  });
}

/**
 * Slice 201b (FM-4.3): Top-10-Holders-Concentration per player.
 * Lazy-load opt-in (enabled-Flag) damit nicht alle PlayerRows in TransferList
 * eager-fetchen (N+1-Risiko). Caller setzt enabled=true z.B. bei Player-Detail
 * oder bei Visible-On-Screen.
 */
export function usePlayerHoldersConcentration(
  playerId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['players', 'holders-concentration', playerId!] as const,
    queryFn: () => getPlayerHoldersConcentration(playerId!),
    enabled: !!playerId && enabled,
    staleTime: FIVE_MIN, // Holdings-Verteilung aendert sich langsam
  });
}

/**
 * Fetch wildcard transaction history for a user.
 * Reads from the `wildcard_transactions` table via getWildcardHistory.
 * Slice 306: the wildcard economy is dormant — earn/spend/admin_grant RPCs DO write
 * tx rows (verified live), but no app path calls them yet, so the table is empty.
 * The hook stays live so that once an earning/spending path is wired, consumers can
 * mount it in Timeline / Transactions without code changes elsewhere.
 */
export function useWildcardHistory(
  userId: string | undefined,
  opts: { limit?: number; enabled?: boolean } = {},
) {
  const { limit = 50, enabled = true } = opts;
  return useQuery({
    queryKey: ['wildcards', 'history', userId!, limit] as const,
    queryFn: () => getWildcardHistory(userId!, limit),
    enabled: !!userId && enabled,
    staleTime: TWO_MIN,
  });
}

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: qk.leaderboard.top(limit),
    queryFn: () => getLeaderboard(limit),
    staleTime: FIVE_MIN,
  });
}

export function usePosts(params: {
  limit?: number;
  offset?: number;
  playerId?: string;
  userId?: string;
  clubName?: string;
  clubId?: string;
  postType?: PostType;
  eventId?: string;
  active?: boolean;
} = {}) {
  const { active, ...queryParams } = params;
  return useQuery({
    queryKey: qk.posts.list(queryParams as Record<string, unknown>),
    queryFn: () => getPosts(queryParams),
    staleTime: TWO_MIN,
    ...(active === false && { enabled: false }),
  });
}

export function useScoutMissions() {
  return useQuery({
    queryKey: qk.missions.scout,
    queryFn: getScoutMissions,
    staleTime: FIVE_MIN,
  });
}

export function useMissionProgress(userId: string | undefined, gameweek: number) {
  return useQuery({
    queryKey: qk.missions.progress(userId!, gameweek),
    queryFn: () => getUserMissionProgress(userId!, gameweek),
    enabled: !!userId && gameweek > 0,
    staleTime: FIVE_MIN,
  });
}

// ── Club Detail ──

export function useClubBySlug(slug: string, userId?: string) {
  return useQuery({
    queryKey: qk.clubs.bySlug(slug, userId),
    queryFn: () => getClubBySlug(slug, userId),
    staleTime: FIVE_MIN,
  });
}

export function useClubSubscription(userId: string | undefined, clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubs.subscription(userId!, clubId!),
    queryFn: () => getMySubscription(userId!, clubId!),
    enabled: !!userId && !!clubId,
    staleTime: TWO_MIN,
  });
}

/**
 * Slice 149 — Liga-Tabellenposition fuer Club-Info-Kachel.
 * Standings werden taeglich via Cron aktualisiert → FIVE_MIN stale.
 */
export function useClubStanding(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubs.standing(clubId!),
    queryFn: () => getClubStanding(clubId!),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}

// ── Player Detail ──

export function usePlayerGwScores(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.scoring.gwScores(playerId!),
    queryFn: () => getPlayerGameweekScores(playerId!),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

export function usePlayerMatchTimeline(playerId: string | undefined, limit = 15, active = true) {
  return useQuery({
    queryKey: qk.scoring.matchTimeline(playerId!),
    queryFn: () => getPlayerMatchTimeline(playerId!, limit),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

export function usePbtForPlayer(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.pbt.byPlayer(playerId!),
    queryFn: () => getPbtForPlayer(playerId!),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

export function useMyWishes(active = true) {
  return useQuery({
    queryKey: qk.fanWishes.mine(),
    queryFn: () => import('@/lib/services/fanWishes').then(m => m.getMyWishes()),
    enabled: active,
    staleTime: FIVE_MIN,
  });
}

export function useLiquidationEvent(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.liquidation.byPlayer(playerId!),
    queryFn: () => getLiquidationEvent(playerId!),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

export function useIpoForPlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.ipos.byPlayer(playerId!),
    queryFn: () => getIpoForPlayer(playerId!),
    enabled: !!playerId,
    staleTime: FIVE_MIN,
  });
}

/**
 * Slice 368b / D100: price of the player's first IPO = honest "Dein Einstieg" anchor.
 * Returns null when the player never had an IPO → UI shows "—" (no fabricated number).
 * Historical/immutable value → 5min staleTime is safe. Consumer = RewardsTab (lazy mount).
 */
export function useFirstIpoPrice(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.ipos.firstPrice(playerId!),
    queryFn: () => getFirstIpoPrice(playerId!),
    enabled: !!playerId,
    staleTime: FIVE_MIN,
  });
}

export function useHoldingQty(userId: string | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: qk.holdings.qty(userId!, playerId!),
    queryFn: () => getHoldingQty(userId!, playerId!),
    enabled: !!userId && !!playerId,
    staleTime: 30_000,
  });
}

export function usePlayerHolderCount(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.holdings.holderCount(playerId!),
    queryFn: () => getPlayerHolderCount(playerId!),
    enabled: !!playerId,
    staleTime: TWO_MIN,
  });
}

export function useSellOrders(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.orders.byPlayer(playerId!),
    queryFn: () => getSellOrders(playerId!),
    enabled: !!playerId,
    staleTime: ONE_MIN,
  });
}

export function useOpenBids(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.offers.bids(playerId!),
    queryFn: () => getOpenBids({ playerId }),
    enabled: !!playerId && active,
    staleTime: ONE_MIN,
  });
}

export function useUserIpoPurchases(userId: string | undefined, ipoId: string | undefined) {
  return useQuery({
    queryKey: qk.ipos.purchases(userId!, ipoId!),
    queryFn: () => getUserIpoPurchases(userId!, ipoId!),
    enabled: !!userId && !!ipoId,
    staleTime: TWO_MIN,
  });
}

export function useWatcherCount(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.watchlist.watcherCount(playerId!),
    queryFn: () => getWatcherCount(playerId!),
    enabled: !!playerId,
    staleTime: 60_000,
  });
}
