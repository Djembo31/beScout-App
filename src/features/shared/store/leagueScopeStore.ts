/**
 * League Scope Store — global SSOT for the active league filter across pages.
 *
 * Slice 251 Wave 3 Track C established this as SSOT, Wave 6 (Slice 252)
 * removed the legacy duplicates from fantasyStore / marketStore / managerStore
 * + lokales useState in /rankings + /clubs.
 *
 * Hydration cascade (1→2→3):
 *   1. profile.favorite_club_id → getClub(...).league_id
 *   2. activeClub.league_id (via ClubProvider)
 *   3. getActiveLeagues()[0] (alphabetic, deterministic — Anil Open-Q #2)
 *
 * Persistence: localStorage key `bescout-league-scope-v1`. Versioned so that
 * future schema changes silent-reset instead of crash (EC-03).
 *
 * Cache invalidation: setLeagueScope() invalidates 4 React-Query prefixes that
 * carry leagueId in their keys (events.leagueGw, events.leagueMaxGw,
 * events.wildcardBalance, fantasy.gwFixtureInfo + fantasy.fixtureDeadlines).
 * Driven by EC-13 + AR-13 from spec.
 */

import { create } from 'zustand';
import { logSilentCatch } from '@/lib/observability/silentRejects';
import { getClub } from '@/lib/clubs';
import { getActiveLeagues } from '@/lib/leagues';

// ============================================
// Types
// ============================================

export interface LeagueScopeState {
  /** UUID from `leagues.id`. null until hydrated or when "Alle" is selected. */
  leagueId: string | null;
  /** Display name like "Bundesliga". '' when "Alle" is selected. Used by legacy
   *  string-filter consumers (e.g. `c.league === leagueName`). */
  leagueName: string;
  /** ISO 2-letter country code like "DE". '' when "Alle" is selected. */
  countryCode: string;
  /** True once the cascade has been attempted (success or fallback to default). */
  hydrated: boolean;
  /** Set the full league scope. Triggers cache invalidation for league-aware queries. */
  setLeagueScope: (l: { id: string | null; name: string; country: string }) => void;
  /** Set country only — clears leagueId + leagueName (smart-collapse). Triggers cache invalidation. */
  setCountry: (code: string) => void;
  /** Reset to "Alle" (no scope). */
  resetToDefault: () => void;
  /** Hydrate from cascade (favorite_club → activeClub → first active league). Idempotent. */
  hydrateFromCascade: (params: {
    profileFavoriteClubId: string | null;
    activeClubLeagueId: string | null;
    activeClubName: string | null;
    activeClubCountry: string | null;
  }) => Promise<void>;
}

// ============================================
// Persistence (versioned + corruption-safe)
// ============================================

const STORAGE_KEY = 'bescout-league-scope-v1';

type PersistedState = {
  leagueId: string | null;
  leagueName: string;
  countryCode: string;
};

function readFromStorage(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    // Schema validation — EC-03: corrupted state silent-resets.
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('leagueId' in parsed) ||
      !('leagueName' in parsed) ||
      !('countryCode' in parsed) ||
      (parsed.leagueId !== null && typeof parsed.leagueId !== 'string') ||
      typeof parsed.leagueName !== 'string' ||
      typeof parsed.countryCode !== 'string'
    ) {
      // Drop corrupted blob silently.
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      return null;
    }
    return parsed as PersistedState;
  } catch (err) {
    logSilentCatch('leagueScopeStore.hydrate', err);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return null;
  }
}

function writeToStorage(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // QuotaExceeded or private-mode — log and continue. State stays in-memory.
    logSilentCatch('leagueScopeStore.persist', err);
  }
}

// ============================================
// Cache invalidation (EC-13 / AR-13)
//
// Lazy import to avoid SSR + module-init circular dependencies. Invalidates
// the 5 query-key prefixes that include leagueId in their factories.
// ============================================

async function invalidateLeagueAwareQueries(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { queryClient } = await import('@/lib/queryClient');
    // Prefix-match: any key starting with these arrays gets invalidated.
    // qk.events.leagueGw(leagueId) → ['events', 'leagueGw', <id>]
    // qk.events.leagueMaxGw(leagueId) → ['events', 'leagueMaxGw', <id>]
    // qk.events.wildcardBalance(uid) → ['events', 'wildcardBalance', <uid>]
    // qk.fantasy.gwFixtureInfo(gw) → ['fantasy', 'gwFixtureInfo', <gw>]
    // qk.fantasy.fixtureDeadlines(gw) → ['fantasy', 'fixtureDeadlines', <gw>]
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['events', 'leagueGw'] }),
      queryClient.invalidateQueries({ queryKey: ['events', 'leagueMaxGw'] }),
      queryClient.invalidateQueries({ queryKey: ['events', 'wildcardBalance'] }),
      queryClient.invalidateQueries({ queryKey: ['fantasy', 'gwFixtureInfo'] }),
      queryClient.invalidateQueries({ queryKey: ['fantasy', 'fixtureDeadlines'] }),
    ]);
  } catch (err) {
    logSilentCatch('leagueScopeStore.invalidate', err);
  }
}

// ============================================
// Store
// ============================================

const initialPersisted = readFromStorage();

export const useLeagueScope = create<LeagueScopeState>((set, get) => ({
  leagueId: initialPersisted?.leagueId ?? null,
  leagueName: initialPersisted?.leagueName ?? '',
  countryCode: initialPersisted?.countryCode ?? '',
  hydrated: false,

  setLeagueScope: ({ id, name, country }) => {
    set({ leagueId: id, leagueName: name, countryCode: country });
    writeToStorage({ leagueId: id, leagueName: name, countryCode: country });
    void invalidateLeagueAwareQueries();
  },

  setCountry: (code) => {
    // Smart-collapse: changing country clears the league.
    set({ countryCode: code, leagueId: null, leagueName: '' });
    writeToStorage({ leagueId: null, leagueName: '', countryCode: code });
    void invalidateLeagueAwareQueries();
  },

  resetToDefault: () => {
    set({ leagueId: null, leagueName: '', countryCode: '' });
    writeToStorage({ leagueId: null, leagueName: '', countryCode: '' });
    void invalidateLeagueAwareQueries();
  },

  hydrateFromCascade: async ({
    profileFavoriteClubId,
    activeClubLeagueId,
    activeClubName,
    activeClubCountry,
  }) => {
    // If user already picked something via persisted state, don't auto-override.
    // hydrated still flips to true so consumers know cascade attempted.
    const current = get();
    if (current.leagueId || current.leagueName || current.countryCode) {
      set({ hydrated: true });
      return;
    }

    // Stage 1: profile.favorite_club_id → club.league_id
    if (profileFavoriteClubId) {
      const club = getClub(profileFavoriteClubId);
      // EC-01: zombie-uuid → club is null → fall through to stage 2.
      // EC-02: legacy club without league_id → fall through.
      if (club && club.league_id && club.league && club.country) {
        set({
          leagueId: club.league_id,
          leagueName: club.league,
          countryCode: club.country,
          hydrated: true,
        });
        writeToStorage({
          leagueId: club.league_id,
          leagueName: club.league,
          countryCode: club.country,
        });
        return;
      }
    }

    // Stage 2: activeClub.league_id (via ClubProvider — already loaded).
    if (activeClubLeagueId && activeClubName && activeClubCountry) {
      set({
        leagueId: activeClubLeagueId,
        leagueName: activeClubName,
        countryCode: activeClubCountry,
        hydrated: true,
      });
      writeToStorage({
        leagueId: activeClubLeagueId,
        leagueName: activeClubName,
        countryCode: activeClubCountry,
      });
      return;
    }

    // Stage 3: first active league, alphabetic order. Deterministic per AC-06 + Open-Q #2.
    const activeLeagues = getActiveLeagues();
    if (activeLeagues.length > 0) {
      const sorted = [...activeLeagues].sort((a, b) => a.name.localeCompare(b.name));
      const first = sorted[0];
      set({
        leagueId: first.id,
        leagueName: first.name,
        countryCode: first.country,
        hydrated: true,
      });
      writeToStorage({
        leagueId: first.id,
        leagueName: first.name,
        countryCode: first.country,
      });
      return;
    }

    // Nothing found — flag hydrated anyway so caller doesn't loop.
    set({ hydrated: true });
  },
}));

// ============================================
// Test helper — reset internal state between tests.
// (Only used by `__tests__/`. Not part of public API.)
// ============================================
export function __resetLeagueScopeForTests(): void {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
  useLeagueScope.setState({
    leagueId: null,
    leagueName: '',
    countryCode: '',
    hydrated: false,
  });
}
