import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import { dbToPlayer } from '@/lib/services/players';
import type {
  Player, DbPlayer, DbIpo, PublicOrder, PublicTrade,
  DbPbtTreasury, DbLiquidationEvent, OfferWithDetails,
  PostWithAuthor, ResearchPostWithAuthor,
} from '@/types';
import type { MatchTimelineEntry, PlayerGameweekScore } from '@/features/fantasy/services/scoring.queries';

// React Query hooks
import { useDbPlayerById, usePlayerPercentiles } from '@/lib/queries/players';
import {
  usePlayerGwScores,
  usePlayerMatchTimeline,
  usePbtForPlayer,
  useLiquidationEvent,
  useIpoForPlayer,
  useHoldingQty,
  usePlayerHolderCount,
  useSellOrders,
  useOpenBids,
  usePosts,
  useUserIpoPurchases,
  useWatcherCount,
} from '@/lib/queries/misc';
import { usePlayerResearch } from '@/lib/queries/research';
import { usePlayerTrades } from '@/lib/queries/trades';
import { useHoldingLocks } from '@/lib/queries/events';
import { useWatchlist } from '@/lib/queries/watchlist';

type Tab = 'trading' | 'performance' | 'community';

export interface PlayerDetailData {
  // Core player
  player: Player | null;
  playerWithOwnership: Player | null;
  dbPlayer: DbPlayer | null | undefined;
  dpcAvailable: number;

  // Holdings & market
  holdingQty: number;
  holderCount: number;
  watcherCount: number;
  isWatchlisted: boolean;
  watchlistMap: Record<string, boolean>;
  lockedScMap: Map<string, number> | undefined;
  allSellOrders: PublicOrder[];
  openBids: OfferWithDetails[];
  trades: PublicTrade[];
  tradesLoading: boolean;
  activeIpo: DbIpo | null | undefined;
  userIpoPurchased: number;
  pbtTreasury: DbPbtTreasury | null | undefined;

  // Performance
  matchTimelineData: MatchTimelineEntry[];
  matchTimelineLoading: boolean;
  liquidationEvent: DbLiquidationEvent | null | undefined;
  gwScores: PlayerGameweekScore[];
  percentiles: Record<string, number> | undefined;

  // Community
  playerResearch: ResearchPostWithAuthor[];
  playerPosts: PostWithAuthor[];

  // Profiles
  profileMap: Record<string, { handle: string; display_name: string | null }>;

  // Loading state
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function usePlayerDetailData(
  playerId: string,
  userId: string | undefined,
  tab: Tab,
): PlayerDetailData {
  const { addToast } = useToast();
  const t = useTranslations('player');

  // Below-the-fold queries (counters, banners, trades, research) load 300ms
  // after mount to keep the initial burst under the browser's 6-concurrent
  // connection limit. Critical-path (Hero + Trading-Actions) stays ungated.
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setBelowFoldReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // ─── React Query Hooks ────────────────────
  // CRITICAL PATH (Hero + trading-actions, always initial):
  const { data: dbPlayer, isLoading, isError, refetch } = useDbPlayerById(playerId);
  const { data: holdingQtyData } = useHoldingQty(userId, playerId);
  const { data: watchlistEntries } = useWatchlist(userId);
  const { data: allSellOrdersData } = useSellOrders(playerId);
  const { data: activeIpo } = useIpoForPlayer(playerId);

  // BELOW-THE-FOLD (info-layer, deferred 300ms):
  const { data: lockedScMap } = useHoldingLocks(belowFoldReady ? userId : undefined);
  const { data: holderCountData } = usePlayerHolderCount(belowFoldReady ? playerId : undefined);
  const { data: watcherCountData } = useWatcherCount(belowFoldReady ? playerId : undefined);
  const { data: tradesData, isLoading: tradesLoading } = usePlayerTrades(belowFoldReady ? playerId : undefined);
  const { data: matchTimelineData, isLoading: matchTimelineLoading } = usePlayerMatchTimeline(playerId, 15, belowFoldReady);
  const { data: liquidationEvent } = useLiquidationEvent(playerId, belowFoldReady);

  // TRADING TAB (default tab-gated):
  const { data: openBidsData } = useOpenBids(playerId, tab === 'trading');
  const { data: pbtTreasury } = usePbtForPlayer(playerId, tab === 'trading');
  const { data: userIpoPurchasedData } = useUserIpoPurchases(userId, activeIpo?.id);

  // PERFORMANCE TAB (deferred — tab switch):
  const { data: gwScoresData } = usePlayerGwScores(playerId, tab === 'performance');

  // COMMUNITY TAB (deferred — tab switch + below-fold):
  const { data: playerResearchData } = usePlayerResearch(playerId, userId, (tab === 'community' || tab === 'trading') && belowFoldReady);
  const { data: playerPostsData } = usePosts({ playerId, limit: 30, active: tab === 'community' });

  // ─── Derived from queries ─────────────────
  const { data: percentiles } = usePlayerPercentiles(playerId, tab === 'performance');

  const player = useMemo(() => (dbPlayer ? dbToPlayer(dbPlayer) : null), [dbPlayer]);
  const dpcAvailable = dbPlayer?.dpc_available ?? 0;
  const holdingQty = holdingQtyData ?? 0;
  const holderCount = holderCountData ?? 0;
  const watcherCount = watcherCountData ?? 0;
  const watchlistMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    (watchlistEntries ?? []).forEach(e => { m[e.playerId] = true; });
    return m;
  }, [watchlistEntries]);
  const isWatchlisted = !!watchlistMap[playerId];
  const allSellOrders = allSellOrdersData ?? [];
  const openBids = openBidsData ?? [];
  const trades = tradesData ?? [];
  const playerResearch = playerResearchData ?? [];
  const playerPosts = playerPostsData ?? [];
  const userIpoPurchased = userIpoPurchasedData ?? 0;
  const gwScores = gwScoresData ?? [];

  // ─── Profile Map Side-Effect ──────────────
  // Slice 095: setProfileMap entfällt (trades carrying handle direkt). profileMap bleibt empty default.
  const [profileMap] = useState<Record<string, { handle: string; display_name: string | null }>>({});

  // Slice 095: trades RPC liefert buyer_handle/seller_handle direkt. profileMap-Lookup entfällt.
  // Orders tragen handle seit Slice 020 direkt. profileMap bleibt als stabiler Return-Wert
  // (empty Record) für Backwards-Compat mit BuyModal.

  // ─── Player With Ownership ────────────────
  const playerWithOwnership = useMemo(() => {
    if (!player) return null;
    const c2b = (c: number) => c / 100;
    return {
      ...player,
      dpc: { ...player.dpc, owned: holdingQty },
      pbt: pbtTreasury
        ? {
            balance: c2b(pbtTreasury.balance),
            lastInflow: pbtTreasury.last_inflow_at
              ? c2b(pbtTreasury.trading_inflow + pbtTreasury.ipo_inflow)
              : undefined,
            sources: {
              trading: c2b(pbtTreasury.trading_inflow),
              ipo: c2b(pbtTreasury.ipo_inflow),
              votes: c2b(pbtTreasury.votes_inflow),
              content: c2b(pbtTreasury.content_inflow),
            },
          }
        : player.pbt,
    };
  }, [player, holdingQty, pbtTreasury]);

  return {
    player,
    playerWithOwnership,
    dbPlayer,
    dpcAvailable,
    holdingQty,
    holderCount,
    watcherCount,
    isWatchlisted,
    watchlistMap,
    lockedScMap,
    allSellOrders,
    openBids,
    trades,
    tradesLoading,
    activeIpo,
    userIpoPurchased,
    pbtTreasury,
    matchTimelineData: matchTimelineData ?? [],
    matchTimelineLoading,
    liquidationEvent,
    gwScores,
    percentiles,
    playerResearch,
    playerPosts,
    profileMap,
    isLoading,
    isError,
    refetch,
  };
}
