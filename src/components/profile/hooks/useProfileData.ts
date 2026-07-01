import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { getHoldings } from '@/lib/services/wallet';
import { getClub } from '@/lib/clubs';
import { getMyPayouts } from '@/lib/services/creatorFund';
import {
  getUserStats, refreshUserStats, checkAndUnlockAchievements,
} from '@/lib/services/social';
import { useFollowerCount, useFollowingCount, useIsFollowingUser } from '@/lib/queries/social';
import { useToggleFollowUser } from '@/lib/hooks/useToggleFollowUser';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { getResearchPosts, getAuthorTrackRecord, resolveExpiredResearch } from '@/lib/services/research';
import { getUserTrades } from '@/lib/services/trading';
import { getUserFantasyHistory } from '@/lib/services/lineups';
import { getMySubscription } from '@/lib/services/clubSubscriptions';
import { val } from '@/lib/settledHelpers';
import { logSilentRejects } from '@/lib/observability/silentRejects';
import { useLoginStreak } from '@/lib/queries/streaks';
import { getDimensionTabOrder, getStrongestDimension } from '@/lib/scoutReport';
import { useHighestPass } from '@/lib/queries/foundingPasses';
import { useTransactions } from '@/lib/queries/misc';
import { useTicketTransactions } from '@/lib/queries/tickets';
import { isPublicTxType } from '@/lib/transactionTypes';
import type {
  ProfileTab, HoldingRow, DbUserStats,
  ResearchPostWithAuthor, AuthorTrackRecord, UserTradeWithPlayer,
  UserFantasyResult, DbCreatorFundPayout,
} from '@/types';
import type { UseProfileDataParams, ProfileDataResult } from './types';

const VALID_TABS: ReadonlyArray<ProfileTab> = ['manager', 'trader', 'analyst', 'timeline'];

function isValidTab(value: string | undefined): value is ProfileTab {
  return !!value && (VALID_TABS as readonly string[]).includes(value);
}

export function useProfileData({ targetUserId, targetProfile, isSelf, initialTab }: UseProfileDataParams): ProfileDataResult {
  const { user } = useUser();
  const qc = useQueryClient();

  // ── Query Hooks (cached, invalidated by trade/research/poll mutations) ──
  const txQuery = useTransactions(targetUserId, { limit: 50 });
  const ticketTxQuery = useTicketTransactions(targetUserId, { limit: 50, enabled: isSelf });

  // ── Follow (React Query, Slice 501 — ersetzt lokales useState-Follow) ──
  const followerCount = useFollowerCount(targetUserId).data ?? 0;
  const followingCount = useFollowingCount(targetUserId).data ?? 0;
  const following = useIsFollowingUser(isSelf ? undefined : user?.id, isSelf ? undefined : targetUserId).data ?? false;
  const { toggleAsync: toggleFollowAsync, isPending: followLoading } = useToggleFollowUser();

  // ── Data State (non-cached sources) ──
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [userStats, setUserStats] = useState<DbUserStats | null>(null);
  const [myResearch, setMyResearch] = useState<ResearchPostWithAuthor[]>([]);
  const [trackRecord, setTrackRecord] = useState<AuthorTrackRecord | null>(null);
  const [recentTrades, setRecentTrades] = useState<UserTradeWithPlayer[]>([]);
  const [fantasyResults, setFantasyResults] = useState<UserFantasyResult[]>([]);
  const [creatorPayouts, setCreatorPayouts] = useState<DbCreatorFundPayout[]>([]);
  const [clubSub, setClubSub] = useState<{ tier: string; clubName: string } | null>(null);

  // ── Stats Refresh ──
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  // ── Tab State ──
  // Deep link takes precedence at mount: if ?tab=X is valid, start there immediately.
  // Otherwise fall back to 'manager' until stats load + strongest dimension is computed.
  const [tab, setTab] = useState<ProfileTab>(() => (isValidTab(initialTab) ? initialTab : 'manager'));
  const [tabInitialized, setTabInitialized] = useState(() => isValidTab(initialTab));

  // ── Founding Pass ──
  const { data: highestPassData } = useHighestPass(targetUserId);
  const highestPass = highestPassData?.tier ?? null;

  // ── Streak ──
  // Source-of-truth via `useLoginStreak` (Server-Authority).
  // Replaces legacy `getLoginStreak()` localStorage Mirror, der `streak=0` lieferte
  // wenn der User /profile via Deep-Link aufgerufen hat ohne vorher /home zu besuchen.
  const { streak: ownStreak } = useLoginStreak(isSelf ? targetUserId : undefined);
  const streakDays = isSelf ? ownStreak : 0;

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
          isSelf ? getHoldings(targetUserId) : Promise.resolve([]),
          getUserStats(targetUserId),
          getResearchPosts({ currentUserId: targetUserId }),
          getAuthorTrackRecord(targetUserId),
          getUserTrades(targetUserId, 10),
          getUserFantasyHistory(targetUserId, 10),
          isSelf ? getMyPayouts(targetUserId) : Promise.resolve([]),
        ]);
        logSilentRejects('useProfileData.load', results);
        if (!cancelled) {
          setHoldings(val(results[0], []) as HoldingRow[]);
          const stats = val(results[1], null);
          setUserStats(stats);
          // followerCount/followingCount: Slice 501 → React Query (useFollowerCount/useFollowingCount)
          const researchResult = val(results[2], [] as ResearchPostWithAuthor[]);
          setMyResearch(isSelf ? researchResult.filter(p => p.is_own) : researchResult.filter(p => p.user_id === targetUserId));
          setTrackRecord(val(results[3], null));
          setRecentTrades(val(results[4], []));
          setFantasyResults(val(results[5], []));
          setCreatorPayouts(val(results[6], []) as DbCreatorFundPayout[]);
          setDataError(false);

          if (!tabInitialized && stats) {
            if (isValidTab(initialTab)) {
              // Deep link takes precedence over default dimension logic
              setTab(initialTab);
            } else {
              const scores = {
                manager_score: stats.manager_score ?? 0,
                trading_score: stats.trading_score ?? 0,
                scout_score: stats.scout_score ?? 0,
              };
              setTab(getStrongestDimension(scores));
            }
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
  }, [targetUserId, isSelf, retryCount, tabInitialized, initialTab]);

  // ── Club Subscription ──
  useEffect(() => {
    if (!targetProfile?.favorite_club_id) return;
    getMySubscription(targetUserId, targetProfile.favorite_club_id)
      .then(sub => {
        if (sub) setClubSub({ tier: sub.tier, clubName: targetProfile.favorite_club_id ? (getClub(targetProfile.favorite_club_id)?.name ?? '') : '' });
      })
      .catch(err => console.error('[ProfileView] getMySubscription:', err));
  }, [targetUserId, targetProfile?.favorite_club_id]);

  // ── Follow/Unfollow Actions (Slice 501 — kanonische useToggleFollowUser; following-Status
  //    + counts kommen aus React Query, onSettled reconciled Community-„Folge ich" + Feed) ──
  const handleFollow = useCallback(async () => {
    if (!user || isSelf) return;
    try { await toggleFollowAsync({ targetUserId, follow: true }); }
    catch (err) { console.error('[ProfileView] follow:', err); }
  }, [user, isSelf, targetUserId, toggleFollowAsync]);

  const handleUnfollow = useCallback(async () => {
    if (!user || isSelf) return;
    try { await toggleFollowAsync({ targetUserId, follow: false }); }
    catch (err) { console.error('[ProfileView] unfollow:', err); }
  }, [user, isSelf, targetUserId, toggleFollowAsync]);

  // ── Refresh Stats ──
  const handleRefreshStats = useCallback(async () => {
    if (statsRefreshing) return;
    setStatsRefreshing(true);
    try {
      await refreshUserStats(targetUserId);
      await checkAndUnlockAchievements(targetUserId);
      const stats = await getUserStats(targetUserId);
      setUserStats(stats);
      // Slice 501: Follower/Following-Counts sind React Query → invalidieren statt setState.
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.social.followerCount(targetUserId) }),
        qc.invalidateQueries({ queryKey: qk.social.followingCount(targetUserId) }),
      ]);
    } catch (err) { console.error('[ProfileView] refreshStats:', err); }
    finally { setStatsRefreshing(false); }
  }, [targetUserId, statsRefreshing, qc]);

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

  // Derive transactions from Query Hooks (cached, auto-invalidated by mutations)
  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data]);
  const ticketTransactions = useMemo(() => ticketTxQuery.data ?? [], [ticketTxQuery.data]);

  const publicTransactions = useMemo(
    () => isSelf ? transactions : transactions.filter(tx => isPublicTxType(tx.type)),
    [transactions, isSelf],
  );

  const retry = useCallback(() => {
    setRetryCount(c => c + 1);
    void txQuery.refetch();
    void ticketTxQuery.refetch();
  }, [txQuery, ticketTxQuery]);

  const loading = holdingsLoading || txQuery.isLoading || (isSelf && ticketTxQuery.isLoading);

  return {
    loading, dataError, retry,
    holdings, transactions, ticketTransactions, userStats,
    myResearch, trackRecord, recentTrades, fantasyResults,
    creatorPayouts, clubSub,
    portfolioPnlPct, avgFantasyRank, publicTransactions,
    scores, dimOrder,
    tab, setTab,
    following, followLoading, followerCount, followingCount,
    handleFollow, handleUnfollow,
    statsRefreshing, handleRefreshStats,
    highestPass, streakDays,
  };
}
