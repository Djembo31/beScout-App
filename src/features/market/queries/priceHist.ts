'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { getAllPriceHistories } from '@/lib/services/trading';

const THREE_MIN = 3 * 60 * 1000;

export function useAllPriceHistories(limit = 10, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.priceHist.all(limit),
    queryFn: () => getAllPriceHistories(limit),
    staleTime: THREE_MIN,
    enabled: options?.enabled ?? true,
  });
}
