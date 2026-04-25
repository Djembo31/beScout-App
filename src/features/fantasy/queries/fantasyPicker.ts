'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getBatchFormScores,
  getEventCaptainDistribution,
  getEventPlayerPickRates,
} from '@/features/fantasy/services/scoring.queries';
import { getNextFixturesByClub } from '@/features/fantasy/services/fixtures';

const FIVE_MIN = 5 * 60 * 1000;
const ONE_MIN = 60 * 1000;

export function useBatchFormScores(playerIds: string[], enabled = true) {
  return useQuery({
    queryKey: [...qk.scoring.batchForm, playerIds.length],
    queryFn: () => getBatchFormScores(playerIds, 5),
    enabled: enabled && playerIds.length > 0,
    staleTime: FIVE_MIN,
  });
}

export function useNextFixtures(enabled = true) {
  return useQuery({
    queryKey: qk.fixtures.next,
    queryFn: getNextFixturesByClub,
    enabled,
    staleTime: FIVE_MIN,
  });
}

/**
 * Slice 195e — Captain-Pick-Rate fuer Event.
 * Anonymisierte Aggregation: [{player_id, count, pct}] sortiert count DESC.
 * staleTime 60s (refresh schnell vor Deadline).
 */
export function useEventCaptainDistribution(
  eventId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: qk.fantasy.captainDistribution(eventId),
    queryFn: () => getEventCaptainDistribution(eventId as string),
    enabled: !!eventId && enabled,
    staleTime: ONE_MIN,
    refetchOnWindowFocus: true,
  });
}

/**
 * Slice 195e — Player-Pick-Rates fuer Event (alle 12 starting-slots).
 * Anonymisierte Aggregation: [{player_id, count, pct}] sortiert count DESC.
 * Bench wird NICHT mitgezaehlt.
 * staleTime 60s.
 */
export function useEventPlayerPickRates(
  eventId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: qk.fantasy.pickRates(eventId),
    queryFn: () => getEventPlayerPickRates(eventId as string),
    enabled: !!eventId && enabled,
    staleTime: ONE_MIN,
    refetchOnWindowFocus: true,
  });
}
