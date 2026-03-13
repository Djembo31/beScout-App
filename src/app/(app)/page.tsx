'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ErrorState } from '@/components/ui';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout, cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  Clock, Trophy, Users, Rocket,
  Shield, Compass, Coins, TrendingUp, TrendingDown,
} from 'lucide-react';

// ── React Query Hooks ──
import {
  usePlayers,
  useHoldings,
  useEvents,
  useUserStats,
  useTrendingPlayers,
  qk,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';

// ── Gamification v5 ──
import { useTodaysChallenge, useChallengeHistory } from '@/lib/queries/dailyChallenge';
import { useUserTickets } from '@/lib/queries/tickets';
import { submitDailyChallenge } from '@/lib/services/dailyChallenge';
import { openMysteryBox } from '@/lib/services/mysteryBox';

// ── Home Components ──
import HomeStoryHeader from '@/components/home/HomeStoryHeader';
import HomeSpotlight from '@/components/home/HomeSpotlight';
import PortfolioStrip from '@/components/home/PortfolioStrip';
import TopMoversStrip from '@/components/home/TopMoversStrip';
import DiscoveryCard from '@/components/market/DiscoveryCard';
import { updateLoginStreak, STREAK_KEY, SectionHeader, formatPrize, getTimeUntil, getStoryMessage } from '@/components/home/helpers';

const NewUserTip = dynamic(() => import('@/components/onboarding/NewUserTip'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const DailyChallengeCard = dynamic(() => import('@/components/gamification/DailyChallengeCard'), {
  ssr: false,
  loading: () => <div className="h-40 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const MysteryBoxModal = dynamic(() => import('@/components/gamification/MysteryBoxModal'), {
  ssr: false,
});
const ScoreRoadStrip = dynamic(() => import('@/components/gamification/ScoreRoadStrip'), {
  ssr: false,
  loading: () => <div className="h-10 rounded-xl bg-white/[0.02] animate-pulse" />,
});
const OnboardingChecklist = dynamic(() => import('@/components/home/OnboardingChecklist'), { ssr: false });
const WelcomeBonusModal = dynamic(() => import('@/components/onboarding/WelcomeBonusModal'), { ssr: false });
const StreakMilestoneBanner = dynamic(() => import('@/components/home/StreakMilestoneBanner'), { ssr: false });
const SuggestedActionBanner = dynamic(() => import('@/components/home/SuggestedActionBanner'), { ssr: false });

import type { DpcHolding, DbEvent, Pos } from '@/types';
import { getRetentionContext } from '@/lib/retentionEngine';

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { user, profile, loading } = useUser();
  const { addToast } = useToast();
  const { followedClubs } = useClub();
  const { balanceCents } = useWallet();
  const name = profile?.display_name || displayName(user);
  const firstName = name.split(' ')[0];
  const uid = user?.id;

  // ── UI-only state ──
  const [streak, setStreak] = useState(0);
  const [shieldsRemaining, setShieldsRemaining] = useState<number | null>(null);

  // ── React Query ──
  const { data: players = [], isLoading: playersLoading, isError: playersError } = usePlayers();
  const { data: rawHoldings = [] } = useHoldings(uid);
  const { data: events = [] } = useEvents();
  const { data: userStats = null } = useUserStats(uid);
  const { data: trendingPlayers = [] } = useTrendingPlayers(5);

  // ── Gamification v5 Hooks ──
  const { data: todaysChallenge = null, isLoading: challengeLoading } = useTodaysChallenge();
  const { data: challengeHistory = [] } = useChallengeHistory(uid);
  const { data: ticketData = null } = useUserTickets(uid);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);

  const todaysAnswer = useMemo(() => {
    if (!todaysChallenge || !challengeHistory.length) return null;
    return challengeHistory.find(h => h.challenge_id === todaysChallenge.id) ?? null;
  }, [todaysChallenge, challengeHistory]);

  const handleChallengeSubmit = useCallback(async (challengeId: string, option: number) => {
    if (!uid) return;
    setIsSubmitting(true);
    try {
      await submitDailyChallenge(challengeId, option);
      queryClient.invalidateQueries({ queryKey: qk.dailyChallenge.history(uid) });
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) });
    } finally {
      setIsSubmitting(false);
    }
  }, [uid]);

  const handleOpenMysteryBox = useCallback(async (free?: boolean) => {
    if (!uid) return null;
    const result = await openMysteryBox(free);
    if (result.ok) {
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) });
      queryClient.invalidateQueries({ queryKey: qk.cosmetics.user(uid) });
      return {
        id: crypto.randomUUID(),
        rarity: result.rarity!,
        reward_type: result.rewardType!,
        tickets_amount: result.ticketsAmount ?? null,
        cosmetic_id: result.cosmeticKey ?? null,
        ticket_cost: free ? 0 : 15,
        opened_at: new Date().toISOString(),
      };
    }
    return null;
  }, [uid]);

  // ── i18n ──
  const t = useTranslations('home');
  const tg = useTranslations('gamification');

  // ── Holdings transform ──
  const holdings = useMemo<DpcHolding[]>(() =>
    rawHoldings.filter((h) => h.player != null).map((h) => ({
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

  const activeIPOs = useMemo(() => players.filter((p) => p.ipo.status === 'open' || p.ipo.status === 'early_access'), [players]);

  const nextEvent = useMemo(() => {
    const active = events.filter(e => e.status === 'registering' || e.status === 'late-reg' || e.status === 'running');
    active.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return active[0] ?? null;
  }, [events]);

  const storyMessage = useMemo(
    () => getStoryMessage(holdings, pnl, pnlPct, activeIPOs, nextEvent),
    [holdings, pnl, pnlPct, activeIPOs, nextEvent]
  );

  // ── Retention context ──
  const retention = useMemo(() => {
    if (!profile?.created_at) return null;
    return getRetentionContext({
      createdAt: profile.created_at,
      streakDays: streak,
      userStats,
      holdingsCount: holdings.length,
      eventsJoined: userStats?.events_count ?? 0,
      challengesCompleted: challengeHistory.length,
      postsCount: userStats?.votes_cast ?? 0,
      followedClubs: followedClubs.length,
    });
  }, [profile?.created_at, streak, userStats, holdings.length, challengeHistory.length, followedClubs.length]);

  // Determine what Spotlight shows so we don't duplicate below
  const spotlightType = useMemo(() => {
    if (activeIPOs.length > 0) return 'ipo' as const;
    if (nextEvent) return 'event' as const;
    if (holdings.length > 0 && holdings.some(h => h.change24h !== 0)) return 'topMover' as const;
    if (trendingPlayers.length > 0) return 'trending' as const;
    return 'cta' as const;
  }, [activeIPOs, nextEvent, holdings, trendingPlayers]);

  // Trending players matched to full Player objects for DiscoveryCard
  const trendingWithPlayers = useMemo(() => {
    return trendingPlayers
      .map(tp => ({ tp, player: players.find(p => p.id === tp.playerId) }))
      .filter((item): item is { tp: typeof trendingPlayers[0]; player: NonNullable<typeof item.player> } => !!item.player)
      .slice(0, 5);
  }, [trendingPlayers, players]);

  // ── Portfolio Top Movers (biggest daily % changes in holdings) ──
  const topMovers = useMemo(() => {
    if (holdings.length < 2) return [];
    return [...holdings]
      .filter(h => h.change24h !== 0)
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
      .slice(0, 3);
  }, [holdings]);

  // ── Guards ──
  if (playersError && players.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto py-12">
        <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6">

      {/* ── 0. WELCOME BONUS MODAL — First-time celebration ── */}
      {holdings.length === 0 && balanceCents != null && balanceCents > 0 && (
        <WelcomeBonusModal balanceCents={balanceCents} />
      )}

      {/* ── 1. HERO HEADER — Greeting + Stats ── */}
      <HomeStoryHeader
        loading={loading}
        firstName={firstName}
        streak={streak}
        shieldsRemaining={shieldsRemaining}
        userStats={userStats}
        portfolioValue={portfolioValue}
        holdingsCount={holdings.length}
        pnl={pnl}
        pnlPct={pnlPct}
        storyMessage={storyMessage}
      />

      {/* ── 1b. SPOTLIGHT — Context-aware hero card ── */}
      {playersLoading ? (
        <div className="h-40 bg-surface-base border border-white/10 rounded-2xl animate-pulse" />
      ) : (
        <HomeSpotlight
          activeIPOs={activeIPOs}
          nextEvent={nextEvent}
          holdings={holdings}
          trendingPlayers={trendingPlayers}
          players={players}
        />
      )}

      {/* ── 1c. ONBOARDING CHECKLIST — New users (day 0-7) ── */}
      {retention?.onboarding && (
        <OnboardingChecklist items={retention.onboarding} />
      )}

      {/* ── 1d. WELCOME BONUS — First-time users with 0 holdings ── */}
      {/* Graceful: if wallet fetch fails (balanceCents=null), banner simply doesn't show */}
      {holdings.length === 0 && balanceCents != null && balanceCents > 0 && (
        <NewUserTip
          tipKey="welcome-bonus"
          icon={<Coins className="size-5" />}
          title={t('welcomeBonusTitle')}
          description={t('welcomeBonusDesc', { balance: fmtScout(centsToBsd(balanceCents)) })}
          action={{ label: t('welcomeBonusAction'), href: '/market' }}
          show={true}
        />
      )}

      {/* ── 2. PORTFOLIO STRIP — Top holdings ── */}
      <PortfolioStrip holdings={holdings} />

      {/* ── 2a. TOP MOVERS — Biggest daily changes in portfolio ── */}
      {topMovers.length > 0 && (
        <div>
          <SectionHeader title={t('topMovers')} href="/market" />
          <div className="flex gap-2.5 mt-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {topMovers.map(h => {
              const up = h.change24h >= 0;
              return (
                <Link
                  key={h.playerId}
                  href={`/player/${h.playerId}`}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-white/[0.02] hover:bg-white/[0.05] transition-colors shrink-0 min-w-[180px]"
                  style={{ borderColor: up ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{h.player}</div>
                    <div className="text-[11px] text-white/40">{h.club}</div>
                  </div>
                  <div className={cn('flex items-center gap-0.5 ml-auto font-mono font-bold text-sm tabular-nums shrink-0', up ? 'text-green-500' : 'text-red-400')}>
                    {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {up ? '+' : ''}{h.change24h.toFixed(1)}%
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2a2. GLOBAL TOP MOVERS — Biggest daily changes across all players ── */}
      {!playersLoading && players.length > 0 && (
        <div>
          <SectionHeader title={t('globalMovers')} href="/market" />
          <div className="mt-2">
            <TopMoversStrip players={players} />
          </div>
        </div>
      )}

      {/* ── 2b. SCORE ROAD STRIP — Progress toward next milestone ── */}
      {uid && <ScoreRoadStrip userId={uid} />}

      {/* ── 2c. STREAK MILESTONE — Celebration banner ── */}
      {retention?.streakMilestone && (
        <StreakMilestoneBanner milestone={retention.streakMilestone} />
      )}

      {/* ── 2d. SUGGESTED ACTION — Stage-specific CTA ── */}
      {retention?.suggestedAction && (
        <SuggestedActionBanner action={retention.suggestedAction} />
      )}

      {/* ── 3. ENGAGEMENT ZONE — Daily Challenge + Mystery Box ── */}
      {uid && (
        <>
          <DailyChallengeCard
            challenge={todaysChallenge}
            userAnswer={todaysAnswer ? {
              selectedOption: todaysAnswer.selected_option,
              isCorrect: todaysAnswer.is_correct,
              ticketsAwarded: todaysAnswer.tickets_awarded,
            } : null}
            onSubmit={handleChallengeSubmit}
            isSubmitting={isSubmitting}
            streakDays={streak}
            isLoading={challengeLoading}
            ticketBalance={ticketData?.balance ?? 0}
            onOpenMysteryBox={() => setShowMysteryBox(true)}
          />

          <MysteryBoxModal
            open={showMysteryBox}
            onClose={() => setShowMysteryBox(false)}
            onOpen={handleOpenMysteryBox}
            ticketBalance={ticketData?.balance ?? 0}
          />
        </>
      )}

      {/* ── 4. DYNAMIC FEED — Event/IPO + Trending ── */}
      {playersLoading ? (
        <div className="h-24 bg-surface-base border border-white/10 rounded-2xl animate-pulse" />
      ) : (
        <>
          {nextEvent && spotlightType !== 'event' && (
            <div>
              <SectionHeader
                title={t('nextEvent')}
                href="/fantasy"
                badge={
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25">
                    <Clock className="size-3 text-purple-400" />
                    <span className="text-[11px] font-bold text-purple-300">
                      {nextEvent.status === 'running' ? getTimeUntil(nextEvent.ends_at) : getTimeUntil(nextEvent.starts_at)}
                    </span>
                  </span>
                }
              />
              <Link href="/fantasy" className="block mt-3">
                <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/10 shadow-lg">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="size-4 text-purple-400" />
                          <span className="text-[11px] font-black uppercase text-purple-400">{nextEvent.format}</span>
                        </div>
                        <h3 className="text-base md:text-lg font-black text-balance">{nextEvent.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {nextEvent.current_entries}/{nextEvent.max_entries ?? '\u221E'}
                          </span>
                          <span>{t('entryLabel')}{nextEvent.entry_fee === 0 ? t('entryFree') : `${fmtScout(centsToBsd(nextEvent.entry_fee))} bCredits`}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-white/40 mb-0.5">{t('prizeMoney')}</div>
                        <div className="text-xl md:text-2xl font-black font-mono tabular-nums text-gold">
                          {formatPrize(centsToBsd(nextEvent.prize_pool))}
                        </div>
                        <div className="text-[11px] text-white/40">bCredits</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {activeIPOs.length > 0 && spotlightType !== 'ipo' && (
            <Link href={`/player/${activeIPOs[0].id}`} className="block">
              <div className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-green-500/10">
                <div className="relative flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-2xl bg-green-500/15 border border-green-500/25 shrink-0">
                      <Rocket className="size-5 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-black uppercase text-green-500">{t('liveIPO')}</span>
                        <span className="relative flex size-2.5">
                          <span className="animate-ping motion-reduce:animate-none absolute inline-flex size-full rounded-full bg-green-500 opacity-75" />
                          <span className="relative inline-flex rounded-full size-2.5 bg-green-500" />
                        </span>
                      </div>
                      <div className="font-black text-sm truncate">
                        {activeIPOs.map((p) => `${p.first} ${p.last}`).join(', ')}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {activeIPOs[0].club} · {activeIPOs[0].ipo.progress}% {t('sold')}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono font-black text-gold text-lg">{activeIPOs[0].ipo.price}</div>
                    <div className="text-[11px] text-white/40">bCredits/DPC</div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {trendingWithPlayers.length > 0 && (
            <div>
              <SectionHeader title={t('marketPulse')} href="/market" />
              <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {trendingWithPlayers.map(({ tp, player }) => (
                  <DiscoveryCard
                    key={player.id}
                    player={player}
                    variant="trending"
                    tradeCount={tp.tradeCount}
                    change24h={tp.change24h}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 5. MY CLUBS — Conditional ── */}
      {followedClubs.length > 0 && (
        <div>
          <SectionHeader title={t('myClubs')} href="/clubs" />
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {followedClubs.map(club => {
              const color = club.primary_color ?? '#FFD700';
              return (
                <Link
                  key={club.id}
                  href={`/club/${club.slug}`}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/15 transition-colors shrink-0"
                >
                  <div className="size-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                    {club.logo_url ? (
                      <img src={club.logo_url} alt="" className="size-5 object-contain" />
                    ) : (
                      <Shield className="size-3.5" style={{ color }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate max-w-[100px]">{club.name}</div>
                    <div className="text-[11px] text-white/30">{club.league}</div>
                  </div>
                </Link>
              );
            })}
            <Link href="/clubs" className="flex items-center gap-2 px-3 py-2 bg-gold/[0.03] border border-gold/10 rounded-xl hover:bg-gold/[0.06] transition-colors shrink-0">
              <Compass className="size-4 text-gold/60" />
              <span className="text-xs font-medium text-gold/60">{t('discover')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── 6. SPONSOR — Single footer placement ── */}
      <SponsorBanner placement="home_mid" />
    </div>
  );
}
