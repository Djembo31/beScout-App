import { supabase } from '@/lib/supabaseClient';
import { getAllClubsCached } from '@/lib/clubs';
import type { Pos } from '@/types';

export type SearchResultType = 'player' | 'club' | 'profile';

export type RichSearchResult = {
  type: SearchResultType;
  id: string;
  href: string;
  // Player
  firstName?: string;
  lastName?: string;
  position?: Pos;
  club?: string;
  clubId?: string;
  imageUrl?: string | null;
  floorPrice?: number;
  ipoPrice?: number;
  perfL5?: number;
  // Club
  clubName?: string;
  clubShort?: string;
  clubLogo?: string | null;
  clubSlug?: string;
  clubLeague?: string;
  clubColors?: { primary: string };
  followerCount?: number;
  // Profile
  handle?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  level?: number;
  totalScore?: number;
};

/** Unified search across players, clubs, and profiles */
export async function spotlightSearch(
  query: string,
  filter: SearchResultType | 'all' = 'all',
): Promise<RichSearchResult[]> {
  if (!query || query.length < 2) return [];

  const q = `%${query}%`;
  const results: RichSearchResult[] = [];

  const shouldSearch = (t: SearchResultType) => filter === 'all' || filter === t;

  // --- Clubs: client-side, instant ---
  if (shouldSearch('club')) {
    const lq = query.toLowerCase();
    const clubs = getAllClubsCached().filter(
      (c) => c.name.toLowerCase().includes(lq) || c.short.toLowerCase().includes(lq),
    );
    for (const c of clubs.slice(0, 8)) {
      results.push({
        type: 'club',
        id: c.id,
        href: `/club/${c.slug}`,
        clubName: c.name,
        clubShort: c.short,
        clubLogo: c.logo,
        clubSlug: c.slug,
        clubLeague: c.league,
        clubColors: { primary: c.colors.primary },
      });
    }
  }

  // --- Players + Profiles: parallel DB queries ---
  const promises: Promise<void>[] = [];

  if (shouldSearch('player')) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from('players')
          .select('id, first_name, last_name, position, club, club_id, floor_price, ipo_price, perf_l5, image_url')
          .or(`first_name.ilike.${q},last_name.ilike.${q}`)
          .limit(8);
        if (data) {
          for (const p of data) {
            results.push({
              type: 'player',
              id: p.id,
              href: `/player/${p.id}`,
              firstName: p.first_name,
              lastName: p.last_name,
              position: p.position as Pos,
              club: p.club,
              clubId: p.club_id,
              imageUrl: p.image_url,
              floorPrice: p.floor_price,
              ipoPrice: p.ipo_price,
              perfL5: p.perf_l5,
            });
          }
        }
      })(),
    );
  }

  if (shouldSearch('profile')) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, handle, display_name, avatar_url, level')
          .or(`handle.ilike.${q},display_name.ilike.${q}`)
          .limit(8);
        if (data && data.length > 0) {
          // Batch fetch total_score from user_stats
          const ids = data.map((u) => u.id);
          const { data: stats } = await supabase
            .from('user_stats')
            .select('user_id, total_score')
            .in('user_id', ids);
          const scoreMap = new Map<string, number>();
          if (stats) {
            for (const s of stats) scoreMap.set(s.user_id, s.total_score ?? 0);
          }

          for (const u of data) {
            results.push({
              type: 'profile',
              id: u.id,
              href: `/profile/${u.handle}`,
              handle: u.handle,
              displayName: u.display_name,
              avatarUrl: u.avatar_url,
              level: u.level,
              totalScore: scoreMap.get(u.id) ?? 0,
            });
          }
        }
      })(),
    );
  }

  await Promise.allSettled(promises);

  return results;
}
