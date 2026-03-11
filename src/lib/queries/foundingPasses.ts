'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserFoundingPasses, getHighestPass } from '@/lib/services/foundingPasses';

const FIVE_MIN = 5 * 60 * 1000;

/** Fetch all founding passes for a user */
export function useUserFoundingPasses(userId: string | undefined) {
  return useQuery({
    queryKey: qk.foundingPasses.list(userId!),
    queryFn: () => getUserFoundingPasses(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}

/** Fetch the highest-tier founding pass for a user */
export function useHighestPass(userId: string | undefined) {
  return useQuery({
    queryKey: qk.foundingPasses.highest(userId!),
    queryFn: () => getHighestPass(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}
