'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getHoldings } from '@/lib/services/wallet';

/**
 * User holdings — staleTime 30s (cache invalidation after trades handles freshness).
 * Previous staleTime: 0 caused refetch on every mount across Home/Market/Community.
 */
export function useHoldings(userId: string | undefined) {
  return useQuery({
    queryKey: qk.holdings.byUser(userId!),
    queryFn: () => getHoldings(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}
