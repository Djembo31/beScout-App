import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import { dbToPlayer } from '@/lib/services/players';
import { getProfilesByIds } from '@/lib/services/profiles';
import type {
  Player, DbPlayer, DbIpo, DbOrder, DbTrade,
  DbPbtTreasury, DbLiquidationEvent, OfferWithDetails,
  PostWithAuthor, ResearchPostWithAuthor,
} from '@/types';
import type { DbDpcMastery } from '@/lib/services/mastery';
import type { MatchTimelineEntry, PlayerGameweekScore } from '@/features/fantasy/services/scoring.queries';

// React Query hooks
import { useDbPlayerById, usePlayers } from '@/lib/queries/players';
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
} from '@/lib/queries/misc';
import { usePlayerResearch } from '@/lib/queries/research';
import { usePlayerTrades } from '@/lib/queries/trades';
import { useHoldingLocks } from '@/lib/queries/events';
import { useDpcMastery } from '@/lib/queries/mastery';

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
  lockedScMap: Map<string, number> | undefined;
  allSellOrders: DbOrder[];
  openBids: OfferWithDetails[];
  trades: DbTrade[];
  tradesLoading: boolean;
  activeIpo: DbIpo | null | undefined;
  userIpoPurchased: number;
  masteryData: DbDpcMastery | null | undefined;
  pbtTreasury: DbPbtTreasury | null | undefined;

  // Performance
  matchTimelineData: MatchTimelineEntry[];
  matchTimelineLoading: boolean;
  liquidationEvent: DbLiquidationEvent | null | undefined;
  gwScores: PlayerGameweekScore[];
  allPlayersForPercentile: Player[];

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

  // ─── React Query Hooks ────────────────────
  // ALWAYS loaded (Hero + Trading default tab):
  const { data: dbPlayer, isLoading, isError, refetch } = useDbPlayerById(playerId);
  const { data: holdingQtyData } = useHoldingQty(userId, playerId);
  const { data: lockedScMap } = useHoldingLocks(userId);
  const { data: holderCountData } = usePlayerHolderCount(playerId);
  const { data: allSellOrdersData } = useSellOrders(playerId);
  const { data: activeIpo } = useIpoForPlayer(playerId);

  // TRADING TAB (default — loaded immediately):
  const { data: tradesData, isLoading: tradesLoading } = usePlayerTrades(playerId);
  const { data: openBidsData } = useOpenBids(playerId, tab === 'trading');
  const { data: pbtTreasury } = usePbtForPlayer(playerId, tab === 'trading');
  const { data: userIpoPurchasedData } = useUserIpoPurchases(userId, activeIpo?.id);
  const { data: masteryData } = useDpcMastery(userId, playerId);

  // HERO + PERFORMANCE shared:
  const { data: matchTimelineData, isLoading: matchTimelineLoading } = usePlayerMatchTimeline(playerId, 15);
  const { data: liquidationEvent } = useLiquidationEvent(playerId);

  // PERFORMANCE TAB (deferred):
  const { data: gwScoresData } = usePlayerGwScores(playerId, tab === 'performance');

  // COMMUNITY TAB (deferred):
  const { data: playerResearchData } = usePlayerResearch(playerId, userId, tab === 'community' || tab === 'trading');
  const { data: playerPostsData } = usePosts({ playerId, limit: 30, active: tab === 'community' });

  // ─── Derived from queries ─────────────────
  const { data: allPlayersData } = usePlayers(tab === 'performance');
  const allPlayersForPercentile = allPlayersData ?? [];

  const player = useMemo(() => (dbPlayer ? dbToPlayer(dbPlayer) : null), [dbPlayer]);
  const dpcAvailable = dbPlayer?.dpc_available ?? 0;
  const holdingQty = holdingQtyData ?? 0;
  const holderCount = holderCountData ?? 0;
  const allSellOrders = allSellOrdersData ?? [];
  const openBids = openBidsData ?? [];
  const trades = tradesData ?? [];
  const playerResearch = playerResearchData ?? [];
  const playerPosts = playerPostsData ?? [];
  const userIpoPurchased = userIpoPurchasedData ?? 0;
  const gwScores = gwScoresData ?? [];

  // ─── Profile Map Side-Effect ──────────────
  const [profileMap, setProfileMap] = useState<Record<string, { handle: string; display_name: string | null }>>({});

  useEffect(() => {
    const userIds = new Set<string>();
    trades.forEach((tr) => {
      if (tr.buyer_id) userIds.add(tr.buyer_id);
      if (tr.seller_id) userIds.add(tr.seller_id);
    });
    allSellOrders.forEach((o) => {
      if (o.user_id) userIds.add(o.user_id);
    });
    const ids = Array.from(userIds);
    if (ids.length > 0) {
      getProfilesByIds(ids).then(setProfileMap).catch((err) => {
        console.error('[Player] Profile map failed:', err);
        addToast(t('couldNotLoadProfiles'), 'error');
      });
    }
  }, [trades, allSellOrders]); // eslint-disable-line react-hooks/exhaustive-deps

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
    lockedScMap,
    allSellOrders,
    openBids,
    trades,
    tradesLoading,
    activeIpo,
    userIpoPurchased,
    masteryData,
    pbtTreasury,
    matchTimelineData: matchTimelineData ?? [],
    matchTimelineLoading,
    liquidationEvent,
    gwScores,
    allPlayersForPercentile,
    playerResearch,
    playerPosts,
    profileMap,
    isLoading,
    isError,
    refetch,
  };
}
