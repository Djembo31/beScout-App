'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Users } from 'lucide-react';
import { Button, Card, ErrorState, TabBar, TabPanel, Skeleton } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { createPost, votePost, getUserPostVotes, deletePost, adminDeletePost, adminTogglePin } from '@/lib/services/posts';
import { getActiveSubscriptionsByUsers } from '@/lib/services/clubSubscriptions';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { followUser, unfollowUser } from '@/lib/services/social';
import { createResearchPost, unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import { getClubBySlug, getUserPrimaryClub } from '@/lib/services/club';
import {
  usePlayers, useHoldings, usePosts, useLeaderboard,
  useFollowingIds, useFollowerCount, useFollowingCount,
  useClubVotes, useResearchPosts,
  qk, invalidateSocialQueries, invalidateResearchQueries,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import CommunityFeedTab from '@/components/community/CommunityFeedTab';
import CommunityResearchTab from '@/components/community/CommunityResearchTab';
import CommunityLeaderboardTab from '@/components/community/CommunityLeaderboardTab';
import CreatePostModal from '@/components/community/CreatePostModal';
import CreateResearchModal from '@/components/community/CreateResearchModal';
import FollowListModal from '@/components/profile/FollowListModal';
import type { PostWithAuthor, Pos, PostType } from '@/types';
import SponsorBanner from '@/components/player/detail/SponsorBanner';

// ============================================
// TYPES
// ============================================

type MainTab = 'feed' | 'research' | 'ranking';

// ============================================
// MAIN PAGE
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
  const [mainTab, setMainTab] = useState<MainTab>('feed');
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createResearchOpen, setCreateResearchOpen] = useState(false);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);

  // Action loading state
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);

  // User-specific vote tracking (optimistically updated by handlers)
  const [myPostVotes, setMyPostVotes] = useState<Map<string, number>>(new Map());

  // Subscription tiers for post authors (batch-fetched)
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
      // Resolve expired research (fire-and-forget)
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

  // ---- Load user-specific vote data (after posts load) ----
  useEffect(() => {
    if (!uid || !posts.length) return;
    let cancelled = false;
    async function loadVoteData() {
      const postVotes = await getUserPostVotes(uid!, posts.map(p => p.id));
      if (!cancelled) {
        setMyPostVotes(postVotes);
      }
    }
    loadVoteData();
    return () => { cancelled = true; };
  }, [uid, posts]);

  // ---- Load subscription tiers for post authors (batch) ----
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

    // Optimistic update on posts cache
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

  const handleFollowToggle = useCallback(async (targetId: string) => {
    if (!uid) return;
    const isCurrentlyFollowing = followingIds.has(targetId);
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(uid, targetId);
      } else {
        await followUser(uid, targetId);
      }
      invalidateSocialQueries(uid);
    } catch (err) {
      console.error('[Community] Follow toggle failed:', err);
      addToast('Fehler beim Folgen/Entfolgen', 'error');
    }
  }, [uid, followingIds, addToast]);

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

  const handleUnlockResearch = useCallback(async (researchId: string) => {
    if (!uid || unlockingId) return;
    setUnlockingId(researchId);
    try {
      const result = await unlockResearch(uid, researchId);
      if (result.success) {
        invalidateResearchQueries(uid);
      }
    } catch (err) {
      console.error('[Community] Unlock research failed:', err);
      addToast('Fehler beim Freischalten', 'error');
    } finally {
      setUnlockingId(null);
    }
  }, [uid, unlockingId, addToast]);

  const handleRateResearch = useCallback(async (researchId: string, rating: number) => {
    if (!uid || ratingId) return;
    setRatingId(researchId);
    try {
      const result = await rateResearch(uid, researchId, rating);
      if (result.success) {
        invalidateResearchQueries(uid);
      }
    } catch (err) {
      console.error('[Community] Rate research failed:', err);
      addToast('Fehler beim Bewerten', 'error');
    } finally {
      setRatingId(null);
    }
  }, [uid, ratingId, addToast]);

  // ---- Tab Config ----
  const TABS: { id: MainTab; label: string }[] = [
    { id: 'feed', label: t('feed') },
    { id: 'research', label: t('research') },
    { id: 'ranking', label: t('leaderboard') },
  ];

  if (!user) return null;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">{t('title')}</h1>
          <p className="text-sm text-white/50 mt-1">{t('subtitle')}</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setCreatePostOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('post')}
        </Button>
      </div>

      {/* Club Scope Toggle */}
      {activeClub && (
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl w-fit">
          <button
            onClick={() => setClubScope('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              clubScope === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t('allClubs')}
          </button>
          <button
            onClick={() => setClubScope('myclub')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              clubScope === 'myclub' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {activeClub.short ?? t('myClub')}
          </button>
        </div>
      )}

      {/* Network Bar */}
      <div className="flex items-center justify-between py-2 mb-2">
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-sky-400/60" />
          <button
            onClick={() => setFollowListMode('followers')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="font-bold text-white/60">{followerCount}</span> Follower
          </button>
          <span className="text-white/10">·</span>
          <button
            onClick={() => setFollowListMode('following')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="font-bold text-white/60">{followingCountNum}</span> Folge ich
          </button>
        </div>
        <button
          onClick={() => setFollowListMode('following')}
          className="text-[10px] font-bold text-[#FFD700]/60 hover:text-[#FFD700] transition-colors"
        >
          {tc('manage')}
        </button>
      </div>

      {/* Tabs */}
      <TabBar tabs={TABS} activeTab={mainTab} onChange={(id) => setMainTab(id as MainTab)} />

      {/* Loading / Error */}
      {postsLoading && (
        <div className="space-y-4 mt-4">
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

      {!postsLoading && !postsError && (
        <>
          {/* Feed (with Alle / Folge ich toggle) */}
          <TabPanel activeTab={mainTab} id="feed">
            <div className="flex items-center gap-2 mb-4">
              {(['all', 'following'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFeedMode(mode)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    feedMode === mode
                      ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
                  }`}
                >
                  {mode === 'all' ? t('filterAll') : t('filterFollowing')}
                </button>
              ))}
            </div>
            <SponsorBanner placement="community_feed" className="mb-3" />
            <CommunityFeedTab
              posts={posts}
              myPostVotes={myPostVotes}
              ownedPlayerIds={ownedPlayerIds}
              followingIds={followingIds}
              leaderboard={leaderboard}
              clubVotes={clubVotes}
              userId={user.id}
              isFollowingTab={feedMode === 'following'}
              onVote={handleVotePost}
              onDelete={handleDeletePost}
              onCreatePost={() => setCreatePostOpen(true)}
              onSwitchToLeaderboard={() => setMainTab('ranking')}
              isClubAdmin={isClubAdmin}
              onAdminDelete={handleAdminDeletePost}
              onTogglePin={handleTogglePin}
              subscriptionMap={subscriptionMap}
            />
          </TabPanel>

          {/* Research */}
          <TabPanel activeTab={mainTab} id="research">
            <SponsorBanner placement="community_research" className="mb-3" />
            <CommunityResearchTab
              researchPosts={researchPosts}
              onCreateResearch={() => setCreateResearchOpen(true)}
              onUnlock={handleUnlockResearch}
              unlockingId={unlockingId}
              onRate={handleRateResearch}
              ratingId={ratingId}
            />
          </TabPanel>

          {/* Ranking */}
          <TabPanel activeTab={mainTab} id="ranking">
            <CommunityLeaderboardTab
              leaderboard={leaderboard}
              followingIds={followingIds}
              onFollowToggle={handleFollowToggle}
              userId={user.id}
            />
          </TabPanel>
        </>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        players={allPlayers}
        onSubmit={handleCreatePost}
        loading={postLoading}
      />

      {/* Create Research Modal */}
      <CreateResearchModal
        open={createResearchOpen}
        onClose={() => setCreateResearchOpen(false)}
        players={allPlayers}
        onSubmit={handleCreateResearch}
        loading={researchLoading}
      />

      {/* Follow List Modal */}
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
