'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, BadgeCheck, Settings, Loader2, RefreshCw, Users, Calendar, MessageCircle, ArrowUp, Share2, TrendingUp, Trophy, Search, Award, Zap, Lock } from 'lucide-react';
import { Card, Button, Chip, ErrorState } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { ScoreCircle } from '@/components/player';
import { cn, fmtScout } from '@/lib/utils';
import { useUser, displayName } from '@/components/providers/AuthProvider';
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
import ProfilePortfolioTab from '@/components/profile/ProfilePortfolioTab';
import ProfileResearchTab from '@/components/profile/ProfileResearchTab';
import ProfileActivityTab from '@/components/profile/ProfileActivityTab';
import ProfilePostsTab from '@/components/profile/ProfilePostsTab';
import FollowListModal from '@/components/profile/FollowListModal';
import { getExpertBadges } from '@/lib/expertBadges';
import { getMySubscription, TIER_CONFIG } from '@/lib/services/clubSubscriptions';
import SubscriptionBadge from '@/components/ui/SubscriptionBadge';
import dynamic from 'next/dynamic';
import type { ClubSubscription, SubscriptionTier } from '@/lib/services/clubSubscriptions';
import type { ExpertBadge } from '@/lib/expertBadges';

const AirdropScoreCard = dynamic(() => import('@/components/airdrop/AirdropScoreCard'), { ssr: false });
const ReferralCard = dynamic(() => import('@/components/airdrop/ReferralCard'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
import type { HoldingRow } from '@/components/profile/ProfileOverviewTab';
import type { ProfileTab, Profile, DbTransaction, DbUserStats, DbUserAchievement, ResearchPostWithAuthor, AuthorTrackRecord, UserTradeWithPlayer, UserFantasyResult, PostWithAuthor } from '@/types';
import { RangBadge, DimensionRangStack } from '@/components/ui/RangBadge';
import FoundingScoutBadge from '@/components/ui/FoundingScoutBadge';
import { useScoutScores } from '@/lib/queries';

const TABS: { id: ProfileTab; label: string; selfOnly?: boolean }[] = [
  { id: 'overview', label: 'Ãœbersicht' },
  { id: 'portfolio', label: 'Portfolio', selfOnly: true },
  { id: 'research', label: 'Research' },
  { id: 'posts', label: 'BeitrÃ¤ge' },
  { id: 'activity', label: 'AktivitÃ¤t' }, // Public: shows trades/rewards (no wallet details)
  { id: 'settings', label: 'Einstellungen', selfOnly: true },
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
  /** Render the settings tab â€” only provided for own profile */
  renderSettings?: () => React.ReactNode;
}

export default function ProfileView({ targetUserId, targetProfile, isSelf, renderSettings }: ProfileViewProps) {
  const { user } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const [tab, setTab] = useState<ProfileTab>('overview');

  // Real holdings from DB
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Scout Scores (3 Dimensions)
  const { data: scoutScores } = useScoutScores(targetUserId);

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

  // Level-Up Detection (localStorage comparison â†’ celebration toast)
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
  const userPlan = targetProfile.plan ?? 'Kostenlos';
  const initial = name.charAt(0).toUpperCase();

  // Computed portfolio stats from real holdings (all in cents)
  const portfolioValueCents = holdings.reduce((s, h) => s + h.quantity * (h.player?.floor_price ?? 0), 0);
  const portfolioCostCents = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const totalDpcs = holdings.reduce((s, h) => s + h.quantity, 0);

  const visibleTabs = TABS.filter((t) => !t.selfOnly || isSelf);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header â€” Sorare-Style */}
      <div className="flex items-start gap-4 md:gap-5">
        {/* Avatar â€” 96px */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#22C55E]/20 border-2 border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {targetProfile.avatar_url ? (
            <img src={targetProfile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-black text-2xl md:text-3xl text-white/70">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-3xl font-black truncate">{name}</h1>
            {targetProfile.verified && <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-[#FFD700] flex-shrink-0" />}
            <Chip className="bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25">{userPlan}</Chip>
          </div>
          <div className="text-sm md:text-base text-white/50">{userHandle}</div>

          {/* Portfolio Value â€” Hero */}
          {(isSelf || portfolioValueCents > 0) && (
            <div className="mt-1">
              <span className="text-2xl md:text-3xl font-mono font-black text-[#FFD700]">
                {fmtScout(centsToBsd(portfolioValueCents))} $SCOUT
              </span>
              <span className="text-xs text-white/30 ml-2">Portfolio-Wert</span>
            </div>
          )}

          {/* Bio */}
          {targetProfile.bio && (
            <p className="text-sm text-white/60 mt-1.5 max-w-lg">{targetProfile.bio}</p>
          )}

          {/* Top Post â€” Pinned Take */}
          {topPost && (
            <div className="mt-2 max-w-lg">
              <button
                onClick={() => setTab('posts')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageCircle className="w-3 h-3 text-sky-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Top Beitrag</span>
                  <span className="flex items-center gap-0.5 ml-auto text-[10px] font-mono font-bold text-[#22C55E]">
                    <ArrowUp className="w-3 h-3" />
                    {topPost.upvotes - topPost.downvotes}
                  </span>
                </div>
                <p className="text-xs text-white/60 line-clamp-2">{topPost.content}</p>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 md:gap-4 mt-2 text-xs md:text-sm flex-wrap">
            <RangBadge scores={scoutScores ?? undefined} score={scoutScores ? undefined : 0} size="sm" />
            {achievements.some(a => a.achievement_key === 'founding_scout') && (
              <FoundingScoutBadge size="sm" />
            )}

            {/* Clickable Follower/Following */}
            <button
              onClick={() => setFollowListMode('followers')}
              className="text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              <strong>{followerCount}</strong> Follower
            </button>
            <button
              onClick={() => setFollowListMode('following')}
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              <strong>{followingCount}</strong> Folge ich
            </button>

            {targetProfile.favorite_club && (
              <span className="text-white/50 flex items-center gap-1.5">
                {getClubName(targetProfile.favorite_club)}
                {clubSub && (
                  <SubscriptionBadge tier={clubSub.tier as SubscriptionTier} size="sm" />
                )}
              </span>
            )}

            {/* Mitglied seit */}
            <span className="text-white/30 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Mitglied seit {new Date(targetProfile.created_at).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          {/* 3-Dimension Scout Scores */}
          {scoutScores && (
            <div className="mt-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 max-w-xs">
              <DimensionRangStack scores={scoutScores} />
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 md:mt-3">
            {isSelf && (
              <Button variant="outline" size="sm" onClick={() => setTab('settings')}>
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Profil</span> bearbeiten
              </Button>
            )}
            {!isSelf && user && (
              <Button
                variant={following ? 'outline' : 'gold'}
                size="sm"
                onClick={handleToggleFollow}
                disabled={followLoading}
              >
                {following ? 'Entfolgen' : 'Folgen'}
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
              <Share2 className="w-3.5 h-3.5" />
              Teilen
            </Button>
          </div>
        </div>
      </div>

      <SponsorBanner placement="profile_hero" className="mb-4" />

      {/* Follow List Modal */}
      {followListMode && (
        <FollowListModal
          userId={targetUserId}
          mode={followListMode}
          onClose={() => setFollowListMode(null)}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-2.5 md:px-5 py-2.5 md:py-3 text-xs md:text-base font-semibold transition-all relative whitespace-nowrap flex-shrink-0 ${
              tab === t.id ? 'text-[#FFD700]' : 'text-white/60 hover:text-white'
            }`}
          >
            {t.label}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD700]" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar */}
        <div className="space-y-6">
          {/* Wallet â€” self only */}
          {isSelf && (
            <Card className="p-4 md:p-6">
              <h3 className="font-black mb-4">Guthaben</h3>
              <div className="text-2xl md:text-3xl font-mono font-black text-[#FFD700] mb-2">
                {balanceCents === null ? (
                  <span className="inline-block w-24 h-8 rounded bg-[#FFD700]/10 animate-pulse" />
                ) : (
                  <>{formatScout(balanceCents)} $SCOUT</>
                )}
              </div>
              <div className="text-sm text-white/50 mb-4">VerfÃ¼gbares Guthaben</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="gold" size="sm">Einzahlen</Button>
                <Button variant="outline" size="sm">Abheben</Button>
              </div>
            </Card>
          )}

          {/* Scores */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black">Scout Score</h3>
              {isSelf && (
                <button
                  onClick={handleRefreshStats}
                  disabled={statsRefreshing}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/70"
                  title="Aktualisieren"
                >
                  <RefreshCw className={cn('w-4 h-4', statsRefreshing && 'animate-spin')} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <ScoreCircle label="T" value={userStats?.trading_score ?? 0} size={48} />
              <ScoreCircle label="M" value={userStats?.manager_score ?? 0} size={48} />
              <ScoreCircle label="S" value={userStats?.scout_score ?? 0} size={48} />
            </div>
            <div className="text-sm text-white/50 mb-2">
              Trading Â· Manager Â· Scout
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-mono font-black text-[#FFD700]">{userStats?.total_score ?? 0}</span>
                <span className="text-white/30 text-sm ml-1">Pkt</span>
              </div>
              {userStats && userStats.rank > 0 && (
                <Chip className="bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25">
                  Rang #{userStats.rank}
                </Chip>
              )}
            </div>
          </Card>

          {/* Airdrop Score */}
          <AirdropScoreCard userId={targetUserId} compact={!isSelf} />

          {/* Referral â€” self only */}
          {isSelf && <ReferralCard userId={targetUserId} />}

          {/* Expert Badges */}
          {userStats && (() => {
            const badges = getExpertBadges(userStats);
            const earnedCount = badges.filter(b => b.earned).length;
            const BADGE_ICONS: Record<string, React.ElementType> = {
              TrendingUp, Trophy, Search, Award, Users, Zap,
            };
            return (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black">Expert-Badges</h3>
                  <span className="text-xs text-white/40">{earnedCount}/{badges.length} verdient</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {badges.map(badge => {
                    const IconComp = BADGE_ICONS[badge.icon] ?? Award;
                    return (
                      <div
                        key={badge.key}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all',
                          badge.earned
                            ? `${badge.bgColor} border`
                            : 'bg-white/[0.02] border-white/[0.06] opacity-50'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          badge.earned ? badge.bgColor : 'bg-white/5'
                        )}>
                          {badge.earned
                            ? <IconComp className={cn('w-4 h-4', badge.color)} />
                            : <Lock className="w-3.5 h-3.5 text-white/20" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cn('text-xs font-bold', badge.earned ? badge.color : 'text-white/30')}>
                            {badge.label}
                          </div>
                          {!badge.earned && (
                            <div className="mt-1">
                              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-white/20 transition-all"
                                  style={{ width: `${badge.progress}%` }}
                                />
                              </div>
                              <div className="text-[9px] text-white/20 mt-0.5">{badge.progress}%</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {dataError && !holdingsLoading && (
            <ErrorState onRetry={() => setRetryCount(c => c + 1)} />
          )}

          {holdingsLoading && !dataError && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFD700]" />
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
            />
          )}
          {!holdingsLoading && !dataError && tab === 'portfolio' && isSelf && (
            <ProfilePortfolioTab holdings={holdings} />
          )}
          {!holdingsLoading && !dataError && tab === 'research' && (
            <ProfileResearchTab myResearch={myResearch} trackRecord={trackRecord} />
          )}
          {!holdingsLoading && !dataError && tab === 'posts' && (
            <ProfilePostsTab userId={targetUserId} />
          )}
          {!holdingsLoading && !dataError && tab === 'activity' && (
            <ProfileActivityTab
              transactions={isSelf ? transactions : transactions.filter(t => PUBLIC_TX_TYPES.has(t.type))}
              userId={targetUserId}
            />
          )}
          {!holdingsLoading && !dataError && tab === 'settings' && isSelf && renderSettings?.()}
        </div>
      </div>
      <SponsorBanner placement="profile_footer" className="mt-4" />
    </div>
  );
}
