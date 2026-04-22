'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from './AuthProvider';
import { initClubCache } from '@/lib/clubs';
import { initLeagueCache } from '@/lib/leagues';
import { getUserFollowedClubs, toggleFollowClub } from '@/lib/services/club';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import type { DbClub } from '@/types';

// ============================================
// Context Type
// ============================================

type ClubContextValue = {
  activeClub: DbClub | null;
  followedClubs: DbClub[];
  primaryClub: DbClub | null;
  setActiveClub: (club: DbClub) => void;
  isFollowing: (clubId: string) => boolean;
  /**
   * Toggle follow for a club. Pass `clubData` when following a *new* club so the
   * provider can do an optimistic add — without it the UI waits for the post-DB
   * refetch before the new club appears in `followedClubs`.
   */
  toggleFollow: (clubId: string, clubName: string, clubData?: DbClub) => Promise<void>;
  refreshClubs: () => Promise<void>;
  loading: boolean;
};

const ClubContext = createContext<ClubContextValue>({
  activeClub: null,
  followedClubs: [],
  primaryClub: null,
  setActiveClub: () => {},
  isFollowing: () => false,
  toggleFollow: async () => {},
  refreshClubs: async () => {},
  loading: true,
});

// ============================================
// SessionStorage Helpers
// ============================================

const SS_ACTIVE_CLUB = 'bescout-active-club';

function ssGetClub(): DbClub | null {
  try {
    const raw = sessionStorage.getItem(SS_ACTIVE_CLUB);
    return raw ? (JSON.parse(raw) as DbClub) : null;
  } catch {
    return null;
  }
}

function ssSetClub(club: DbClub | null): void {
  try {
    if (club) {
      sessionStorage.setItem(SS_ACTIVE_CLUB, JSON.stringify(club));
    } else {
      sessionStorage.removeItem(SS_ACTIVE_CLUB);
    }
  } catch { /* quota exceeded */ }
}

// ============================================
// Provider
// ============================================

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [followedClubs, setFollowedClubs] = useState<DbClub[]>([]);
  const [primaryClub, setPrimaryClub] = useState<DbClub | null>(null);
  const [activeClub, setActiveClubState] = useState<DbClub | null>(null);
  const [loading, setLoading] = useState(true);

  // Load clubs on mount / user change.
  // Depends on user?.id (not full user object) to prevent duplicate fetch on
  // AuthProvider setUser-twice-same-id pattern (sessionStorage hydrate +
  // Supabase getSession both update user).
  const userId = user?.id ?? null;
  useEffect(() => {
    let cancelled = false;
    setLoading(true); // Always reset to loading when userId changes

    async function load() {
      // Always init the club + league caches (sync lookups for getClub() / getLeague() calls)
      await Promise.all([initClubCache(), initLeagueCache()]);

      if (!userId) {
        setFollowedClubs([]);
        setPrimaryClub(null);
        setActiveClubState(null);
        setLoading(false);
        return;
      }

      try {
        // Single query — getUserFollowedClubs returns sorted by is_primary desc,
        // so the first element IS the primary club. Saves 1 DB round-trip.
        const followed = await getUserFollowedClubs(userId);
        const primary = followed[0] ?? null;

        if (cancelled) return;

        setFollowedClubs(followed);
        setPrimaryClub(primary);

        // Restore active club: sessionStorage > primary > first followed
        const stored = ssGetClub();
        const storedStillValid = stored && followed.some(c => c.id === stored.id);
        const active = storedStillValid ? stored : primary ?? followed[0] ?? null;
        setActiveClubState(active);
        if (active) ssSetClub(active);
      } catch (err) {
        console.error('[ClubProvider] Failed to load clubs:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const setActiveClub = useCallback((club: DbClub) => {
    setActiveClubState(club);
    ssSetClub(club);
  }, []);

  // Refs mirror latest state so toggleFollow stays stable across re-renders.
  // Without this, each setFollowedClubs() rebuilt the callback mid-mutation,
  // letting parallel clicks on different clubs race and overwrite each other.
  const activeClubRef = useRef(activeClub);
  activeClubRef.current = activeClub;
  const followedClubsRef = useRef(followedClubs);
  followedClubsRef.current = followedClubs;
  const primaryClubRef = useRef(primaryClub);
  primaryClubRef.current = primaryClub;

  // Mutex per clubId: silent-discards re-entry while an earlier toggle is in-flight.
  // Also used to defer reconcile-from-server until the last outstanding toggle resolves —
  // otherwise getUserFollowedClubs from an earlier call would overwrite an optimistic
  // state from a later call on a different club.
  const inflightRef = useRef<Set<string>>(new Set());

  const isFollowing = useCallback((clubId: string) => {
    return followedClubs.some(c => c.id === clubId);
  }, [followedClubs]);

  const toggleFollow = useCallback(async (
    clubId: string,
    clubName: string,
    clubData?: DbClub,
  ) => {
    if (!user) return;
    if (inflightRef.current.has(clubId)) return;
    inflightRef.current.add(clubId);

    const prevFollowed = followedClubsRef.current;
    const prevPrimary = primaryClubRef.current;
    const prevActive = activeClubRef.current;
    const currently = prevFollowed.some(c => c.id === clubId);

    // Optimistic: apply state change immediately so UI (Card-counts,
    // "Deine Vereine" section, ClubSwitcher pills, etc.) updates without waiting
    // on DB + refetch round-trips.
    let optimisticFollowed: DbClub[];
    if (currently) {
      optimisticFollowed = prevFollowed.filter(c => c.id !== clubId);
    } else if (clubData) {
      optimisticFollowed = [...prevFollowed, clubData];
    } else {
      optimisticFollowed = prevFollowed;
    }
    const optimisticPrimary = optimisticFollowed[0] ?? null;
    setFollowedClubs(optimisticFollowed);
    setPrimaryClub(optimisticPrimary);
    if (currently && prevActive?.id === clubId) {
      const nextActive = optimisticPrimary ?? optimisticFollowed[0] ?? null;
      setActiveClubState(nextActive);
      ssSetClub(nextActive);
    }

    try {
      await toggleFollowClub(user.id, clubId, clubName, !currently);
      // Reconcile strategy (Slice 139 + 142):
      // Skip reconcile on BOTH paths. Optimistic state is deterministic ground-truth:
      //  - Follow: optimisticFollowed knows the added clubData; server-echo would
      //    only risk a pgBouncer read-after-write transient wipe (Slice 139).
      //  - Unfollow: optimisticFollowed[0] is the next primary — Server promotes
      //    exactly that same club in toggleFollowClub's promote-next-primary step,
      //    so reconcile would return the same rows we already set. On the sad path
      //    the 3 sequential writes (DELETE + promote + profile update) spread across
      //    different pgBouncer connections; an immediate read can transient-return
      //    a smaller-than-expected followed list → all follow tiles vanish (Slice 142).
      // Cross-tab drift is handled by the Mount-effect reload, not by post-toggle
      // reconcile.
      inflightRef.current.delete(clubId);

      // Slice 143 — propagate follow-state to dependent query caches so every
      // consumer (club-hero Fan-Count, Community-Header, Admin-Analytics) sees
      // the same number without requiring a page refresh.
      const delta = currently ? -1 : 1;
      queryClient.setQueryData<number>(qk.clubs.followers(clubId), (prev) =>
        prev === undefined ? prev : Math.max(0, prev + delta),
      );
      queryClient.setQueryData<boolean>(qk.clubs.isFollowing(user.id, clubId), !currently);
    } catch (err) {
      inflightRef.current.delete(clubId);
      // Revert on error — leave the caller to surface a toast.
      setFollowedClubs(prevFollowed);
      setPrimaryClub(prevPrimary);
      if (currently && prevActive?.id === clubId && prevActive) {
        setActiveClubState(prevActive);
        ssSetClub(prevActive);
      }
      throw err;
    }
  }, [user]);

  const refreshClubs = useCallback(async () => {
    if (!user) return;
    const followed = await getUserFollowedClubs(user.id);
    setPrimaryClub(followed[0] ?? null);
    setFollowedClubs(followed);
  }, [user]);

  const value = useMemo<ClubContextValue>(() => ({
    activeClub,
    followedClubs,
    primaryClub,
    setActiveClub,
    isFollowing,
    toggleFollow,
    refreshClubs,
    loading,
  }), [activeClub, followedClubs, primaryClub, setActiveClub, isFollowing, toggleFollow, refreshClubs, loading]);

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useClub(): ClubContextValue {
  return useContext(ClubContext);
}
