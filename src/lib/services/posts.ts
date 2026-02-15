import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbPost, PostWithAuthor } from '@/types';

const TWO_MIN = 2 * 60 * 1000;

// ============================================
// Posts (Community)
// ============================================

export async function getPosts(options: {
  limit?: number;
  offset?: number;
  playerId?: string;
  userId?: string;
  clubName?: string;
}): Promise<PostWithAuthor[]> {
  const { limit = 50, offset = 0, playerId, userId, clubName } = options;
  const cacheKey = `posts:${playerId ?? ''}:${userId ?? ''}:${clubName ?? ''}:${offset}:${limit}`;

  return cached(cacheKey, async () => {
    let query = supabase
      .from('posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Only top-level posts (no replies)
    query = query.is('parent_id', null);

    if (playerId) query = query.eq('player_id', playerId);
    if (userId) query = query.eq('user_id', userId);
    if (clubName) query = query.eq('club_name', clubName);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    // Fetch author profiles
    const authorIds = Array.from(new Set((data as DbPost[]).map(p => p.user_id)));
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, level, verified')
      .in('id', authorIds);
    if (pErr) throw new Error(pErr.message);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    // Fetch player names for posts with player_id
    const playerIds = Array.from(new Set(
      (data as DbPost[]).filter(p => p.player_id).map(p => p.player_id as string)
    ));
    let playerMap = new Map<string, { name: string; pos: string }>();
    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, position')
        .in('id', playerIds);
      playerMap = new Map(
        (players ?? []).map(p => [p.id, { name: `${p.first_name} ${p.last_name}`, pos: p.position }])
      );
    }

    return (data as DbPost[]).map(post => {
      const author = profileMap.get(post.user_id);
      const player = post.player_id ? playerMap.get(post.player_id) : undefined;
      return {
        ...post,
        author_handle: author?.handle ?? 'unknown',
        author_display_name: author?.display_name ?? null,
        author_avatar_url: author?.avatar_url ?? null,
        author_level: author?.level ?? 1,
        author_verified: author?.verified ?? false,
        player_name: player?.name,
        player_position: player?.pos as PostWithAuthor['player_position'],
      };
    });
  }, TWO_MIN);
}

export async function createPost(
  userId: string,
  playerId: string | null,
  clubName: string | null,
  content: string,
  tags: string[],
  category: string = 'Meinung',
  clubId: string | null = null
): Promise<DbPost> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      player_id: playerId,
      club_name: clubName,
      club_id: clubId,
      content,
      tags,
      category,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidate('posts:');
  // Mission tracking
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(userId, ['daily_post', 'weekly_3_posts']);
  }).catch(() => {});
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'post_create', 'community', { postId: data.id, category });
  }).catch(() => {});
  return data as DbPost;
}

export async function getReplies(parentId: string): Promise<PostWithAuthor[]> {
  return cached(`replies:${parentId}`, async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    const authorIds = Array.from(new Set((data as DbPost[]).map(p => p.user_id)));
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, level, verified')
      .in('id', authorIds);
    if (pErr) throw new Error(pErr.message);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    return (data as DbPost[]).map(post => {
      const author = profileMap.get(post.user_id);
      return {
        ...post,
        author_handle: author?.handle ?? 'unknown',
        author_display_name: author?.display_name ?? null,
        author_avatar_url: author?.avatar_url ?? null,
        author_level: author?.level ?? 1,
        author_verified: author?.verified ?? false,
      };
    });
  }, TWO_MIN);
}

export async function createReply(
  userId: string,
  parentId: string,
  content: string
): Promise<DbPost> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      parent_id: parentId,
      content,
      tags: [],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidate('posts:');
  invalidate(`replies:${parentId}`);

  // Fire-and-forget: notify parent post author
  (async () => {
    try {
      const { data: parent } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', parentId)
        .single();
      if (parent && parent.user_id !== userId) {
        const { createNotification } = await import('@/lib/services/notifications');
        const { data: replier } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', userId)
          .single();
        const name = replier?.handle ?? 'Jemand';
        await createNotification(
          parent.user_id,
          'reply',
          `${name} hat auf deinen Post geantwortet`,
          content.slice(0, 100)
        );
      }
    } catch {}
  })();

  return data as DbPost;
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  invalidate('posts:');
  invalidate('replies:');
}

export async function votePost(
  userId: string,
  postId: string,
  voteType: number
): Promise<{ upvotes: number; downvotes: number }> {
  const { data, error } = await supabase.rpc('vote_post', {
    p_user_id: userId,
    p_post_id: postId,
    p_vote_type: voteType,
  });
  if (error) throw new Error(error.message);
  invalidate('posts:');
  invalidate(`postVotes:${userId}`);
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(userId, 'post_vote', 'community', { postId, voteType });
  }).catch(() => {});
  return data as { upvotes: number; downvotes: number };
}

export async function getUserPostVotes(
  userId: string,
  postIds: string[]
): Promise<Map<string, number>> {
  if (postIds.length === 0) return new Map();

  return cached(`postVotes:${userId}:${postIds.slice(0, 3).join(',')}`, async () => {
    const { data, error } = await supabase
      .from('post_votes')
      .select('post_id, vote_type')
      .eq('user_id', userId)
      .in('post_id', postIds);

    if (error) throw new Error(error.message);
    const map = new Map<string, number>();
    (data ?? []).forEach(r => map.set(r.post_id, r.vote_type));
    return map;
  }, TWO_MIN);
}

// ============================================
// Admin Moderation
// ============================================

export async function adminDeletePost(
  adminId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('admin_delete_post', {
    p_admin_id: adminId,
    p_post_id: postId,
  });
  if (error) throw new Error(error.message);
  invalidate('posts:');
  invalidate('replies:');
  return data as { success: boolean; error?: string };
}

export async function adminTogglePin(
  adminId: string,
  postId: string,
  pinned: boolean
): Promise<{ success: boolean; is_pinned?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('admin_toggle_pin', {
    p_admin_id: adminId,
    p_post_id: postId,
    p_pinned: pinned,
  });
  if (error) throw new Error(error.message);
  invalidate('posts:');
  return data as { success: boolean; is_pinned?: boolean; error?: string };
}
