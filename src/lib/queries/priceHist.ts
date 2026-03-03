'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllPriceHistories } from '@/lib/services/trading';

const THREE_MIN = 3 * 60 * 1000;

export function useAllPriceHistories(limit = 10) {
  return useQuery({
    queryKey: qk.priceHist.all(limit),
    queryFn: () => getAllPriceHistories(limit),
    staleTime: THREE_MIN,
  });
}
