'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getFixturesByClub, getNextFixturesForClub } from '@/lib/services/fixtures';

const FIVE_MIN = 5 * 60 * 1000;

/** All fixtures for a specific club (home or away), sorted by GW */
export function useClubFixtures(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.fixtures.byClub(clubId!),
    queryFn: () => getFixturesByClub(clubId!),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}

/**
 * Slice 197e — Next N scheduled fixtures for a single club (home or away).
 * Used by ClubFixturesStrip for 5-GW-Forward FDR display.
 */
export function useClubNextFixtures(clubId: string | undefined, count = 5) {
  return useQuery({
    queryKey: qk.fixtures.nextForClub(clubId!, count),
    queryFn: () => getNextFixturesForClub(clubId!, count),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}
