'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getMysteryBoxHistory, countFreeMysteryBoxesToday } from '@/lib/services/mysteryBox';

const THIRTY_SEC = 30 * 1000;

/** Fetch mystery box opening history */
export function useMysteryBoxHistory(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: qk.mysteryBox.history(userId!, limit),
    queryFn: () => getMysteryBoxHistory(userId!, limit),
    enabled: !!userId,
    staleTime: THIRTY_SEC,
  });
}

/**
 * Server-authoritative daily free-box gate.
 * Returns true if the user has not yet opened a free mystery box today (UTC).
 * Replaces the old localStorage-based check — surviving cache clears and device switches.
 */
export function useHasFreeBoxToday(userId: string | undefined) {
  const query = useQuery({
    queryKey: userId
      ? qk.mysteryBox.freeBoxToday(userId)
      : ['mystery-box', 'free-today', 'anon'],
    queryFn: () => countFreeMysteryBoxesToday(userId!),
    enabled: !!userId,
    staleTime: THIRTY_SEC,
  });
  return {
    hasFreeBoxToday: (query.data ?? 0) < 1,
    isLoading: query.isLoading,
  };
}
