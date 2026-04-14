'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recordLoginStreak } from '@/lib/services/streaks';
import type { StreakResult } from '@/types';

const SIXTY_SEC = 60 * 1000;

/**
 * Source-of-truth login streak hook.
 *
 * Calls `record_login_streak` (idempotent — returns `already_today=true` after
 * the first call per UTC day). Replaces the legacy `getLoginStreak()` localStorage
 * helper, which produced `streak=0` for users entering /missions via deep-link
 * (notification, back-button, push) WITHOUT visiting /home first (J7F-01).
 *
 * The `localStorage` mirror in `src/components/home/helpers.tsx` is still
 * updated by the home page on initial load, but it must NEVER be the only
 * source for gamification values.
 */
export function useLoginStreak(userId: string | undefined) {
  const query = useQuery<StreakResult>({
    queryKey: ['streaks', 'login', userId],
    queryFn: () => recordLoginStreak(userId!),
    enabled: !!userId,
    staleTime: SIXTY_SEC,
    // Streak should not refetch aggressively — once per minute is plenty.
    refetchOnWindowFocus: false,
  });

  // Keep a stable streak number for downstream useMemo consumers — null/undefined
  // collapses to 0 only once data has loaded; before that we keep the previous
  // value to avoid layout flash from "0 days" to "30 days".
  const [streak, setStreak] = useState<number>(0);
  useEffect(() => {
    if (query.data?.streak != null) setStreak(query.data.streak);
  }, [query.data?.streak]);

  return {
    streak,
    isLoading: query.isLoading,
    data: query.data ?? null,
  };
}
