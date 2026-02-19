'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getDpcMastery, getUserMasteryAll } from '@/lib/services/mastery';

const FIVE_MIN = 5 * 60 * 1000;

/** Fetch DPC Mastery for a specific user + player */
export function useDpcMastery(userId: string | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: qk.mastery.byUserPlayer(userId!, playerId!),
    queryFn: () => getDpcMastery(userId!, playerId!),
    enabled: !!userId && !!playerId,
    staleTime: FIVE_MIN,
  });
}

/** Fetch all (non-frozen) mastery entries for a user */
export function useUserMasteryAll(userId: string | undefined) {
  return useQuery({
    queryKey: qk.mastery.byUser(userId!),
    queryFn: () => getUserMasteryAll(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}
