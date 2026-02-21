'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { Skeleton, ErrorState } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { createPost, votePost, getUserPostVotes, deletePost, adminDeletePost, adminTogglePin } from '@/lib/services/posts';
import { getActiveSubscriptionsByUsers } from '@/lib/services/clubSubscriptions';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { createResearchPost, resolveExpiredResearch } from '@/lib/services/research';
import { submitBountyResponse } from '@/lib/services/bounties';
import { getClubBySlug, getUserPrimaryClub } from '@/lib/services/club';
import {
  usePlayers, useHoldings, usePosts, useLeaderboard,
  useFollowingIds, useFollowerCount, useFollowingCount,
  useClubVotes, useResearchPosts, useActiveBounties, useClubSubscription,
  qk, invalidateResearchQueries,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import CommunityHero from '@/components/community/CommunityHero';
import CommunityBountySection from '@/components/community/CommunityBountySection';
import CommunityFeedTab from '@/components/community/CommunityFeedTab';
import CommunitySidebar from '@/components/community/CommunitySidebar';
import CreatePostModal from '@/components/community/CreatePostModal';
import CreateResearchModal from '@/components/community/CreateResearchModal';
import FollowListModal from '@/components/profile/FollowListModal';
import type { PostWithAuthor, PostType } from '@/types';
import SponsorBanner from '@/components/player/detail/SponsorBanner';

// ============================================
// MAIN PAGE — Single Scroll Layout
// ============================================

export default function CommunityPage() {
  const { user, profile } = useUser();
  const { addToast } = useToast();
  const { activeClub } = useClub();
  const t = useTranslations('community');
  const tc = useTranslations('common');
  const uid = user?.id;

  // Club context
  const [clubId, setClubId] = useState<string | null>(profile?.favorite_club_id ?? null);
  const [clubName, setClubName] = useState<string | null>(profile?.favorite_club ?? null);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubScope, setClubScope] = useState<'all' | 'myclub'>('all');

  // UI State
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createResearchOpen, setCreateResearchOpen] = useState(false);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);

  // Action loading state
  const [postLoading, setPostLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [bountySubmitting, setBountySubmitting] = useState<string | null>(null);

  // User-specific vote tracking
  const [myPostVotes, setMyPostVotes] = useState<Map<string, number>>(new Map());

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
  const { data: rawPlayers = [] } = usePlayers();
  const { data: researchPosts = [] } = useResearchPosts(uid);
  const { data: followerCount = 0 } = useFollowerCount(uid);
  const { data: followingCountNum = 0 } = useFollowingCount(uid);
  const { data: bounties = [] } = useActiveBounties(uid, scopeClubId);
  const { data: subscription } = useClubSubscription(uid, clubId ?? undefined);

  // ---- Derived data ----
  const followingIds = useMemo(() => new Set(followingIdsList), [followingIdsList]);
  const ownedPlayerIds = useMemo(() => new Set(rawHoldings.map(h => h.player_id)), [rawHoldings]);
  const allPlayers = useMemo(() =>
    rawPlayers.map(p => ({ id: p.id, name: `${p.first} ${p.last}`, pos: p.pos })),
    [rawPlayers]
  );

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
      addToast('Fehler beim Abstimmen', 'error');
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
      addToast('Fehler beim Löschen', 'error');
    }
  }, [uid, addToast]);

  const handleAdminDeletePost = useCallback(async (postId: string) => {
    if (!uid) return;
    try {
      const result = await adminDeletePost(uid, postId);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        addToast('Post entfernt', 'success');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler beim Löschen', 'error');
    }
  }, [uid, addToast]);

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
        addToast(pinned ? 'Post angepinnt' : 'Post gelöst', 'success');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler', 'error');
    }
  }, [uid, addToast, scopeClubId]);

  const handleCreatePost = useCallback(async (playerId: string | null, content: string, tags: string[], category: string, postType: PostType = 'general') => {
    if (!uid) return;
    if (!clubId) { addToast('Kein Club ausgewählt. Bitte zuerst einen Club folgen.', 'error'); return; }
    setPostLoading(true);
    try {
      await createPost(uid, playerId, clubName, content, tags, category, clubId, postType);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setCreatePostOpen(false);
    } catch {
      addToast('Beitrag konnte nicht erstellt werden.', 'error');
    } finally {
      setPostLoading(false);
    }
  }, [uid, clubName, clubId, addToast]);

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
  }) => {
    if (!uid) return;
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
      });
      invalidateResearchQueries(uid);
      setCreateResearchOpen(false);
      addToast('Bericht veröffentlicht!', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Bericht konnte nicht veröffentlicht werden', 'error');
    } finally {
      setResearchLoading(false);
    }
  }, [uid, clubName, clubId, addToast]);

  const handleBountySubmit = useCallback(async (bountyId: string, title: string, content: string) => {
    if (!uid) return;
    setBountySubmitting(bountyId);
    try {
      const result = await submitBountyResponse(uid, bountyId, title, content);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['bounties'] });
        addToast(t('bountySection.submitted'), 'success');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (err) {
      console.error('[Community] Bounty submit failed:', err);
      addToast('Fehler beim Einreichen', 'error');
    } finally {
      setBountySubmitting(null);
    }
  }, [uid, addToast, t]);

  if (!user) return null;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* [A] Hero + Quick Actions */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black mb-1">{t('title')}</h1>
        <p className="text-sm text-white/50 mb-4">{t('subtitle')}</p>
        <CommunityHero
          onCreatePost={() => { setCreatePostOpen(true); }}
          onCreateRumor={() => { setCreatePostOpen(true); /* CreatePostModal handles postType selection */ }}
          onCreateResearch={() => setCreateResearchOpen(true)}
        />
      </div>

      {/* [B] Club Scope Toggle + Network Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {activeClub && (
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => setClubScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  clubScope === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {t('allClubs')}
              </button>
              <button
                onClick={() => setClubScope('myclub')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  clubScope === 'myclub' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  feedMode === mode ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {mode === 'all' ? t('filterAll') : t('filterFollowing')}
              </button>
            ))}
          </div>
        </div>

        {/* Network Bar */}
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-sky-400/60" />
          <button
            onClick={() => setFollowListMode('followers')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            <span className="font-bold text-white/60">{followerCount}</span>&nbsp;Follower
          </button>
          <span className="text-white/10">·</span>
          <button
            onClick={() => setFollowListMode('following')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            <span className="font-bold text-white/60">{followingCountNum}</span>&nbsp;{t('filterFollowing')}
          </button>
        </div>
      </div>

      {/* [C] Bounties Section */}
      <CommunityBountySection
        bounties={bounties}
        userId={user.id}
        onSubmit={handleBountySubmit}
        submitting={bountySubmitting}
        userTier={subscription?.tier}
      />

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
                <Skeleton className="w-8 h-8 rounded-full" />
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

      {/* [D] Feed + Sidebar Grid */}
      {!postsLoading && !postsError && (
        <>
          <SponsorBanner placement="community_feed" className="mb-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* [D.1] Feed */}
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
                onSwitchToLeaderboard={() => {/* scroll to sidebar or link */}}
                isClubAdmin={isClubAdmin}
                onAdminDelete={handleAdminDeletePost}
                onTogglePin={handleTogglePin}
                subscriptionMap={subscriptionMap}
              />
            </div>

            {/* [D.2] Sidebar — hidden on mobile, shown as cards below feed */}
            <div className="hidden lg:block">
              <CommunitySidebar
                leaderboard={leaderboard}
                researchPosts={researchPosts}
                clubVotes={clubVotes}
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
              clubVotes={clubVotes}
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
      />

      <CreateResearchModal
        open={createResearchOpen}
        onClose={() => setCreateResearchOpen(false)}
        players={allPlayers}
        onSubmit={handleCreateResearch}
        loading={researchLoading}
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
