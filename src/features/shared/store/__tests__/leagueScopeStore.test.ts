/**
 * Tests for the global Liga-Scope Zustand store (Slice 251 Wave 3 Track C).
 *
 * Covers:
 *  - Cascade Stages 1 → 2 → 3 (favorite_club, activeClub, getActiveLeagues[0])
 *  - localStorage persistence + corruption silent-reset (EC-03)
 *  - setCountry smart-collapse (clears leagueId + leagueName)
 *  - setLeagueScope triggers React-Query invalidation (EC-13 / AR-13)
 *  - Reset to default
 *
 * Mocking strategy:
 *  - getClub / getActiveLeagues mocked via @/lib/clubs and @/lib/leagues
 *  - queryClient mocked via vi.hoisted (testing.md §5 vi.hoisted-Pattern, Slice 170)
 *  - localStorage mocked per-test via beforeEach setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const { mockQc } = vi.hoisted(() => ({
  mockQc: {
    invalidateQueries: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/queryClient', () => ({ queryClient: mockQc }));

vi.mock('@/lib/clubs', () => ({
  getClub: vi.fn(),
}));

vi.mock('@/lib/leagues', () => ({
  getActiveLeagues: vi.fn(() => []),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: vi.fn(),
}));

// Test fixtures
const BL_LEAGUE = {
  id: 'league-bl-uuid',
  name: 'Bundesliga',
  short: 'BL1',
  country: 'DE',
  season: '2025/2026',
  logoUrl: null,
  apiFootballId: 78,
  activeGameweek: 10,
  maxGameweeks: 34,
  isActive: true,
};

const TFF1_LEAGUE = {
  id: 'league-tff1-uuid',
  name: 'TFF 1. Lig',
  short: 'TFF1',
  country: 'TR',
  season: '2025/2026',
  logoUrl: null,
  apiFootballId: 204,
  activeGameweek: 8,
  maxGameweeks: 34,
  isActive: true,
};

const PL_LEAGUE = {
  id: 'league-pl-uuid',
  name: 'Premier League',
  short: 'PL',
  country: 'GB',
  season: '2025/2026',
  logoUrl: null,
  apiFootballId: 39,
  activeGameweek: 12,
  maxGameweeks: 38,
  isActive: true,
};

const FAVORITE_CLUB = {
  id: 'club-bayern-uuid',
  slug: 'bayern',
  name: 'FC Bayern',
  short: 'BAY',
  colors: { primary: '#DC052D', secondary: '#FFFFFF' },
  logo: null,
  league: 'Bundesliga',
  league_id: 'league-bl-uuid',
  country: 'DE',
};

// Lazy-import store + helpers AFTER mocks are set up so module init reads the mocks.
async function loadStore() {
  // Force module re-import per test to get fresh internal closure state.
  vi.resetModules();
  const mod = await import('../leagueScopeStore');
  return mod;
}

// ============================================
// Test Setup
// ============================================

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  mockQc.invalidateQueries.mockClear();
  // Wipe localStorage between tests
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
});

// ============================================
// Tests
// ============================================

describe('useLeagueScope — initial state', () => {
  it('initializes with null leagueId, empty strings, and hydrated=false', async () => {
    const { useLeagueScope } = await loadStore();
    const state = useLeagueScope.getState();
    expect(state.leagueId).toBeNull();
    expect(state.leagueName).toBe('');
    expect(state.countryCode).toBe('');
    expect(state.hydrated).toBe(false);
  });
});

describe('useLeagueScope — cascade Stage 1 (profile.favorite_club_id)', () => {
  it('hydrates from favorite_club via getClub() lookup', async () => {
    const { useLeagueScope } = await loadStore();
    const { getClub } = await import('@/lib/clubs');
    vi.mocked(getClub).mockReturnValue(FAVORITE_CLUB);

    await useLeagueScope.getState().hydrateFromCascade({
      profileFavoriteClubId: 'club-bayern-uuid',
      activeClubLeagueId: null,
      activeClubName: null,
      activeClubCountry: null,
    });

    const state = useLeagueScope.getState();
    expect(state.leagueId).toBe('league-bl-uuid');
    expect(state.leagueName).toBe('Bundesliga');
    expect(state.countryCode).toBe('DE');
    expect(state.hydrated).toBe(true);
  });

  it('falls through to Stage 2 when favorite_club returns null (EC-01 zombie-uuid)', async () => {
    const { useLeagueScope } = await loadStore();
    const { getClub } = await import('@/lib/clubs');
    vi.mocked(getClub).mockReturnValue(null); // Zombie UUID

    await useLeagueScope.getState().hydrateFromCascade({
      profileFavoriteClubId: 'zombie-uuid',
      activeClubLeagueId: 'league-tff1-uuid',
      activeClubName: 'TFF 1. Lig',
      activeClubCountry: 'TR',
    });

    const state = useLeagueScope.getState();
    expect(state.leagueId).toBe('league-tff1-uuid');
    expect(state.leagueName).toBe('TFF 1. Lig');
    expect(state.countryCode).toBe('TR');
    expect(state.hydrated).toBe(true);
  });

  it('falls through to Stage 2 when favorite_club lacks league_id (EC-02 legacy)', async () => {
    const { useLeagueScope } = await loadStore();
    const { getClub } = await import('@/lib/clubs');
    vi.mocked(getClub).mockReturnValue({ ...FAVORITE_CLUB, league_id: null });

    await useLeagueScope.getState().hydrateFromCascade({
      profileFavoriteClubId: 'club-bayern-uuid',
      activeClubLeagueId: 'league-pl-uuid',
      activeClubName: 'Premier League',
      activeClubCountry: 'GB',
    });

    const state = useLeagueScope.getState();
    expect(state.leagueId).toBe('league-pl-uuid');
    expect(state.leagueName).toBe('Premier League');
  });
});

describe('useLeagueScope — cascade Stage 2 (activeClub.league_id)', () => {
  it('hydrates from activeClub when no favorite_club is provided', async () => {
    const { useLeagueScope } = await loadStore();

    await useLeagueScope.getState().hydrateFromCascade({
      profileFavoriteClubId: null,
      activeClubLeagueId: 'league-pl-uuid',
      activeClubName: 'Premier League',
      activeClubCountry: 'GB',
    });

    const state = useLeagueScope.getState();
    expect(state.leagueId).toBe('league-pl-uuid');
    expect(state.leagueName).toBe('Premier League');
    expect(state.countryCode).toBe('GB');
    expect(state.hydrated).toBe(true);
  });
});

describe('useLeagueScope — cascade Stage 3 (getActiveLeagues alphabetic)', () => {
  it('falls back to alphabetically-first active league when no profile/activeClub', async () => {
    const { useLeagueScope } = await loadStore();
    const { getActiveLeagues } = await import('@/lib/leagues');
    // Order: PL, TFF1, BL → alphabetic: Bundesliga first
    vi.mocked(getActiveLeagues).mockReturnValue([PL_LEAGUE, TFF1_LEAGUE, BL_LEAGUE]);

    await useLeagueScope.getState().hydrateFromCascade({
      profileFavoriteClubId: null,
      activeClubLeagueId: null,
      activeClubName: null,
      activeClubCountry: null,
    });

    const state = useLeagueScope.getState();
    expect(state.leagueId).toBe('league-bl-uuid');
    expect(state.leagueName).toBe('Bundesliga');
    expect(state.hydrated).toBe(true);
  });

  it('flags hydrated=true even when no leagues exist', async () => {
    const { useLeagueScope } = await loadStore();
    const { getActiveLeagues } = await import('@/lib/leagues');
    vi.mocked(getActiveLeagues).mockReturnValue([]);

    await useLeagueScope.getState().hydrateFromCascade({
      profileFavoriteClubId: null,
      activeClubLeagueId: null,
      activeClubName: null,
      activeClubCountry: null,
    });

    expect(useLeagueScope.getState().hydrated).toBe(true);
    expect(useLeagueScope.getState().leagueId).toBeNull();
  });
});

describe('useLeagueScope — cascade idempotency', () => {
  it('does NOT auto-override when user already has a persisted choice', async () => {
    const { useLeagueScope } = await loadStore();
    const { getClub } = await import('@/lib/clubs');
    vi.mocked(getClub).mockReturnValue(FAVORITE_CLUB);

    // Simulate user previously chose TFF
    useLeagueScope.setState({
      leagueId: 'league-tff1-uuid',
      leagueName: 'TFF 1. Lig',
      countryCode: 'TR',
      hydrated: false,
    });

    await useLeagueScope.getState().hydrateFromCascade({
      profileFavoriteClubId: 'club-bayern-uuid',
      activeClubLeagueId: null,
      activeClubName: null,
      activeClubCountry: null,
    });

    // User-pick wins; cascade just flips hydrated=true.
    expect(useLeagueScope.getState().leagueId).toBe('league-tff1-uuid');
    expect(useLeagueScope.getState().leagueName).toBe('TFF 1. Lig');
    expect(useLeagueScope.getState().hydrated).toBe(true);
  });
});

describe('useLeagueScope — setCountry smart-collapse', () => {
  it('clears leagueId and leagueName when changing country', async () => {
    const { useLeagueScope } = await loadStore();

    // Pre-state: BL with league set
    useLeagueScope.setState({
      leagueId: 'league-bl-uuid',
      leagueName: 'Bundesliga',
      countryCode: 'DE',
      hydrated: true,
    });

    useLeagueScope.getState().setCountry('TR');

    const state = useLeagueScope.getState();
    expect(state.countryCode).toBe('TR');
    expect(state.leagueId).toBeNull();
    expect(state.leagueName).toBe('');
  });

  it('clearing country with empty string also clears league', async () => {
    const { useLeagueScope } = await loadStore();

    useLeagueScope.setState({
      leagueId: 'league-pl-uuid',
      leagueName: 'Premier League',
      countryCode: 'GB',
      hydrated: true,
    });

    useLeagueScope.getState().setCountry('');

    const state = useLeagueScope.getState();
    expect(state.countryCode).toBe('');
    expect(state.leagueId).toBeNull();
    expect(state.leagueName).toBe('');
  });
});

describe('useLeagueScope — setLeagueScope cache invalidation (EC-13 / AR-13)', () => {
  it('invalidates 5 React-Query prefixes on setLeagueScope', async () => {
    const { useLeagueScope } = await loadStore();

    useLeagueScope.getState().setLeagueScope({
      id: 'league-bl-uuid',
      name: 'Bundesliga',
      country: 'DE',
    });

    // Wait for the lazy-imported invalidation to settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockQc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['events', 'leagueGw'],
    });
    expect(mockQc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['events', 'leagueMaxGw'],
    });
    expect(mockQc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['events', 'wildcardBalance'],
    });
    expect(mockQc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['fantasy', 'gwFixtureInfo'],
    });
    expect(mockQc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['fantasy', 'fixtureDeadlines'],
    });
    expect(mockQc.invalidateQueries).toHaveBeenCalledTimes(5);
  });

  it('also invalidates on setCountry', async () => {
    const { useLeagueScope } = await loadStore();

    useLeagueScope.getState().setCountry('TR');
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 5 distinct keys per call.
    expect(mockQc.invalidateQueries).toHaveBeenCalledTimes(5);
  });
});

describe('useLeagueScope — localStorage persistence', () => {
  it('persists state across module reloads', async () => {
    {
      const { useLeagueScope } = await loadStore();
      useLeagueScope.getState().setLeagueScope({
        id: 'league-bl-uuid',
        name: 'Bundesliga',
        country: 'DE',
      });
    }
    // Re-import the module: should rehydrate from localStorage.
    {
      const { useLeagueScope } = await loadStore();
      const state = useLeagueScope.getState();
      expect(state.leagueId).toBe('league-bl-uuid');
      expect(state.leagueName).toBe('Bundesliga');
      expect(state.countryCode).toBe('DE');
    }
  });

  it('silent-resets on corrupted localStorage JSON (EC-03)', async () => {
    window.localStorage.setItem('bescout-league-scope-v1', '{"this-is": invalid JSON}');
    const { useLeagueScope } = await loadStore();
    const state = useLeagueScope.getState();
    expect(state.leagueId).toBeNull();
    expect(state.leagueName).toBe('');
    // Corrupted blob removed from storage:
    expect(window.localStorage.getItem('bescout-league-scope-v1')).toBeNull();
  });

  it('silent-resets on schema-mismatch (missing field, EC-03)', async () => {
    window.localStorage.setItem(
      'bescout-league-scope-v1',
      JSON.stringify({ leagueId: 'x', leagueName: 'y' }), // missing countryCode
    );
    const { useLeagueScope } = await loadStore();
    const state = useLeagueScope.getState();
    expect(state.leagueId).toBeNull();
    expect(state.countryCode).toBe('');
    expect(window.localStorage.getItem('bescout-league-scope-v1')).toBeNull();
  });

  it('silent-resets on schema-mismatch (wrong types, EC-03)', async () => {
    window.localStorage.setItem(
      'bescout-league-scope-v1',
      JSON.stringify({ leagueId: 123, leagueName: 'y', countryCode: 'DE' }), // leagueId as number
    );
    const { useLeagueScope } = await loadStore();
    const state = useLeagueScope.getState();
    expect(state.leagueId).toBeNull();
    expect(window.localStorage.getItem('bescout-league-scope-v1')).toBeNull();
  });
});

describe('useLeagueScope — resetToDefault', () => {
  it('resets all fields to default (no scope)', async () => {
    const { useLeagueScope } = await loadStore();

    useLeagueScope.setState({
      leagueId: 'league-bl-uuid',
      leagueName: 'Bundesliga',
      countryCode: 'DE',
      hydrated: true,
    });

    useLeagueScope.getState().resetToDefault();

    const state = useLeagueScope.getState();
    expect(state.leagueId).toBeNull();
    expect(state.leagueName).toBe('');
    expect(state.countryCode).toBe('');
  });
});
