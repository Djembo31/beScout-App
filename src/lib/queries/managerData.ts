import { useQuery } from '@tanstack/react-query';
import { getRecentPlayerMinutes, getRecentPlayerScores, getNextFixturesByClub } from '@/lib/services/fixtures';
import { getPlayerEventUsage } from '@/lib/services/lineups';
import { qk } from './keys';

/** Recent minutes per player (last 5 completed GWs) */
export function useRecentMinutes() {
  return useQuery({
    queryKey: qk.fixtures.recentMinutes,
    queryFn: getRecentPlayerMinutes,
    staleTime: 5 * 60 * 1000,
  });
}

/** Recent GW scores per player (last 5 completed GWs) */
export function useRecentScores() {
  return useQuery({
    queryKey: qk.fixtures.recentScores,
    queryFn: getRecentPlayerScores,
    staleTime: 5 * 60 * 1000,
  });
}

/** Next scheduled fixture per club */
export function useNextFixtures() {
  return useQuery({
    queryKey: qk.fixtures.nextByClub,
    queryFn: getNextFixturesByClub,
    staleTime: 10 * 60 * 1000,
  });
}

/** Which players are committed to active events */
export function usePlayerEventUsage(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.usage(userId ?? ''),
    queryFn: () => getPlayerEventUsage(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
