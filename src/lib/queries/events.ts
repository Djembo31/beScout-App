'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getEvents, getUserJoinedEventIds } from '@/lib/services/events';
import { getPlayerEventUsage } from '@/lib/services/lineups';
import { getActiveGameweek, getLeagueActiveGameweek, isClubAdmin } from '@/lib/services/club';

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

export function useEvents() {
  return useQuery({
    queryKey: qk.events.all,
    queryFn: getEvents,
    staleTime: ONE_MIN,
  });
}

export function useJoinedEventIds(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.joinedIds(userId!),
    queryFn: () => getUserJoinedEventIds(userId!),
    enabled: !!userId,
    staleTime: ONE_MIN,
  });
}

export function usePlayerEventUsage(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.usage(userId!),
    queryFn: () => getPlayerEventUsage(userId!),
    enabled: !!userId,
    staleTime: ONE_MIN,
  });
}

export function useActiveGameweek(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.events.activeGw(clubId!),
    queryFn: () => getActiveGameweek(clubId!),
    enabled: !!clubId,
    staleTime: 0,                  // Always refetch on mount — critical navigation data
    gcTime: 60_000,                // Keep 1min for back-nav, but not long enough to go stale
    placeholderData: undefined,    // Never show stale cached GW — wait for fresh data
    refetchOnMount: 'always',      // Even if query exists in cache, refetch
  });
}

/** League-wide active gameweek — no club dependency, works for ALL users */
export function useLeagueActiveGameweek() {
  return useQuery({
    queryKey: qk.events.leagueGw,
    queryFn: getLeagueActiveGameweek,
    staleTime: 0,
    gcTime: 60_000,
    placeholderData: undefined,
    refetchOnMount: 'always',
  });
}

export function useIsClubAdmin(userId: string | undefined, clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubAdmin.check(userId!, clubId!),
    queryFn: () => isClubAdmin(userId!, clubId!),
    enabled: !!userId && !!clubId,
    staleTime: FIVE_MIN,
  });
}
