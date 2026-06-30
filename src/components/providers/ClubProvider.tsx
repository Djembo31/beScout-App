'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './AuthProvider';
import { initClubCache } from '@/lib/clubs';
import { initLeagueCache } from '@/lib/leagues';
import { useFollowedClubs } from '@/lib/hooks/useFollowedClubs';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
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
// LocalStorage Helpers
// ============================================
//
// Slice 260: migrated from sessionStorage to localStorage for cross-tab
// warm cache. Cross-user pollution is mitigated by the existing
// `storedStillValid` check in the activeClub-hydrate effect (only honours
// the cached club if it's in the *current* user's followed-clubs list).
const LS_ACTIVE_CLUB = 'bescout-active-club';

function lsGetClub(): DbClub | null {
  try {
    const raw = localStorage.getItem(LS_ACTIVE_CLUB);
    return raw ? (JSON.parse(raw) as DbClub) : null;
  } catch {
    return null;
  }
}

function lsSetClub(club: DbClub | null): void {
  try {
    if (club) {
      localStorage.setItem(LS_ACTIVE_CLUB, JSON.stringify(club));
    } else {
      localStorage.removeItem(LS_ACTIVE_CLUB);
    }
  } catch (err) {
    console.error('[ClubProvider] lsSetClub quota exceeded:', err);
  }
}

// ============================================
// Provider
// ============================================

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useUser();
  const userId = user?.id ?? null;
  const [activeClub, setActiveClubState] = useState<DbClub | null>(null);
  const [cachesReady, setCachesReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Followed-Clubs via Query-Cache. Provider ist Consumer, nicht Owner.
  // `useFollowedClubs` gated selbst via `enabled: !!userId`.
  const { data: followedClubs, isLoading: followedLoading } = useFollowedClubs();

  // Slice 251 Wave 3 Track C — League-Scope cascade hydration (R-02 heal).
  // hydrateFromCascade is idempotent: respects user-pick from localStorage,
  // only fires once via internal `hydrated` flag.
  const hydrateLeagueScope = useLeagueScope((s) => s.hydrateFromCascade);
  const leagueScopeHydrated = useLeagueScope((s) => s.hydrated);
  const hydrateLeagueScopeFromStorage = useLeagueScope((s) => s.hydrateFromStorage);

  // Slice 473: apply the persisted league pick AFTER mount (client-only) so the
  // store's first render matches the server's (empty default) — prevents the
  // hydration mismatch that Slice 472 exposed when the authed shell began SSR-
  // rendering the league selector. Runs before the cascade effect below (declared
  // earlier) so a persisted manual pick still wins over the favorite/active-club
  // cascade (via that effect's "scope already set → skip" guard).
  useEffect(() => {
    hydrateLeagueScopeFromStorage();
  }, [hydrateLeagueScopeFromStorage]);

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

  // activeClub hydrate nach initial Query-Load. localStorage-Wert wird nur
  // uebernommen wenn er in der aktuellen followedClubs-Liste enthalten ist
  // (Cross-User-Session-Schutz — kritisch jetzt da localStorage cross-tab
  // shared ist, nicht mehr tab-isoliert wie sessionStorage vor Slice 260).
  useEffect(() => {
    if (!userId) {
      setActiveClubState(null);
      setHydrated(true);
      return;
    }
    if (followedLoading) return;

    const followed = followedClubs ?? [];
    const stored = lsGetClub();
    const storedStillValid = stored && followed.some((c) => c.id === stored.id);
    const primary = followed[0] ?? null;
    const next = storedStillValid ? stored : primary ?? followed[0] ?? null;

    setActiveClubState(next);
    if (next) lsSetClub(next);
    setHydrated(true);
  }, [userId, followedLoading, followedClubs]);

  // Slice 251 Wave 3 Track C — fire LeagueScope cascade once caches+hydrate are ready.
  // Cascade reads:
  //   1. profile.favorite_club_id → getClub(...).league_id
  //   2. activeClub.league_id (just-hydrated state above)
  //   3. getActiveLeagues()[0] alphabetic
  // Idempotent: store self-skips if user already has a persisted choice.
  useEffect(() => {
    if (!cachesReady) return;
    if (!hydrated) return;          // wait for activeClub hydration
    if (!userId) return;            // anon-user: cascade skipped, store stays default
    if (leagueScopeHydrated) return; // already done

    void hydrateLeagueScope({
      profileFavoriteClubId: profile?.favorite_club_id ?? null,
      activeClubLeagueId: activeClub?.league_id ?? null,
      activeClubName: activeClub?.league ?? null,
      activeClubCountry: activeClub?.country ?? null,
    });
  }, [
    cachesReady,
    hydrated,
    userId,
    leagueScopeHydrated,
    profile?.favorite_club_id,
    activeClub?.league_id,
    activeClub?.league,
    activeClub?.country,
    hydrateLeagueScope,
  ]);

  const setActiveClub = useCallback((club: DbClub) => {
    setActiveClubState(club);
    lsSetClub(club);
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
