'use client';

import { useMemo } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { useEvents, useJoinedEventIds } from '@/features/fantasy/queries/events';
import { dbEventToFantasyEvent } from '@/features/fantasy/mappers/eventMapper';
import type { FantasyEvent } from '@/features/fantasy/types';

// Re-export the pure helper so callers can import everything from this file.
export { pickDefaultEvent } from './eventHelpers';

/**
 * All "open" events the manager can join right now — registering, late-reg, running.
 * Excludes ended events. Sorted by start time ascending.
 *
 * Used by Manager Aufstellen-Tab EventSelector.
 */
export function useOpenEvents() {
  const { user } = useUser();
  const userId = user?.id;
  const { data: dbEvents = [], isLoading, isError } = useEvents();
  const { data: joinedIdsArr = [] } = useJoinedEventIds(userId);

  const joinedSet = useMemo(() => new Set(joinedIdsArr), [joinedIdsArr]);

  const events = useMemo<FantasyEvent[]>(() => {
    const mapped = dbEvents.map((e) => dbEventToFantasyEvent(e, joinedSet, null));
    return mapped
      .filter((e) => e.status !== 'ended')
      .sort((a, b) => a.startTime - b.startTime);
  }, [dbEvents, joinedSet]);

  return { events, isLoading, isError };
}
