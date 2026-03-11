'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getMysteryBoxHistory } from '@/lib/services/mysteryBox';

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
