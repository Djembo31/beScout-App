import { useState, useEffect, useCallback } from 'react';
import { getEventsByClubId } from '@/lib/services/events';
import { getGameweekStatuses } from '@/lib/services/fixtures';
import type { DbEvent, GameweekStatus } from '@/types';

// =============================================================================
// Hook return type
// =============================================================================

export type UseClubEventsDataReturn = {
  // Data
  events: DbEvent[];
  loading: boolean;
  activeEvents: DbEvent[];
  pastEvents: DbEvent[];

  // GW simulation state
  simGw: number;
  setSimGw: React.Dispatch<React.SetStateAction<number>>;
  gwStatuses: GameweekStatus[];

  // Actions
  refreshEvents: () => Promise<void>;
  refreshGwStatuses: () => Promise<void>;
};

// =============================================================================
// useClubEventsData — data loading for Club admin events tab
// =============================================================================

export function useClubEventsData(clubId: string): UseClubEventsDataReturn {
  // -- Data state --------------------------------------------------------------
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // -- GW simulation state -----------------------------------------------------
  const [simGw, setSimGw] = useState(1);
  const [gwStatuses, setGwStatuses] = useState<GameweekStatus[]>([]);

  // -- Initial load ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [data, statuses] = await Promise.all([
          getEventsByClubId(clubId),
          getGameweekStatuses(1, 38),
        ]);
        if (!cancelled) {
          setEvents(data);
          setGwStatuses(statuses);
          // Auto-select next unsimulated GW
          const nextUnsim = statuses.find(s => !s.is_complete);
          if (nextUnsim) setSimGw(nextUnsim.gameweek);
        }
      } catch (err) {
        console.error('[useClubEventsData] Failed to load events:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clubId]);

  // -- Derived: active/past events (simple filters, no useMemo needed) ---------
  // Note: DB can return 'cancelled' even though DbEvent.status type omits it
  const TERMINAL_STATUSES: string[] = ['ended', 'cancelled'];
  const activeEvents = events.filter(
    e => !TERMINAL_STATUSES.includes(e.status)
  );
  const pastEvents = events.filter(
    e => TERMINAL_STATUSES.includes(e.status)
  );

  // -- Refresh helpers ---------------------------------------------------------
  const refreshEvents = useCallback(async () => {
    try {
      const data = await getEventsByClubId(clubId);
      setEvents(data);
    } catch (err) {
      console.error('[useClubEventsData] refreshEvents error:', err);
    }
  }, [clubId]);

  const refreshGwStatuses = useCallback(async () => {
    try {
      const statuses = await getGameweekStatuses(1, 38);
      setGwStatuses(statuses);
      // Auto-advance to next unsimulated GW
      const nextUnsim = statuses.find(s => !s.is_complete);
      if (nextUnsim) setSimGw(nextUnsim.gameweek);
    } catch (err) {
      console.error('[useClubEventsData] refreshGwStatuses error:', err);
    }
  }, []);

  return {
    // Data
    events,
    loading,
    activeEvents,
    pastEvents,

    // GW simulation state
    simGw,
    setSimGw,
    gwStatuses,

    // Actions
    refreshEvents,
    refreshGwStatuses,
  };
}
