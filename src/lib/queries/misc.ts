'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getTransactions, getHoldingQty, getPlayerHolderCount } from '@/lib/services/wallet';
import { getLeaderboard } from '@/lib/services/social';
import { getPosts } from '@/lib/services/posts';
import { getDpcOfTheWeek } from '@/lib/services/dpcOfTheWeek';
import { getScoutMissions, getUserMissionProgress } from '@/lib/services/scoutMissions';
import { getClubBySlug } from '@/lib/services/club';
import { getMySubscription } from '@/lib/services/clubSubscriptions';
import { getPlayerGameweekScores } from '@/lib/services/scoring';
import { getPbtForPlayer } from '@/lib/services/pbt';
import { getLiquidationEvent } from '@/lib/services/liquidation';
import { getSellOrders } from '@/lib/services/trading';
import { getIpoForPlayer, getUserIpoPurchases } from '@/lib/services/ipo';
import { getOpenBids } from '@/lib/services/offers';
import type { PostType } from '@/types';

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

export function useTransactions(userId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: qk.transactions.byUser(userId!, limit),
    queryFn: () => getTransactions(userId!, limit),
    enabled: !!userId,
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
} = {}) {
  return useQuery({
    queryKey: qk.posts.list(params as Record<string, unknown>),
    queryFn: () => getPosts(params),
    staleTime: TWO_MIN,
  });
}

export function useDpcOfWeek() {
  return useQuery({
    queryKey: qk.dpcOfWeek,
    queryFn: getDpcOfTheWeek,
    staleTime: FIVE_MIN,
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

// ── Player Detail ──

export function usePlayerGwScores(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.scoring.gwScores(playerId!),
    queryFn: () => getPlayerGameweekScores(playerId!),
    enabled: !!playerId,
    staleTime: FIVE_MIN,
  });
}

export function usePbtForPlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.pbt.byPlayer(playerId!),
    queryFn: () => getPbtForPlayer(playerId!),
    enabled: !!playerId,
    staleTime: FIVE_MIN,
  });
}

export function useLiquidationEvent(playerId: string | undefined) {
  return useQuery({
    queryKey: qk.liquidation.byPlayer(playerId!),
    queryFn: () => getLiquidationEvent(playerId!),
    enabled: !!playerId,
    staleTime: FIVE_MIN,
  });
}

export function useIpoForPlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: ['ipos', 'player', playerId],
    queryFn: () => getIpoForPlayer(playerId!),
    enabled: !!playerId,
    staleTime: FIVE_MIN,
  });
}

export function useHoldingQty(userId: string | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: ['holdings', 'qty', userId, playerId],
    queryFn: () => getHoldingQty(userId!, playerId!),
    enabled: !!userId && !!playerId,
    staleTime: 0,
  });
}

export function usePlayerHolderCount(playerId: string | undefined) {
  return useQuery({
    queryKey: ['holdings', 'holderCount', playerId],
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

export function useOpenBids(playerId: string | undefined) {
  return useQuery({
    queryKey: ['offers', 'bids', playerId],
    queryFn: () => getOpenBids(playerId!),
    enabled: !!playerId,
    staleTime: ONE_MIN,
  });
}

export function useUserIpoPurchases(userId: string | undefined, ipoId: string | undefined) {
  return useQuery({
    queryKey: ['ipos', 'purchases', userId, ipoId],
    queryFn: () => getUserIpoPurchases(userId!, ipoId!),
    enabled: !!userId && !!ipoId,
    staleTime: TWO_MIN,
  });
}
