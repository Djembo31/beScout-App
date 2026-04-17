'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllOpenSellOrders, getAllOpenBuyOrders } from '@/lib/services/trading';
import type { PublicOrder } from '@/types';

/**
 * All open sell orders — shared across Market + Home.
 * staleTime 30s caps the floor-price drift window for cross-user trades
 * (B-01, Slice 008): if another user buys the cheapest sell-order, this
 * client re-fetches within 30s instead of 2min. Post-mutation invalidation
 * via `qk.orders.all` keeps self-actions instant (see `invalidation.ts`).
 *
 * Slice 053 (B-01 follow-up): refetchInterval 30s fuer aktives Polling
 * solange Tab fokussiert ist. `refetchIntervalInBackground=false` default
 * spart Requests bei Background-Tabs. Gibt near-live Orderbook ohne
 * Supabase-Realtime-Komplexitaet.
 */
export function useAllOpenOrders() {
  return useQuery({
    queryKey: qk.orders.all,
    queryFn: async (): Promise<PublicOrder[]> => {
      const { orders } = await getAllOpenSellOrders();
      return orders;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/** All open buy orders — for Kaufgesuche section. Same 30s floor-drift cap + active polling. */
export function useAllOpenBuyOrders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.orders.buy,
    queryFn: () => getAllOpenBuyOrders(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: options?.enabled ?? true,
  });
}
