'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getFixturesByClub } from '@/lib/services/fixtures';

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
