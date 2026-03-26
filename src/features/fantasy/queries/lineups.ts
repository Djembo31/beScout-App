'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLineup } from '../services/lineups.queries';
import type { DbEvent } from '@/types';

/**
 * Replaces FantasyContent lines 149-164:
 * Load user lineups for scored events to get rank + points.
 */
export function useLineupScores(
  userId: string | undefined,
  dbEvents: DbEvent[],
  joinedSet: Set<string>,
) {
  const scoredJoinedIds = useMemo(() =>
    dbEvents.filter(e => e.scored_at && joinedSet.has(e.id)).map(e => e.id),
    [dbEvents, joinedSet]
  );

  return useQuery({
    queryKey: ['fantasy', 'lineupScores', userId, ...scoredJoinedIds],
    queryFn: async () => {
      const lineups = await Promise.all(scoredJoinedIds.map(eid => getLineup(eid, userId!)));
      const map = new Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>();
      scoredJoinedIds.forEach((eid, i) => {
        if (lineups[i]) map.set(eid, {
          total_score: lineups[i]!.total_score,
          rank: lineups[i]!.rank,
          reward_amount: lineups[i]!.reward_amount,
        });
      });
      return map;
    },
    enabled: !!userId && scoredJoinedIds.length > 0,
    staleTime: 5 * 60_000,
  });
}
