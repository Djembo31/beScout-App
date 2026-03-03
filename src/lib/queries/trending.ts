'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getTrendingPlayers } from '@/lib/services/trading';

const TWO_MIN = 2 * 60 * 1000;

export function useTrendingPlayers(limit = 5) {
  return useQuery({
    queryKey: qk.trending.top(limit),
    queryFn: () => getTrendingPlayers(limit),
    staleTime: TWO_MIN,
  });
}
