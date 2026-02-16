import { supabase } from '@/lib/supabaseClient';

export type SearchResult = {
  type: 'player' | 'research' | 'profile' | 'post' | 'bounty';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/** Global search across players, research posts, profiles, community posts, and bounties */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const q = `%${query}%`;

  const results = await Promise.allSettled([
    // Players: search by name
    supabase
      .from('players')
      .select('id, first_name, last_name, position, club, shirt_number')
      .or(`first_name.ilike.${q},last_name.ilike.${q}`)
      .limit(5),
    // Research posts: search by title
    supabase
      .from('research_posts')
      .select('id, title, call, player_name')
      .ilike('title', q)
      .limit(5),
    // Profiles: search by handle or display_name
    supabase
      .from('profiles')
      .select('id, handle, display_name, level')
      .or(`handle.ilike.${q},display_name.ilike.${q}`)
      .limit(5),
    // Community posts: search by content
    supabase
      .from('posts')
      .select('id, content, category, post_type, player_id')
      .is('parent_id', null)
      .ilike('content', q)
      .order('created_at', { ascending: false })
      .limit(5),
    // Bounties: search by title or description
    supabase
      .from('bounties')
      .select('id, title, reward_cents, status')
      .or(`title.ilike.${q},description.ilike.${q}`)
      .eq('status', 'open')
      .limit(5),
  ]);

  const searchResults: SearchResult[] = [];

  // Players
  if (results[0].status === 'fulfilled' && results[0].value.data) {
    for (const p of results[0].value.data) {
      searchResults.push({
        type: 'player',
        id: p.id,
        title: `${p.first_name} ${p.last_name}`,
        subtitle: `#${p.shirt_number ?? 0} · ${p.position} · ${p.club}`,
        href: `/player/${p.id}`,
      });
    }
  }

  // Research
  if (results[1].status === 'fulfilled' && results[1].value.data) {
    for (const r of results[1].value.data) {
      searchResults.push({
        type: 'research',
        id: r.id,
        title: r.title,
        subtitle: r.player_name ? `${r.call} · ${r.player_name}` : r.call,
        href: '/community?tab=research',
      });
    }
  }

  // Profiles
  if (results[2].status === 'fulfilled' && results[2].value.data) {
    for (const u of results[2].value.data) {
      searchResults.push({
        type: 'profile',
        id: u.id,
        title: u.display_name || u.handle,
        subtitle: `@${u.handle} · Lv ${u.level}`,
        href: `/profile/${u.handle}`,
      });
    }
  }

  // Posts
  if (results[3].status === 'fulfilled' && results[3].value.data) {
    for (const p of results[3].value.data) {
      const preview = (p.content as string).slice(0, 60);
      const typeLabel = p.post_type === 'transfer_rumor' ? 'Gerücht' : (p.category ?? 'Post');
      searchResults.push({
        type: 'post',
        id: p.id,
        title: `${preview}${(p.content as string).length > 60 ? '…' : ''}`,
        subtitle: typeLabel,
        href: p.player_id ? `/player/${p.player_id}` : '/community',
      });
    }
  }

  // Bounties
  if (results[4].status === 'fulfilled' && results[4].value.data) {
    for (const b of results[4].value.data) {
      const rewardBsd = ((b.reward_cents as number) / 100).toLocaleString('de-DE');
      searchResults.push({
        type: 'bounty',
        id: b.id,
        title: b.title,
        subtitle: `Auftrag · ${rewardBsd} BSD`,
        href: '/community?tab=aktionen',
      });
    }
  }

  return searchResults;
}
