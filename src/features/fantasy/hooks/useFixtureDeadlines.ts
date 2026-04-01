'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getFixtureDeadlinesByGameweek } from '../services/fixtures';
import type { FixtureDeadline } from '../services/fixtures';
import type { UserDpcHolding } from '../types';
import { qk } from '@/lib/queries/keys';

/**
 * Per-fixture deadline locking — replaces manual useEffect + setState
 * with a React Query hook that auto-polls when events are running.
 *
 * Source: FantasyContent.tsx lines 131-144 + EventDetailModal.tsx lines 286-319
 */
export function useFixtureDeadlines(currentGw: number, hasRunningEvents: boolean) {
  const { data: fixtureDeadlines = new Map<string, FixtureDeadline>() } = useQuery({
    queryKey: qk.fantasy.fixtureDeadlines(currentGw),
    queryFn: () => getFixtureDeadlinesByGameweek(currentGw),
    staleTime: 30_000,
    refetchInterval: hasRunningEvents ? 60_000 : false,
    enabled: !!currentGw,
  });

  // Check if specific player's fixture is locked
  const isPlayerLocked = useCallback((playerId: string, holdings: UserDpcHolding[], eventStatus?: string): boolean => {
    if (!fixtureDeadlines.size || eventStatus !== 'running') return false;
    const holding = holdings.find(h => h.id === playerId);
    if (!holding?.clubId) return false;
    return fixtureDeadlines.get(holding.clubId)?.isLocked ?? false;
  }, [fixtureDeadlines]);

  const isPartiallyLocked = useMemo(() => {
    if (!fixtureDeadlines.size) return false;
    const values = Array.from(fixtureDeadlines.values());
    const locked = values.filter(d => d.isLocked).length;
    return locked > 0 && locked < values.length;
  }, [fixtureDeadlines]);

  const hasUnlockedFixtures = useMemo(() => {
    return Array.from(fixtureDeadlines.values()).some(d => !d.isLocked);
  }, [fixtureDeadlines]);

  const nextKickoff = useMemo(() => {
    if (!fixtureDeadlines.size) return null;
    const now = Date.now();
    let earliest: number | null = null;
    fixtureDeadlines.forEach(d => {
      if (d.playedAt && !d.isLocked) {
        const t = new Date(d.playedAt).getTime();
        if (t > now && (earliest === null || t < earliest)) earliest = t;
      }
    });
    return earliest;
  }, [fixtureDeadlines]);

  return { fixtureDeadlines, isPlayerLocked, isPartiallyLocked, hasUnlockedFixtures, nextKickoff };
}
