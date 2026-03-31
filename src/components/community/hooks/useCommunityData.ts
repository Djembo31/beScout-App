import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import { getActiveSubscriptionsByUsers } from '@/lib/services/clubSubscriptions';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { resolveExpiredResearch } from '@/lib/services/research';
import { getClubBySlug, getUserPrimaryClub } from '@/lib/services/club';
import { getUserPostVotes } from '@/lib/services/posts';
import { getUserVotedIds } from '@/lib/services/votes';
import { getUserPollVotedIds } from '@/lib/services/communityPolls';
import { getGesamtRang } from '@/lib/gamification';
import {
  usePlayerNames, useHoldings, usePosts, useLeaderboard,
  useUserSocialStats,
  useClubVotes, useResearchPosts, useActiveBounties, useClubSubscription,
  useUserStats, useCommunityPolls,
} from '@/lib/queries';

import type { CommunityState, CommunityAction } from './types';

export function useCommunityData(
  userId: string | undefined,
  profile: { favorite_club_id?: string | null; favorite_club?: string | null } | null,
  scopeClubId: string | undefined,
  state: CommunityState,
  dispatch: React.Dispatch<CommunityAction>,
) {
  // ─── Deferred loading: below-fold queries load after 500ms ──
  const [deferredReady, setDeferredReady] = useState(false);
  const deferredRef = useRef(false);
  useEffect(() => {
    if (deferredRef.current) return;
    const timer = setTimeout(() => { deferredRef.current = true; setDeferredReady(true); }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ─── React Query Hooks ────────────────────
  // Critical path (feed + navigation)
  const { data: posts = [], isLoading: postsLoading, isError: postsError } = usePosts({ limit: 50, clubId: scopeClubId });
  const { data: socialStats } = useUserSocialStats(userId);
  const { data: rawHoldings = [] } = useHoldings(userId);
  const { data: playerNames = [] } = usePlayerNames();
  const { data: userStats } = useUserStats(userId);
  const { data: subscription } = useClubSubscription(userId, state.clubId ?? undefined);

  // Deferred (sidebar + below-fold — loads 500ms after mount to reduce initial burst)
  const { data: clubVotes = [] } = useClubVotes(deferredReady ? state.clubId : null);
  const { data: leaderboard = [] } = useLeaderboard(50);
  const { data: researchPosts = [] } = useResearchPosts(deferredReady ? userId : undefined);
  const { data: bounties = [] } = useActiveBounties(deferredReady ? userId : undefined, scopeClubId);
  const { data: communityPolls = [] } = useCommunityPolls(scopeClubId);

  // ─── Derived Data ─────────────────────────
  const followingIds = useMemo(() => new Set(socialStats?.following_ids ?? []), [socialStats]);
  const followerCount = socialStats?.follower_count ?? 0;
  const followingCount = socialStats?.following_count ?? 0;
  const ownedPlayerIds = useMemo(() => new Set(rawHoldings.map(h => h.player_id)), [rawHoldings]);
  const allPlayers = playerNames;

  const userRangTier = useMemo(() => {
    if (!userStats) return 0;
    const rang = getGesamtRang({
      trader_score: userStats.trading_score ?? 0,
      manager_score: userStats.manager_score ?? 0,
      analyst_score: userStats.scout_score ?? 0,
    });
    return rang.tier;
  }, [userStats]);

  // ─── Map/Set State ────────────────────────
  const [myPostVotes, setMyPostVotes] = useState<Map<string, number>>(new Map());
  const [userVotedIds, setUserVotedIds] = useState<Set<string>>(new Set());
  const [userPollVotedIds, setUserPollVotedIds] = useState<Set<string>>(new Set());
  const [subscriptionMap, setSubscriptionMap] = useState<Map<string, SubscriptionTier>>(new Map());

  // ─── Club Context Resolution ──────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function resolveClub() {
      resolveExpiredResearch().catch(err => console.error('[Community] Resolve expired research:', err));

      let cId = profile?.favorite_club_id ?? state.clubId;
      let cName = profile?.favorite_club ?? state.clubName;
      if (!cId) {
        const primaryClub = await getUserPrimaryClub(userId!);
        if (primaryClub) { cId = primaryClub.id; cName = primaryClub.name; }
      }
      const clubData = await getClubBySlug(cId ? (cName ?? '') : 'sakaryaspor', userId!).catch(() => null);
      if (!cId && clubData) { cId = clubData.id; cName = clubData.name; }
      if (!cancelled && cId) { dispatch({ type: 'SET_CLUB', clubId: cId, clubName: cName }); }
      if (!cancelled && clubData) { dispatch({ type: 'SET_CLUB_ADMIN', value: clubData.is_admin }); }
    }
    resolveClub();
    return () => { cancelled = true; };
  }, [userId, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load User Post Votes ─────────────────
  useEffect(() => {
    if (!userId || !posts.length) return;
    let cancelled = false;
    async function loadVoteData() {
      const postVotes = await getUserPostVotes(userId!, posts.map(p => p.id));
      if (!cancelled) setMyPostVotes(postVotes);
    }
    loadVoteData();
    return () => { cancelled = true; };
  }, [userId, posts]);

  // ─── Load User Club Vote + Poll Vote IDs ──
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function loadVoteIds() {
      const [vIds, pIds] = await Promise.all([
        getUserVotedIds(userId!).catch(() => new Set<string>()),
        getUserPollVotedIds(userId!).catch(() => new Set<string>()),
      ]);
      if (!cancelled) {
        setUserVotedIds(vIds);
        setUserPollVotedIds(pIds);
      }
    }
    loadVoteIds();
    return () => { cancelled = true; };
  }, [userId]);

  // ─── Load Subscription Tiers ──────────────
  useEffect(() => {
    if (!posts.length) return;
    let cancelled = false;
    const authorIds = Array.from(new Set(posts.map(p => p.user_id)));
    getActiveSubscriptionsByUsers(authorIds).then(map => {
      if (!cancelled) setSubscriptionMap(map);
    }).catch(err => console.error('[Community] Subscription fetch:', err));
    return () => { cancelled = true; };
  }, [posts]);

  return {
    posts, postsLoading, postsError,
    clubVotes, leaderboard, researchPosts, bounties, communityPolls,
    followingIds, ownedPlayerIds, allPlayers,
    followerCount, followingCount,
    subscription, userStats, userRangTier,
    myPostVotes, setMyPostVotes,
    userVotedIds, setUserVotedIds,
    userPollVotedIds, setUserPollVotedIds,
    subscriptionMap,
  };
}
