'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Users, MessageCircle } from 'lucide-react';
import { Skeleton, ErrorState } from '@/components/ui';
import { cn } from '@/lib/utils';
import NewUserTip from '@/components/onboarding/NewUserTip';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import CommunityHero from '@/components/community/CommunityHero';
import CommunityFeedTab from '@/components/community/CommunityFeedTab';
import type { ContentFilter } from '@/components/community/CommunityFeedTab';
import CommunitySidebar from '@/components/community/CommunitySidebar';
import type { PostType } from '@/types';
import dynamic from 'next/dynamic';

import { useCommunityData, useCommunityActions } from '@/components/community/hooks';
import type { CommunityState, CommunityAction } from '@/components/community/hooks';

const CreatePostModal = dynamic(() => import('@/components/community/CreatePostModal'), { ssr: false });
const CreateResearchModal = dynamic(() => import('@/components/community/CreateResearchModal'), { ssr: false });
const CreateBountyModal = dynamic(() => import('@/components/community/CreateBountyModal'), { ssr: false });
const FollowListModal = dynamic(() => import('@/components/profile/FollowListModal'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const MissionHintList = dynamic(() => import('@/components/missions/MissionHintList'), { ssr: false });

// ============================================
// State Reducer
// ============================================

function communityReducer(state: CommunityState, action: CommunityAction): CommunityState {
  switch (action.type) {
    case 'SET_CLUB': return { ...state, clubId: action.clubId, clubName: action.clubName };
    case 'SET_CLUB_ADMIN': return { ...state, isClubAdmin: action.value };
    case 'SET_CLUB_SCOPE': return { ...state, clubScope: action.value };
    case 'SET_FEED_MODE': return { ...state, feedMode: action.value };
    case 'SET_CONTENT_FILTER': return { ...state, contentFilter: action.value };
    case 'SET_CREATE_POST_OPEN': return { ...state, createPostOpen: action.value };
    case 'SET_CREATE_RESEARCH_OPEN': return { ...state, createResearchOpen: action.value };
    case 'SET_FOLLOW_LIST_MODE': return { ...state, followListMode: action.value };
    case 'SET_DEFAULT_POST_TYPE': return { ...state, defaultPostType: action.value };
    case 'SET_CREATE_BOUNTY_OPEN': return { ...state, createBountyOpen: action.value };
    case 'SET_POST_LOADING': return { ...state, postLoading: action.value };
    case 'SET_RESEARCH_LOADING': return { ...state, researchLoading: action.value };
    case 'SET_BOUNTY_SUBMITTING': return { ...state, bountySubmitting: action.value };
    case 'SET_BOUNTY_CREATING': return { ...state, bountyCreating: action.value };
    case 'SET_UNLOCKING_RESEARCH': return { ...state, unlockingResearchId: action.value };
    case 'SET_RATING_RESEARCH': return { ...state, ratingResearchId: action.value };
    case 'SET_VOTING_ID': return { ...state, votingId: action.value };
    case 'SET_POLL_VOTING_ID': return { ...state, pollVotingId: action.value };
    default: return state;
  }
}

// ============================================
// MAIN PAGE — Scouting Zone
// ============================================

export default function CommunityPage() {
  const { user, profile } = useUser();
  const { activeClub } = useClub();
  const router = useRouter();
  const t = useTranslations('community');
  const tt = useTranslations('tips');
  const uid = user?.id;

  // ─── UI State (Reducer) ─────────────────
  const [state, dispatch] = useReducer(communityReducer, {
    clubId: profile?.favorite_club_id ?? null,
    clubName: profile?.favorite_club ?? null,
    isClubAdmin: false,
    clubScope: 'all' as const,
    feedMode: 'all' as const,
    contentFilter: 'all' as ContentFilter,
    createPostOpen: false,
    createResearchOpen: false,
    followListMode: null,
    defaultPostType: 'general' as PostType,
    createBountyOpen: false,
    postLoading: false,
    researchLoading: false,
    bountySubmitting: null,
    bountyCreating: false,
    unlockingResearchId: null,
    ratingResearchId: null,
    votingId: null,
    pollVotingId: null,
  });

  // ─── Scope-dependent club ID ────────────
  const scopeClubId = state.clubScope === 'myclub' ? (activeClub?.id ?? state.clubId ?? undefined) : undefined;

  // ─── Data Hook ──────────────────────────
  const data = useCommunityData(uid, profile, scopeClubId, state, dispatch);

  // ─── Actions Hook ───────────────────────
  const actions = useCommunityActions({
    userId: uid, state, dispatch, scopeClubId,
    myPostVotes: data.myPostVotes, setMyPostVotes: data.setMyPostVotes,
    setUserVotedIds: data.setUserVotedIds, setUserPollVotedIds: data.setUserPollVotedIds,
  });

  if (!user) return null;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* [A] Hero + Quick Actions */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black mb-1 text-balance">{t('scoutingZone.title')}</h1>
        <p className="text-sm text-white/50 mb-4 text-pretty">{t('scoutingZone.subtitle')}</p>
        <CommunityHero
          onCreatePost={() => { dispatch({ type: 'SET_DEFAULT_POST_TYPE', value: 'general' }); dispatch({ type: 'SET_CREATE_POST_OPEN', value: true }); }}
          onCreateRumor={() => { dispatch({ type: 'SET_DEFAULT_POST_TYPE', value: 'transfer_rumor' }); dispatch({ type: 'SET_CREATE_POST_OPEN', value: true }); }}
          onCreateResearch={() => dispatch({ type: 'SET_CREATE_RESEARCH_OPEN', value: true })}
          researchLocked={false}
          onCreateBounty={() => dispatch({ type: 'SET_CREATE_BOUNTY_OPEN', value: true })}
        />
      </div>

      {/* New User Tip */}
      <NewUserTip
        tipKey="community-first-post"
        icon={<MessageCircle className="size-4" />}
        title={tt('communityTitle')}
        description={tt('communityDesc')}
        show={!!uid && !data.posts.some(p => p.user_id === uid)}
        action={{ label: tt('writePost'), onClick: () => { dispatch({ type: 'SET_DEFAULT_POST_TYPE', value: 'general' }); dispatch({ type: 'SET_CREATE_POST_OPEN', value: true }); } }}
      />

      {/* Contextual Mission Hints */}
      <MissionHintList context="community" />

      {/* [B] Club Scope Toggle + Network Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {activeClub && (
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => dispatch({ type: 'SET_CLUB_SCOPE', value: 'all' })}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]',
                  state.clubScope === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                {t('allClubs')}
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_CLUB_SCOPE', value: 'myclub' })}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]',
                  state.clubScope === 'myclub' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
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
                onClick={() => dispatch({ type: 'SET_FEED_MODE', value: mode })}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]',
                  state.feedMode === mode ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
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
            onClick={() => dispatch({ type: 'SET_FOLLOW_LIST_MODE', value: 'followers' })}
            className="text-xs text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            <span className="font-bold tabular-nums text-white/60">{data.followerCount}</span>&nbsp;Follower
          </button>
          <span className="text-white/10">·</span>
          <button
            onClick={() => dispatch({ type: 'SET_FOLLOW_LIST_MODE', value: 'following' })}
            className="text-xs text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            <span className="font-bold tabular-nums text-white/60">{data.followingCount}</span>&nbsp;{t('filterFollowing')}
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {data.postsLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="flex-1 h-10 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-minimal border border-white/10 rounded-2xl p-4 space-y-3">
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

      {data.postsError && !data.postsLoading && (
        <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: qk.posts.all })} />
      )}

      {/* [C] Feed + Sidebar Grid */}
      {!data.postsLoading && !data.postsError && (
        <>
          <SponsorBanner placement="community_feed" className="mb-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* [C.1] Feed */}
            <div className="lg:col-span-2">
              <CommunityFeedTab
                posts={data.posts}
                myPostVotes={data.myPostVotes}
                ownedPlayerIds={data.ownedPlayerIds}
                followingIds={data.followingIds}
                userId={user.id}
                isFollowingTab={state.feedMode === 'following'}
                onVote={actions.handleVotePost}
                onDelete={actions.handleDeletePost}
                onCreatePost={() => dispatch({ type: 'SET_CREATE_POST_OPEN', value: true })}
                onSwitchToLeaderboard={() => router.push('/')}
                isClubAdmin={state.isClubAdmin}
                onAdminDelete={actions.handleAdminDeletePost}
                onTogglePin={actions.handleTogglePin}
                subscriptionMap={data.subscriptionMap}
                contentFilter={state.contentFilter}
                onContentFilterChange={(v: ContentFilter) => dispatch({ type: 'SET_CONTENT_FILTER', value: v })}
                researchPosts={data.researchPosts}
                bounties={data.bounties}
                clubVotes={data.clubVotes}
                communityPolls={data.communityPolls}
                onUnlockResearch={actions.handleUnlockResearch}
                unlockingResearchId={state.unlockingResearchId}
                onRateResearch={actions.handleRateResearch}
                ratingResearchId={state.ratingResearchId}
                onBountySubmit={actions.handleBountySubmit}
                bountySubmitting={state.bountySubmitting}
                userTier={data.subscription?.tier}
                userVotedIds={data.userVotedIds}
                onCastVote={actions.handleCastVote}
                votingId={state.votingId}
                userPollVotedIds={data.userPollVotedIds}
                onCastPollVote={actions.handleCastPollVote}
                onCancelPoll={actions.handleCancelPoll}
                pollVotingId={state.pollVotingId}
              />
            </div>

            {/* [C.2] Sidebar — hidden on mobile, shown as cards below feed */}
            <div className="hidden lg:block">
              <CommunitySidebar
                leaderboard={data.leaderboard}
                researchPosts={data.researchPosts}
                userId={user.id}
                onCreateResearch={() => dispatch({ type: 'SET_CREATE_RESEARCH_OPEN', value: true })}
              />
            </div>
          </div>

          {/* Mobile: Sidebar content below feed */}
          <div className="lg:hidden">
            <CommunitySidebar
              leaderboard={data.leaderboard}
              researchPosts={data.researchPosts}
              userId={user.id}
              onCreateResearch={() => dispatch({ type: 'SET_CREATE_RESEARCH_OPEN', value: true })}
            />
          </div>
        </>
      )}

      {/* Modals */}
      <CreatePostModal
        open={state.createPostOpen}
        onClose={() => dispatch({ type: 'SET_CREATE_POST_OPEN', value: false })}
        players={data.allPlayers}
        onSubmit={actions.handleCreatePost}
        loading={state.postLoading}
        defaultPostType={state.defaultPostType}
      />

      <CreateResearchModal
        open={state.createResearchOpen}
        onClose={() => dispatch({ type: 'SET_CREATE_RESEARCH_OPEN', value: false })}
        players={data.allPlayers}
        onSubmit={actions.handleCreateResearch}
        loading={state.researchLoading}
      />

      <CreateBountyModal
        open={state.createBountyOpen}
        onClose={() => dispatch({ type: 'SET_CREATE_BOUNTY_OPEN', value: false })}
        onSubmit={actions.handleCreateBounty}
        loading={state.bountyCreating}
      />

      {state.followListMode && user && (
        <FollowListModal
          userId={user.id}
          mode={state.followListMode}
          onClose={() => dispatch({ type: 'SET_FOLLOW_LIST_MODE', value: null })}
        />
      )}
    </div>
  );
}
