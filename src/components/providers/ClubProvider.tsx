'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './AuthProvider';
import { initClubCache } from '@/lib/clubs';
import { initLeagueCache } from '@/lib/leagues';
import { useFollowedClubs } from '@/lib/hooks/useFollowedClubs';
import type { DbClub } from '@/types';

// ============================================
// Context Type (Slice 151b-RESET — shrunk)
// ============================================
//
// Vorher enthielt der Provider `followedClubs[]`, `primaryClub`, `isFollowing`,
// `toggleFollow`, `refreshClubs` — alles Server-Daten-Duplikate des Query-Caches
// (State-Sync-Audit 2026-04-23 Klasse A + C). Migration zu `useFollowedClubs` /
// `usePrimaryClub` / `useToggleFollowClub` als Query-Cache-Konsumenten.
//
// Was bleibt: der aktuell in der Sidebar selektierte Club (UI-State, keine
// Server-Daten) + der Loading-Flag bis initialer Hydrate abgeschlossen ist.

type ClubContextValue = {
  activeClub: DbClub | null;
  setActiveClub: (club: DbClub) => void;
  loading: boolean;
};

const ClubContext = createContext<ClubContextValue>({
  activeClub: null,
  setActiveClub: () => {},
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
  } catch (err) {
    console.error('[ClubProvider] ssSetClub quota exceeded:', err);
  }
}

// ============================================
// Provider
// ============================================

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const [activeClub, setActiveClubState] = useState<DbClub | null>(null);
  const [cachesReady, setCachesReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Followed-Clubs via Query-Cache. Provider ist Consumer, nicht Owner.
  // `useFollowedClubs` gated selbst via `enabled: !!userId`.
  const { data: followedClubs, isLoading: followedLoading } = useFollowedClubs();

  // Init club+league lookup caches (sync lookups in `getClub()` / `getLeague()`).
  // Einmal pro Session ausreichend — Cache-Dedupe in den jeweiligen Services.
  useEffect(() => {
    let cancelled = false;
    Promise.all([initClubCache(), initLeagueCache()])
      .then(() => {
        if (!cancelled) setCachesReady(true);
      })
      .catch((err) => {
        console.error('[ClubProvider] init caches failed:', err);
        if (!cancelled) setCachesReady(true); // fail open — besser Leak als Deadlock
      });
    return () => { cancelled = true; };
  }, []);

  // activeClub hydrate nach initial Query-Load. sessionStorage-Wert wird nur
  // uebernommen wenn er in der aktuellen followedClubs-Liste enthalten ist
  // (Cross-User-Session-Schutz).
  useEffect(() => {
    if (!userId) {
      setActiveClubState(null);
      setHydrated(true);
      return;
    }
    if (followedLoading) return;

    const followed = followedClubs ?? [];
    const stored = ssGetClub();
    const storedStillValid = stored && followed.some((c) => c.id === stored.id);
    const primary = followed[0] ?? null;
    const next = storedStillValid ? stored : primary ?? followed[0] ?? null;

    setActiveClubState(next);
    if (next) ssSetClub(next);
    setHydrated(true);
  }, [userId, followedLoading, followedClubs]);

  const setActiveClub = useCallback((club: DbClub) => {
    setActiveClubState(club);
    ssSetClub(club);
  }, []);

  const loading = !cachesReady || followedLoading || !hydrated;

  const value = useMemo<ClubContextValue>(
    () => ({ activeClub, setActiveClub, loading }),
    [activeClub, setActiveClub, loading],
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useClub(): ClubContextValue {
  return useContext(ClubContext);
}
