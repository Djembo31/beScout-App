'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getEvents, getUserJoinedEventIds } from '@/lib/services/events';
import { getPlayerEventUsage } from '@/lib/services/lineups';
import { getActiveGameweek, getLeagueActiveGameweek, isClubAdmin } from '@/lib/services/club';
import { supabase } from '@/lib/supabaseClient';

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

/** Check if $SCOUT events are enabled via platform_settings */
export function useScoutEventsEnabled(): boolean {
  const { data } = useQuery({
    queryKey: qk.platformSettings.scoutEvents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'scout_events_enabled')
        .maybeSingle();
      if (error) {
        console.error('[useScoutEventsEnabled] Failed to fetch setting:', error);
        return false;
      }
      return data?.value === true || data?.value === 'true';
    },
    staleTime: FIVE_MIN,
  });
  return data ?? false;
}
