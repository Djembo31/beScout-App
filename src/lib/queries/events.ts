'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getEvents, getUserJoinedEventIds } from '@/lib/services/events';
import { getPlayerEventUsage } from '@/lib/services/lineups';
import { getActiveGameweek, isClubAdmin } from '@/lib/services/club';

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
    staleTime: FIVE_MIN,
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
