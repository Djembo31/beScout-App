'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getPlayerTrades } from '@/lib/services/trading';
import { getClubRecentTrades, getMostOwnedPlayersPerClub } from '@/lib/services/club';

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

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
    staleTime: FIVE_MIN,
  });
}

/**
 * Slice 199 K-02 — Most-Owned Players per Club (anonymized aggregate).
 * Returns Top-N players by holders_count for a given club.
 */
export function useMostOwnedPlayersPerClub(clubId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: qk.clubs.mostOwned(clubId!, limit),
    queryFn: () => getMostOwnedPlayersPerClub(clubId!, limit),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}
