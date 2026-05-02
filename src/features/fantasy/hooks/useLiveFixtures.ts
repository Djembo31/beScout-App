'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { subscribeFixtureUpdates } from '@/features/fantasy/services/fixtures';
import type { DbFixture } from '@/types';

export type LiveFixtureChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

export type UseLiveFixturesOptions = {
  /** Called for every UPDATE event on `fixtures` filtered by `league_id=eq.${leagueId}`. */
  onUpdate?: (fixture: DbFixture) => void;
  /** Called on channel-status transitions. Polling-Fallback (X1, F-08) is also tracked internally. */
  onStatus?: (status: LiveFixtureChannelStatus) => void;
};

/**
 * Slice 267 — Live-Fixtures Realtime-Subscription Hook.
 *
 * Subscribes to `fixtures`-UPDATE events for the given `leagueId` (F2
 * Liga-Scope-Channel) via Supabase Realtime postgres_changes and invokes
 * `options.onUpdate` for each update. Side-effect-only — no internal cache
 * (caller decides how to apply updates: setState, setQueryData, etc.).
 *
 * Pattern source: `src/lib/queries/social.ts:46-90` (useFollowingFeed
 * Realtime-Goldstandard, callback-driven).
 *
 * Polling-Fallback (Spec X1, F-08): the hook tracks `isPolling` based on
 * channel-status. CHANNEL_ERROR / TIMED_OUT / CLOSED engage `isPolling=true`
 * (caller may use this signal to refetch initial-data manually). SUBSCRIBED
 * disengages.
 *
 * @param leagueId - league filter (Liga-Scope-Channel). Hook is disabled when undefined.
 * @param options.onUpdate - callback for each fixture-UPDATE row.
 * @param options.onStatus - optional channel-status observer.
 * @returns `{ isPolling }` — true while channel is in error/closed state.
 */
export function useLiveFixtures(
  leagueId: string | undefined,
  options?: UseLiveFixturesOptions,
): { isPolling: boolean } {
  const [isPolling, setIsPolling] = useState(false);

  // Stable refs for callbacks — prevents re-subscribe storms on each render
  // when consumer passes inline callbacks.
  const onUpdateRef = useRef(options?.onUpdate);
  const onStatusRef = useRef(options?.onStatus);
  useEffect(() => {
    onUpdateRef.current = options?.onUpdate;
    onStatusRef.current = options?.onStatus;
  }, [options?.onUpdate, options?.onStatus]);

  useEffect(() => {
    if (!leagueId) return;

    const channel = subscribeFixtureUpdates(
      leagueId,
      (updatedRow: DbFixture) => {
        onUpdateRef.current?.(updatedRow);
      },
      (status) => {
        const typedStatus = status as LiveFixtureChannelStatus;
        // F-08 Polling-Fallback-Trigger.
        if (typedStatus === 'CHANNEL_ERROR' || typedStatus === 'TIMED_OUT' || typedStatus === 'CLOSED') {
          setIsPolling(true);
        } else if (typedStatus === 'SUBSCRIBED') {
          setIsPolling(false);
        }
        onStatusRef.current?.(typedStatus);
      },
    );

    return () => {
      // Channel-Cleanup auf Liga-Switch / Unmount (AC-14 — Memory-Leak-frei)
      supabase.removeChannel(channel);
    };
  }, [leagueId]);

  return { isPolling };
}
