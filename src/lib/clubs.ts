import { supabase } from '@/lib/supabaseClient';

// ============================================
// Club Lookup Type (used by all consumers)
// ============================================

export type ClubLookup = {
  id: string;
  slug: string;
  name: string;
  short: string;
  colors: { primary: string; secondary: string };
  logo: string | null;
  league: string;
  league_id: string | null;
};

// ============================================
// In-Memory Club Cache (loaded once from DB)
// ============================================

let clubCache: Map<string, ClubLookup> = new Map();
let cacheReady = false;
let cachePromise: Promise<void> | null = null;

/** Load all clubs from DB into the in-memory cache. Safe to call multiple times. */
export async function initClubCache(): Promise<void> {
  if (cacheReady) return;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, slug, name, short, league, league_id, primary_color, secondary_color, logo_url')
        .order('name');

      if (error) {
        console.error('[ClubCache] Failed to load clubs:', error.message);
        return;
      }

      const newCache = new Map<string, ClubLookup>();
      for (const c of data ?? []) {
        const lookup: ClubLookup = {
          id: c.id,
          slug: c.slug,
          name: c.name,
          short: c.short,
          colors: {
            primary: c.primary_color ?? '#666666',
            secondary: c.secondary_color ?? '#FFFFFF',
          },
          logo: c.logo_url,
          league: c.league,
          league_id: c.league_id,
        };
        // Index by multiple keys for flexible lookup
        newCache.set(c.id, lookup);         // UUID
        newCache.set(c.slug, lookup);       // slug
        newCache.set(c.name, lookup);       // full name
        newCache.set(c.short, lookup);      // short code (SAK, GÖZ, etc.)
      }
      clubCache = newCache;
      cacheReady = true;
    } catch (err) {
      console.error('[ClubCache] Init error:', err);
    } finally {
      cachePromise = null;
    }
  })();

  return cachePromise;
}

/** Force-refresh the club cache (e.g. after adding a new club) */
export async function refreshClubCache(): Promise<void> {
  cacheReady = false;
  cachePromise = null;
  await initClubCache();
}

// ============================================
// Sync Lookup Functions (same signatures as before)
// ============================================

/**
 * Synchronous club lookup by UUID, slug, name, or short code.
 * Returns null if cache is not yet loaded or club not found.
 * All 13 existing call-sites (PlayerRow, SpieltagTab, GameweekTab, etc.) continue to work unchanged.
 */
export function getClub(idOrName: string): ClubLookup | null {
  return clubCache.get(idOrName) ?? null;
}

/** Get club display name by any key, fallback to the key itself */
export function getClubName(id: string): string {
  return clubCache.get(id)?.name ?? id;
}

/** Get all clubs as a flat array (deduped by UUID) */
export function getAllClubsCached(): ClubLookup[] {
  const seen = new Set<string>();
  const result: ClubLookup[] = [];
  clubCache.forEach((club) => {
    if (!seen.has(club.id)) {
      seen.add(club.id);
      result.push(club);
    }
  });
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/** Check if club cache is ready */
export function isClubCacheReady(): boolean {
  return cacheReady;
}

// ============================================
// Legacy Exports (deprecated, kept for backwards-compat)
// ============================================

/** @deprecated Use getClub() with DB-backed cache instead */
export const PILOT_CLUB_ID = '2bf30014-db88-4567-9885-9da215e3a0d4';

/** @deprecated — TFF_CLUBS is now loaded from DB via initClubCache() */
export const TFF_CLUBS = [
  { id: 'sakaryaspor', name: 'Sakaryaspor', short: 'SAK', colors: { primary: '#1B5E20', secondary: '#000000' }, logo: '/clubs/sakaryaspor.png', stadiumImage: '/stadiums/sakaryaspor.jpg' },
  { id: 'goztepe', name: 'Göztepe', short: 'GÖZ', colors: { primary: '#FFD700', secondary: '#DC2626' }, logo: '/clubs/goztepe.png', stadiumImage: '/stadiums/goztepe.jpg' },
  { id: 'ankaragucu', name: 'Ankaragücü', short: 'ANK', colors: { primary: '#1E3A5F', secondary: '#FFD700' }, logo: '/clubs/ankaragucu.png', stadiumImage: '/stadiums/ankaragucu.jpg' },
  { id: 'umraniyespor', name: 'Ümraniyespor', short: 'ÜMR', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: '/clubs/umraniyespor.png', stadiumImage: '/stadiums/umraniyespor.jpg' },
  { id: 'bandirmaspor', name: 'Bandırmaspor', short: 'BAN', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: '/clubs/bandirmaspor.png', stadiumImage: '/stadiums/bandirmaspor.jpg' },
  { id: 'boluspor', name: 'Boluspor', short: 'BOL', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: '/clubs/boluspor.png', stadiumImage: '/stadiums/boluspor.jpg' },
  { id: 'keciörengücü', name: 'Keçiörengücü', short: 'KEÇ', colors: { primary: '#7C3AED', secondary: '#FFFFFF' }, logo: '/clubs/keciörengücü.png', stadiumImage: '/stadiums/keciörengücü.jpg' },
  { id: 'genclerbirligi', name: 'Gençlerbirliği', short: 'GEN', colors: { primary: '#DC2626', secondary: '#000000' }, logo: '/clubs/genclerbirligi.png', stadiumImage: '/stadiums/genclerbirligi.jpg' },
  { id: 'tuzlaspor', name: 'Tuzlaspor', short: 'TUZ', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: '/clubs/tuzlaspor.png', stadiumImage: '/stadiums/tuzlaspor.jpg' },
  { id: 'sanliurfaspor', name: 'Şanlıurfaspor', short: 'ŞAN', colors: { primary: '#16A34A', secondary: '#FFFFFF' }, logo: '/clubs/sanliurfaspor.png', stadiumImage: '/stadiums/sanliurfaspor.jpg' },
  { id: 'manisa', name: 'Manisa FK', short: 'MAN', colors: { primary: '#000000', secondary: '#FFFFFF' }, logo: '/clubs/manisa.png', stadiumImage: '/stadiums/manisa.jpg' },
  { id: 'adanaspor', name: 'Adanaspor', short: 'ADA', colors: { primary: '#F97316', secondary: '#1E3A5F' }, logo: '/clubs/adanaspor.png', stadiumImage: '/stadiums/adanaspor.jpg' },
  { id: 'altay', name: 'Altay SK', short: 'ALT', colors: { primary: '#000000', secondary: '#FFFFFF' }, logo: '/clubs/altay.png', stadiumImage: '/stadiums/altay.jpg' },
  { id: 'erzurumspor', name: 'Erzurumspor FK', short: 'ERZ', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: '/clubs/erzurumspor.png', stadiumImage: '/stadiums/erzurumspor.jpg' },
  { id: 'istaciospor', name: 'İstanbulspor', short: 'İST', colors: { primary: '#000000', secondary: '#FFD700' }, logo: '/clubs/istaciospor.png', stadiumImage: '/stadiums/istaciospor.jpg' },
  { id: 'altinordu', name: 'Altınordu FK', short: 'AOR', colors: { primary: '#DC2626', secondary: '#1E3A5F' }, logo: '/clubs/altinordu.png', stadiumImage: '/stadiums/altinordu.jpg' },
  { id: 'yeni-malatyaspor', name: 'Yeni Malatyaspor', short: 'MAL', colors: { primary: '#FFD700', secondary: '#000000' }, logo: '/clubs/yeni-malatyaspor.png', stadiumImage: '/stadiums/yeni-malatyaspor.jpg' },
  { id: 'kocaelispor', name: 'Kocaelispor', short: 'KOC', colors: { primary: '#16A34A', secondary: '#000000' }, logo: '/clubs/kocaelispor.png', stadiumImage: '/stadiums/kocaelispor.jpg' },
  { id: 'pendikspor', name: 'Pendikspor', short: 'PEN', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: '/clubs/pendikspor.png', stadiumImage: '/stadiums/pendikspor.jpg' },
  { id: 'rizespor', name: 'Çaykur Rizespor', short: 'RIZ', colors: { primary: '#16A34A', secondary: '#1E3A5F' }, logo: '/clubs/rizespor.png', stadiumImage: '/stadiums/rizespor.jpg' },
] as const;

export type ClubId = (typeof TFF_CLUBS)[number]['id'];
