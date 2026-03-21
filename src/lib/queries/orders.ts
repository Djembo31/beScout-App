'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllOpenSellOrders, getAllOpenBuyOrders } from '@/lib/services/trading';
import type { DbOrder } from '@/types';

/** All open sell orders — shared across Market + Home */
export function useAllOpenOrders() {
  return useQuery({
    queryKey: qk.orders.all,
    queryFn: async (): Promise<DbOrder[]> => {
      const { orders } = await getAllOpenSellOrders();
      return orders;
    },
    staleTime: 2 * 60_000,
  });
}

/** Whether the order list was truncated (for UI hint) — derived from useAllOpenOrders to avoid double fetch */
export function useOrdersCapped() {
  const { data } = useAllOpenOrders();
  return data ? data.length >= 1000 : false;
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
