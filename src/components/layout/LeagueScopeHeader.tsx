'use client';

/**
 * LeagueScopeHeader — sticky header carrying CountryBar + LeagueBar bound to
 * the global useLeagueScope SSOT (Slice 251 Wave 3 Track C).
 *
 * Single source of truth for the current league filter across /fantasy,
 * /market, /manager, /rankings, /clubs.
 *
 * Mounted inline in each consumer page (replaces the existing CountryBar +
 * LeagueBar pair). Sticky `top-0 z-30` with bg matching #0a0a0a so it overlays
 * scroll content cleanly. No Layout-Shift versus the pre-Track-C inline pair.
 *
 * Mobile 393px verified: pills are scroll-x with min-h 44px touch targets
 * (inherited from CountryBar/LeagueBar). No horizontal viewport overflow.
 */

import React, { useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { CountryBar, LeagueBar } from '@/components/ui';
import { getCountries, getLeague, type CountryLocale, type CountryInfo } from '@/lib/leagues';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
import { cn } from '@/lib/utils';

interface LeagueScopeHeaderProps {
  /** Optional pre-filtered country list (e.g. only countries with events).
   *  Defaults to all countries from `getCountries(locale)`. */
  countries?: CountryInfo[];
  /** Hide the LeagueBar (e.g. when caller wants country-only). Defaults to false. */
  hideLeagueBar?: boolean;
  /** LeagueBar size — 'sm' or 'md'. Defaults to 'sm' (more compact). */
  leagueBarSize?: 'sm' | 'md';
  /** Add extra className to the outer wrapper. */
  className?: string;
  /** Make non-sticky (e.g. on small modals). Defaults to sticky. */
  nonSticky?: boolean;
}

export function LeagueScopeHeader({
  countries: countriesProp,
  hideLeagueBar = false,
  leagueBarSize = 'sm',
  className,
  nonSticky = false,
}: LeagueScopeHeaderProps) {
  const locale = useLocale() as CountryLocale;
  const countryCode = useLeagueScope((s) => s.countryCode);
  const leagueName = useLeagueScope((s) => s.leagueName);
  const setCountry = useLeagueScope((s) => s.setCountry);
  const setLeagueScope = useLeagueScope((s) => s.setLeagueScope);

  const allCountries = useMemo(() => getCountries(locale), [locale]);
  const countries = countriesProp ?? allCountries;

  // CountryBar callback: drop league when country changes (smart-collapse).
  const handleCountrySelect = useCallback(
    (code: string) => {
      setCountry(code);
    },
    [setCountry],
  );

  // LeagueBar callback: resolve league name → id + country, then commit full scope.
  // If user clicks the same league (toggle-off), LeagueBar emits '' → reset league.
  const handleLeagueSelect = useCallback(
    (name: string) => {
      if (!name) {
        // Reset to "Alle leagues" but keep current country if any.
        setLeagueScope({ id: null, name: '', country: countryCode });
        return;
      }
      const league = getLeague(name);
      if (!league) {
        // Unknown league name — silent rollback, store stays in prior state.
        return;
      }
      setLeagueScope({
        id: league.id,
        name: league.name,
        country: league.country,
      });
    },
    [countryCode, setLeagueScope],
  );

  return (
    <div
      className={cn(
        nonSticky ? '' : 'sticky top-0 z-30 -mx-4 px-4 sm:-mx-0 sm:px-0',
        // Background to overlay scroll content cleanly (BG token = #0a0a0a)
        nonSticky ? '' : 'bg-bg-main pt-1 pb-2',
        'space-y-1.5',
        className,
      )}
      data-testid="league-scope-header"
    >
      <CountryBar
        countries={countries}
        selected={countryCode}
        onSelect={handleCountrySelect}
      />
      {!hideLeagueBar && (
        <LeagueBar
          selected={leagueName}
          onSelect={handleLeagueSelect}
          country={countryCode || undefined}
          size={leagueBarSize}
        />
      )}
    </div>
  );
}

export default LeagueScopeHeader;
