'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from './keys';
import { supabase } from '@/lib/supabaseClient';
import { getFollowingFeed, getFollowerCount, getFollowingCount, getFollowingIds, getUserSocialStats } from '@/lib/services/social';
import type { UserSocialStats } from '@/lib/services/social';
import { getClubFollowerCount, isUserFollowingClub } from '@/lib/services/club';

const TWO_MIN = 2 * 60 * 1000;

// Realtime event-batching window: when new events stream in, we wait this
// long after the FIRST event before flushing the counter (throttle with
// trailing edge). Keeps the pill calm during activity bursts.
const FEED_EVENT_WINDOW_MS = 2000;

/**
 * Following Feed hook with live updates.
 *
 * Subscribes to INSERTs on `activity_log` via Supabase Realtime. RLS
 * policies already restrict which rows any given user sees (cross-user
 * feed policy added in migration 20260408180000), so the channel does not
 * need an explicit filter — the server only streams rows the user is
 * allowed to read.
 *
 * Incoming events are counted in a small buffer and flushed once every
 * {@link FEED_EVENT_WINDOW_MS} to avoid thrashing the UI during activity
 * bursts. The consumer shows a "X neue Aktivitäten"-pill; clicking it
 * invalidates the query and resets the counter. React Query is configured
 * globally with `placeholderData: keepPreviousData`, so the refetch is
 * flicker-free.
 */
export function useFollowingFeed(userId: string | undefined, limit = 15) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);

  const query = useQuery({
    queryKey: qk.social.feed(userId!, limit),
    queryFn: () => getFollowingFeed(userId!, limit),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });

  // Realtime subscription — throttle-style batching
  useEffect(() => {
    if (!userId) return;

    const bufferRef = { count: 0 };
    let timer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`following-feed-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
        },
        (payload) => {
          const row = payload.new as { user_id?: string } | null;
          // Skip own activity — you don't follow yourself in the feed
          if (!row || row.user_id === userId) return;

          bufferRef.count += 1;
          // Throttle: first event starts the timer; subsequent events
          // within the window just increment the buffer.
          if (timer === null) {
            timer = setTimeout(() => {
              setPendingCount((c) => c + bufferRef.count);
              bufferRef.count = 0;
              timer = null;
            }, FEED_EVENT_WINDOW_MS);
          }
        },
      )
      .subscribe();

    return () => {
      if (timer !== null) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const applyPending = useCallback(() => {
    if (!userId) return;
    setPendingCount(0);
    queryClient.invalidateQueries({ queryKey: qk.social.feed(userId, limit) });
  }, [queryClient, userId, limit]);

  // Reset pending counter whenever the underlying data actually refetches,
  // so manual `refetch()` calls from the consumer also clear the pill.
  const lastDataUpdatedAt = useRef(query.dataUpdatedAt);
  useEffect(() => {
    if (query.dataUpdatedAt !== lastDataUpdatedAt.current) {
      lastDataUpdatedAt.current = query.dataUpdatedAt;
      setPendingCount(0);
    }
  }, [query.dataUpdatedAt]);

  return {
    ...query,
    pendingCount,
    applyPending,
  };
}

export function useFollowerCount(userId: string | undefined) {
  return useQuery({
    queryKey: qk.social.followerCount(userId!),
    queryFn: () => getFollowerCount(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useFollowingCount(userId: string | undefined) {
  return useQuery({
    queryKey: qk.social.followingCount(userId!),
    queryFn: () => getFollowingCount(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useFollowingIds(userId: string | undefined) {
  return useQuery({
    queryKey: qk.social.followingIds(userId!),
    queryFn: () => getFollowingIds(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

/** Batched: followingIds + followerCount + followingCount in 1 RPC call */
export function useUserSocialStats(userId: string | undefined) {
  return useQuery<UserSocialStats>({
    queryKey: qk.social.stats(userId!),
    queryFn: () => getUserSocialStats(),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useClubFollowerCount(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubs.followers(clubId!),
    queryFn: () => getClubFollowerCount(clubId!),
    enabled: !!clubId,
    staleTime: TWO_MIN,
  });
}

export function useIsFollowingClub(userId: string | undefined, clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubs.isFollowing(userId!, clubId!),
    queryFn: () => isUserFollowingClub(userId!, clubId!),
    enabled: !!userId && !!clubId,
    staleTime: TWO_MIN,
  });
}
