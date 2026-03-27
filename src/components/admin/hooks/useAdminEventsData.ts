import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllEventsAdmin,
  getEventAdminStats,
  ALLOWED_TRANSITIONS,
} from '@/lib/services/events';
import { getAllClubs } from '@/lib/services/club';
import type { AdminEvent, SortField } from './types';
import type { DbClub } from '@/types';

// =============================================================================
// Filter state shape
// =============================================================================

export type AdminEventsFilters = {
  status: string[];
  type: string[];
  clubId: string;
  gameweek: number | null;
  search: string;
};

const INITIAL_FILTERS: AdminEventsFilters = {
  status: [],
  type: [],
  clubId: '',
  gameweek: null,
  search: '',
};

// =============================================================================
// Stats shape
// =============================================================================

export type AdminEventsStats = {
  activeCount: number;
  totalParticipants: number;
  totalPool: number;
};

// =============================================================================
// Hook return type
// =============================================================================

export type UseAdminEventsDataReturn = {
  // Data
  events: AdminEvent[];
  sortedEvents: AdminEvent[];
  clubs: DbClub[];
  stats: AdminEventsStats | null;
  loading: boolean;
  error: boolean;

  // Filters
  filters: AdminEventsFilters;
  setFilters: React.Dispatch<React.SetStateAction<AdminEventsFilters>>;

  // Sort
  sortField: SortField;
  sortAsc: boolean;
  toggleSort: (field: SortField) => void;

  // Selection
  selected: Set<string>;
  bulkStatus: string;
  setBulkStatus: React.Dispatch<React.SetStateAction<string>>;
  availableBulkTransitions: string[];
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  // Actions
  fetchEvents: () => Promise<void>;
  refreshAll: () => Promise<void>;
};

// =============================================================================
// useAdminEventsData — data, filters, sort, selection for Platform admin
// =============================================================================

export function useAdminEventsData(): UseAdminEventsDataReturn {
  // -- Data state --------------------------------------------------------------
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [clubs, setClubs] = useState<DbClub[]>([]);
  const [stats, setStats] = useState<AdminEventsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // -- Filter state ------------------------------------------------------------
  const [filters, setFilters] = useState<AdminEventsFilters>(INITIAL_FILTERS);

  // -- Sort state --------------------------------------------------------------
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // -- Selection state ---------------------------------------------------------
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  // -- filtersReady guard (skip initial render) --------------------------------
  const [filtersReady, setFiltersReady] = useState(false);

  // -- Data loading ------------------------------------------------------------
  const fetchEvents = useCallback(async () => {
    try {
      const data = await getAllEventsAdmin({
        status: filters.status.length > 0 ? filters.status : undefined,
        type: filters.type.length > 0 ? filters.type : undefined,
        clubId: filters.clubId || undefined,
        gameweek: filters.gameweek ?? undefined,
        search: filters.search || undefined,
      });
      setEvents(data as AdminEvent[]);
      setError(false);
    } catch (err) {
      console.error('[useAdminEventsData] fetchEvents error:', err);
      setError(true);
    }
  }, [filters]);

  const refreshAll = useCallback(async () => {
    try {
      const [eventsData, statsData] = await Promise.all([
        getAllEventsAdmin({
          status: filters.status.length > 0 ? filters.status : undefined,
          type: filters.type.length > 0 ? filters.type : undefined,
          clubId: filters.clubId || undefined,
          gameweek: filters.gameweek ?? undefined,
          search: filters.search || undefined,
        }),
        getEventAdminStats(),
      ]);
      setEvents(eventsData as AdminEvent[]);
      setStats(statsData);
      setError(false);
    } catch (err) {
      console.error('[useAdminEventsData] refreshAll error:', err);
      setError(true);
    }
  }, [filters]);

  // -- Initial load ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [eventsData, clubsData, statsData] = await Promise.all([
          getAllEventsAdmin(),
          getAllClubs(),
          getEventAdminStats(),
        ]);
        if (!cancelled) {
          setEvents(eventsData as AdminEvent[]);
          setClubs(clubsData);
          setStats(statsData);
          setError(false);
        }
      } catch (err) {
        console.error('[useAdminEventsData] initial load error:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // -- Filter-driven refetch (skip initial render) -----------------------------
  useEffect(() => {
    if (!filtersReady) {
      setFiltersReady(true);
      return;
    }
    fetchEvents();
  }, [filters, fetchEvents, filtersReady]);

  // -- Sorting -----------------------------------------------------------------
  const sortedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'current_entries') {
        cmp = (a.current_entries ?? 0) - (b.current_entries ?? 0);
      } else if (sortField === 'prize_pool') {
        cmp = (a.prize_pool ?? 0) - (b.prize_pool ?? 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [events, sortField, sortAsc]);

  // -- Bulk transitions (union of ALLOWED_TRANSITIONS for selected events) -----
  const availableBulkTransitions = useMemo(() => {
    if (selected.size === 0) return [];
    const selectedEvents = events.filter(e => selected.has(e.id));
    if (selectedEvents.length === 0) return [];

    // Intersect transitions: only statuses ALL selected events can transition to
    let common: Set<string> | null = null;
    for (const ev of selectedEvents) {
      const transitions = new Set(ALLOWED_TRANSITIONS[ev.status] ?? []);
      if (common === null) {
        common = transitions;
      } else {
        // Intersect
        const next = new Set<string>();
        Array.from(common).forEach(t => {
          if (transitions.has(t)) next.add(t);
        });
        common = next;
      }
    }
    return Array.from(common ?? []);
  }, [events, selected]);

  // -- Selection helpers -------------------------------------------------------
  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setBulkStatus('');
  }, []);

  // -- Sort toggle -------------------------------------------------------------
  const toggleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortAsc(a => !a);
        return prev;
      }
      setSortAsc(false);
      return field;
    });
  }, []);

  return {
    // Data
    events,
    sortedEvents,
    clubs,
    stats,
    loading,
    error,

    // Filters
    filters,
    setFilters,

    // Sort
    sortField,
    sortAsc,
    toggleSort,

    // Selection
    selected,
    bulkStatus,
    setBulkStatus,
    availableBulkTransitions,
    toggleSelect,
    clearSelection,

    // Actions
    fetchEvents,
    refreshAll,
  };
}
