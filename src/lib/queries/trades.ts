'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getRecentGlobalTrades, getTopTraders, getPlayerTrades } from '@/lib/services/trading';
import { getClubRecentTrades } from '@/lib/services/club';

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * 60 * 1000;

export function useRecentGlobalTrades(limit = 10) {
  return useQuery({
    queryKey: qk.trades.global(limit),
    queryFn: () => getRecentGlobalTrades(limit),
    staleTime: ONE_MIN,
  });
}

export function useTopTraders(limit = 5) {
  return useQuery({
    queryKey: qk.trades.topTraders(limit),
    queryFn: () => getTopTraders(limit),
    staleTime: TWO_MIN,
  });
}

export function useClubRecentTrades(clubId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: qk.clubs.recentTrades(clubId!),
    queryFn: () => getClubRecentTrades(clubId!, limit),
    enabled: !!clubId,
    staleTime: ONE_MIN,
  });
}

export function usePlayerTrades(playerId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: qk.trades.byPlayer(playerId!),
    queryFn: () => getPlayerTrades(playerId!, limit),
    enabled: !!playerId,
    staleTime: ONE_MIN,
  });
}
