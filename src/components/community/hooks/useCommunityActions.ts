import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import { createPost, uploadPostImage, votePost, deletePost, adminDeletePost, adminTogglePin } from '@/lib/services/posts';
import { createResearchPost, unlockResearch, rateResearch } from '@/lib/services/research';
import { submitBountyResponse, createUserBounty } from '@/lib/services/bounties';
import { castVote } from '@/lib/services/votes';
import { castCommunityPollVote, cancelCommunityPoll } from '@/lib/services/communityPolls';
import { qk, invalidateResearchQueries } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { PostWithAuthor, PostType } from '@/types';

import type { CommunityState, CommunityAction } from './types';

interface UseCommunityActionsParams {
  userId: string | undefined;
  state: CommunityState;
  dispatch: React.Dispatch<CommunityAction>;
  scopeClubId: string | undefined;
  myPostVotes: Map<string, number>;
  setMyPostVotes: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setUserVotedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setUserPollVotedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useCommunityActions({
  userId, state, dispatch, scopeClubId,
  myPostVotes, setMyPostVotes, setUserVotedIds, setUserPollVotedIds,
}: UseCommunityActionsParams) {
  const { addToast } = useToast();
  const t = useTranslations('community');
  const tErrors = useTranslations('errors');

  const handleVotePost = useCallback(async (postId: string, voteType: number) => {
    if (!userId) return;
    const prevVotes = new Map(myPostVotes);
    const oldVote = myPostVotes.get(postId) ?? 0;

    queryClient.setQueryData<PostWithAuthor[]>(
      qk.posts.list({ limit: 50, clubId: scopeClubId } as Record<string, unknown>),
      (prev) => prev?.map(p => {
        if (p.id !== postId) return p;
        let up = p.upvotes, down = p.downvotes;
        if (oldVote === 1) up--;
        if (oldVote === -1) down--;
        if (voteType === 1) up++;
        if (voteType === -1) down++;
        return { ...p, upvotes: up, downvotes: down };
      }),
    );
    setMyPostVotes(prev => {
      const next = new Map(prev);
      if (voteType === 0) next.delete(postId);
      else next.set(postId, voteType);
      return next;
    });

    try {
      const result = await votePost(userId, postId, voteType);
      queryClient.setQueryData<PostWithAuthor[]>(
        qk.posts.list({ limit: 50, clubId: scopeClubId } as Record<string, unknown>),
        (prev) => prev?.map(p =>
          p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p
        ),
      );
    } catch (err) {
      console.error('[Community] Vote post failed:', err);
      addToast(t('voteError'), 'error');
      setMyPostVotes(prevVotes);
      queryClient.invalidateQueries({ queryKey: qk.posts.all });
    }
  }, [userId, myPostVotes, scopeClubId, addToast, t, setMyPostVotes]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!userId) return;
    try {
      await deletePost(userId, postId);
      queryClient.invalidateQueries({ queryKey: qk.posts.all });
    } catch (err) {
      console.error('[Community] Delete post failed:', err);
      addToast(t('deleteError'), 'error');
    }
  }, [userId, addToast, t]);

  const handleAdminDeletePost = useCallback(async (postId: string) => {
    if (!userId) return;
    try {
      const result = await adminDeletePost(userId, postId);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: qk.posts.all });
        addToast(t('postRemoved'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('deleteError'), 'error');
    }
  }, [userId, addToast, t]);

  const handleTogglePin = useCallback(async (postId: string, pinned: boolean) => {
    if (!userId) return;
    try {
      const result = await adminTogglePin(userId, postId, pinned);
      if (result.success) {
        queryClient.setQueryData<PostWithAuthor[]>(
          qk.posts.list({ limit: 50, clubId: scopeClubId } as Record<string, unknown>),
          (prev) => prev?.map(p =>
            p.id === postId ? { ...p, is_pinned: pinned } : p
          ),
        );
        addToast(pinned ? t('postPinned') : t('postUnpinned'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    }
  }, [userId, addToast, scopeClubId, t]);

  const handleCreatePost = useCallback(async (
    playerId: string | null, content: string, tags: string[], category: string,
    postType: PostType = 'general', imageFile: File | null = null,
  ) => {
    if (!userId) return;
    if (!state.clubId) { addToast(t('noClubSelected'), 'error'); return; }
    dispatch({ type: 'SET_POST_LOADING', value: true });
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadPostImage(userId, imageFile);
      }
      await createPost(userId, playerId, state.clubName, content, tags, category, state.clubId, postType, null, null, null, imageUrl);
      queryClient.invalidateQueries({ queryKey: qk.posts.all });
      dispatch({ type: 'SET_CREATE_POST_OPEN', value: false });
    } catch (err) {
      console.error('[Community] Post creation failed:', err);
      addToast(t('postCreateError'), 'error');
    } finally {
      dispatch({ type: 'SET_POST_LOADING', value: false });
    }
  }, [userId, state.clubName, state.clubId, addToast, t, dispatch]);

  const handleCreateResearch = useCallback(async (params: {
    playerId: string | null;
    title: string;
    preview: string;
    content: string;
    tags: string[];
    category: string;
    call: string;
    horizon: string;
    priceBsd: number;
    evaluation?: Record<string, unknown> | null;
    fixtureId?: string | null;
  }) => {
    if (!userId) return;
    if (!state.clubId) { addToast(t('feed.noClub'), 'error'); return; }
    dispatch({ type: 'SET_RESEARCH_LOADING', value: true });
    try {
      await createResearchPost({
        userId,
        playerId: params.playerId,
        clubName: state.clubName,
        clubId: state.clubId,
        title: params.title,
        preview: params.preview,
        content: params.content,
        tags: params.tags,
        category: params.category,
        call: params.call,
        horizon: params.horizon,
        price: params.priceBsd * 100,
        evaluation: params.evaluation,
        fixtureId: params.fixtureId,
      });
      invalidateResearchQueries(userId);
      dispatch({ type: 'SET_CREATE_RESEARCH_OPEN', value: false });
      addToast(t('researchPublished'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('researchPublishError'), 'error');
    } finally {
      dispatch({ type: 'SET_RESEARCH_LOADING', value: false });
    }
  }, [userId, state.clubName, state.clubId, addToast, t, dispatch]);

  const handleBountySubmit = useCallback(async (
    bountyId: string, title: string, content: string, evaluation?: Record<string, unknown> | null,
  ) => {
    if (!userId) return;
    dispatch({ type: 'SET_BOUNTY_SUBMITTING', value: bountyId });
    try {
      const result = await submitBountyResponse(userId, bountyId, title, content, evaluation);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: qk.bounties.all });
        addToast(t('bountySection.submitted'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      console.error('[Community] Bounty submit failed:', err);
      addToast(t('submitError'), 'error');
    } finally {
      dispatch({ type: 'SET_BOUNTY_SUBMITTING', value: null });
    }
  }, [userId, addToast, t, dispatch]);

  const handleUnlockResearch = useCallback(async (postId: string) => {
    if (!userId) return;
    dispatch({ type: 'SET_UNLOCKING_RESEARCH', value: postId });
    try {
      const result = await unlockResearch(userId, postId);
      if (result.success) {
        invalidateResearchQueries(userId);
        addToast(t('researchUnlocked'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      dispatch({ type: 'SET_UNLOCKING_RESEARCH', value: null });
    }
  }, [userId, addToast, t, dispatch]);

  const handleRateResearch = useCallback(async (postId: string, rating: number) => {
    if (!userId) return;
    dispatch({ type: 'SET_RATING_RESEARCH', value: postId });
    try {
      const result = await rateResearch(userId, postId, rating);
      if (result.success) {
        invalidateResearchQueries(userId);
        addToast(t('ratingSaved'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      dispatch({ type: 'SET_RATING_RESEARCH', value: null });
    }
  }, [userId, addToast, t, dispatch]);

  const handleCastVote = useCallback(async (voteId: string, optionIndex: number) => {
    if (!userId) return;
    dispatch({ type: 'SET_VOTING_ID', value: voteId });
    try {
      await castVote(userId, voteId, optionIndex);
      setUserVotedIds(prev => new Set([...Array.from(prev), voteId]));
      queryClient.invalidateQueries({ queryKey: qk.votes.all });
      addToast(t('voteCast'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      dispatch({ type: 'SET_VOTING_ID', value: null });
    }
  }, [userId, addToast, t, dispatch, setUserVotedIds]);

  const handleCastPollVote = useCallback(async (pollId: string, optionIndex: number) => {
    if (!userId) return;
    dispatch({ type: 'SET_POLL_VOTING_ID', value: pollId });
    try {
      await castCommunityPollVote(userId, pollId, optionIndex);
      setUserPollVotedIds(prev => new Set([...Array.from(prev), pollId]));
      queryClient.invalidateQueries({ queryKey: qk.polls.all });
      addToast(t('voteCast'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      dispatch({ type: 'SET_POLL_VOTING_ID', value: null });
    }
  }, [userId, addToast, t, dispatch, setUserPollVotedIds]);

  const handleCancelPoll = useCallback(async (pollId: string) => {
    if (!userId) return;
    try {
      await cancelCommunityPoll(userId, pollId);
      queryClient.invalidateQueries({ queryKey: qk.polls.all });
      addToast(t('pollCancelled'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    }
  }, [userId, addToast, t]);

  const handleCreateBounty = useCallback(async (params: {
    title: string;
    description: string;
    rewardCents: number;
    deadlineDays: number;
    maxSubmissions: number;
  }) => {
    if (!userId || !state.clubId || !state.clubName) {
      addToast(t('feed.noClub'), 'error');
      return;
    }
    dispatch({ type: 'SET_BOUNTY_CREATING', value: true });
    try {
      await createUserBounty({
        userId,
        clubId: state.clubId,
        clubName: state.clubName,
        title: params.title,
        description: params.description,
        rewardCents: params.rewardCents,
        deadlineDays: params.deadlineDays,
        maxSubmissions: params.maxSubmissions,
      });
      queryClient.invalidateQueries({ queryKey: qk.bounties.all });
      dispatch({ type: 'SET_CREATE_BOUNTY_OPEN', value: false });
      addToast(t('createBounty.success'), 'success');
    } catch (err) {
      // Service throws i18n-keys (e.g. 'bountyRewardMinimum') — resolve via errors-namespace.
      // Avoids raw-key-leak (common-errors.md: i18n-Key-Leak via Service-Errors, 2026-04-14).
      const key = mapErrorToKey(normalizeError(err));
      addToast(tErrors(key), 'error');
    } finally {
      dispatch({ type: 'SET_BOUNTY_CREATING', value: false });
    }
  }, [userId, state.clubId, state.clubName, addToast, t, tErrors, dispatch]);

  return {
    handleVotePost,
    handleDeletePost,
    handleAdminDeletePost,
    handleTogglePin,
    handleCreatePost,
    handleCreateResearch,
    handleBountySubmit,
    handleUnlockResearch,
    handleRateResearch,
    handleCastVote,
    handleCastPollVote,
    handleCancelPoll,
    handleCreateBounty,
  };
}
