'use client';

import { useMemo } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { useEvents, useJoinedEventIds } from '../queries/events';
import { useLineupScores } from '../queries/lineups';
import { dbEventToFantasyEvent } from '../mappers/eventMapper';
import { useFantasyStore } from '../store/fantasyStore';
import type { FantasyEvent } from '../types';

/**
 * Derives FantasyEvent[] from DB events + joined IDs + lineup scores.
 * Single source of truth for all event data in the Fantasy page.
 */
export function useFantasyEvents(currentGw: number) {
  const { user } = useUser();
  const userId = user?.id;

  const { selectedEventId, interestedIds } = useFantasyStore();

  const { data: dbEvents = [], isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } = useEvents();
  const { data: joinedIdsArr = [] } = useJoinedEventIds(userId);

  const joinedSet = useMemo(() => new Set(joinedIdsArr), [joinedIdsArr]);

  // Load user lineups for scored events to get rank + points
  const { data: lineupMap = new Map() } = useLineupScores(userId, dbEvents, joinedSet);

  // Derive events from React Query data -- single source of truth, no local overrides
  const events = useMemo(() => {
    return dbEvents.map(e => {
      const fe = dbEventToFantasyEvent(e, joinedSet, lineupMap.get(e.id));
      if (interestedIds.has(e.id)) fe.isInterested = true;
      return fe;
    });
  }, [dbEvents, joinedSet, lineupMap, interestedIds]);

  // selectedEvent derived LIVE from events -- always reflects latest React Query data
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find(e => e.id === selectedEventId) ?? null;
  }, [selectedEventId, events]);

  // Derived data
  const activeEvents = useMemo(() => events.filter(e => e.isJoined && e.status === 'running'), [events]);

  // Events filtered by selected gameweek
  const gwEvents = useMemo(() => {
    return events.filter(e => e.gameweek === currentGw);
  }, [events, currentGw]);

  return {
    events,
    gwEvents,
    activeEvents,
    selectedEvent,
    joinedSet,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  };
}
