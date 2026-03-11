'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getFanRanking, getClubFanLeaderboard } from '@/lib/services/fanRanking';

const FIVE_MIN = 5 * 60 * 1000;

/** Fetch a user's fan ranking for a specific club */
export function useFanRanking(userId: string | undefined, clubId: string | undefined) {
  return useQuery({
    queryKey: qk.fanRanking.user(userId!, clubId!),
    queryFn: () => getFanRanking(userId!, clubId!),
    enabled: !!userId && !!clubId,
    staleTime: FIVE_MIN,
  });
}

/** Fetch club fan leaderboard */
export function useClubFanLeaderboard(clubId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: qk.fanRanking.leaderboard(clubId!, limit),
    queryFn: () => getClubFanLeaderboard(clubId!, limit),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}
