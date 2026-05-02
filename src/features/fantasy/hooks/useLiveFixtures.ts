'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { qk } from '@/lib/queries/keys';
import { getFixturesByGameweek, subscribeFixtureUpdates } from '@/features/fantasy/services/fixtures';
import type { Fixture, DbFixture } from '@/types';

/** Slice 267 — Polling-Fallback window (X1 spec §2). Engaged when Realtime
 * channel emits CHANNEL_ERROR / TIMED_OUT / CLOSED. Disengaged once
 * SUBSCRIBED is received again. */
const POLLING_FALLBACK_MS = 60_000;

/**
 * Slice 267 — Live-Fixtures Realtime-Hook.
 *
 * Subscribes to `fixtures`-UPDATE events for the given `leagueId` (F2
 * Liga-Scope-Channel) via Supabase Realtime postgres_changes. When a
 * row updates, the cached fixtures-array under `qk.fixtures.live(leagueId)`
 * is patched in-place via `queryClient.setQueryData`. Status-transitions
 * to `'finished'` additionally invalidate the entire `['fixtures']` root-
 * prefix to trigger Bucket-Resort across SpieltagBrowser.
 *
 * Pattern source: `src/lib/queries/social.ts:46-90` (useFollowingFeed
 * Realtime-Goldstandard). RLS deckt Filterung ab — kein Client-Filter
 * im Channel-Listener nötig (siehe `database.md` Realtime-Pattern).
 *
 * Polling-Fallback (Spec X1, F-08): Status-Callback in `subscribeFixtureUpdates`
 * triggert 60s-Refetch-Intervall bei Channel-Error / Timeout / Close. Sobald
 * Channel wieder SUBSCRIBED ist, wird Polling deaktiviert.
 *
 * @param leagueId - league filter (Liga-Scope-Channel). Hook is disabled
 *   when undefined.
 * @param gameweek - current gameweek for initial-fetch + cache-key.
 * @returns same shape as `useQuery` — TanStack-Query data + status.
 */
export function useLiveFixtures(leagueId: string | undefined, gameweek: number) {
  const queryClient = useQueryClient();
  const [pollingActive, setPollingActive] = useState(false);

  const query = useQuery({
    queryKey: qk.fixtures.live(leagueId ?? '__none__'),
    queryFn: () => getFixturesByGameweek(gameweek, leagueId),
    enabled: !!leagueId,
    refetchInterval: pollingActive ? POLLING_FALLBACK_MS : false,
  });

  useEffect(() => {
    if (!leagueId) return;

    const channel = subscribeFixtureUpdates(
      leagueId,
      (updatedRow: DbFixture) => {
        // Update cached fixtures-array — replace matching row in-place.
        // setQueryData is preferred over invalidate because the update is
        // deterministic (single row, full payload) — avoids unneeded refetch.
        queryClient.setQueryData<Fixture[]>(qk.fixtures.live(leagueId), (prev) => {
          if (!prev) return prev;
          return prev.map((f) => (f.id === updatedRow.id ? { ...f, ...updatedRow } : f));
        });
        // Status-Transition 'live' → 'finished' triggert Bucket-Resort:
        // root-prefix-invalidation (errors-frontend.md "Cache-Invalidation:
        // Root-Prefix vs enumerated Keys") — alle Konsumenten der
        // `['fixtures', ...]`-Subtree refetchen.
        if (updatedRow.status === 'finished') {
          queryClient.invalidateQueries({ queryKey: ['fixtures'] });
        }
      },
      (status) => {
        // F-08 Polling-Fallback-Trigger via channel.subscribe-callback.
        // CHANNEL_ERROR + TIMED_OUT + CLOSED engage Polling. SUBSCRIBED disengages.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setPollingActive(true);
        } else if (status === 'SUBSCRIBED') {
          setPollingActive(false);
        }
      },
    );

    return () => {
      // Channel-Cleanup auf Liga-Switch / Unmount (AC-14 — Memory-Leak-frei)
      supabase.removeChannel(channel);
    };
  }, [leagueId, queryClient]);

  return query;
}
