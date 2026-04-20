'use client';

/**
 * Isolated hook for reading a user's Scout-Card holding locks
 * (i.e. quantity reserved for active fantasy event entries), returned as
 * a Map<playerId, totalLocked>.
 *
 * Lives in its own file so that `MarketContent` can import it without
 * pulling in the full `queries/events.ts` barrel, which also top-level
 * imports events.queries / lineups.queries / wildcards / club — none of
 * those are needed on the market bundle path.
 *
 * Slice 121: /market bundle hygiene.
 */

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserHoldingLocks } from '@/lib/services/wallet';

const TWO_MIN = 2 * 60 * 1000;

export function useHoldingLocks(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.holdingLocks(userId!),
    queryFn: async () => {
      const locks = await getUserHoldingLocks(userId!);
      const map = new Map<string, number>();
      for (const lock of locks) {
        map.set(lock.player_id, (map.get(lock.player_id) ?? 0) + lock.quantity_locked);
      }
      return map;
    },
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}
