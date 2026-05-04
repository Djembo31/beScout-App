/**
 * Smoke tests for <LeagueScopeHeader /> (Slice 251 Wave 3 Track C).
 *
 * Covers:
 *  - Renders CountryBar + LeagueBar
 *  - Click on country pill → setCountry called
 *  - Click on league pill → setLeagueScope resolved with full id+name+country
 *  - i18n strings (DE pre-existing keys: countryNavLabel, leagueNavLabel) usable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// ============================================
// Mocks (top-level — lifted before imports)
// ============================================

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultMessage?: string }) =>
    opts?.defaultMessage ?? key,
  useLocale: () => 'de',
}));

const mockGetCountries = vi.fn();
const mockGetLeague = vi.fn();
const mockGetAllLeaguesCached = vi.fn();
const mockGetActiveLeagues = vi.fn();

vi.mock('@/lib/leagues', () => ({
  getCountries: (...args: unknown[]) => mockGetCountries(...args),
  getLeague: (...args: unknown[]) => mockGetLeague(...args),
  getAllLeaguesCached: () => mockGetAllLeaguesCached(),
  getActiveLeagues: () => mockGetActiveLeagues(),
  // Used by LeagueBar internals
  getLeaguesByCountry: () => [],
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn(() => Promise.resolve()) },
}));

vi.mock('@/lib/clubs', () => ({ getClub: vi.fn() }));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: vi.fn(),
}));

// Static imports replace dynamic-import-inside-loadHeader (Slice SO-3 Heal,
// Sign-Off Re-Trial #2 RISK-6). Dynamic import + vi.resetModules() caused
// 10s+ JSDOM warmup latency on first test, intermittent pre-push failures.
import { LeagueScopeHeader } from '@/components/layout/LeagueScopeHeader';
import { useLeagueScope } from '../leagueScopeStore';

// ============================================
// Test Fixtures
// ============================================

const COUNTRIES = [
  { code: 'DE', name: 'Deutschland', leagueCount: 2 },
  { code: 'TR', name: 'Türkei', leagueCount: 2 },
];

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

const BL2_LEAGUE = {
  id: 'league-bl2-uuid',
  name: '2. Bundesliga',
  short: 'BL2',
  country: 'DE',
  season: '2025/2026',
  logoUrl: null,
  apiFootballId: 79,
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

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
  mockGetCountries.mockReturnValue(COUNTRIES);
  mockGetAllLeaguesCached.mockReturnValue([BL_LEAGUE, BL2_LEAGUE, TFF1_LEAGUE]);
  mockGetActiveLeagues.mockReturnValue([BL_LEAGUE, BL2_LEAGUE, TFF1_LEAGUE]);
  mockGetLeague.mockImplementation((nameOrShort: string) => {
    if (nameOrShort === BL_LEAGUE.name || nameOrShort === BL_LEAGUE.short) return BL_LEAGUE;
    if (nameOrShort === TFF1_LEAGUE.name || nameOrShort === TFF1_LEAGUE.short) return TFF1_LEAGUE;
    return undefined;
  });
  // Reset Zustand store to clean state (replaces vi.resetModules() pattern).
  useLeagueScope.getState().resetToDefault();
});

// ============================================
// Tests
// ============================================

describe('<LeagueScopeHeader />', () => {
  it('renders CountryBar and LeagueBar', () => {
    const { container } = render(<LeagueScopeHeader />);
    // Wrapper div is present
    expect(container.querySelector('[data-testid="league-scope-header"]')).not.toBeNull();
    // CountryBar nav present
    expect(screen.getByRole('navigation', { name: /Länderwahl|countryNavLabel/ })).toBeTruthy();
    // LeagueBar nav present (only when >1 league for the selected country)
    // With no country selected (showAll = true on LeagueBar), it would show all leagues.
    // Since mockGetAllLeaguesCached returns 2 leagues > 1 → LeagueBar renders.
    expect(screen.getByRole('navigation', { name: /Liga-Auswahl|leagueNavLabel/ })).toBeTruthy();
  });

  it('clicking a country pill calls setCountry on the store', () => {
    render(<LeagueScopeHeader />);

    // Find the DE pill — its aria-label is the country name.
    const dePill = screen.getByRole('button', { name: 'Deutschland' });
    fireEvent.click(dePill);

    expect(useLeagueScope.getState().countryCode).toBe('DE');
    // Smart-collapse: leagueId/Name cleared
    expect(useLeagueScope.getState().leagueId).toBeNull();
    expect(useLeagueScope.getState().leagueName).toBe('');
  });

  it('clicking a league pill resolves to id+name+country', () => {
    render(<LeagueScopeHeader />);

    const blPill = screen.getByRole('button', { name: 'Bundesliga' });
    fireEvent.click(blPill);

    const state = useLeagueScope.getState();
    expect(state.leagueId).toBe('league-bl-uuid');
    expect(state.leagueName).toBe('Bundesliga');
    expect(state.countryCode).toBe('DE');
  });

  it('clicking the same league pill again toggles it off (LeagueBar emits "")', async () => {
    render(<LeagueScopeHeader />);

    const blPill = screen.getByRole('button', { name: 'Bundesliga' });
    // Wrap clicks in act() so React 18 batched updates flush before second click.
    await act(async () => {
      fireEvent.click(blPill);
    });
    expect(useLeagueScope.getState().leagueName).toBe('Bundesliga');

    // Re-query to get the re-rendered button reference.
    const blPillAfter = screen.getByRole('button', { name: 'Bundesliga' });
    await act(async () => {
      fireEvent.click(blPillAfter);
    });
    // Toggle-off: league reset, country preserved
    expect(useLeagueScope.getState().leagueName).toBe('');
    expect(useLeagueScope.getState().leagueId).toBeNull();
    expect(useLeagueScope.getState().countryCode).toBe('DE');
  });

  it('honours custom countries prop (e.g. event-filtered countries)', () => {
    // 2+ countries needed because CountryBar renders null when countries.length <= 1.
    render(<LeagueScopeHeader countries={[
      { code: 'TR', name: 'Türkei', leagueCount: 2 },
      { code: 'DE', name: 'Deutschland', leagueCount: 2 },
    ]} />);

    // Both pills present.
    expect(screen.getByRole('button', { name: 'Türkei' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deutschland' })).toBeTruthy();
  });
});
