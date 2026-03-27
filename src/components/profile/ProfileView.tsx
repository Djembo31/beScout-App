'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, Button, ErrorState } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { formatScout } from '@/lib/services/wallet';
import { ScoutCard } from '@/components/profile/ScoutCard';
import FollowListModal from '@/components/profile/FollowListModal';
import { TabBar, TabPanel } from '@/components/ui/TabBar';
import dynamic from 'next/dynamic';
import type { Profile, ProfileTab } from '@/types';
import { useTranslations } from 'next-intl';
import { useProfileData } from '@/components/profile/hooks';

const AirdropScoreCard = dynamic(() => import('@/components/airdrop/AirdropScoreCard'), { ssr: false });
const ReferralCard = dynamic(() => import('@/components/airdrop/ReferralCard'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const ManagerTab = dynamic(() => import('./ManagerTab'));
const TraderTab = dynamic(() => import('./TraderTab'));
const AnalystTab = dynamic(() => import('./AnalystTab'));
const AchievementsSection = dynamic(() => import('./AchievementsSection'));
const TimelineTab = dynamic(() => import('./TimelineTab'));

interface ProfileViewProps {
  targetUserId: string;
  targetProfile: Profile;
  isSelf: boolean;
}

export default function ProfileView({ targetUserId, targetProfile, isSelf }: ProfileViewProps) {
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const t = useTranslations('profile');

  // ── Data + Actions Hook ──
  const data = useProfileData({ targetUserId, targetProfile, isSelf });
  const {
    loading, dataError, retry,
    holdings, ticketTransactions, userStats,
    myResearch, trackRecord, recentTrades, fantasyResults,
    unlockedAchievements, creatorPayouts, clubSub,
    portfolioPnlPct, avgFantasyRank, publicTransactions,
    scores, dimOrder,
    tab, setTab,
    following, followLoading, followerCount, followingCount,
    handleFollow, handleUnfollow,
    highestPass, streakDays,
  } = data;

  // ── UI State ──
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);

  // ── Level-up Detection ──
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

  // ── Dynamic Tab Ordering ──
  const tabDefs = useMemo(() => [
    ...dimOrder.map(dim => ({
      id: dim,
      label: t(`tab${dim.charAt(0).toUpperCase() + dim.slice(1)}`),
    })),
    { id: 'achievements' as const, label: t('tabAchievements') },
    { id: 'timeline' as const, label: t('tabTimeline') },
  ], [dimOrder, t]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">
      {/* ===== SCOUT CARD HERO ===== */}
      {!loading && !dataError && (
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
          avgFantasyRank={avgFantasyRank}
          researchCount={myResearch.length}
          onFollowersClick={() => setFollowListMode('followers')}
          onFollowingClick={() => setFollowListMode('following')}
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
      {!loading && !dataError && (
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
          {isSelf && (
            <Card className="p-4 md:p-6">
              <h3 className="font-black mb-4">{t('walletTitle')}</h3>
              <div className="text-2xl md:text-3xl font-mono font-black text-gold mb-2">
                {balanceCents === null ? (
                  <span className="inline-block w-24 h-8 rounded bg-gold/10 animate-pulse motion-reduce:animate-none" />
                ) : (
                  <>{formatScout(balanceCents)} CR</>
                )}
              </div>
              <div className="text-sm text-white/50 mb-4">{t('walletAvailable')}</div>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="gold" size="sm">{t('depositBtn')}</Button>
              </div>
            </Card>
          )}
          <AirdropScoreCard userId={targetUserId} compact={!isSelf} />
          {isSelf && <ReferralCard userId={targetUserId} />}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {dataError && !loading && <ErrorState onRetry={retry} />}

          {loading && !dataError && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
            </div>
          )}

          {!loading && !dataError && (
            <>
              <TabPanel id="manager" activeTab={tab}>
                <ManagerTab
                  userId={targetUserId}
                  userStats={userStats}
                  fantasyResults={fantasyResults}
                  isSelf={isSelf}
                  favoriteClubId={targetProfile.favorite_club_id ?? undefined}
                  favoriteClubName={targetProfile.favorite_club ?? undefined}
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
                  creatorPayouts={creatorPayouts}
                />
              </TabPanel>

              <TabPanel id="achievements" activeTab={tab}>
                <AchievementsSection
                  userStats={userStats}
                  unlockedKeys={unlockedAchievements}
                />
              </TabPanel>

              <TabPanel id="timeline" activeTab={tab}>
                <TimelineTab
                  transactions={publicTransactions}
                  ticketTransactions={ticketTransactions}
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
