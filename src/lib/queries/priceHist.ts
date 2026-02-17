'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllPriceHistories } from '@/lib/services/trading';

const ONE_MIN = 60 * 1000;

export function useAllPriceHistories(limit = 10) {
  return useQuery({
    queryKey: qk.priceHist.all(limit),
    queryFn: () => getAllPriceHistories(limit),
    staleTime: ONE_MIN,
  });
}
