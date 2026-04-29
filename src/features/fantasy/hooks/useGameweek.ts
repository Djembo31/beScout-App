'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLeagueActiveGameweek } from '../queries/events';
import { getGameweekStatuses } from '../services/fixtures';
import { useFantasyStore } from '../store/fantasyStore';
import { qk } from '@/lib/queries/keys';
import type { FantasyEvent } from '../types';

/**
 * Manages gameweek selection, sync with league active GW,
 * Safari bfcache recovery, and GW status derivation.
 *
 * Slice 251 Wave 1: leagueId is required to fetch the per-league active_gameweek.
 * Pass null when no league is in scope yet (hook stays disabled, currentGw falls back to selected ?? 1).
 */
export function useGameweek(gwEvents: FantasyEvent[] = [], leagueId: string | null = null) {
  const { selectedGameweek, setSelectedGameweek, setCurrentGw } = useFantasyStore();
  const queryClient = useQueryClient();
  const { data: activeGw, isLoading: activeGwLoading } = useLeagueActiveGameweek(leagueId);

  // Slice 254 Heal v2 — reset selectedGameweek when league changes so the next
  // render picks up the new league's active_gameweek directly. Without this,
  // switching from league A (selectedGameweek=A.activeGw) to league B keeps the
  // pinned A-value even though B has a different active_gw — fantasy UI stays
  // stuck on stale GW.
  const prevLeagueIdRef = useRef<string | null>(leagueId);
  useEffect(() => {
    if (prevLeagueIdRef.current !== leagueId) {
      prevLeagueIdRef.current = leagueId;
      setSelectedGameweek(null);
    }
  }, [leagueId, setSelectedGameweek]);

  // Safari bfcache: page is restored from memory with stale JS state
  // -> reset selectedGameweek and refetch activeGw to get fresh data
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setSelectedGameweek(null);
        // Slice 251 Wave 1: prefix-match invalidates ALL league variants.
        queryClient.invalidateQueries({ queryKey: ['events', 'leagueGw'] });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [setSelectedGameweek, queryClient]);

  // Slice 254 Heal v2 — currentGw semantics:
  //   selectedGameweek = MANUAL user-override (set ONLY when user clicks GW-Selector)
  //   activeGw = league's reality (server-truth, react-query-fetched)
  //
  // Pre-Heal had a third source — an init-effect that auto-set
  // selectedGameweek=activeGw on mount. That froze the value across Liga-Switches
  // because the init-effect re-fired with a stale cached activeGw before the new
  // league's refetch settled, leaving selectedGameweek pinned at the prior value.
  //
  // Heal v2: removed the init-effect entirely. selectedGameweek now stays null
  // until user manually picks a GW. Liga-Switch (above) clears manual pick.
  // currentGw resolution: manual override wins over reality, both fall back to 1.
  const currentGw = selectedGameweek ?? activeGw ?? 1;

  // Keep store in sync
  useEffect(() => {
    setCurrentGw(currentGw);
  }, [currentGw, setCurrentGw]);

  // GW fixture completion — lightweight check (independent of events)
  const { data: gwFixtureInfo = { complete: false, count: 0 } } = useQuery({
    queryKey: qk.fantasy.gwFixtureInfo(currentGw),
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
