'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getHoldings } from '@/lib/services/wallet';
import { useUser } from '@/components/providers/AuthProvider';

/**
 * User holdings — staleTime 30s (cache invalidation after trades handles freshness).
 * Previous staleTime: 0 caused refetch on every mount across Home/Market/Community.
 *
 * Slice 193 auth-race fix: gate `enabled` on `!profileLoading` so the query
 * does NOT fire while AuthProvider is still hydrating profile + role + admin
 * state. Without this gate, PostgREST nested-select `player:players(...)`
 * silently returned NULL for nested rows when JWT was not fully ready —
 * producing the Slice-192 ghost-row symptom Anil saw 2026-04-24.
 *
 * `userId` is the cached user-id from localStorage (set early; Slice 260
 * migrated from sessionStorage for cross-tab warm cache). The query waits
 * ~50-200ms longer until `profileLoading=false`, eliminating the race.
 */
export function useHoldings(userId: string | undefined) {
  const { profileLoading } = useUser();
  return useQuery({
    queryKey: qk.holdings.byUser(userId!),
    queryFn: () => getHoldings(userId!),
    enabled: !!userId && !profileLoading,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}
