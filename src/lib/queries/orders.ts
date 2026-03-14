'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllOpenSellOrders } from '@/lib/services/trading';
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

/** Whether the order list was truncated (for UI hint) */
export function useOrdersCapped() {
  return useQuery({
    queryKey: [...qk.orders.all, 'capped'],
    queryFn: async () => {
      const { capped } = await getAllOpenSellOrders();
      return capped;
    },
    staleTime: 5 * 60_000,
  });
}
