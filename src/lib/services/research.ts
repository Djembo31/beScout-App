import { supabase } from '@/lib/supabaseClient';
import { cached, invalidateResearchData } from '@/lib/cache';
import type { DbResearchPost, ResearchPostWithAuthor, AuthorTrackRecord } from '@/types';
import { toPos } from '@/types';

export type RateResult = {
  success: boolean;
  error?: string;
  avg_rating?: number;
  ratings_count?: number;
  user_rating?: number;
};

const TWO_MIN = 2 * 60 * 1000;

// ============================================
// Research Posts (Premium Content / Paywall)
// ============================================

export async function getResearchPosts(options: {
  limit?: number;
  offset?: number;
  playerId?: string;
  clubName?: string;
  clubId?: string;
  currentUserId?: string;
}): Promise<ResearchPostWithAuthor[]> {
  const { limit = 50, offset = 0, playerId, clubName, clubId, currentUserId } = options;
  const cacheKey = `research:${playerId ?? ''}:${clubName ?? ''}:${clubId ?? ''}:${currentUserId ?? ''}:${offset}:${limit}`;

  return cached(cacheKey, async () => {
    let query = supabase
      .from('research_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (playerId) query = query.eq('player_id', playerId);
    if (clubId) query = query.eq('club_id', clubId);
    else if (clubName) query = query.eq('club_name', clubName);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    const posts = data as DbResearchPost[];

    // Batch fetch all enrichment data in parallel
    const authorIds = Array.from(new Set(posts.map(p => p.user_id)));
    const playerIds = Array.from(new Set(
      posts.filter(p => p.player_id).map(p => p.player_id as string)
    ));
    const postIds = posts.map(p => p.id);

    // Parallel fetch: profiles + players + (unlocks + ratings if logged in)
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url, level, verified, top_role')
        .in('id', authorIds);
      if (error) throw new Error(error.message);
      return data ?? [];
    };
    const fetchPlayers = async () => {
      if (playerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, position')
        .in('id', playerIds);
      if (error) throw new Error(error.message);
      return data ?? [];
    };

    const enrichPromises: Promise<unknown>[] = [fetchProfiles(), fetchPlayers()];
    if (currentUserId) {
      enrichPromises.push(getUserUnlockedIds(currentUserId));
      enrichPromises.push(getUserResearchRatings(currentUserId, postIds));
    }

    const enrichResults = await Promise.allSettled(enrichPromises);

    type ProfileRow = { id: string; handle: string; display_name: string | null; avatar_url: string | null; level: number; verified: boolean; top_role: string | null };
    type PlayerRow = { id: string; first_name: string; last_name: string; position: string };
    const profiles = enrichResults[0].status === 'fulfilled' ? (enrichResults[0].value as ProfileRow[]) : [];
    const players = enrichResults[1].status === 'fulfilled' ? (enrichResults[1].value as PlayerRow[]) : [];

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const playerMap = new Map<string, { name: string; pos: string }>(
      players.map(p => [p.id, { name: `${p.first_name} ${p.last_name}`, pos: p.position }])
    );

    let unlockedIds = new Set<string>();
    let ratingsMap = new Map<string, number>();
    if (currentUserId) {
      const unlocksRes = enrichResults[2];
      const ratingsRes = enrichResults[3];
      if (unlocksRes.status === 'fulfilled') unlockedIds = unlocksRes.value as Set<string>;
      if (ratingsRes.status === 'fulfilled') ratingsMap = ratingsRes.value as Map<string, number>;
    }

    return posts.map(post => {
      const author = profileMap.get(post.user_id);
      const player = post.player_id ? playerMap.get(post.player_id) : undefined;
      return {
        ...post,
        author_handle: author?.handle ?? 'unknown',
        author_display_name: author?.display_name ?? null,
        author_avatar_url: author?.avatar_url ?? null,
        author_level: author?.level ?? 1,
        author_verified: author?.verified ?? false,
        author_top_role: author?.top_role ?? null,
        player_name: post.player_id ? (player?.name ?? 'Unbekannter Spieler') : undefined,
        player_position: player ? toPos(player.pos) : undefined,
        is_unlocked: unlockedIds.has(post.id),
        is_own: post.user_id === currentUserId,
        user_rating: ratingsMap.get(post.id) ?? null,
      };
    });
  }, TWO_MIN);
}

export async function getUserUnlockedIds(userId: string): Promise<Set<string>> {
  return cached(`researchUnlocks:${userId}`, async () => {
    const { data, error } = await supabase
      .from('research_unlocks')
      .select('research_id')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return new Set((data ?? []).map(r => r.research_id));
  }, TWO_MIN);
}

export async function createResearchPost(params: {
  userId: string;
  playerId: string | null;
  clubName: string | null;
  clubId?: string | null;
  title: string;
  preview: string;
  content: string;
  tags: string[];
  category: string;
  call: string;
  horizon: string;
  price: number; // cents
}): Promise<DbResearchPost> {
  // Fetch player price snapshot for track record (floor_price > ipo_price > 0)
  let priceAtCreation = 0;
  if (params.playerId) {
    const { data: playerData } = await supabase
      .from('players')
      .select('floor_price, ipo_price')
      .eq('id', params.playerId)
      .single();
    if (playerData) priceAtCreation = playerData.floor_price || playerData.ipo_price || 0;
  }

  const { data, error } = await supabase
    .from('research_posts')
    .insert({
      user_id: params.userId,
      player_id: params.playerId,
      club_name: params.clubName,
      club_id: params.clubId ?? null,
      title: params.title,
      preview: params.preview,
      content: params.content,
      tags: params.tags,
      category: params.category,
      call: params.call,
      horizon: params.horizon,
      price: params.price,
      price_at_creation: priceAtCreation,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidateResearchData(params.userId);
  // Mission tracking
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(params.userId, ['weekly_research']);
  }).catch(err => console.error('[Research] Mission tracking failed:', err));
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'research_create', 'community', { researchId: data.id, title: params.title, call: params.call });
  }).catch(err => console.error('[Research] Activity log failed:', err));
  return data as DbResearchPost;
}

export async function deleteResearchPost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase
    .from('research_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  invalidateResearchData(userId);
}

export type UnlockResult = {
  success: boolean;
  error?: string;
  amount_paid?: number;
  author_earned?: number;
  platform_fee?: number;
};

export async function unlockResearch(userId: string, researchId: string): Promise<UnlockResult> {
  const { data, error } = await supabase.rpc('unlock_research', {
    p_user_id: userId,
    p_research_id: researchId,
  });

  if (error) throw new Error(error.message);
  const result = data as UnlockResult;

  if (result.success) {
    invalidateResearchData(userId);
    // Mission tracking
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(userId, ['daily_unlock_research']);
    }).catch(err => console.error('[Research] Mission tracking failed:', err));

    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'research_unlock', 'community', { researchId });
    }).catch(err => console.error('[Research] Activity log failed:', err));

    // Fire-and-forget notification to author
    (async () => {
      try {
        const { data: post } = await supabase
          .from('research_posts')
          .select('user_id, title')
          .eq('id', researchId)
          .single();
        if (post && post.user_id !== userId) {
          const { createNotification } = await import('@/lib/services/notifications');
          createNotification(
            post.user_id,
            'research_unlock',
            'Bericht freigeschaltet',
            `Jemand hat deinen Bericht "${post.title}" freigeschaltet`,
            researchId,
            'research'
          );
        }
      } catch (err) { console.error('[Research] Unlock notification failed:', err); }
    })();
  }

  return result;
}

// ============================================
// Research Ratings
// ============================================

export async function getUserResearchRatings(
  userId: string,
  researchIds: string[]
): Promise<Map<string, number>> {
  if (researchIds.length === 0) return new Map();

  const sortedKey = Array.from(researchIds).sort().join(',');
  return cached(`researchRatings:${userId}:${sortedKey}`, async () => {
    const { data, error } = await supabase
      .from('research_ratings')
      .select('research_id, rating')
      .eq('user_id', userId)
      .in('research_id', researchIds);

    if (error) throw new Error(error.message);
    return new Map((data ?? []).map(r => [r.research_id, r.rating as number]));
  }, TWO_MIN);
}

export async function rateResearch(
  userId: string,
  researchId: string,
  rating: number
): Promise<RateResult> {
  const { data, error } = await supabase.rpc('rate_research', {
    p_user_id: userId,
    p_research_id: researchId,
    p_rating: rating,
  });

  if (error) throw new Error(error.message);
  const result = data as RateResult;

  if (result.success) {
    invalidateResearchData(userId);
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'research_rate', 'community', { researchId, rating });
    }).catch(err => console.error('[Research] Rate activity log failed:', err));
    // Notify author
    (async () => {
      try {
        const { data: post } = await supabase
          .from('research_posts')
          .select('user_id, title')
          .eq('id', researchId)
          .single();
        if (post && post.user_id !== userId) {
          const { createNotification } = await import('@/lib/services/notifications');
          createNotification(
            post.user_id,
            'research_rating',
            `Bewertung: ${rating}/5 Sterne`,
            `Jemand hat deinen Bericht "${post.title}" bewertet`,
            researchId,
            'research'
          );
        }
      } catch (err) { console.error('[Research] Rating notification failed:', err); }
    })();
  }

  return result;
}

// ============================================
// Track Record
// ============================================

export async function resolveExpiredResearch(): Promise<number> {
  const { data, error } = await supabase.rpc('resolve_expired_research');
  if (error) return 0;
  const resolved = (data as { resolved: number })?.resolved ?? 0;
  if (resolved > 0) {
    invalidateResearchData();
  }
  return resolved;
}

export async function getAuthorTrackRecord(userId: string): Promise<AuthorTrackRecord> {
  return cached(`trackRecord:${userId}`, async () => {
    const { data, error } = await supabase
      .from('research_posts')
      .select('outcome')
      .eq('user_id', userId)
      .gt('price_at_creation', 0);

    if (error || !data) return { totalCalls: 0, correctCalls: 0, incorrectCalls: 0, pendingCalls: 0, hitRate: 0 };

    let correctCalls = 0;
    let incorrectCalls = 0;
    let pendingCalls = 0;

    for (const row of data) {
      if (row.outcome === 'correct') correctCalls++;
      else if (row.outcome === 'incorrect') incorrectCalls++;
      else pendingCalls++;
    }

    const totalCalls = correctCalls + incorrectCalls;
    const hitRate = totalCalls > 0 ? Math.round((correctCalls / totalCalls) * 100) : 0;

    return { totalCalls, correctCalls, incorrectCalls, pendingCalls, hitRate };
  }, TWO_MIN);
}
