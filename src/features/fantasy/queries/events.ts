'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getEvents, getUserJoinedEventIds, getUserEnteredEventIds, getEventEntry, getScoutEventsEnabled } from '@/features/fantasy/services/events.queries';
import { getPlayerEventUsage } from '@/features/fantasy/services/lineups.queries';
import { getUserHoldingLocks } from '@/lib/services/wallet';
import { getWildcardBalance } from '@/features/fantasy/services/wildcards';
import { getActiveGameweek, getLeagueActiveGameweek, isClubAdmin } from '@/lib/services/club';
import type { DbEventEntry } from '@/types';

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const THIRTY_SEC = 30 * 1000;

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

/** Holding locks for SC blocking — returns Map<playerId, totalLocked> */
export function useHoldingLocks(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.holdingLocks(userId!),
    queryFn: async () => {
      const locks = await getUserHoldingLocks(userId!);
      const map = new Map<string, number>();
      for (const lock of locks) {
        map.set(lock.player_id, (map.get(lock.player_id) ?? 0) + lock.quantity_locked);
      }
      return map;
    },
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

/** Wild card balance for lineup builder */
export function useWildcardBalance(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.wildcardBalance(userId!),
    queryFn: () => getWildcardBalance(userId!),
    enabled: !!userId,
    staleTime: ONE_MIN,
  });
}

export function useActiveGameweek(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.events.activeGw(clubId!),
    queryFn: () => getActiveGameweek(clubId!),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
    gcTime: 10 * 60 * 1000,
  });
}

/** League-wide active gameweek — no club dependency, works for ALL users */
export function useLeagueActiveGameweek() {
  return useQuery({
    queryKey: qk.events.leagueGw,
    queryFn: getLeagueActiveGameweek,
    staleTime: FIVE_MIN,
    gcTime: 10 * 60 * 1000,
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

/** Check if user has entered (paid for) an event */
export function useEventEntry(eventId: string | undefined, userId: string | undefined) {
  return useQuery<DbEventEntry | null>({
    queryKey: qk.events.entry(eventId!, userId!),
    queryFn: () => getEventEntry(eventId!, userId!),
    enabled: !!eventId && !!userId,
    staleTime: THIRTY_SEC,
  });
}

/** Get all entered event IDs for a user */
export function useEnteredEventIds(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.enteredIds(userId!),
    queryFn: () => getUserEnteredEventIds(userId!),
    enabled: !!userId,
    staleTime: ONE_MIN,
  });
}

/** Check if $SCOUT events are enabled (platform setting) — returns boolean directly */
export function useScoutEventsEnabled(): boolean {
  const { data } = useQuery({
    queryKey: qk.platformSettings.scoutEvents,
    queryFn: getScoutEventsEnabled,
    staleTime: FIVE_MIN,
  });
  return data ?? false;
}
