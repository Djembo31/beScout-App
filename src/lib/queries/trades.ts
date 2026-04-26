'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getPlayerTrades } from '@/lib/services/trading';
import {
  getClubRecentTrades,
  getMostOwnedPlayersPerClub,
  getMostOwnedPlayersPerClubBatch,
} from '@/lib/services/club';

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

/**
 * Slice 207 K-02 — Most-Owned Players per Club BATCH (anonymized aggregate).
 * Returns Map<club_id, Top-N players> for a list of club ids in 1 RPC call.
 *
 * Use case: /clubs Discovery page renders league-grouped club cards and needs
 * the top-1 most-owned player per card without N parallel RPCs.
 *
 * `enabled` gates on non-empty clubIds. Stable cache key via sorted+joined ids.
 */
export function useMostOwnedPlayersPerClubBatch(clubIds: string[], limit = 1) {
  // Sort + join for stable React-Query key regardless of input order.
  const stableKey = useMemo(() => Array.from(clubIds).sort().join(','), [clubIds]);
  return useQuery({
    queryKey: qk.clubs.mostOwnedBatch(stableKey, limit),
    queryFn: () => getMostOwnedPlayersPerClubBatch(clubIds, limit),
    enabled: clubIds.length > 0,
    staleTime: FIVE_MIN,
  });
}
