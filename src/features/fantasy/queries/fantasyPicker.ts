'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getBatchFormScores } from '@/features/fantasy/services/scoring.queries';
import { getNextFixturesByClub } from '@/features/fantasy/services/fixtures';

const FIVE_MIN = 5 * 60 * 1000;

export function useBatchFormScores(playerIds: string[], enabled = true) {
  return useQuery({
    queryKey: [qk.scoring.batchForm, playerIds.length],
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
