import { supabase } from '@/lib/supabaseClient';
import type { League } from '@/types';

// ============================================
// League Lookup Cache (analogous to clubs.ts)
// ============================================

let leagueCache: League[] = [];
let cacheReady = false;
let cachePromise: Promise<void> | null = null;

/** Country display names for CountryBar */
const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Deutschland',
  TR: 'Türkei',
  GB: 'England',
  IT: 'Italien',
  ES: 'Spanien',
  FR: 'Frankreich',
  NL: 'Niederlande',
  PT: 'Portugal',
};

export type CountryInfo = {
  code: string;
  name: string;
  leagueCount: number;
};

/** Load all leagues from DB into the in-memory cache. Safe to call multiple times. */
export async function initLeagueCache(): Promise<void> {
  if (cacheReady) return;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, short, country, season, logo_url, api_football_id, active_gameweek, max_gameweeks, is_active')
        .order('name');

      if (error) {
        console.error('[LeagueCache] Failed to load leagues:', error.message);
        return;
      }

      leagueCache = (data ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        short: l.short,
        country: l.country,
        season: l.season,
        logoUrl: l.logo_url,
        apiFootballId: l.api_football_id,
        activeGameweek: l.active_gameweek,
        maxGameweeks: l.max_gameweeks,
        isActive: l.is_active,
      }));
      cacheReady = true;
    } catch (err) {
      console.error('[LeagueCache] Init error:', err);
    } finally {
      cachePromise = null;
    }
  })();

  return cachePromise;
}

/** Force-refresh the league cache */
export async function refreshLeagueCache(): Promise<void> {
  cacheReady = false;
  cachePromise = null;
  await initLeagueCache();
}

// ============================================
// Sync Lookup Functions
// ============================================

/** Get all leagues (sorted by name) */
export function getAllLeaguesCached(): League[] {
  return leagueCache;
}

/** Get only active leagues */
export function getActiveLeagues(): League[] {
  return leagueCache.filter((l) => l.isActive);
}

/** Get a single league by name or short code */
export function getLeague(nameOrShort: string): League | undefined {
  return leagueCache.find((l) => l.name === nameOrShort || l.short === nameOrShort);
}

/** Get leagues filtered by country code (e.g. 'DE', 'TR') */
export function getLeaguesByCountry(countryCode: string): League[] {
  return leagueCache.filter((l) => l.country === countryCode);
}

/** Get unique countries with league counts (sorted by league count desc) */
export function getCountries(): CountryInfo[] {
  const map = new Map<string, number>();
  for (const l of leagueCache) {
    map.set(l.country, (map.get(l.country) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([code, count]) => ({
      code,
      name: COUNTRY_NAMES[code] ?? code,
      leagueCount: count,
    }))
    .sort((a, b) => b.leagueCount - a.leagueCount);
}

/** Get country display name by code */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

/** Check if league cache is ready */
export function isLeagueCacheReady(): boolean {
  return cacheReady;
}
