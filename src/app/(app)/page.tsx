'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ErrorState } from '@/components/ui';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  Clock, Trophy, Users, Rocket,
  Shield, Compass,
} from 'lucide-react';

// ── React Query Hooks ──
import {
  usePlayers,
  useHoldings,
  useEvents,
  useUserStats,
  useScoutScores,
  useRecentGlobalTrades,
  useTrendingPlayers,
  qk,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';

// ── Home Components ──
import { HomeSkeleton } from '@/components/home';
import HomeStoryHeader from '@/components/home/HomeStoryHeader';
import HomeSpotlight from '@/components/home/HomeSpotlight';
import LiveTicker from '@/components/home/LiveTicker';
import PortfolioStrip from '@/components/home/PortfolioStrip';
import DiscoveryCard from '@/components/market/DiscoveryCard';
import { updateLoginStreak, STREAK_KEY, SectionHeader, formatPrize, getTimeUntil, getStoryMessage } from '@/components/home/helpers';

const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const OnboardingChecklist = dynamic(() => import('@/components/onboarding/OnboardingChecklist'), {
  ssr: false,
  loading: () => <div className="h-24 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />,
});

import type { DpcHolding, DbEvent, Pos } from '@/types';

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { user, profile, loading } = useUser();
  const { addToast } = useToast();
  const { followedClubs } = useClub();
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
  const { data: scoutScores = null } = useScoutScores(uid);
  const { data: globalTrades = [] } = useRecentGlobalTrades(5);
  const { data: trendingPlayers = [] } = useTrendingPlayers(5);

  // ── i18n ──
  const t = useTranslations('home');
  const tg = useTranslations('gamification');

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

      {/* 1. Story Header — Greeting + Narrative + Compact Stats */}
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

      {/* 2. Spotlight — One Focus Card */}
      <HomeSpotlight
        activeIPOs={activeIPOs}
        nextEvent={nextEvent}
        holdings={holdings}
        trendingPlayers={trendingPlayers}
        players={players}
      />

      {/* 3. Onboarding — Only for new users */}
      {uid && <OnboardingChecklist userId={uid} name={firstName} />}

      {/* 4. Live Ticker — Social Proof */}
      <LiveTicker trades={globalTrades} />

      {/* 5. Portfolio Strip — Top 3 Holdings as Cards */}
      <PortfolioStrip holdings={holdings} />

      <SponsorBanner placement="home_hero" />

      {/* 6. Meine Vereine */}
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
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/15 transition-all shrink-0"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                    {club.logo_url ? (
                      <img src={club.logo_url} alt="" className="w-5 h-5 object-contain" />
                    ) : (
                      <Shield className="w-3.5 h-3.5" style={{ color }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate max-w-[100px]">{club.name}</div>
                    <div className="text-[10px] text-white/30">{club.league}</div>
                  </div>
                </Link>
              );
            })}
            <Link href="/clubs" className="flex items-center gap-2 px-3 py-2 bg-[#FFD700]/[0.03] border border-[#FFD700]/10 rounded-xl hover:bg-[#FFD700]/[0.06] transition-all shrink-0">
              <Compass className="w-4 h-4 text-[#FFD700]/60" />
              <span className="text-xs font-medium text-[#FFD700]/60">{t('discover')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* 7. Event + IPO (only if NOT already shown in Spotlight) */}
      {nextEvent && spotlightType !== 'event' && (
        <div>
          <SectionHeader
            title={t('nextEvent')}
            href="/fantasy"
            badge={
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25">
                <Clock className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-300">
                  {nextEvent.status === 'running' ? getTimeUntil(nextEvent.ends_at) : getTimeUntil(nextEvent.starts_at)}
                </span>
              </span>
            }
          />
          <Link href="/fantasy" className="block mt-3">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-600/20 via-purple-500/8 to-transparent shadow-card-md" style={{ boxShadow: '0 0 30px rgba(168,85,247,0.12), 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-purple-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">{nextEvent.format}</span>
                    </div>
                    <h3 className="text-base md:text-lg font-black">{nextEvent.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {nextEvent.current_entries}/{nextEvent.max_entries ?? '\u221E'}
                      </span>
                      <span>Eintritt: {nextEvent.entry_fee === 0 ? 'Gratis' : `${fmtScout(centsToBsd(nextEvent.entry_fee))} $SCOUT`}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-white/40 mb-0.5">Preisgeld</div>
                    <div className="text-xl md:text-2xl font-black font-mono text-[#FFD700] gold-glow">
                      {formatPrize(centsToBsd(nextEvent.prize_pool))}
                    </div>
                    <div className="text-[10px] text-white/40">$SCOUT</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* IPO Banner only if Spotlight doesn't already show it */}
      {activeIPOs.length > 0 && spotlightType !== 'ipo' && (
        <Link href={`/player/${activeIPOs[0].id}`} className="block">
          <div className="relative overflow-hidden rounded-2xl border border-[#22C55E]/30 bg-gradient-to-r from-[#22C55E]/[0.15] via-transparent to-[#FFD700]/[0.06] shadow-glow-live">
            <div className="relative flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/25 shrink-0">
                  <Rocket className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#22C55E]">{t('liveIPO')}</span>
                    <span className="relative flex h-2.5 w-2.5 live-ring">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E]" style={{ boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
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
                <div className="font-mono font-black text-[#FFD700] text-lg">{activeIPOs[0].ipo.price}</div>
                <div className="text-[10px] text-white/40">$SCOUT/DPC</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* 8. Markt-Puls — Trending Players */}
      {trendingWithPlayers.length > 0 && (
        <>
          <div className="floodlight-divider" />
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
        </>
      )}

      {/* 9. Missions — Default Collapsed */}
      {uid && <MissionBanner />}

      <SponsorBanner placement="home_mid" />
    </div>
  );
}
