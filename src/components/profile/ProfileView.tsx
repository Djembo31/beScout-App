'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, Settings, Loader2, RefreshCw, Users, Share2, Flame } from 'lucide-react';
import { Card, Button, Chip, ErrorState } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { cn, fmtScout } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { getHoldings, getTransactions, formatScout } from '@/lib/services/wallet';
import { getUserStats, refreshUserStats, getFollowerCount, getFollowingCount, getUserAchievements, checkAndUnlockAchievements, isFollowing, followUser, unfollowUser } from '@/lib/services/social';
import { getClubName } from '@/lib/clubs';
import { centsToBsd } from '@/lib/services/players';
import { getResearchPosts, getAuthorTrackRecord, resolveExpiredResearch } from '@/lib/services/research';
import { getTopPostByUser } from '@/lib/services/posts';
import { getUserTrades } from '@/lib/services/trading';
import { getUserFantasyHistory } from '@/lib/services/lineups';
import { val } from '@/lib/settledHelpers';
import ProfileOverviewTab from '@/components/profile/ProfileOverviewTab';
import ProfileActivityTab from '@/components/profile/ProfileActivityTab';
import FollowListModal from '@/components/profile/FollowListModal';
import { getMySubscription } from '@/lib/services/clubSubscriptions';
import SubscriptionBadge from '@/components/ui/SubscriptionBadge';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ClubSubscription, SubscriptionTier } from '@/lib/services/clubSubscriptions';

const AirdropScoreCard = dynamic(() => import('@/components/airdrop/AirdropScoreCard'), { ssr: false });
const ReferralCard = dynamic(() => import('@/components/airdrop/ReferralCard'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const ProfileSquadTab = dynamic(() => import('@/components/profile/ProfileSquadTab'));
const ProfileStatsTab = dynamic(() => import('@/components/profile/ProfileStatsTab'));
import type { HoldingRow } from '@/components/profile/ProfileOverviewTab';
import type { ProfileTab, Profile, DbTransaction, DbUserStats, DbUserAchievement, ResearchPostWithAuthor, AuthorTrackRecord, UserTradeWithPlayer, UserFantasyResult, PostWithAuthor } from '@/types';
import { RangBadge } from '@/components/ui/RangBadge';
import FoundingScoutBadge from '@/components/ui/FoundingScoutBadge';
import FoundingPassBadge from '@/components/ui/FoundingPassBadge';
import { getRang, getDimensionColor, type Dimension } from '@/lib/gamification';
import { useScoutScores, useScoutingStats, qk } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import { useTranslations as useProfileTranslations, useLocale } from 'next-intl';
import { useHighestPass } from '@/lib/queries/foundingPasses';
import { getLoginStreak } from '@/components/home/helpers';

const TAB_IDS: { id: ProfileTab }[] = [
  { id: 'overview' },
  { id: 'squad' },
  { id: 'stats' },
  { id: 'activity' },
];

const DIMENSIONS: { key: Dimension; scoreKey: 'trader_score' | 'manager_score' | 'analyst_score' }[] = [
  { key: 'trader', scoreKey: 'trader_score' },
  { key: 'manager', scoreKey: 'manager_score' },
  { key: 'analyst', scoreKey: 'analyst_score' },
];

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
  const tp = useProfileTranslations('profile');
  const tg = useProfileTranslations('gamification');
  const tc = useProfileTranslations('common');
  const locale = useLocale();
  const [tab, setTab] = useState<ProfileTab>('overview');

  // Real holdings from DB
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Scout Scores (3 Dimensions)
  const { data: scoutScores } = useScoutScores(targetUserId);
  const { data: scoutingStats } = useScoutingStats(targetUserId);

  // Founding Pass
  const { data: highestPassData } = useHighestPass(targetUserId);
  const highestPass = highestPassData?.tier ?? null;

  // Bio expand
  const [bioExpanded, setBioExpanded] = useState(false);

  // Streak (from localStorage for self, 0 for public)
  const streakDays = isSelf ? getLoginStreak().current : 0;

  // Reputation & Social
  const [userStats, setUserStats] = useState<DbUserStats | null>(null);
  const [achievements, setAchievements] = useState<DbUserAchievement[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  // Research Track Record
  const [myResearch, setMyResearch] = useState<ResearchPostWithAuthor[]>([]);
  const [trackRecord, setTrackRecord] = useState<AuthorTrackRecord | null>(null);

  // Trading History & Fantasy Results
  const [recentTrades, setRecentTrades] = useState<UserTradeWithPlayer[]>([]);
  const [fantasyResults, setFantasyResults] = useState<UserFantasyResult[]>([]);

  // Top Post (most upvoted)
  const [topPost, setTopPost] = useState<PostWithAuthor | null>(null);

  // Club-Abo badge
  const [clubSub, setClubSub] = useState<ClubSubscription | null>(null);

  // Follow state (for public profiles)
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Follow list modal
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);

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
          getTransactions(targetUserId, 50), // Load for all profiles (filtered for public)
          getUserStats(targetUserId),
          getUserAchievements(targetUserId),
          getFollowerCount(targetUserId),
          getFollowingCount(targetUserId),
          getResearchPosts({ currentUserId: targetUserId }),
          getAuthorTrackRecord(targetUserId),
          getUserTrades(targetUserId, 10),
          getUserFantasyHistory(targetUserId, 10),
          getTopPostByUser(targetUserId),
        ]);
        if (!cancelled) {
          if (results[0].status === 'rejected' && isSelf) {
            setDataError(true);
          } else {
            setHoldings(isSelf ? (results[0] as PromiseFulfilledResult<unknown>).value as HoldingRow[] : []);
            setTransactions(val(results[1], []));
            setUserStats(val(results[2], null));
            setAchievements(val(results[3], []));
            setFollowerCount(val(results[4], 0));
            setFollowingCount(val(results[5], 0));
            const researchResult = val(results[6], [] as ResearchPostWithAuthor[]);
            setMyResearch(isSelf ? researchResult.filter(p => p.is_own) : researchResult.filter(p => p.user_id === targetUserId));
            setTrackRecord(val(results[7], null));
            setRecentTrades(val(results[8], []));
            setFantasyResults(val(results[9], []));
            setTopPost(val(results[10], null));
            setDataError(false);
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
  }, [targetUserId, isSelf, retryCount]);

  // Load club subscription badge
  useEffect(() => {
    if (!targetProfile?.favorite_club_id) return;
    getMySubscription(targetUserId, targetProfile.favorite_club_id)
      .then(sub => setClubSub(sub))
      .catch(err => console.error('[ProfileView] getMySubscription:', err));
  }, [targetUserId, targetProfile?.favorite_club_id]);

  // Check follow status for public profiles
  useEffect(() => {
    if (isSelf || !user) return;
    isFollowing(user.id, targetUserId).then(setFollowing).catch(err => console.error('[ProfileView] isFollowing:', err));
  }, [isSelf, user, targetUserId]);

  const handleToggleFollow = useCallback(async () => {
    if (!user || isSelf) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(user.id, targetUserId);
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await followUser(user.id, targetUserId);
        setFollowing(true);
        setFollowerCount(c => c + 1);
      }
    } catch (err) { console.error('[ProfileView] toggleFollow:', err); }
    finally { setFollowLoading(false); }
  }, [user, isSelf, following, targetUserId]);

  const handleRefreshStats = useCallback(async () => {
    if (statsRefreshing) return;
    setStatsRefreshing(true);
    try {
      await refreshUserStats(targetUserId);
      await checkAndUnlockAchievements(targetUserId);
      const [stats, achvs, fCount, fgCount] = await Promise.all([
        getUserStats(targetUserId),
        getUserAchievements(targetUserId),
        getFollowerCount(targetUserId),
        getFollowingCount(targetUserId),
      ]);
      setUserStats(stats);
      setAchievements(achvs);
      setFollowerCount(fCount);
      setFollowingCount(fgCount);
    } catch (err) { console.error('[ProfileView] refreshStats:', err); }
    finally { setStatsRefreshing(false); }
  }, [targetUserId, statsRefreshing]);

  // Level-Up Detection (localStorage comparison â†' celebration toast)
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

  const name = targetProfile.display_name || targetProfile.handle;
  const userHandle = `@${targetProfile.handle}`;
  const userPlan = targetProfile.plan ?? tp('freePlan');
  const initial = name.charAt(0).toUpperCase();

  // Computed portfolio stats from real holdings (all in cents)
  const portfolioValueCents = holdings.reduce((s, h) => s + h.quantity * (h.player?.floor_price ?? 0), 0);
  const portfolioCostCents = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const totalDpcs = holdings.reduce((s, h) => s + h.quantity, 0);

  const visibleTabs = TAB_IDS;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">
      {/* ===== COMPRESSED HEADER — Fan Identity Card (~250px mobile) ===== */}
      <div className="space-y-3">
        {/* Row 1: Avatar + Name + Badges + Handle + Followers */}
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-xl bg-gold/[0.12] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {targetProfile.avatar_url ? (
              <img src={targetProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-black text-lg text-white/70">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-lg md:text-2xl font-black truncate">{name}</h1>
              {targetProfile.verified && <BadgeCheck className="size-4 text-gold flex-shrink-0" aria-hidden="true" />}
              <Chip className="bg-gold/15 text-gold border-gold/25 text-[11px]">{userPlan}</Chip>
              <FoundingPassBadge tier={highestPass} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-[13px] text-white/50 flex-wrap">
              <span>{userHandle}</span>
              <span className="text-white/20">·</span>
              <button
                onClick={() => setFollowListMode('followers')}
                className="hover:text-white/80 transition-colors"
              >
                <strong className="text-white/70">{followerCount}</strong> Follower
              </button>
              <button
                onClick={() => setFollowListMode('following')}
                className="hover:text-white/80 transition-colors"
              >
                <strong className="text-white/70">{followingCount}</strong> Folge ich
              </button>
              {targetProfile.favorite_club && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-1">
                    {getClubName(targetProfile.favorite_club)}
                    {clubSub && <SubscriptionBadge tier={clubSub.tier as SubscriptionTier} size="sm" />}
                  </span>
                </>
              )}
            </div>
            {/* Expandable Bio */}
            {targetProfile.bio && (
              <div className="mt-1">
                <p className={cn('text-[13px] text-white/50 max-w-lg', !bioExpanded && 'line-clamp-1')}>
                  {targetProfile.bio}
                </p>
                {targetProfile.bio.length > 80 && (
                  <button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    className="text-[11px] text-gold hover:text-gold/80 transition-colors"
                  >
                    {bioExpanded ? tp('lessBio') : tp('moreBio')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Compact 3-Dimension Elo Bars */}
        {scoutScores && (
          <div className="flex items-center gap-3 px-1">
            {DIMENSIONS.map(({ key, scoreKey }) => {
              const score = scoutScores[scoreKey];
              const rang = getRang(score);
              const progress = rang.maxScore
                ? ((score - rang.minScore) / (rang.maxScore - rang.minScore)) * 100
                : 100;
              return (
                <div key={key} className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn('text-[11px] font-bold', getDimensionColor(key))}>
                      {tg(`dimension.${key}`)}
                    </span>
                    <span className="text-[11px] text-white/40 font-mono">{rang.fullName}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', rang.bgColor)}
                      style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Row 3: Stats Ribbon — Rank / Portfolio / Streak */}
        <div className="flex items-center gap-0 rounded-xl bg-white/[0.03] border border-white/[0.06] divide-x divide-white/[0.06] overflow-hidden">
          <div className="flex-1 px-3 py-2.5 text-center">
            <div className="text-lg font-mono font-black text-white/90">
              {userStats && userStats.rank > 0 ? `#${userStats.rank}` : '\u2014'}
            </div>
            <div className="text-[11px] text-white/40">{tp('totalRank')}</div>
          </div>
          <div className="flex-1 px-3 py-2.5 text-center">
            <div className="text-lg font-mono font-black text-gold">
              {fmtScout(centsToBsd(portfolioValueCents))}
            </div>
            <div className="text-[11px] text-white/40">{tp('portfolioPulse')}</div>
          </div>
          <div className="flex-1 px-3 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame className={cn('size-4', streakDays > 0 ? 'text-orange-400' : 'text-white/20')} aria-hidden="true" />
              <span className={cn('text-lg font-mono font-black', streakDays > 0 ? 'text-orange-400' : 'text-white/30')}>
                {streakDays}
              </span>
            </div>
            <div className="text-[11px] text-white/40">{tp('streakLabel')}</div>
          </div>
        </div>

        {/* Row 4: Action Buttons */}
        <div className="flex items-center gap-2">
          {!isSelf && user && (
            <Button
              variant={following ? 'outline' : 'gold'}
              size="sm"
              onClick={handleToggleFollow}
              disabled={followLoading}
            >
              {following ? tp('unfollow') : tp('follow')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const url = `${window.location.origin}/profile/${targetProfile.handle}`;
              const text = `${name} auf BeScout`;
              if (navigator.share) {
                try { await navigator.share({ title: text, url }); } catch (err) { console.error('[ProfileView] share:', err); }
              } else {
                await navigator.clipboard.writeText(url);
                addToast('Link kopiert!', 'success');
              }
            }}
          >
            <Share2 className="size-3.5" aria-hidden="true" />
            Teilen
          </Button>
          {isSelf && (
            <Link
              href="/profile/settings"
              className="ml-auto p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/70"
              aria-label={tp('settingsLabel')}
            >
              <Settings className="size-4" aria-hidden="true" />
            </Link>
          )}
          {isSelf && (
            <button
              onClick={handleRefreshStats}
              disabled={statsRefreshing}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/70"
              aria-label={tc('refreshLabel')}
            >
              <RefreshCw className={cn('size-4', statsRefreshing && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Badges row — compact */}
        <div className="flex items-center gap-2 text-[13px]">
          <RangBadge scores={scoutScores ?? undefined} score={scoutScores ? undefined : 0} size="sm" />
          {achievements.some(a => a.achievement_key === 'founding_scout') && (
            <FoundingScoutBadge size="sm" />
          )}
        </div>
      </div>

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
      <div className="flex items-center border-b border-white/10 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 md:px-5 py-2.5 md:py-3 text-[13px] md:text-base font-semibold transition-colors relative whitespace-nowrap flex-shrink-0',
              tab === t.id ? 'text-gold' : 'text-white/60 hover:text-white'
            )}
          >
            {tp(t.id)}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
          </button>
        ))}
      </div>

      {/* ===== CONTENT GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar — HIDDEN on mobile */}
        <div className="hidden lg:block space-y-6">
          {/* Wallet — self only */}
          {isSelf && (
            <Card className="p-4 md:p-6">
              <h3 className="font-black mb-4">{tp('walletTitle')}</h3>
              <div className="text-2xl md:text-3xl font-mono font-black text-gold mb-2">
                {balanceCents === null ? (
                  <span className="inline-block w-24 h-8 rounded bg-gold/10 animate-pulse motion-reduce:animate-none" />
                ) : (
                  <>{formatScout(balanceCents)} bCredits</>
                )}
              </div>
              <div className="text-sm text-white/50 mb-4">{tp('walletAvailable')}</div>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="gold" size="sm">{tp('depositBtn')}</Button>
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

          {!holdingsLoading && !dataError && tab === 'overview' && (
            <ProfileOverviewTab
              holdings={holdings}
              recentTrades={recentTrades}
              fantasyResults={fantasyResults}
              achievements={achievements}
              portfolioValueCents={portfolioValueCents}
              portfolioCostCents={portfolioCostCents}
              totalDpcs={totalDpcs}
              userId={targetUserId}
              transactions={transactions}
              myResearch={myResearch}
              trackRecord={trackRecord}
              isSelf={isSelf}
            />
          )}
          {!holdingsLoading && !dataError && tab === 'squad' && (
            <ProfileSquadTab holdings={holdings} isSelf={isSelf} userId={targetUserId} />
          )}
          {!holdingsLoading && !dataError && tab === 'stats' && (
            <ProfileStatsTab
              userId={targetUserId}
              userStats={userStats}
              achievements={achievements}
              myResearch={myResearch}
              trackRecord={trackRecord}
              recentTrades={recentTrades}
              fantasyResults={fantasyResults}
              topPost={topPost}
              scoutingStats={scoutingStats ?? null}
              isSelf={isSelf}
              transactions={transactions}
            />
          )}
          {!holdingsLoading && !dataError && tab === 'activity' && (
            <ProfileActivityTab
              transactions={isSelf ? transactions : transactions.filter(t => PUBLIC_TX_TYPES.has(t.type))}
              userId={targetUserId}
              isSelf={isSelf}
            />
          )}
        </div>
      </div>
      <SponsorBanner placement="profile_footer" className="mt-4" />
    </div>
  );
}
