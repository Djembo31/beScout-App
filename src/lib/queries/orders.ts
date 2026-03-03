'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllOpenSellOrders } from '@/lib/services/trading';

/** All open sell orders — shared across Market + Home */
export function useAllOpenOrders() {
  return useQuery({
    queryKey: qk.orders.all,
    queryFn: getAllOpenSellOrders,
    staleTime: 2 * 60_000,
  });
}
