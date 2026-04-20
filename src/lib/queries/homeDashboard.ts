'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { queryClient } from '@/lib/queryClient';
import { getHomeDashboard, type HomeDashboard } from '@/lib/services/homeDashboard';

const THIRTY_SEC = 30 * 1000;

/**
 * Slice 109: Single-roundtrip /home dashboard query.
 *
 * Fetches holdings + user_stats + tickets + highest_pass via the
 * `get_home_dashboard_v1` RPC (SECURITY DEFINER, AR-44 guarded) and primes
 * the individual query caches so TopBar / SideNav / other widgets reading
 * the underlying keys stay warm without firing their own requests.
 *
 * staleTime 30s = min of source staleTimes (holdings/tickets); shorter than
 * user_stats (2min) and highest_pass (5min) but safer — individual hooks on
 * other pages continue to use their own staleTimes via primed cache.
 */
export function useHomeDashboard(userId: string | undefined) {
  return useQuery<HomeDashboard>({
    queryKey: userId ? qk.homeDashboard.byUser(userId) : ['home-dashboard', 'anon'],
    queryFn: async () => {
      const dash = await getHomeDashboard();
      if (userId) primeHomeDashboardCaches(userId, dash);
      return dash;
    },
    enabled: !!userId,
    staleTime: THIRTY_SEC,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Prime the 4 underlying query caches with data from a HomeDashboard payload
 * so that components using useHoldings / useUserStats / useUserTickets /
 * useHighestPass on the same page (e.g. TopBar, SideNav) hit the warm cache.
 */
export function primeHomeDashboardCaches(userId: string, dash: HomeDashboard): void {
  queryClient.setQueryData(qk.holdings.byUser(userId), dash.holdings);
  queryClient.setQueryData(qk.userStats.byUser(userId), dash.user_stats);
  queryClient.setQueryData(qk.tickets.balance(userId), dash.tickets);
  queryClient.setQueryData(qk.foundingPasses.highest(userId), dash.highest_pass);
}
