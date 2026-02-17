'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getWatchlist } from '@/lib/services/watchlist';

const TWO_MIN = 2 * 60 * 1000;

export function useWatchlist(userId: string | undefined) {
  return useQuery({
    queryKey: qk.watchlist.byUser(userId!),
    queryFn: () => getWatchlist(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}
