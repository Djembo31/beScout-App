'use client';

import { useSyncExternalStore } from 'react';
import { subscribeLeagueCache, getLeagueCacheVersion } from '@/lib/leagues';

/**
 * Slice 286 — Reaktiver Cache-Ready-Trigger.
 *
 * Der League-Lookup-Cache (`@/lib/leagues`) wird async aus der DB befüllt.
 * Komponenten die `getCountries()` / `getAllLeaguesCached()` in einem `useMemo`
 * lesen, capturen beim ersten Render (Cold-Load) eine leere Liste und recomputen
 * sonst nie → Liga-Filter (CountryBar/LeagueBar) rendert leer.
 *
 * Diesen Versions-Wert als zusätzliche `useMemo`-dep einsetzen — er ändert sich
 * sobald der Cache geladen ist, und triggert das Recompute.
 *
 * SSR-safe: getServerSnapshot == getLeagueCacheVersion → 0 auf dem Server,
 * Client-initial ebenfalls 0 → kein Hydration-Mismatch.
 */
export function useLeagueCacheVersion(): number {
  return useSyncExternalStore(
    subscribeLeagueCache,
    getLeagueCacheVersion,
    getLeagueCacheVersion,
  );
}
