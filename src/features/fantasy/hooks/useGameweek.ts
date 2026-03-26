'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLeagueActiveGameweek } from '../queries/events';
import { getGameweekStatuses } from '../services/fixtures';
import { useFantasyStore } from '../store/fantasyStore';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import type { FantasyEvent } from '../types';

/**
 * Manages gameweek selection, sync with league active GW,
 * Safari bfcache recovery, and GW status derivation.
 */
export function useGameweek(gwEvents: FantasyEvent[] = []) {
  const { selectedGameweek, setSelectedGameweek, setCurrentGw } = useFantasyStore();
  const { data: activeGw, isLoading: activeGwLoading } = useLeagueActiveGameweek();

  // Sync selectedGameweek with league activeGw on first load
  useEffect(() => {
    if (activeGw && activeGw > 0 && selectedGameweek === null) {
      setSelectedGameweek(activeGw);
    }
  }, [activeGw, selectedGameweek, setSelectedGameweek]);

  // Safari bfcache: page is restored from memory with stale JS state
  // -> reset selectedGameweek and refetch activeGw to get fresh data
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setSelectedGameweek(null);
        queryClient.invalidateQueries({ queryKey: qk.events.leagueGw });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [setSelectedGameweek]);

  const currentGw = selectedGameweek ?? activeGw ?? 1;

  // Keep store in sync
  useEffect(() => {
    setCurrentGw(currentGw);
  }, [currentGw, setCurrentGw]);

  // GW fixture completion — lightweight check (independent of events)
  const { data: gwFixtureInfo = { complete: false, count: 0 } } = useQuery({
    queryKey: ['fantasy', 'gwFixtureInfo', currentGw],
    queryFn: async () => {
      const statuses = await getGameweekStatuses(currentGw, currentGw);
      const s = statuses.find(st => st.gameweek === currentGw);
      return { complete: s?.is_complete ?? false, count: s?.total ?? 0 };
    },
    staleTime: 30_000,
    enabled: !!currentGw,
  });

  // GW status for selector — considers BOTH fixtures AND events
  const gwStatus = useMemo((): 'open' | 'simulated' | 'empty' => {
    // All fixtures finished -> GW is done (regardless of events)
    if (gwFixtureInfo.complete) return 'simulated';
    // Events exist and all ended -> done
    if (gwEvents.length > 0) {
      const allEnded = gwEvents.every(e => e.status === 'ended' || e.scoredAt);
      if (allEnded) return 'simulated';
    }
    // No fixtures and no events -> empty
    if (gwEvents.length === 0) return 'empty';
    return 'open';
  }, [gwEvents, gwFixtureInfo.complete]);

  const fixtureCount = gwFixtureInfo.count;

  return {
    currentGw,
    activeGw,
    gwStatus,
    fixtureCount,
    isLoading: activeGwLoading,
    setSelectedGameweek,
  };
}
