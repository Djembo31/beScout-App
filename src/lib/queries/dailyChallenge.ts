'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getTodaysChallenge, getUserChallengeHistory } from '@/lib/services/dailyChallenge';

const FIVE_MIN = 5 * 60 * 1000;
const THIRTY_SEC = 30 * 1000;

/** Fetch today's daily challenge */
export function useTodaysChallenge(active = true) {
  return useQuery({
    queryKey: qk.dailyChallenge.today(),
    queryFn: () => getTodaysChallenge(),
    staleTime: FIVE_MIN,
    enabled: active,
  });
}

/** Fetch user's challenge answer history */
export function useChallengeHistory(userId: string | undefined, active = true, limit = 20) {
  return useQuery({
    queryKey: qk.dailyChallenge.history(userId!, limit),
    queryFn: () => getUserChallengeHistory(userId!, limit),
    enabled: !!userId && active,
    staleTime: THIRTY_SEC,
  });
}
