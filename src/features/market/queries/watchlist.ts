'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { getWatchlist, getMostWatchedPlayers } from '@/lib/services/watchlist';

const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

export function useWatchlist(userId: string | undefined) {
  return useQuery({
    queryKey: qk.watchlist.byUser(userId!),
    queryFn: () => getWatchlist(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useMostWatchedPlayers(userId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: qk.watchlist.mostWatched(limit),
    queryFn: () => getMostWatchedPlayers(limit),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}
