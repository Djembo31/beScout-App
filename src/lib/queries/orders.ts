'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllOpenSellOrders, getAllOpenBuyOrders } from '@/lib/services/trading';

/** All open sell orders — shared across Market + Home */
export function useAllOpenOrders() {
  return useQuery({
    queryKey: qk.orders.all,
    queryFn: getAllOpenSellOrders,
    staleTime: 2 * 60_000,
  });
}

/** All open buy orders — for Kaufgesuche section */
export function useAllOpenBuyOrders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.orders.buy,
    queryFn: () => getAllOpenBuyOrders(),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}
