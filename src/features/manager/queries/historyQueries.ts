'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { qk } from '@/lib/queries/keys';
import { getUserFantasyHistory, getLineup } from '@/features/fantasy/services/lineups.queries';

const ONE_MIN = 60_000;

/**
 * User's fantasy history — scored events with rank/reward.
 * Used by Manager Historie-Tab.
 */
export function useUserFantasyHistory(limit = 50) {
  const { user } = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: qk.fantasy.userHistory(userId),
    queryFn: () => getUserFantasyHistory(userId!, limit),
    enabled: !!userId,
    staleTime: ONE_MIN,
  });
}

/**
 * Lazy lineup snapshot — fetches the saved lineup row for a single event.
 * Used by HistoryEventCard expanded state. Immutable after scoring,
 * so cache lives forever (staleTime: Infinity).
 */
export function useLineupSnapshot(eventId: string, enabled: boolean) {
  const { user } = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: qk.fantasy.lineupSnapshot(eventId, userId),
    queryFn: () => getLineup(eventId, userId!),
    enabled: !!userId && enabled,
    staleTime: Infinity,
  });
}
