import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { getHoldings, getTransactions } from '@/lib/services/wallet';
import { getMyPayouts } from '@/lib/services/creatorFund';
import {
  getUserStats, refreshUserStats, getFollowerCount, getFollowingCount,
  checkAndUnlockAchievements, isFollowing as checkIsFollowing,
  followUser, unfollowUser, getUserAchievements,
} from '@/lib/services/social';
import { getResearchPosts, getAuthorTrackRecord, resolveExpiredResearch } from '@/lib/services/research';
import { getUserTrades } from '@/lib/services/trading';
import { getUserFantasyHistory } from '@/lib/services/lineups';
import { getTicketTransactions } from '@/lib/services/tickets';
import { getMySubscription } from '@/lib/services/clubSubscriptions';
import { val } from '@/lib/settledHelpers';
import { getLoginStreak } from '@/components/home/helpers';
import { getDimensionTabOrder, getStrongestDimension } from '@/lib/scoutReport';
import { useHighestPass } from '@/lib/queries/foundingPasses';
import type {
  ProfileTab, HoldingRow, DbTransaction, DbUserStats,
  ResearchPostWithAuthor, AuthorTrackRecord, UserTradeWithPlayer,
  UserFantasyResult, DbCreatorFundPayout,
} from '@/types';
import type { UseProfileDataParams, ProfileDataResult } from './types';

// Transaction types safe to show publicly
const PUBLIC_TX_TYPES = new Set([
  'buy', 'sell', 'ipo_buy', 'fantasy_join', 'fantasy_reward',
  'bounty_reward', 'research_earning', 'mission_reward',
  'streak_bonus', 'poll_earning',
]);

export function useProfileData({ targetUserId, targetProfile, isSelf }: UseProfileDataParams): ProfileDataResult {
  const { user } = useUser();

  // ── Data State ──
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [ticketTransactions, setTicketTransactions] = useState<import('@/types').DbTicketTransaction[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [userStats, setUserStats] = useState<DbUserStats | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [myResearch, setMyResearch] = useState<ResearchPostWithAuthor[]>([]);
  const [trackRecord, setTrackRecord] = useState<AuthorTrackRecord | null>(null);
  const [recentTrades, setRecentTrades] = useState<UserTradeWithPlayer[]>([]);
  const [fantasyResults, setFantasyResults] = useState<UserFantasyResult[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [creatorPayouts, setCreatorPayouts] = useState<DbCreatorFundPayout[]>([]);
  const [clubSub, setClubSub] = useState<{ tier: string; clubName: string } | null>(null);

  // ── Follow State ──
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // ── Stats Refresh ──
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  // ── Tab State ──
  const [tab, setTab] = useState<ProfileTab>('manager');
  const [tabInitialized, setTabInitialized] = useState(false);

  // ── Founding Pass ──
  const { data: highestPassData } = useHighestPass(targetUserId);
  const highestPass = highestPassData?.tier ?? null;

  // ── Streak ──
  const streakDays = isSelf ? getLoginStreak().current : 0;

  // ── Load All Data ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setHoldingsLoading(true);
      if (isSelf) {
        resolveExpiredResearch().catch(err => console.error('[ProfileView] resolveExpiredResearch:', err));
      }
      try {
        const results = await Promise.allSettled([
          getHoldings(targetUserId),
          getTransactions(targetUserId, 50),
          getUserStats(targetUserId),
          getFollowerCount(targetUserId),
          getFollowingCount(targetUserId),
          getResearchPosts({ currentUserId: targetUserId }),
          getAuthorTrackRecord(targetUserId),
          getUserTrades(targetUserId, 10),
          getUserFantasyHistory(targetUserId, 10),
          getUserAchievements(targetUserId).then(rows => rows.map(r => ({ achievement_key: r.achievement_key }))),
          isSelf ? getMyPayouts(targetUserId) : Promise.resolve([]),
          isSelf ? getTicketTransactions(targetUserId, 50) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setHoldings(val(results[0], []) as HoldingRow[]);
          setTransactions(val(results[1], []));
          const stats = val(results[2], null);
          setUserStats(stats);
          setFollowerCount(val(results[3], 0));
          setFollowingCount(val(results[4], 0));
          const researchResult = val(results[5], [] as ResearchPostWithAuthor[]);
          setMyResearch(isSelf ? researchResult.filter(p => p.is_own) : researchResult.filter(p => p.user_id === targetUserId));
          setTrackRecord(val(results[6], null));
          setRecentTrades(val(results[7], []));
          setFantasyResults(val(results[8], []));
          const achRows = val(results[9], [] as { achievement_key: string }[]);
          setUnlockedAchievements(new Set(achRows.map(r => r.achievement_key)));
          setCreatorPayouts(val(results[10], []) as DbCreatorFundPayout[]);
          setTicketTransactions(val(results[11], []));
          setDataError(false);

          if (!tabInitialized && stats) {
            const scores = {
              manager_score: stats.manager_score ?? 0,
              trading_score: stats.trading_score ?? 0,
              scout_score: stats.scout_score ?? 0,
            };
            setTab(getStrongestDimension(scores));
            setTabInitialized(true);
          }
        }
      } catch {
        if (!cancelled) setDataError(true);
      } finally {
        if (!cancelled) setHoldingsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [targetUserId, isSelf, retryCount, tabInitialized]);

  // ── Club Subscription ──
  useEffect(() => {
    if (!targetProfile?.favorite_club_id) return;
    getMySubscription(targetUserId, targetProfile.favorite_club_id)
      .then(sub => {
        if (sub) setClubSub({ tier: sub.tier, clubName: targetProfile.favorite_club ?? '' });
      })
      .catch(err => console.error('[ProfileView] getMySubscription:', err));
  }, [targetUserId, targetProfile?.favorite_club_id, targetProfile?.favorite_club]);

  // ── Follow Status Check ──
  useEffect(() => {
    if (isSelf || !user) return;
    checkIsFollowing(user.id, targetUserId).then(setFollowing).catch(err => console.error('[ProfileView] isFollowing:', err));
  }, [isSelf, user, targetUserId]);

  // ── Follow/Unfollow Actions ──
  const handleFollow = useCallback(async () => {
    if (!user || isSelf) return;
    setFollowLoading(true);
    try {
      await followUser(user.id, targetUserId);
      setFollowing(true);
      setFollowerCount(c => c + 1);
    } catch (err) { console.error('[ProfileView] follow:', err); }
    finally { setFollowLoading(false); }
  }, [user, isSelf, targetUserId]);

  const handleUnfollow = useCallback(async () => {
    if (!user || isSelf) return;
    setFollowLoading(true);
    try {
      await unfollowUser(user.id, targetUserId);
      setFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
    } catch (err) { console.error('[ProfileView] unfollow:', err); }
    finally { setFollowLoading(false); }
  }, [user, isSelf, targetUserId]);

  // ── Refresh Stats ──
  const handleRefreshStats = useCallback(async () => {
    if (statsRefreshing) return;
    setStatsRefreshing(true);
    try {
      await refreshUserStats(targetUserId);
      await checkAndUnlockAchievements(targetUserId);
      const [stats, fCount, fgCount] = await Promise.all([
        getUserStats(targetUserId),
        getFollowerCount(targetUserId),
        getFollowingCount(targetUserId),
      ]);
      setUserStats(stats);
      setFollowerCount(fCount);
      setFollowingCount(fgCount);
    } catch (err) { console.error('[ProfileView] refreshStats:', err); }
    finally { setStatsRefreshing(false); }
  }, [targetUserId, statsRefreshing]);

  // ── Derived Values ──
  const portfolioValueCents = holdings.reduce((s, h) => s + h.quantity * (h.player?.floor_price ?? 0), 0);
  const portfolioCostCents = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const portfolioPnlPct = portfolioCostCents > 0
    ? Math.round(((portfolioValueCents - portfolioCostCents) / portfolioCostCents) * 100)
    : 0;

  const avgFantasyRank = fantasyResults.length > 0
    ? fantasyResults.reduce((s, r) => s + r.rank, 0) / fantasyResults.length
    : undefined;

  const scores = useMemo(() => ({
    manager_score: userStats?.manager_score ?? 0,
    trading_score: userStats?.trading_score ?? 0,
    scout_score: userStats?.scout_score ?? 0,
  }), [userStats]);

  const dimOrder = useMemo(() => getDimensionTabOrder(scores), [scores]);

  const publicTransactions = useMemo(
    () => isSelf ? transactions : transactions.filter(tx => PUBLIC_TX_TYPES.has(tx.type)),
    [transactions, isSelf],
  );

  const retry = useCallback(() => setRetryCount(c => c + 1), []);

  return {
    loading: holdingsLoading, dataError, retry,
    holdings, transactions, ticketTransactions, userStats,
    myResearch, trackRecord, recentTrades, fantasyResults,
    unlockedAchievements, creatorPayouts, clubSub,
    portfolioPnlPct, avgFantasyRank, publicTransactions,
    scores, dimOrder,
    tab, setTab,
    following, followLoading, followerCount, followingCount,
    handleFollow, handleUnfollow,
    statsRefreshing, handleRefreshStats,
    highestPass, streakDays,
  };
}
