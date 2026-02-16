'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Plus } from 'lucide-react';
import { Button, Card, ErrorState, TabBar, TabPanel } from '@/components/ui';
import { val } from '@/lib/settledHelpers';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getPosts, createPost, votePost, getUserPostVotes, deletePost, adminDeletePost, adminTogglePin } from '@/lib/services/posts';
import { getAllVotes, getUserVotedIds, castVote } from '@/lib/services/votes';
import { getLeaderboard, followUser, unfollowUser, getFollowingIds } from '@/lib/services/social';
import { getHoldings } from '@/lib/services/wallet';
import { getPlayers } from '@/lib/services/players';
import { getResearchPosts, createResearchPost, unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import { getCommunityPolls, getUserPollVotedIds, castCommunityPollVote, createCommunityPoll, cancelCommunityPoll } from '@/lib/services/communityPolls';
import { getAllActiveBounties, submitBountyResponse, invalidateBountyData } from '@/lib/services/bounties';
import { getClubBySlug } from '@/lib/services/club';
import CommunityFeedTab from '@/components/community/CommunityFeedTab';
import CommunityResearchTab from '@/components/community/CommunityResearchTab';
import CommunityVotesTab from '@/components/community/CommunityVotesTab';
import CommunityLeaderboardTab from '@/components/community/CommunityLeaderboardTab';
import CreatePostModal from '@/components/community/CreatePostModal';
import CreateResearchModal from '@/components/community/CreateResearchModal';
import CreateCommunityPollModal from '@/components/community/CreateCommunityPollModal';
import CommunityBountiesTab from '@/components/community/CommunityBountiesTab';
import type { PostWithAuthor, DbClubVote, LeaderboardUser, ResearchPostWithAuthor, CommunityPollWithCreator, BountyWithCreator, ClubWithAdmin, Pos, PostType } from '@/types';

// ============================================
// TYPES
// ============================================

type MainTab = 'feed' | 'research' | 'geruechte' | 'aktionen' | 'ranking';

// ============================================
// MAIN PAGE
// ============================================

export default function CommunityPage() {
  const { user, profile } = useUser();
  const { addToast } = useToast();

  // Club context from user profile (fallback: load default)
  const [clubId, setClubId] = useState<string | null>(profile?.favorite_club_id ?? null);
  const [clubName, setClubName] = useState<string | null>(profile?.favorite_club ?? null);
  const [isClubAdmin, setIsClubAdmin] = useState(false);

  // UI State
  const [mainTab, setMainTab] = useState<MainTab>('feed');
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createResearchOpen, setCreateResearchOpen] = useState(false);
  const [createPollOpen, setCreatePollOpen] = useState(false);

  // Data State
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [myPostVotes, setMyPostVotes] = useState<Map<string, number>>(new Map());
  const [clubVotes, setClubVotes] = useState<DbClubVote[]>([]);
  const [userVotedIdSet, setUserVotedIdSet] = useState<Set<string>>(new Set());
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [ownedPlayerIds, setOwnedPlayerIds] = useState<Set<string>>(new Set());
  const [allPlayers, setAllPlayers] = useState<{ id: string; name: string; pos: Pos }[]>([]);
  const [researchPosts, setResearchPosts] = useState<ResearchPostWithAuthor[]>([]);
  const [communityPolls, setCommunityPolls] = useState<CommunityPollWithCreator[]>([]);
  const [userPollVotedIds, setUserPollVotedIds] = useState<Set<string>>(new Set());
  const [bounties, setBounties] = useState<BountyWithCreator[]>([]);
  const [rumors, setRumors] = useState<PostWithAuthor[]>([]);

  // Loading State
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [pollLoading, setPollLoading] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [pollVotingId, setPollVotingId] = useState<string | null>(null);
  const [submittingBountyId, setSubmittingBountyId] = useState<string | null>(null);

  // ---- Load Data ----
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;

    async function load() {
      setDataLoading(true);
      setDataError(false);
      // Fire-and-forget: resolve expired research calls
      resolveExpiredResearch().catch(err => console.error('[Community] Resolve expired research:', err));

      // Resolve club context: profile favorite → fallback to Sakaryaspor
      // Always load via slug to get admin status (Pilot: single club)
      const clubData = await getClubBySlug('sakaryaspor', uid);
      let cId = profile?.favorite_club_id ?? clubId;
      let cName = profile?.favorite_club ?? clubName;
      if (!cId && clubData) { cId = clubData.id; cName = clubData.name; }
      if (!cancelled && cId) { setClubId(cId); setClubName(cName); }
      if (!cancelled && clubData) { setIsClubAdmin(clubData.is_admin); }

      try {
        const results = await Promise.allSettled([
          getPosts({ limit: 50 }),
          cId ? getAllVotes(cId) : Promise.resolve([]),
          getLeaderboard(50),
          getFollowingIds(uid),
          getHoldings(uid),
          getPlayers(),
          getResearchPosts({ currentUserId: uid }),
          getCommunityPolls(),
          getAllActiveBounties(uid),
        ]);

        if (cancelled) return;

        // If ALL results failed, show error state
        const allFailed = results.every(r => r.status === 'rejected');
        if (allFailed) {
          setDataError(true);
          setDataLoading(false);
          return;
        }

        const postsResult = val(results[0], []);
        const votesResult = val(results[1], []);
        const leaderboardResult = val(results[2], []);
        const followingResult = val(results[3], []);
        const holdingsResult = val(results[4], []);
        const playersResult = val(results[5], []);
        const researchResult = val(results[6], []);
        const pollsResult = val(results[7], []);
        const bountiesResult = val(results[8], []);

        setPosts(postsResult);
        setResearchPosts(researchResult);
        setClubVotes(votesResult);
        setCommunityPolls(pollsResult);
        setBounties(bountiesResult);
        setLeaderboard(leaderboardResult);
        setFollowingIds(new Set(followingResult));
        setOwnedPlayerIds(new Set(holdingsResult.map(h => h.player_id)));
        setAllPlayers(playersResult.map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          pos: p.position as Pos,
        })));

        // Load transfer rumors (fire-and-forget)
        getPosts({ limit: 30, postType: 'transfer_rumor' })
          .then(r => { if (!cancelled) setRumors(r); })
          .catch(err => console.error('[Community] Rumors load failed:', err));

        // Post votes
        if (postsResult.length > 0) {
          const postVotesResult = await getUserPostVotes(uid, postsResult.map(p => p.id));
          if (!cancelled) setMyPostVotes(postVotesResult);
        }

        // Voted vote IDs + poll voted IDs
        const [votedResult, pollVotedResult] = await Promise.all([
          getUserVotedIds(uid),
          getUserPollVotedIds(uid),
        ]);
        if (!cancelled) {
          setUserVotedIdSet(votedResult);
          setUserPollVotedIds(pollVotedResult);
        }
      } catch {
        if (!cancelled) setDataError(true);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, profile, retryCount]);

  // ---- Handlers ----
  const handleVotePost = useCallback(async (postId: string, voteType: number) => {
    if (!user) return;
    // Optimistic update
    const prevPosts = posts;
    const prevVotes = new Map(myPostVotes);
    const oldVote = myPostVotes.get(postId) ?? 0;

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      let up = p.upvotes;
      let down = p.downvotes;
      // Remove old vote
      if (oldVote === 1) up--;
      if (oldVote === -1) down--;
      // Apply new vote
      if (voteType === 1) up++;
      if (voteType === -1) down++;
      return { ...p, upvotes: up, downvotes: down };
    }));
    setMyPostVotes(prev => {
      const next = new Map(prev);
      if (voteType === 0) next.delete(postId);
      else next.set(postId, voteType);
      return next;
    });

    try {
      const result = await votePost(user.id, postId, voteType);
      // Reconcile with server truth
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p
      ));
    } catch (err) {
      console.error('[Community] Vote post failed:', err);
      // Revert on error
      setPosts(prevPosts);
      setMyPostVotes(prevVotes);
    }
  }, [user, posts, myPostVotes]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      await deletePost(user.id, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('[Community] Delete post failed:', err);
      addToast('Fehler beim Löschen', 'error');
    }
  }, [user, addToast]);

  const handleAdminDeletePost = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      const result = await adminDeletePost(user.id, postId);
      if (result.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        addToast('Post entfernt', 'success');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler beim Löschen', 'error');
    }
  }, [user, addToast]);

  const handleTogglePin = useCallback(async (postId: string, pinned: boolean) => {
    if (!user) return;
    try {
      const result = await adminTogglePin(user.id, postId, pinned);
      if (result.success) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, is_pinned: pinned } : p
        ));
        addToast(pinned ? 'Post angepinnt' : 'Post gelöst', 'success');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler', 'error');
    }
  }, [user, addToast]);

  const handleCreatePost = useCallback(async (playerId: string | null, content: string, tags: string[], category: string, postType: PostType = 'general') => {
    if (!user) return;
    setPostLoading(true);
    try {
      await createPost(user.id, playerId, clubName, content, tags, category, clubId, postType);
      const postsResult = await getPosts({ limit: 50 });
      setPosts(postsResult);
      if (postType === 'transfer_rumor') {
        getPosts({ limit: 30, postType: 'transfer_rumor' })
          .then(r => setRumors(r))
          .catch(err => console.error('[Community] Rumors refresh:', err));
      }
      setCreatePostOpen(false);
    } catch {
      addToast('Beitrag konnte nicht erstellt werden.', 'error');
    } finally {
      setPostLoading(false);
    }
  }, [user, clubName, clubId, addToast]);

  const handleCastVote = useCallback(async (voteId: string, optionIndex: number) => {
    if (!user || votingId) return;
    setVotingId(voteId);
    try {
      await castVote(user.id, voteId, optionIndex);
      const [votesResult, votedResult] = await Promise.all([
        clubId ? getAllVotes(clubId) : Promise.resolve([]),
        getUserVotedIds(user.id),
      ]);
      setClubVotes(votesResult);
      setUserVotedIdSet(votedResult);
    } catch {
      addToast('Fehler beim Abstimmen', 'error');
    } finally {
      setVotingId(null);
    }
  }, [user, clubId, votingId, addToast]);

  const handleFollowToggle = useCallback(async (targetId: string) => {
    if (!user) return;
    const isCurrentlyFollowing = followingIds.has(targetId);
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(user.id, targetId);
        setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
      } else {
        await followUser(user.id, targetId);
        setFollowingIds(prev => new Set(prev).add(targetId));
      }
    } catch (err) {
      console.error('[Community] Follow toggle failed:', err);
    }
  }, [user, followingIds]);

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
    if (!user) return;
    setResearchLoading(true);
    try {
      await createResearchPost({
        userId: user.id,
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
      const result = await getResearchPosts({ currentUserId: user.id });
      setResearchPosts(result);
      setCreateResearchOpen(false);
      addToast('Bericht veröffentlicht!', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Bericht konnte nicht veröffentlicht werden', 'error');
    } finally {
      setResearchLoading(false);
    }
  }, [user, clubName, clubId, addToast]);

  const handleUnlockResearch = useCallback(async (researchId: string) => {
    if (!user || unlockingId) return;
    setUnlockingId(researchId);
    try {
      const result = await unlockResearch(user.id, researchId);
      if (result.success) {
        const updated = await getResearchPosts({ currentUserId: user.id });
        setResearchPosts(updated);
      }
    } catch (err) {
      console.error('[Community] Unlock research failed:', err);
      addToast('Fehler beim Freischalten', 'error');
    } finally {
      setUnlockingId(null);
    }
  }, [user, unlockingId, addToast]);

  const handleRateResearch = useCallback(async (researchId: string, rating: number) => {
    if (!user || ratingId) return;
    setRatingId(researchId);
    try {
      const result = await rateResearch(user.id, researchId, rating);
      if (result.success) {
        setResearchPosts(prev => prev.map(p =>
          p.id === researchId
            ? { ...p, avg_rating: result.avg_rating ?? p.avg_rating, ratings_count: result.ratings_count ?? p.ratings_count, user_rating: result.user_rating ?? p.user_rating }
            : p
        ));
      }
    } catch (err) {
      console.error('[Community] Rate research failed:', err);
    } finally {
      setRatingId(null);
    }
  }, [user, ratingId]);

  const handleCastPollVote = useCallback(async (pollId: string, optionIndex: number) => {
    if (!user || pollVotingId) return;
    setPollVotingId(pollId);
    try {
      const result = await castCommunityPollVote(user.id, pollId, optionIndex);
      if (result.success) {
        const [pollsResult, pollVotedResult] = await Promise.all([
          getCommunityPolls(),
          getUserPollVotedIds(user.id),
        ]);
        setCommunityPolls(pollsResult);
        setUserPollVotedIds(pollVotedResult);
        addToast('Stimme abgegeben!', 'success');
      } else {
        addToast(result.error ?? 'Fehler beim Abstimmen', 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler beim Abstimmen', 'error');
    } finally {
      setPollVotingId(null);
    }
  }, [user, pollVotingId, addToast]);

  const handleCreatePoll = useCallback(async (params: {
    question: string;
    description: string | null;
    options: string[];
    priceBsd: number;
    durationDays: number;
  }) => {
    if (!user) return;
    setPollLoading(true);
    try {
      await createCommunityPoll({
        userId: user.id,
        question: params.question,
        description: params.description,
        options: params.options,
        costCents: params.priceBsd * 100,
        durationDays: params.durationDays,
      });
      const pollsResult = await getCommunityPolls();
      setCommunityPolls(pollsResult);
      setCreatePollOpen(false);
      addToast('Umfrage erstellt!', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Umfrage konnte nicht erstellt werden', 'error');
    } finally {
      setPollLoading(false);
    }
  }, [user, addToast]);

  const handleCancelPoll = useCallback(async (pollId: string) => {
    if (!user) return;
    try {
      await cancelCommunityPoll(user.id, pollId);
      const pollsResult = await getCommunityPolls();
      setCommunityPolls(pollsResult);
      addToast('Umfrage abgebrochen', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler beim Abbrechen', 'error');
    }
  }, [user, addToast]);

  const handleSubmitBounty = useCallback(async (bountyId: string, title: string, content: string) => {
    if (!user || submittingBountyId) return;
    setSubmittingBountyId(bountyId);
    try {
      const result = await submitBountyResponse(user.id, bountyId, title, content);
      if (result.success) {
        invalidateBountyData(user.id);
        const updated = await getAllActiveBounties(user.id);
        setBounties(updated);
        addToast('Lösung eingereicht!', 'success');
      } else {
        addToast(result.error ?? 'Fehler beim Einreichen', 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler beim Einreichen', 'error');
    } finally {
      setSubmittingBountyId(null);
    }
  }, [user, submittingBountyId, addToast]);

  // ---- Tab Config ----
  const TABS: { id: MainTab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'research', label: 'Research' },
    { id: 'geruechte', label: 'Gerüchte' },
    { id: 'aktionen', label: 'Aktionen' },
    { id: 'ranking', label: 'Ranking' },
  ];

  if (!user) return null;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Community</h1>
          <p className="text-sm text-white/50 mt-1">Vernetze dich mit anderen Scouts</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setCreatePostOpen(true)}>
          <Plus className="w-4 h-4" />
          Posten
        </Button>
      </div>

      {/* Tabs */}
      <TabBar tabs={TABS} activeTab={mainTab} onChange={(id) => setMainTab(id as MainTab)} />

      {/* Loading / Error */}
      {dataLoading && !dataError && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFD700]" />
        </div>
      )}

      {dataError && !dataLoading && (
        <ErrorState onRetry={() => setRetryCount(c => c + 1)} />
      )}

      {!dataLoading && !dataError && (
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
                  {mode === 'all' ? 'Alle' : 'Folge ich'}
                </button>
              ))}
            </div>
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
              onSwitchToVotes={() => setMainTab('aktionen')}
              isClubAdmin={isClubAdmin}
              onAdminDelete={handleAdminDeletePost}
              onTogglePin={handleTogglePin}
            />
          </TabPanel>

          {/* Research */}
          <TabPanel activeTab={mainTab} id="research">
            <CommunityResearchTab
              researchPosts={researchPosts}
              onCreateResearch={() => setCreateResearchOpen(true)}
              onUnlock={handleUnlockResearch}
              unlockingId={unlockingId}
              onRate={handleRateResearch}
              ratingId={ratingId}
            />
          </TabPanel>

          {/* Gerüchte (Transfer Rumors) */}
          <TabPanel activeTab={mainTab} id="geruechte">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white/50">Transfergerüchte und Insider-Infos aus der Community</p>
              </div>
              {rumors.length === 0 ? (
                <Card className="p-8 text-center border-red-500/10">
                  <div className="text-3xl mb-3">📡</div>
                  <div className="text-white/50 text-sm mb-1">Noch keine Gerüchte</div>
                  <div className="text-white/30 text-xs mb-3">Erstelle einen Post mit Typ &quot;Gerücht&quot; oder geh zu einem Spieler!</div>
                  <Button variant="gold" size="sm" onClick={() => setCreatePostOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Gerücht posten
                  </Button>
                </Card>
              ) : (
                rumors.map(rumor => {
                  const netScore = rumor.upvotes - rumor.downvotes;
                  return (
                    <Card key={rumor.id} className="p-4 border-red-500/15 bg-red-500/[0.02] hover:border-red-500/25 transition-all">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-bold text-sm">{rumor.author_display_name || rumor.author_handle}</span>
                        <span className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/5 rounded">Lv{rumor.author_level}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-red-500/15 text-red-300 border-red-500/20">
                          {rumor.rumor_source ? `📡 ${rumor.rumor_source}` : '📡 Gerücht'}
                        </span>
                        {rumor.rumor_club_target && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-amber-500/15 text-amber-300 border-amber-500/20">
                            → {rumor.rumor_club_target}
                          </span>
                        )}
                      </div>
                      {rumor.player_id && rumor.player_name && (
                        <Link href={`/player/${rumor.player_id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/5 text-white/70 hover:bg-white/10 transition-colors mb-2">
                          {rumor.player_name}
                        </Link>
                      )}
                      <p className="text-sm text-white/80 leading-relaxed mb-2">{rumor.content}</p>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="font-mono font-bold" style={{ color: netScore > 5 ? '#22C55E' : netScore < 0 ? '#f87171' : undefined }}>
                          {netScore > 0 ? '+' : ''}{netScore} Stimmen
                        </span>
                        <span>{new Date(rumor.created_at).toLocaleDateString('de-DE')}</span>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabPanel>

          {/* Aktionen: Votes + Bounties combined */}
          <TabPanel activeTab={mainTab} id="aktionen">
            <div className="space-y-8">
              {/* Votes Section */}
              <section>
                <h2 className="text-lg font-bold mb-4">Abstimmungen & Umfragen</h2>
                <CommunityVotesTab
                  communityPolls={communityPolls}
                  userPollVotedIds={userPollVotedIds}
                  clubVotes={clubVotes}
                  userVotedIdSet={userVotedIdSet}
                  userId={user.id}
                  onCastPollVote={handleCastPollVote}
                  onCancelPoll={handleCancelPoll}
                  pollVotingId={pollVotingId}
                  onCastVote={handleCastVote}
                  votingId={votingId}
                  onCreatePoll={() => setCreatePollOpen(true)}
                />
              </section>

              {/* Bounties Section */}
              <section>
                <h2 className="text-lg font-bold mb-4">Aufträge</h2>
                <CommunityBountiesTab
                  bounties={bounties}
                  userId={user.id}
                  onSubmit={handleSubmitBounty}
                  submitting={submittingBountyId}
                />
              </section>
            </div>
          </TabPanel>

          {/* Ranking */}
          <TabPanel activeTab={mainTab} id="ranking">
            <CommunityLeaderboardTab
              leaderboard={leaderboard}
              followingIds={followingIds}
              onFollowToggle={handleFollowToggle}
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

      {/* Create Community Poll Modal */}
      <CreateCommunityPollModal
        open={createPollOpen}
        onClose={() => setCreatePollOpen(false)}
        onSubmit={handleCreatePoll}
        loading={pollLoading}
      />
    </div>
  );
}
