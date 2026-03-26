'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { getTrendingPlayers } from '@/lib/services/trading';

const TWO_MIN = 2 * 60 * 1000;

export function useTrendingPlayers(limit = 5, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.trending.top(limit),
    queryFn: () => getTrendingPlayers(limit),
    staleTime: TWO_MIN,
    enabled: options?.enabled ?? true,
  });
}
