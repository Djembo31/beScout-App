'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { getClubsWithStats } from '@/lib/services/club';
import type { DbClub } from '@/types';

export type ClubWithStats = DbClub & { follower_count: number; player_count: number };

/**
 * Slice 500 (W4) — Discovery-Liste als React-Query statt page-lokalem useState/useEffect.
 * Cacht die Vereins-Liste (kein Re-Fetch pro Mount), teilt sie über Konsumenten und
 * ermöglicht Server-Reconciliation der `follower_count` nach Follow-Toggle
 * (`useToggleFollowClub.onSettled` invalidiert `qk.clubs.withStats`).
 * staleTime 2min: Vereine sind semi-statisch, die eingebettete follower_count driftet
 * durch fremde Follows — die eigene Aktion reconciled sofort via Invalidation.
 */
const TWO_MIN = 2 * 60 * 1000;

export function useClubsWithStats(opts?: { activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? false;
  return useQuery<ClubWithStats[]>({
    queryKey: qk.clubs.withStats(activeOnly),
    queryFn: () => getClubsWithStats({ activeOnly }),
    staleTime: TWO_MIN,
  });
}
