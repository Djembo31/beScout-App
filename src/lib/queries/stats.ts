'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserStats } from '@/lib/services/social';

const TWO_MIN = 2 * 60 * 1000;

export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: qk.userStats.byUser(userId!),
    queryFn: () => getUserStats(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}
