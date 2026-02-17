'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getHoldings } from '@/lib/services/wallet';

/**
 * User holdings — staleTime: 0 to avoid RLS race condition (MEMORY.md).
 * React Query still deduplicates in-flight requests.
 */
export function useHoldings(userId: string | undefined) {
  return useQuery({
    queryKey: qk.holdings.byUser(userId!),
    queryFn: () => getHoldings(userId!),
    enabled: !!userId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}
