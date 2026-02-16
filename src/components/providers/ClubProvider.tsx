'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './AuthProvider';
import { initClubCache } from '@/lib/clubs';
import { getUserFollowedClubs, getUserPrimaryClub, toggleFollowClub } from '@/lib/services/club';
import { invalidate } from '@/lib/cache';
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
  toggleFollow: (clubId: string, clubName: string) => Promise<void>;
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

  // Load clubs on mount / user change
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Always init the club cache (sync lookup for getClub() calls)
      await initClubCache();

      if (!user) {
        setFollowedClubs([]);
        setPrimaryClub(null);
        setActiveClubState(null);
        setLoading(false);
        return;
      }

      try {
        const [followed, primary] = await Promise.all([
          getUserFollowedClubs(user.id),
          getUserPrimaryClub(user.id),
        ]);

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
  }, [user]);

  const setActiveClub = useCallback((club: DbClub) => {
    setActiveClubState(club);
    ssSetClub(club);
  }, []);

  const isFollowing = useCallback((clubId: string) => {
    return followedClubs.some(c => c.id === clubId);
  }, [followedClubs]);

  const toggleFollow = useCallback(async (clubId: string, clubName: string) => {
    if (!user) return;
    const currently = followedClubs.some(c => c.id === clubId);
    await toggleFollowClub(user.id, clubId, clubName, !currently);
    invalidate(`clubFollows:${user.id}`);
    // Refresh
    const [followed, primary] = await Promise.all([
      getUserFollowedClubs(user.id),
      getUserPrimaryClub(user.id),
    ]);
    setFollowedClubs(followed);
    setPrimaryClub(primary);
    // If unfollowed the active club, switch
    if (currently && activeClub?.id === clubId) {
      const next = primary ?? followed[0] ?? null;
      setActiveClubState(next);
      ssSetClub(next);
    }
  }, [user, followedClubs, activeClub]);

  const refreshClubs = useCallback(async () => {
    if (!user) return;
    invalidate(`clubFollows:${user.id}`);
    const [followed, primary] = await Promise.all([
      getUserFollowedClubs(user.id),
      getUserPrimaryClub(user.id),
    ]);
    setFollowedClubs(followed);
    setPrimaryClub(primary);
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
