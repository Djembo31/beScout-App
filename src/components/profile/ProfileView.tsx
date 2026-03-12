'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, Button, ErrorState } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { getHoldings, getTransactions, formatScout } from '@/lib/services/wallet';
import { getUserStats, refreshUserStats, getFollowerCount, getFollowingCount, getUserAchievements, checkAndUnlockAchievements, isFollowing as checkIsFollowing, followUser, unfollowUser } from '@/lib/services/social';
import { centsToBsd } from '@/lib/services/players';
import { getResearchPosts, getAuthorTrackRecord, resolveExpiredResearch } from '@/lib/services/research';
import { getUserTrades } from '@/lib/services/trading';
import { getUserFantasyHistory } from '@/lib/services/lineups';
import { val } from '@/lib/settledHelpers';
import { ScoutCard } from '@/components/profile/ScoutCard';
import FollowListModal from '@/components/profile/FollowListModal';
import { getMySubscription } from '@/lib/services/clubSubscriptions';
import { TabBar, TabPanel } from '@/components/ui/TabBar';
import { getDimensionTabOrder, getStrongestDimension } from '@/lib/scoutReport';
import dynamic from 'next/dynamic';
import type { HoldingRow } from '@/components/profile/ProfileOverviewTab';
import type { ProfileTab, Profile, DbTransaction, DbUserStats, ResearchPostWithAuthor, AuthorTrackRecord, UserTradeWithPlayer, UserFantasyResult } from '@/types';
import { useHighestPass } from '@/lib/queries/foundingPasses';
import { getLoginStreak } from '@/components/home/helpers';
import { useTranslations } from 'next-intl';

const AirdropScoreCard = dynamic(() => import('@/components/airdrop/AirdropScoreCard'), { ssr: false });
const ReferralCard = dynamic(() => import('@/components/airdrop/ReferralCard'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const ManagerTab = dynamic(() => import('./ManagerTab'));
const TraderTab = dynamic(() => import('./TraderTab'));
const AnalystTab = dynamic(() => import('./AnalystTab'));
const TimelineTab = dynamic(() => import('./TimelineTab'));

// Transaction types safe to show publicly (no wallet/deposit/withdrawal info)
const PUBLIC_TX_TYPES = new Set([
  'buy', 'sell', 'ipo_buy', 'fantasy_join', 'fantasy_reward',
  'bounty_reward', 'research_earning', 'mission_reward',
  'streak_reward', 'poll_revenue',
]);

interface ProfileViewProps {
  targetUserId: string;
  targetProfile: Profile;
  isSelf: boolean;
}

export default function ProfileView({ targetUserId, targetProfile, isSelf }: ProfileViewProps) {
  const { user } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const t = useTranslations('profile');

  // ── Data state ──
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
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

  // ── Club subscription ──
  const [clubSub, setClubSub] = useState<{ tier: string; clubName: string } | null>(null);

  // ── Follow state ──
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);

  // ── Stats refresh ──
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  // ── Tab state (initialized after data loads) ──
  const [tab, setTab] = useState<ProfileTab>('manager');
  const [tabInitialized, setTabInitialized] = useState(false);

  // ── Founding Pass ──
  const { data: highestPassData } = useHighestPass(targetUserId);
  const highestPass = highestPassData?.tier ?? null;

  // ── Streak ──
  const streakDays = isSelf ? getLoginStreak().current : 0;

  // ── Load all data ──
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
          getTransactions(targetUserId, 50),
          getUserStats(targetUserId),
          getUserAchievements(targetUserId),
          getFollowerCount(targetUserId),
          getFollowingCount(targetUserId),
          getResearchPosts({ currentUserId: targetUserId }),
          getAuthorTrackRecord(targetUserId),
          getUserTrades(targetUserId, 10),
          getUserFantasyHistory(targetUserId, 10),
        ]);
        if (!cancelled) {
          if (results[0].status === 'rejected' && isSelf) {
            setDataError(true);
          } else {
            setHoldings(isSelf ? (results[0] as PromiseFulfilledResult<unknown>).value as HoldingRow[] : []);
            setTransactions(val(results[1], []));
            const stats = val(results[2], null);
            setUserStats(stats);
            setFollowerCount(val(results[4], 0));
            setFollowingCount(val(results[5], 0));
            const researchResult = val(results[6], [] as ResearchPostWithAuthor[]);
            setMyResearch(isSelf ? researchResult.filter(p => p.is_own) : researchResult.filter(p => p.user_id === targetUserId));
            setTrackRecord(val(results[7], null));
            setRecentTrades(val(results[8], []));
            setFantasyResults(val(results[9], []));
            setDataError(false);

            // Set default tab to strongest dimension (only on first load)
            if (!tabInitialized && stats) {
              const scores = {
                manager_score: stats.manager_score ?? 0,
                trading_score: stats.trading_score ?? 0,
                scout_score: stats.scout_score ?? 0,
              };
              const strongest = getStrongestDimension(scores);
              setTab(strongest);
              setTabInitialized(true);
            }
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

  // ── Load club subscription ──
  useEffect(() => {
    if (!targetProfile?.favorite_club_id) return;
    getMySubscription(targetUserId, targetProfile.favorite_club_id)
      .then(sub => {
        if (sub) {
          setClubSub({ tier: sub.tier, clubName: targetProfile.favorite_club ?? '' });
        }
      })
      .catch(err => console.error('[ProfileView] getMySubscription:', err));
  }, [targetUserId, targetProfile?.favorite_club_id, targetProfile?.favorite_club]);

  // ── Check follow status ──
  useEffect(() => {
    if (isSelf || !user) return;
    checkIsFollowing(user.id, targetUserId).then(setFollowing).catch(err => console.error('[ProfileView] isFollowing:', err));
  }, [isSelf, user, targetUserId]);

  // ── Follow/unfollow ──
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

  // ── Refresh stats ──
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

  // ── Level-up detection ──
  const userLevel = targetProfile.level ?? 1;
  useEffect(() => {
    if (!isSelf) return;
    const key = `bescout_last_level_${targetUserId}`;
    const stored = localStorage.getItem(key);
    const lastLevel = stored ? parseInt(stored, 10) : 0;
    if (lastLevel > 0 && userLevel > lastLevel) {
      addToast(`Level Up! Du bist jetzt Level ${userLevel}`, 'celebration');
    }
    localStorage.setItem(key, String(userLevel));
  }, [isSelf, targetUserId, userLevel, addToast]);

  // ── Portfolio PnL for ScoutCard badge ──
  const portfolioValueCents = holdings.reduce((s, h) => s + h.quantity * (h.player?.floor_price ?? 0), 0);
  const portfolioCostCents = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const portfolioPnlPct = portfolioCostCents > 0
    ? Math.round(((portfolioValueCents - portfolioCostCents) / portfolioCostCents) * 100)
    : 0;

  // ── Dynamic tab ordering ──
  const scores = useMemo(() => ({
    manager_score: userStats?.manager_score ?? 0,
    trading_score: userStats?.trading_score ?? 0,
    scout_score: userStats?.scout_score ?? 0,
  }), [userStats]);

  const dimOrder = useMemo(() => getDimensionTabOrder(scores), [scores]);

  const tabDefs = useMemo(() => [
    ...dimOrder.map(dim => ({
      id: dim,
      label: t(`tab${dim.charAt(0).toUpperCase() + dim.slice(1)}`),
    })),
    { id: 'timeline' as const, label: t('tabTimeline') },
  ], [dimOrder, t]);

  // ── Public transactions filter ──
  const publicTransactions = useMemo(
    () => isSelf ? transactions : transactions.filter(tx => PUBLIC_TX_TYPES.has(tx.type)),
    [transactions, isSelf],
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">
      {/* ===== SCOUT CARD HERO ===== */}
      {!holdingsLoading && !dataError && (
        <ScoutCard
          profile={targetProfile}
          userStats={userStats}
          trackRecord={trackRecord}
          followersCount={followerCount}
          followingCount={followingCount}
          isFollowing={following}
          isSelf={isSelf}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          followLoading={followLoading}
          currentStreak={streakDays}
          clubSubscription={clubSub}
          foundingPassTier={highestPass}
          portfolioPnlPct={portfolioPnlPct}
        />
      )}

      <SponsorBanner placement="profile_hero" className="mb-2" />

      {/* Follow List Modal */}
      {followListMode && (
        <FollowListModal
          userId={targetUserId}
          mode={followListMode}
          onClose={() => setFollowListMode(null)}
        />
      )}

      {/* ===== TAB BAR ===== */}
      {!holdingsLoading && !dataError && (
        <TabBar
          tabs={tabDefs}
          activeTab={tab}
          onChange={(id) => setTab(id as ProfileTab)}
        />
      )}

      {/* ===== CONTENT GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar — HIDDEN on mobile */}
        <div className="hidden lg:block space-y-6">
          {/* Wallet — self only */}
          {isSelf && (
            <Card className="p-4 md:p-6">
              <h3 className="font-black mb-4">{t('walletTitle')}</h3>
              <div className="text-2xl md:text-3xl font-mono font-black text-gold mb-2">
                {balanceCents === null ? (
                  <span className="inline-block w-24 h-8 rounded bg-gold/10 animate-pulse motion-reduce:animate-none" />
                ) : (
                  <>{formatScout(balanceCents)} bCredits</>
                )}
              </div>
              <div className="text-sm text-white/50 mb-4">{t('walletAvailable')}</div>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="gold" size="sm">{t('depositBtn')}</Button>
              </div>
            </Card>
          )}

          {/* Airdrop Score */}
          <AirdropScoreCard userId={targetUserId} compact={!isSelf} />

          {/* Referral — self only */}
          {isSelf && <ReferralCard userId={targetUserId} />}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {dataError && !holdingsLoading && (
            <ErrorState onRetry={() => setRetryCount(c => c + 1)} />
          )}

          {holdingsLoading && !dataError && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
            </div>
          )}

          {!holdingsLoading && !dataError && (
            <>
              <TabPanel id="manager" activeTab={tab}>
                <ManagerTab
                  userId={targetUserId}
                  userStats={userStats}
                  fantasyResults={fantasyResults}
                  isSelf={isSelf}
                />
              </TabPanel>

              <TabPanel id="trader" activeTab={tab}>
                <TraderTab
                  userId={targetUserId}
                  userStats={userStats}
                  holdings={holdings}
                  recentTrades={recentTrades}
                  isSelf={isSelf}
                />
              </TabPanel>

              <TabPanel id="analyst" activeTab={tab}>
                <AnalystTab
                  userId={targetUserId}
                  userStats={userStats}
                  trackRecord={trackRecord}
                  myResearch={myResearch}
                  isSelf={isSelf}
                  transactions={publicTransactions}
                />
              </TabPanel>

              <TabPanel id="timeline" activeTab={tab}>
                <TimelineTab
                  transactions={publicTransactions}
                  userId={targetUserId}
                  isSelf={isSelf}
                />
              </TabPanel>
            </>
          )}
        </div>
      </div>
      <SponsorBanner placement="profile_footer" className="mt-4" />
    </div>
  );
}
