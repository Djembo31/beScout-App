'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getMysteryBoxHistory,
  countFreeMysteryBoxesToday,
  getDropRates,
} from '@/lib/services/mysteryBox';

const THIRTY_SEC = 30 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

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
 * Fetch Mystery Box drop rates from the DB-side config (AR-48).
 * RPC is authenticated-only — returns `{rates: [{rarity, drop_weight, drop_percent}], total_weight}`.
 * staleTime 5 Min: drop-rates aendern sich selten, aber Admin kann via RPC anpassen.
 */
export function useMysteryBoxDropRates() {
  return useQuery({
    queryKey: qk.mysteryBox.dropRates,
    queryFn: getDropRates,
    staleTime: FIVE_MIN,
  });
}

/**
 * Server-authoritative daily free-box gate.
 * Returns true if the user has not yet opened a free mystery box today (UTC).
 * Replaces the old localStorage-based check — surviving cache clears and device switches.
 *
 * NOTE: `staleTime: 0` is EXPLICIT per J5F-05 — the daily free-box cap must be
 * re-fetched synchronously after every open() call to close the race window
 * where a stale cached `count=0` allows a second free-open before invalidate
 * propagates. This is an approved exception to the `staleTime: 0 is VERBOTEN`
 * rule in `.claude/rules/performance.md` because the server RPC is the real
 * cap-gate; the query only governs the UI gate.
 */
export function useHasFreeBoxToday(userId: string | undefined) {
  const query = useQuery({
    queryKey: userId
      ? qk.mysteryBox.freeBoxToday(userId)
      : ['mystery-box', 'free-today', 'anon'],
    queryFn: () => countFreeMysteryBoxesToday(userId!),
    enabled: !!userId,
    // staleTime:0 EXPLICIT per J5F-05 — daily_free_limit_reached race. See JSDoc above.
    staleTime: 0,
  });
  return {
    hasFreeBoxToday: (query.data ?? 0) < 1,
    isLoading: query.isLoading,
  };
}
