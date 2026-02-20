'use client';

import { useState, useMemo, useEffect } from 'react';
import { TabBar, TabPanel, ErrorState } from '@/components/ui';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { centsToBsd } from '@/lib/services/players';
import dynamic from 'next/dynamic';
import FollowListModal from '@/components/profile/FollowListModal';
import { useTranslations } from 'next-intl';

// ── React Query Hooks ──
import {
  usePlayers,
  useHoldings,
  useAllOpenOrders,
  useEvents,
  useUserStats,
  useTransactions,
  useLeaderboard,
  useRecentGlobalTrades,
  useTopTraders,
  usePosts,
  useDpcOfWeek,
  useScoutMissions,
  useMissionProgress,
  useFollowingFeed,
  useFollowerCount,
  useFollowingCount,
  useScoutScores,
  qk,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';

// ── Home Components ──
import { HomeSkeleton, HomeHeader, MeinStandTab, AktuellTab, EntdeckenTab } from '@/components/home';
import { updateLoginStreak, STREAK_KEY } from '@/components/home/helpers';

const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const OnboardingChecklist = dynamic(() => import('@/components/onboarding/OnboardingChecklist'), { ssr: false });

import type { DpcHolding, DbEvent, Pos, Player, DbOrder } from '@/types';

// ============================================
// MAIN COMPONENT
// ============================================

type HomeTab = 'mein' | 'aktuell' | 'entdecken';

export default function HomePage() {
  const { user, profile, loading } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const { followedClubs } = useClub();
  const name = profile?.display_name || displayName(user);
  const firstName = name.split(' ')[0];
  const uid = user?.id;

  // ── UI-only state ──
  const [activeTab, setActiveTab] = useState<HomeTab>('mein');
  const [streak, setStreak] = useState(0);
  const [shieldsRemaining, setShieldsRemaining] = useState<number | null>(null);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);

  // ── React Query: Phase 1 (critical) ──
  const { data: players = [], isLoading: playersLoading, isError: playersError } = usePlayers();
  const { data: rawHoldings = [] } = useHoldings(uid);
  const { data: events = [] } = useEvents();
  const { data: orders = [] } = useAllOpenOrders();
  const { data: userStats = null } = useUserStats(uid);
  const { data: scoutScores = null } = useScoutScores(uid);

  // ── i18n ──
  const t = useTranslations('home');
  const tg = useTranslations('gamification');

  const HOME_TABS = useMemo(() => [
    { id: 'mein' as const, label: t('myStand') },
    { id: 'aktuell' as const, label: 'Aktuell' },
    { id: 'entdecken' as const, label: t('discover') },
  ], [t]);

  // ── React Query: Phase 2 (secondary) ──
  const { data: transactions = [] } = useTransactions(uid, 10);
  const { data: topScouts = [] } = useLeaderboard(10);
  const { data: recentTrades = [] } = useRecentGlobalTrades(10);
  const { data: topTraders = [] } = useTopTraders(5);
  const { data: communityPosts = [] } = usePosts({ limit: 5 });
  const { data: dpcOfWeek = null } = useDpcOfWeek();
  const { data: scoutMissions = [] } = useScoutMissions();
  const { data: followingFeed = [] } = useFollowingFeed(uid);
  const { data: followerCount = 0 } = useFollowerCount(uid);
  const { data: followingCount = 0 } = useFollowingCount(uid);

  const maxGw = useMemo(() => events.reduce((mx: number, e: DbEvent) => Math.max(mx, e.gameweek || 0), 0), [events]);
  const { data: missionProgress = [] } = useMissionProgress(uid, maxGw);

  // ── Holdings transform ──
  const holdings = useMemo<DpcHolding[]>(() =>
    rawHoldings.map((h) => ({
      id: h.id,
      playerId: h.player_id,
      player: `${h.player.first_name} ${h.player.last_name}`,
      club: h.player.club,
      pos: h.player.position as Pos,
      qty: h.quantity,
      avgBuy: centsToBsd(h.avg_buy_price),
      floor: centsToBsd(h.player.floor_price),
      change24h: Number(h.player.price_change_24h),
      listedByUser: 0,
      ticket: h.player.shirt_number ?? 0,
      age: h.player.age ?? 0,
      perfL5: h.player.perf_l5 ?? 0,
      matches: h.player.matches ?? 0,
      goals: h.player.goals ?? 0,
      assists: h.player.assists ?? 0,
      imageUrl: h.player.image_url ?? null,
    })),
    [rawHoldings]
  );

  // ── Login streak + mission tracking ──
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    import('@/lib/services/missions').then(({ trackMissionProgress }) => {
      trackMissionProgress(userId, 'daily_login');
    }).catch(err => console.error('[Home] Mission tracking failed:', err));

    setStreak(updateLoginStreak());

    import('@/lib/services/streaks').then(({ recordLoginStreak }) => {
      recordLoginStreak(userId).then(result => {
        if (cancelled) return;
        setStreak(result.streak);
        setShieldsRemaining(result.shields_remaining);
        localStorage.setItem(STREAK_KEY, JSON.stringify({ current: result.streak, lastDate: new Date().toISOString().slice(0, 10) }));
        if (result.milestone_reward > 0 && result.milestone_label) {
          addToast(result.milestone_label, 'success');
        }
        if (result.shield_used) {
          addToast(tg('streak.shieldUsed') + ` ${tg('streak.shieldsRemaining', { count: result.shields_remaining })}`, 'success');
        }
      }).catch(err => console.error('[Home] Login streak record failed:', err));
    }).catch(err => console.error('[Home] Streaks module load failed:', err));

    return () => { cancelled = true; };
  }, [user]);

  // ── Derived data ──
  const portfolioValue = useMemo(() => holdings.reduce((s, h) => s + h.qty * h.floor, 0), [holdings]);
  const portfolioCost = useMemo(() => holdings.reduce((s, h) => s + h.qty * h.avgBuy, 0), [holdings]);
  const pnl = portfolioValue - portfolioCost;
  const pnlPct = portfolioCost > 0 ? (pnl / portfolioCost) * 100 : 0;
  const totalDpcs = useMemo(() => holdings.reduce((s, h) => s + h.qty, 0), [holdings]);

  const sortedByChange = useMemo(() => [...players].sort((a, b) => b.prices.change24h - a.prices.change24h), [players]);
  const topGainers = sortedByChange.filter((p) => p.prices.change24h > 0).slice(0, 3);
  const topLosers = sortedByChange.filter((p) => p.prices.change24h < 0).slice(0, 3);

  const recentListings = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    return [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map(o => ({ order: o, player: playerMap.get(o.player_id) }))
      .filter((item): item is { order: DbOrder; player: Player } => !!item.player);
  }, [orders, players]);

  const activeIPOs = useMemo(() => players.filter((p) => p.ipo.status === 'open' || p.ipo.status === 'early_access'), [players]);

  const bargains = useMemo(() => {
    if (players.length === 0) return [];
    return players
      .filter(p => p.perf.l5 > 0 && (p.prices.floor ?? 0) > 0)
      .map(p => {
        const floor = centsToBsd(p.prices.floor ?? 0);
        const valueRatio = p.perf.l5 / floor;
        return { player: p, floor, valueRatio };
      })
      .sort((a, b) => b.valueRatio - a.valueRatio)
      .slice(0, 5);
  }, [players]);

  const nextEvent = useMemo(() => {
    const active = events.filter(e => e.status === 'registering' || e.status === 'late-reg' || e.status === 'running');
    active.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return active[0] ?? null;
  }, [events]);

  // ── Guards ──
  if (playersLoading) return <HomeSkeleton />;

  if (playersError && players.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto py-12">
        <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6">

      <HomeHeader
        loading={loading}
        firstName={firstName}
        streak={streak}
        shieldsRemaining={shieldsRemaining}
        userStats={userStats}
        portfolioValue={portfolioValue}
        holdingsCount={holdings.length}
        totalDpcs={totalDpcs}
        pnl={pnl}
        pnlPct={pnlPct}
        balanceCents={balanceCents}
        scoutScores={scoutScores}
      />

      {uid && <OnboardingChecklist userId={uid} name={firstName} />}
      <SponsorBanner placement="home_hero" />

      <div data-tour-id="home-tabs">
        <TabBar tabs={HOME_TABS} activeTab={activeTab} onChange={(id) => setActiveTab(id as HomeTab)} />
      </div>

      <TabPanel id="mein" activeTab={activeTab}>
        <MeinStandTab
          uid={uid}
          holdings={holdings}
          transactions={transactions}
          followingFeed={followingFeed}
          followerCount={followerCount}
          followingCount={followingCount}
          followedClubs={followedClubs}
          dpcOfWeek={dpcOfWeek}
          scoutMissions={scoutMissions}
          missionProgress={missionProgress}
          userStats={userStats}
          onFollowListOpen={(mode) => setFollowListMode(mode)}
        />
      </TabPanel>

      <SponsorBanner placement="home_mid" />

      <TabPanel id="aktuell" activeTab={activeTab}>
        <AktuellTab
          nextEvent={nextEvent}
          activeIPOs={activeIPOs}
          recentTrades={recentTrades}
          topGainers={topGainers}
          topLosers={topLosers}
          recentListings={recentListings}
        />
      </TabPanel>

      <TabPanel id="entdecken" activeTab={activeTab}>
        <EntdeckenTab
          uid={uid}
          bargains={bargains}
          communityPosts={communityPosts}
          topScouts={topScouts}
          topTraders={topTraders}
        />
      </TabPanel>

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
