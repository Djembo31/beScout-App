'use client';

import { useMemo } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { useHoldings } from '@/lib/queries/holdings';
import { usePlayerEventUsage, useHoldingLocks } from '../queries/events';
import { dbHoldingToUserDpcHolding } from '../mappers/holdingMapper';
import type { UserDpcHolding } from '../types';

/**
 * Holdings enriched with event usage, locked SC count, and available SC.
 * Source: FantasyContent.tsx lines 182, 200-211
 */
export function useFantasyHoldings(): { holdings: UserDpcHolding[] } {
  const { user } = useUser();
  const userId = user?.id;

  const { data: dbHoldings = [] } = useHoldings(userId);
  const { data: usageMap } = usePlayerEventUsage(userId);
  const { data: lockedScMap } = useHoldingLocks(userId);

  const holdings = useMemo(() => {
    return dbHoldings.map(h => {
      const holding = dbHoldingToUserDpcHolding(h);
      const eventIds = usageMap?.get(holding.id) || [];
      holding.activeEventIds = eventIds;
      holding.eventsUsing = eventIds.length;
      // Use actual locked SC quantity from holding_locks (not just event count)
      const totalLocked = lockedScMap?.get(holding.id) ?? 0;
      holding.dpcAvailable = Math.max(0, holding.dpcOwned - totalLocked);
      holding.isLocked = holding.dpcAvailable <= 0;
      return holding;
    });
  }, [dbHoldings, usageMap, lockedScMap]);

  return { holdings };
}
