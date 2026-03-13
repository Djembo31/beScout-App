'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Users, MessageCircle } from 'lucide-react';
import { Skeleton, ErrorState } from '@/components/ui';
import { cn } from '@/lib/utils';
import NewUserTip from '@/components/onboarding/NewUserTip';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { createPost, uploadPostImage, votePost, getUserPostVotes, deletePost, adminDeletePost, adminTogglePin } from '@/lib/services/posts';
import { getActiveSubscriptionsByUsers } from '@/lib/services/clubSubscriptions';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { createResearchPost, resolveExpiredResearch, unlockResearch, rateResearch } from '@/lib/services/research';
import { submitBountyResponse, createUserBounty } from '@/lib/services/bounties';
import { getClubBySlug, getUserPrimaryClub } from '@/lib/services/club';
import { castVote, getUserVotedIds } from '@/lib/services/votes';
import { castCommunityPollVote, getUserPollVotedIds, cancelCommunityPoll } from '@/lib/services/communityPolls';
import { getGesamtRang } from '@/lib/gamification';
import {
  usePlayerNames, useHoldings, usePosts, useLeaderboard,
  useFollowingIds, useFollowerCount, useFollowingCount,
  useClubVotes, useResearchPosts, useActiveBounties, useClubSubscription,
  useUserStats, useCommunityPolls,
  qk, invalidateResearchQueries,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import CommunityHero from '@/components/community/CommunityHero';
import CommunityFeedTab from '@/components/community/CommunityFeedTab';
import type { ContentFilter } from '@/components/community/CommunityFeedTab';
import CommunitySidebar from '@/components/community/CommunitySidebar';
import CreatePostModal from '@/components/community/CreatePostModal';
import CreateResearchModal from '@/components/community/CreateResearchModal';
import CreateBountyModal from '@/components/community/CreateBountyModal';
import FollowListModal from '@/components/profile/FollowListModal';
import type { PostWithAuthor, PostType } from '@/types';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const MissionHintList = dynamic(() => import('@/components/missions/MissionHintList'), { ssr: false });

// ============================================
// MAIN PAGE — Scouting Zone
// ============================================

export default function CommunityPage() {
  const { user, profile } = useUser();
  const { addToast } = useToast();
  const { activeClub } = useClub();
  const t = useTranslations('community');
  const tt = useTranslations('tips');
  const uid = user?.id;

  // Club context
  const [clubId, setClubId] = useState<string | null>(profile?.favorite_club_id ?? null);
  const [clubName, setClubName] = useState<string | null>(profile?.favorite_club ?? null);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubScope, setClubScope] = useState<'all' | 'myclub'>('all');

  // UI State
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createResearchOpen, setCreateResearchOpen] = useState(false);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);
  const [defaultPostType, setDefaultPostType] = useState<PostType>('general');
  const [createBountyOpen, setCreateBountyOpen] = useState(false);

  // Action loading state
  const [postLoading, setPostLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [bountySubmitting, setBountySubmitting] = useState<string | null>(null);
  const [bountyCreating, setBountyCreating] = useState(false);
  const [unlockingResearchId, setUnlockingResearchId] = useState<string | null>(null);
  const [ratingResearchId, setRatingResearchId] = useState<string | null>(null);

  // User-specific vote tracking
  const [myPostVotes, setMyPostVotes] = useState<Map<string, number>>(new Map());
  const [userVotedIds, setUserVotedIds] = useState<Set<string>>(new Set());
  const [userPollVotedIds, setUserPollVotedIds] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [pollVotingId, setPollVotingId] = useState<string | null>(null);

  // Subscription tiers for post authors
  const [subscriptionMap, setSubscriptionMap] = useState<Map<string, SubscriptionTier>>(new Map());

  // ---- Scope-dependent club ID for queries ----
  const scopeClubId = clubScope === 'myclub' ? (activeClub?.id ?? clubId ?? undefined) : undefined;

  // ---- React Query: shared data ----
  const { data: posts = [], isLoading: postsLoading, isError: postsError } = usePosts({ limit: 50, clubId: scopeClubId });
  const { data: clubVotes = [] } = useClubVotes(clubId);
  const { data: leaderboard = [] } = useLeaderboard(50);
  const { data: followingIdsList = [] } = useFollowingIds(uid);
  const { data: rawHoldings = [] } = useHoldings(uid);
  const { data: playerNames = [] } = usePlayerNames();
  const { data: researchPosts = [] } = useResearchPosts(uid);
  const { data: followerCount = 0 } = useFollowerCount(uid);
  const { data: followingCountNum = 0 } = useFollowingCount(uid);
  const { data: bounties = [] } = useActiveBounties(uid, scopeClubId);
  const { data: subscription } = useClubSubscription(uid, clubId ?? undefined);
  const { data: userStats } = useUserStats(uid);
  const { data: communityPolls = [] } = useCommunityPolls(scopeClubId);

  // ---- Derived data ----
  const followingIds = useMemo(() => new Set(followingIdsList), [followingIdsList]);
  const ownedPlayerIds = useMemo(() => new Set(rawHoldings.map(h => h.player_id)), [rawHoldings]);
  const allPlayers = playerNames;

  // User rang tier for research gate (Bronze II = tier 2)
  const userRangTier = useMemo(() => {
    if (!userStats) return 0;
    const rang = getGesamtRang({
      trader_score: userStats.trading_score ?? 0,
      manager_score: userStats.manager_score ?? 0,
      analyst_score: userStats.scout_score ?? 0,
    });
    return rang.tier;
  }, [userStats]);

  // ---- Club context resolution ----
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    async function resolveClub() {
      resolveExpiredResearch().catch(err => console.error('[Community] Resolve expired research:', err));

      let cId = profile?.favorite_club_id ?? clubId;
      let cName = profile?.favorite_club ?? clubName;
      if (!cId) {
        const primaryClub = await getUserPrimaryClub(uid!);
        if (primaryClub) { cId = primaryClub.id; cName = primaryClub.name; }
      }
      const clubData = cId
        ? await getClubBySlug(cName ?? '', uid!).catch(() => null)
        : await getClubBySlug('sakaryaspor', uid!).catch(() => null);
      if (!cId && clubData) { cId = clubData.id; cName = clubData.name; }
      if (!cancelled && cId) { setClubId(cId); setClubName(cName); }
      if (!cancelled && clubData) { setIsClubAdmin(clubData.is_admin); }
    }
    resolveClub();
    return () => { cancelled = true; };
  }, [uid, profile]);

  // ---- Load user-specific vote data ----
  useEffect(() => {
    if (!uid || !posts.length) return;
    let cancelled = false;
    async function loadVoteData() {
      const postVotes = await getUserPostVotes(uid!, posts.map(p => p.id));
      if (!cancelled) setMyPostVotes(postVotes);
    }
    loadVoteData();
    return () => { cancelled = true; };
  }, [uid, posts]);

  // ---- Load user club vote + poll vote IDs ----
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    async function loadVoteIds() {
      const [vIds, pIds] = await Promise.all([
        getUserVotedIds(uid!).catch(() => new Set<string>()),
        getUserPollVotedIds(uid!).catch(() => new Set<string>()),
      ]);
      if (!cancelled) {
        setUserVotedIds(vIds);
        setUserPollVotedIds(pIds);
      }
    }
    loadVoteIds();
    return () => { cancelled = true; };
  }, [uid]);

  // ---- Load subscription tiers for post authors ----
  useEffect(() => {
    if (!posts.length) return;
    let cancelled = false;
    const authorIds = Array.from(new Set(posts.map(p => p.user_id)));
    getActiveSubscriptionsByUsers(authorIds).then(map => {
      if (!cancelled) setSubscriptionMap(map);
    }).catch(err => console.error('[Community] Subscription fetch:', err));
    return () => { cancelled = true; };
  }, [posts]);

  // ---- Handlers ----
  const handleVotePost = useCallback(async (postId: string, voteType: number) => {
    if (!uid) return;
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
      const result = await votePost(uid, postId, voteType);
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
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  }, [uid, myPostVotes, scopeClubId, addToast]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!uid) return;
    try {
      await deletePost(uid, postId);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err) {
      console.error('[Community] Delete post failed:', err);
      addToast(t('deleteError'), 'error');
    }
  }, [uid, addToast, t]);

  const handleAdminDeletePost = useCallback(async (postId: string) => {
    if (!uid) return;
    try {
      const result = await adminDeletePost(uid, postId);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        addToast(t('postRemoved'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('deleteError'), 'error');
    }
  }, [uid, addToast, t]);

  const handleTogglePin = useCallback(async (postId: string, pinned: boolean) => {
    if (!uid) return;
    try {
      const result = await adminTogglePin(uid, postId, pinned);
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
  }, [uid, addToast, scopeClubId, t]);

  const handleCreatePost = useCallback(async (playerId: string | null, content: string, tags: string[], category: string, postType: PostType = 'general', imageFile: File | null = null) => {
    if (!uid) return;
    if (!clubId) { addToast(t('noClubSelected'), 'error'); return; }
    setPostLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadPostImage(uid, imageFile);
      }
      await createPost(uid, playerId, clubName, content, tags, category, clubId, postType, null, null, null, imageUrl);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setCreatePostOpen(false);
    } catch (err) {
      console.error('[Community] Post creation failed:', err);
      addToast(t('postCreateError'), 'error');
    } finally {
      setPostLoading(false);
    }
  }, [uid, clubName, clubId, addToast, t]);

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
    if (!uid) return;
    if (!clubId) { addToast(t('feed.noClub'), 'error'); return; }
    setResearchLoading(true);
    try {
      await createResearchPost({
        userId: uid,
        playerId: params.playerId,
        clubName: clubName,
        clubId: clubId,
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
      invalidateResearchQueries(uid);
      setCreateResearchOpen(false);
      addToast(t('researchPublished'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('researchPublishError'), 'error');
    } finally {
      setResearchLoading(false);
    }
  }, [uid, clubName, clubId, userRangTier, addToast, t]);

  const handleBountySubmit = useCallback(async (bountyId: string, title: string, content: string, evaluation?: Record<string, unknown> | null) => {
    if (!uid) return;
    setBountySubmitting(bountyId);
    try {
      const result = await submitBountyResponse(uid, bountyId, title, content, evaluation);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['bounties'] });
        addToast(t('bountySection.submitted'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      console.error('[Community] Bounty submit failed:', err);
      addToast(t('submitError'), 'error');
    } finally {
      setBountySubmitting(null);
    }
  }, [uid, addToast, t]);

  const handleUnlockResearch = useCallback(async (postId: string) => {
    if (!uid) return;
    setUnlockingResearchId(postId);
    try {
      const result = await unlockResearch(uid, postId);
      if (result.success) {
        invalidateResearchQueries(uid);
        addToast(t('researchUnlocked'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      setUnlockingResearchId(null);
    }
  }, [uid, addToast, t]);

  const handleRateResearch = useCallback(async (postId: string, rating: number) => {
    if (!uid) return;
    setRatingResearchId(postId);
    try {
      const result = await rateResearch(uid, postId, rating);
      if (result.success) {
        invalidateResearchQueries(uid);
        addToast(t('ratingSaved'), 'success');
      } else {
        addToast(result.error ?? t('genericError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      setRatingResearchId(null);
    }
  }, [uid, addToast, t]);

  const handleCastVote = useCallback(async (voteId: string, optionIndex: number) => {
    if (!uid) return;
    setVotingId(voteId);
    try {
      await castVote(uid, voteId, optionIndex);
      setUserVotedIds(prev => new Set([...Array.from(prev), voteId]));
      queryClient.invalidateQueries({ queryKey: ['clubVotes'] });
      addToast(t('voteCast'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      setVotingId(null);
    }
  }, [uid, addToast, t]);

  const handleCastPollVote = useCallback(async (pollId: string, optionIndex: number) => {
    if (!uid) return;
    setPollVotingId(pollId);
    try {
      await castCommunityPollVote(uid, pollId, optionIndex);
      setUserPollVotedIds(prev => new Set([...Array.from(prev), pollId]));
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      addToast(t('voteCast'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      setPollVotingId(null);
    }
  }, [uid, addToast, t]);

  const handleCancelPoll = useCallback(async (pollId: string) => {
    if (!uid) return;
    try {
      await cancelCommunityPoll(uid, pollId);
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      addToast(t('pollCancelled'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    }
  }, [uid, addToast, t]);

  const handleCreateBounty = useCallback(async (params: {
    title: string;
    description: string;
    rewardCents: number;
    deadlineDays: number;
    maxSubmissions: number;
  }) => {
    if (!uid || !clubId || !clubName) {
      addToast(t('feed.noClub'), 'error');
      return;
    }
    setBountyCreating(true);
    try {
      await createUserBounty({
        userId: uid,
        clubId,
        clubName,
        title: params.title,
        description: params.description,
        rewardCents: params.rewardCents,
        deadlineDays: params.deadlineDays,
        maxSubmissions: params.maxSubmissions,
      });
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
      setCreateBountyOpen(false);
      addToast(t('createBounty.success'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('genericError'), 'error');
    } finally {
      setBountyCreating(false);
    }
  }, [uid, clubId, clubName, addToast, t]);

  if (!user) return null;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* [A] Hero + Quick Actions */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black mb-1 text-balance">{t('scoutingZone.title')}</h1>
        <p className="text-sm text-white/50 mb-4 text-pretty">{t('scoutingZone.subtitle')}</p>
        <CommunityHero
          onCreatePost={() => { setDefaultPostType('general'); setCreatePostOpen(true); }}
          onCreateRumor={() => { setDefaultPostType('transfer_rumor'); setCreatePostOpen(true); }}
          onCreateResearch={() => setCreateResearchOpen(true)}
          researchLocked={false}
          onCreateBounty={() => setCreateBountyOpen(true)}
        />
      </div>

      {/* New User Tip */}
      <NewUserTip
        tipKey="community-first-post"
        icon={<MessageCircle className="size-4" />}
        title={tt('communityTitle')}
        description={tt('communityDesc')}
        show={!!uid && !posts.some(p => p.user_id === uid)}
        action={{ label: tt('writePost'), onClick: () => { setDefaultPostType('general'); setCreatePostOpen(true); } }}
      />

      {/* Contextual Mission Hints */}
      <MissionHintList context="community" />

      {/* [B] Club Scope Toggle + Network Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {activeClub && (
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => setClubScope('all')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]',
                  clubScope === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                {t('allClubs')}
              </button>
              <button
                onClick={() => setClubScope('myclub')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]',
                  clubScope === 'myclub' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                {activeClub.short ?? t('myClub')}
              </button>
            </div>
          )}

          {/* Alle / Folge ich Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
            {(['all', 'following'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFeedMode(mode)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]',
                  feedMode === mode ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                {mode === 'all' ? t('filterAll') : t('filterFollowing')}
              </button>
            ))}
          </div>
        </div>

        {/* Network Bar */}
        <div className="flex items-center gap-3">
          <Users className="size-4 text-sky-400/60" />
          <button
            onClick={() => setFollowListMode('followers')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            <span className="font-bold tabular-nums text-white/60">{followerCount}</span>&nbsp;Follower
          </button>
          <span className="text-white/10">·</span>
          <button
            onClick={() => setFollowListMode('following')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            <span className="font-bold tabular-nums text-white/60">{followingCountNum}</span>&nbsp;{t('filterFollowing')}
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {postsLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="flex-1 h-10 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {postsError && !postsLoading && (
        <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ['posts'] })} />
      )}

      {/* [C] Feed + Sidebar Grid */}
      {!postsLoading && !postsError && (
        <>
          <SponsorBanner placement="community_feed" className="mb-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* [C.1] Feed */}
            <div className="lg:col-span-2">
              <CommunityFeedTab
                posts={posts}
                myPostVotes={myPostVotes}
                ownedPlayerIds={ownedPlayerIds}
                followingIds={followingIds}
                userId={user.id}
                isFollowingTab={feedMode === 'following'}
                onVote={handleVotePost}
                onDelete={handleDeletePost}
                onCreatePost={() => setCreatePostOpen(true)}
                onSwitchToLeaderboard={() => {}}
                isClubAdmin={isClubAdmin}
                onAdminDelete={handleAdminDeletePost}
                onTogglePin={handleTogglePin}
                subscriptionMap={subscriptionMap}
                contentFilter={contentFilter}
                onContentFilterChange={setContentFilter}
                researchPosts={researchPosts}
                bounties={bounties}
                clubVotes={clubVotes}
                communityPolls={communityPolls}
                onUnlockResearch={handleUnlockResearch}
                unlockingResearchId={unlockingResearchId}
                onRateResearch={handleRateResearch}
                ratingResearchId={ratingResearchId}
                onBountySubmit={handleBountySubmit}
                bountySubmitting={bountySubmitting}
                userTier={subscription?.tier}
                userVotedIds={userVotedIds}
                onCastVote={handleCastVote}
                votingId={votingId}
                userPollVotedIds={userPollVotedIds}
                onCastPollVote={handleCastPollVote}
                onCancelPoll={handleCancelPoll}
                pollVotingId={pollVotingId}
              />
            </div>

            {/* [C.2] Sidebar — hidden on mobile, shown as cards below feed */}
            <div className="hidden lg:block">
              <CommunitySidebar
                leaderboard={leaderboard}
                researchPosts={researchPosts}
                userId={user.id}
                onCreateResearch={() => setCreateResearchOpen(true)}
              />
            </div>
          </div>

          {/* Mobile: Sidebar content below feed */}
          <div className="lg:hidden">
            <CommunitySidebar
              leaderboard={leaderboard}
              researchPosts={researchPosts}
              userId={user.id}
              onCreateResearch={() => setCreateResearchOpen(true)}
            />
          </div>
        </>
      )}

      {/* Modals */}
      <CreatePostModal
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        players={allPlayers}
        onSubmit={handleCreatePost}
        loading={postLoading}
        defaultPostType={defaultPostType}
      />

      <CreateResearchModal
        open={createResearchOpen}
        onClose={() => setCreateResearchOpen(false)}
        players={allPlayers}
        onSubmit={handleCreateResearch}
        loading={researchLoading}
      />

      <CreateBountyModal
        open={createBountyOpen}
        onClose={() => setCreateBountyOpen(false)}
        onSubmit={handleCreateBounty}
        loading={bountyCreating}
      />

      {followListMode && user && (
        <FollowListModal
          userId={user.id}
          mode={followListMode}
          onClose={() => setFollowListMode(null)}
        />
      )}
    </div>
  );
}
