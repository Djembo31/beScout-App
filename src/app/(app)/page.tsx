'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ErrorState } from '@/components/ui';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { centsToBsd } from '@/lib/services/players';
import { fmtBSD } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  Clock, Trophy, Users, Rocket, ArrowUpRight, ArrowDownRight,
  Shield, Compass, Briefcase, Zap, MessageCircle,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';

// ── React Query Hooks ──
import {
  usePlayers,
  useHoldings,
  useEvents,
  useUserStats,
  useScoutScores,
  qk,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';

// ── Home Components ──
import { HomeSkeleton, HomeHeader } from '@/components/home';
import { updateLoginStreak, STREAK_KEY, SectionHeader, formatPrize, getTimeUntil } from '@/components/home/helpers';

const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const OnboardingChecklist = dynamic(() => import('@/components/onboarding/OnboardingChecklist'), { ssr: false });

import type { DpcHolding, DbEvent, Pos } from '@/types';

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { user, profile, loading } = useUser();
  const { balanceCents } = useWallet();
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

  const activeIPOs = useMemo(() => players.filter((p) => p.ipo.status === 'open' || p.ipo.status === 'early_access'), [players]);

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

      {/* ── Meine Vereine ── */}
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

      {/* ── Portfolio Holdings Top 5 ── */}
      <div>
        <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
        <div className="mt-3 space-y-1.5">
          {holdings.length === 0 ? (
            <Card className="p-6 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-2 text-white/20" />
              <div className="text-sm font-medium text-white/50">{t('emptyPortfolioTitle')}</div>
              <div className="text-xs text-white/30 mt-1">{t('emptyPortfolioDesc')}</div>
              <Link href="/market?tab=kaufen" className="inline-block mt-3">
                <Button variant="gold" size="sm" className="gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  {t('buyFirstPlayer')}
                </Button>
              </Link>
            </Card>
          ) : (
            holdings.slice(0, 5).map((h) => (
              <PlayerDisplay key={h.id} variant="compact"
                player={{
                  id: h.playerId,
                  first: h.player.split(' ')[0] || '',
                  last: h.player.split(' ').slice(1).join(' ') || '',
                  club: h.club,
                  pos: h.pos,
                  age: h.age,
                  ticket: h.ticket,
                  status: 'fit' as const,
                  contractMonthsLeft: 24,
                  country: '',
                  league: '',
                  isLiquidated: false,
                  imageUrl: h.imageUrl,
                  stats: { matches: h.matches, goals: h.goals, assists: h.assists },
                  perf: { l5: h.perfL5, l15: 0, trend: 'FLAT' as const },
                  prices: { lastTrade: 0, floor: h.floor, change24h: h.change24h },
                  dpc: { supply: 0, float: 0, circulation: 0, onMarket: 0, owned: h.qty },
                  ipo: { status: 'none' as const },
                  listings: [],
                  topOwners: [],
                }}
                holding={{ quantity: h.qty, avgBuyPriceBsd: h.avgBuy }}
                showActions={false}
              />
            ))
          )}
          {holdings.length > 5 && (
            <Link href="/market?tab=portfolio" className="block text-center py-2 text-xs text-[#FFD700] hover:underline">
              {t('viewAllPlayers', { count: holdings.length })}
            </Link>
          )}
        </div>
      </div>

      <SponsorBanner placement="home_mid" />

      {/* ── Nächstes Event ── */}
      {nextEvent && (
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
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-transparent">
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
                      <span>Eintritt: {nextEvent.entry_fee === 0 ? 'Gratis' : `${fmtBSD(centsToBsd(nextEvent.entry_fee))} BSD`}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-white/40 mb-0.5">Preisgeld</div>
                    <div className="text-xl md:text-2xl font-black font-mono text-[#FFD700]">
                      {formatPrize(centsToBsd(nextEvent.prize_pool))}
                    </div>
                    <div className="text-[10px] text-white/40">BSD</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── IPO Banner ── */}
      {activeIPOs.length > 0 && (
        <Link href={`/player/${activeIPOs[0].id}`} className="block">
          <div className="relative overflow-hidden rounded-2xl border border-[#22C55E]/20 bg-gradient-to-r from-[#22C55E]/[0.08] via-transparent to-[#FFD700]/[0.04]">
            <div className="relative flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/25 shrink-0">
                  <Rocket className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#22C55E]">{t('liveIPO')}</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
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
                <div className="text-[10px] text-white/40">BSD/DPC</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── Marktbewegungen ── */}
      <div>
        <SectionHeader title={t('marketMovements')} href="/market" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {t('winners24h')}
            </div>
            <div className="space-y-2">
              {topGainers.map((p, i) => (
                <PlayerDisplay variant="compact" key={p.id} player={p} rank={i + 1} showSparkline />
              ))}
              {topGainers.length === 0 && (
                <div className="text-sm text-white/30 p-3 text-center rounded-xl bg-white/[0.02]">{t('noWinnersToday')}</div>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {t('losers24h')}
            </div>
            <div className="space-y-2">
              {topLosers.map((p, i) => (
                <PlayerDisplay variant="compact" key={p.id} player={p} rank={i + 1} showSparkline />
              ))}
              {topLosers.length === 0 && (
                <div className="text-sm text-white/30 p-3 text-center rounded-xl bg-white/[0.02]">{t('noLosersToday')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
