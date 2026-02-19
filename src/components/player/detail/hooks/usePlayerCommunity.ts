'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/providers/ToastProvider';
import { createPost, votePost, getUserPostVotes, deletePost } from '@/lib/services/posts';
import { unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import { qk } from '@/lib/queries/keys';
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
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      addToast('Beitrag gepostet!', 'success');
    } catch { addToast('Beitrag konnte nicht erstellt werden', 'error'); }
    finally { setPostLoading(false); }
  }, [userId, playerClub, playerId, addToast, queryClient]);

  const handleVotePlayerPost = useCallback(async (postId: string, voteType: number) => {
    if (!userId) return;
    try {
      const result = await votePost(userId, postId, voteType);
      queryClient.setQueryData(qk.posts.list({ playerId, limit: 30 } as Record<string, unknown>), (old: PostWithAuthor[] | undefined) =>
        (old ?? []).map(p => p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p)
      );
      setMyPostVotes(prev => {
        const next = new Map(prev);
        if (voteType === 0) next.delete(postId);
        else next.set(postId, voteType);
        return next;
      });
    } catch (err) { console.error('[Player] Vote post failed:', err); }
  }, [userId, playerId, queryClient]);

  const handleDeletePlayerPost = useCallback(async (postId: string) => {
    if (!userId) return;
    try {
      await deletePost(userId, postId);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err) { console.error('[Player] Delete post failed:', err); }
  }, [userId, queryClient]);

  const handleResearchUnlock = useCallback(async (id: string) => {
    if (!userId || unlockingId) return;
    setUnlockingId(id);
    try {
      const result = await unlockResearch(userId, id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['research'] });
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
        queryClient.invalidateQueries({ queryKey: ['research'] });
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
