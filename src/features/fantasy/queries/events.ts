'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getEvents, getUserJoinedEventIds, getUserEnteredEventIds, getEventEntry, getScoutEventsEnabled, getEventDifficultyScore } from '@/features/fantasy/services/events.queries';
import { getPlayerEventUsage } from '@/features/fantasy/services/lineups.queries';
import { getUserHoldingLocks } from '@/lib/services/wallet';
import { getWildcardBalance } from '@/features/fantasy/services/wildcards';
import { getLeagueActiveGameweek, getLeagueMaxGameweeks, isClubAdmin } from '@/lib/services/club';
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

/**
 * Holding locks for SC blocking — returns Map<playerId, totalLocked>.
 * Slice 121: implementation extracted to `./holdingLocks.ts` so market-bundle
 * consumers can import the hook without pulling in this events barrel.
 * Re-exported here for backwards compatibility with existing consumers.
 */
export { useHoldingLocks } from './holdingLocks';

/**
 * Wild card balance for lineup builder — per league.
 * Slice 251 Wave 2 Track F: requires leagueId for Composite-PK lookup.
 * enabled: !!userId && !!leagueId — query disabled when either missing.
 */
export function useWildcardBalance(userId: string | undefined, leagueId: string | undefined) {
  return useQuery({
    queryKey: qk.events.wildcardBalance(userId!, leagueId!),
    queryFn: () => getWildcardBalance(userId!, leagueId!),
    enabled: !!userId && !!leagueId,
    staleTime: ONE_MIN,
  });
}

/** League-wide active gameweek — Slice 251 Wave 1: per-league via leagues.active_gameweek.
 *  Reads SSOT from leagues table (rewrite from clubs MIN-aggregation). */
export function useLeagueActiveGameweek(leagueId: string | null) {
  return useQuery({
    queryKey: qk.events.leagueGw(leagueId),
    queryFn: () => getLeagueActiveGameweek(leagueId),
    enabled: !!leagueId,
    staleTime: FIVE_MIN,
    gcTime: 10 * 60 * 1000,
  });
}

/** Slice 251 Wave 1: max gameweeks per league. Replaces hardcoded `<= 38`. */
export function useLeagueMaxGameweeks(leagueId: string | null) {
  return useQuery({
    queryKey: qk.events.leagueMaxGw(leagueId),
    queryFn: () => getLeagueMaxGameweeks(leagueId),
    enabled: !!leagueId,
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

/**
 * Slice 199 fm 2.4 — Event-Difficulty-Score (avg IPO + clubs).
 * Public-safe; cached lange (Aggregate change selten).
 */
export function useEventDifficultyScore(eventId: string | undefined) {
  return useQuery({
    queryKey: qk.events.difficulty(eventId!),
    queryFn: () => getEventDifficultyScore(eventId!),
    enabled: !!eventId,
    staleTime: FIVE_MIN,
  });
}
