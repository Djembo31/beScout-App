'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import { createPost, votePost, getUserPostVotes, deletePost } from '@/lib/services/posts';
import { unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import { qk } from '@/lib/queries/keys';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import type { PostWithAuthor } from '@/types';

interface UsePlayerCommunityParams {
  playerId: string;
  playerClub?: string;
  userId?: string;
  playerPosts: PostWithAuthor[];
}

export function usePlayerCommunity({
  playerId, playerClub, userId, playerPosts,
}: UsePlayerCommunityParams) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const t = useTranslations('player');

  const [postLoading, setPostLoading] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [myPostVotes, setMyPostVotes] = useState<Map<string, number>>(new Map());

  // Resolve expired research on mount
  useEffect(() => {
    resolveExpiredResearch().catch(err => console.error('[Player] Resolve expired research failed:', err));
  }, []);

  // Load user post votes when posts change
  useEffect(() => {
    if (!userId || playerPosts.length === 0) return;
    getUserPostVotes(userId, playerPosts.map(p => p.id))
      .then(setMyPostVotes)
      .catch(err => console.error('[Player] Post votes failed:', err));
  }, [userId, playerPosts]);

  const handleCreatePlayerPost = useCallback(async (
    content: string, tags: string[], category: string,
    postType: 'player_take' | 'transfer_rumor' = 'player_take',
    rumorSource?: string, rumorClubTarget?: string
  ) => {
    if (!userId || !playerClub) return;
    setPostLoading(true);
    try {
      await createPost(userId, playerId, playerClub, content, tags, category, null, postType, rumorSource ?? null, rumorClubTarget ?? null);
      queryClient.invalidateQueries({ queryKey: qk.posts.all });
      addToast(t('postCreated'), 'success');
    } catch { addToast(t('postCreateError'), 'error'); }
    finally { setPostLoading(false); }
  }, [userId, playerClub, playerId, addToast, queryClient, t]);

  // Slice 162 Ferrari-Blueprint: useSafeMutation ersetzt raw async (D18 Race-Class).
  // RPC `vote_post` rejects vote_type NOT IN (1,-1); toggle-off via same-vote → RPC DELETE path.
  const votePostMut = useSafeMutation<
    Awaited<ReturnType<typeof votePost>>,
    Error,
    { postId: string; voteType: 1 | -1; isToggleOff: boolean }
  >({
    mutationFn: async ({ postId, voteType, isToggleOff }) => {
      if (!userId) throw new Error('auth_required');
      return votePost(userId, postId, voteType, isToggleOff);
    },
    onSuccess: (result, { postId, voteType, isToggleOff }) => {
      queryClient.setQueryData(qk.posts.list({ playerId, limit: 30 } as Record<string, unknown>), (old: PostWithAuthor[] | undefined) =>
        (old ?? []).map(p => p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p)
      );
      setMyPostVotes(prev => {
        const next = new Map(prev);
        if (isToggleOff) next.delete(postId);
        else next.set(postId, voteType);
        return next;
      });
    },
    errorTag: 'player.votePost',
  });

  const handleVotePlayerPost = useCallback((postId: string, voteType: 1 | -1) => {
    if (!userId) return;
    const prevVote = myPostVotes.get(postId);
    const isToggleOff = prevVote === voteType;
    votePostMut.safeTrigger({ postId, voteType, isToggleOff });
  }, [userId, myPostVotes, votePostMut]);

  const handleDeletePlayerPost = useCallback(async (postId: string) => {
    if (!userId) return;
    try {
      await deletePost(userId, postId);
      queryClient.invalidateQueries({ queryKey: qk.posts.all });
    } catch (err) { console.error('[Player] Delete post failed:', err); }
  }, [userId, queryClient]);

  const handleResearchUnlock = useCallback(async (id: string) => {
    if (!userId || unlockingId) return;
    setUnlockingId(id);
    try {
      const result = await unlockResearch(userId, id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: qk.research.all });
      }
    } catch (err) { console.error('[Player] Research unlock failed:', err); }
    finally { setUnlockingId(null); }
  }, [userId, unlockingId, queryClient]);

  const handleResearchRate = useCallback(async (id: string, rating: number) => {
    if (!userId || ratingId) return;
    setRatingId(id);
    try {
      const result = await rateResearch(userId, id, rating);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: qk.research.all });
      }
    } catch (err) { console.error('[Player] Research rate failed:', err); }
    finally { setRatingId(null); }
  }, [userId, ratingId, queryClient]);

  return {
    postLoading, unlockingId, ratingId, myPostVotes,
    handleCreatePlayerPost, handleVotePlayerPost,
    handleDeletePlayerPost, handleResearchUnlock, handleResearchRate,
  };
}
