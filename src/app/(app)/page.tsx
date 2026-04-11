'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ErrorState, Card } from '@/components/ui';
import { useWallet } from '@/components/providers/WalletProvider';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout, cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  Clock, Trophy, Users, Rocket, Crown,
  Shield, Compass, Coins, TrendingUp, TrendingDown,
  ShoppingCart, Swords, Target, MessageSquare,
  Gift, Ticket, Package,
} from 'lucide-react';
import { qk } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';

import HomeStoryHeader from '@/components/home/HomeStoryHeader';
import HomeSpotlight from '@/components/home/HomeSpotlight';
import BeScoutIntroCard from '@/components/home/BeScoutIntroCard';
import ScoutCardStats from '@/components/home/ScoutCardStats';
import LastGameweekWidget from '@/components/home/LastGameweekWidget';
import TopMoversStrip from '@/components/home/TopMoversStrip';
import { SectionHeader, formatPrize, getTimeUntil } from '@/components/home/helpers';

const NewUserTip = dynamic(() => import('@/components/onboarding/NewUserTip'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none" />,
});
const MysteryBoxModal = dynamic(() => import('@/components/gamification/MysteryBoxModal'), { ssr: false });
const OnboardingChecklist = dynamic(() => import('@/components/home/OnboardingChecklist'), { ssr: false });
const MissionHintList = dynamic(() => import('@/components/missions/MissionHintList'), { ssr: false });
const WelcomeBonusModal = dynamic(() => import('@/components/onboarding/WelcomeBonusModal'), { ssr: false });
const MostWatchedStrip = dynamic(() => import('@/components/home/MostWatchedStrip'), { ssr: false });
const FollowingFeedRail = dynamic(() => import('@/components/social/FollowingFeedRail'), { ssr: false });

import { useHomeData } from './hooks/useHomeData';

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { balanceCents } = useWallet();
  const t = useTranslations('home');

  const {
    user, uid, loading, firstName,
    streak, shieldsRemaining, streakBenefits,
    players, playersLoading, playersError,
    holdings, activeIPOs, trendingPlayers, trendingWithPlayers,
    topMovers, hasGlobalMovers,
    portfolioValue, pnl, pnlPct,
    nextEvent, isEventLive,
    userStats,
    ticketData, showMysteryBox, setShowMysteryBox,
    handleOpenMysteryBox, hasFreeBoxToday,
    storyMessage, spotlightType, retention, showQuickActions,
    followedClubs, highestPass,
  } = useHomeData();

  const isNewUser = holdings.length === 0;

  // ── Guards ──
  if (playersError && players.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto py-12">
        <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 md:space-y-10">

      {/* ── 0. WELCOME BONUS MODAL ── */}
      {isNewUser && balanceCents != null && balanceCents > 0 && (
        <WelcomeBonusModal balanceCents={balanceCents} />
      )}

      {/* ── 1. HERO HEADER ── */}
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

      {/* Scout Cards — total + position breakdown.
          Placed directly under the Wertentwicklung pill inside the hero
          (self-renders null when portfolio is empty, so new users never
          see an empty card). Moved here from the main column on Anil's
          request so it visually anchors the squad overview. */}
      <ScoutCardStats holdings={holdings} />

      {/* ── 1a. NEW USER: Intro + Checklist + Founding Pass ── */}
      {isNewUser && <BeScoutIntroCard />}
      {isNewUser && retention?.onboarding && (
        <OnboardingChecklist items={retention.onboarding} />
      )}
      {uid && !highestPass && (
        <Link
          href="/founding"
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card-glow-gold border border-gold/15 hover:border-gold/30 transition-colors group shadow-card-md"
        >
          <div className="size-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <Crown className="size-4 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gold">{t('foundingUpsellTitle')}</div>
            <div className="text-xs text-white/50 truncate">{t('foundingUpsellDesc')}</div>
          </div>
          <div className="text-xs font-bold text-gold/70 group-hover:text-gold transition-colors shrink-0">{t('foundingUpsellCta')}</div>
        </Link>
      )}

      {/* ── 1b. QUICK ACTIONS BAR ── */}
      {showQuickActions && (
        <nav aria-label={t('quickActions')} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mt-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[
            { href: '/market?tab=kaufen', icon: ShoppingCart, label: t('qaBuy'), color: 'text-gold', bg: 'bg-gold/10 border-gold/20', glow: 'rgba(255,215,0,0.25)' },
            { href: '/fantasy', icon: Swords, label: t('qaFantasy'), color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-400/20', glow: 'rgba(168,85,247,0.25)' },
            { href: '/missions', icon: Target, label: t('qaMissions'), color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-400/20', glow: 'rgba(245,158,11,0.25)' },
            { href: '/inventory', icon: Package, label: t('qaInventory'), color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-400/20', glow: 'rgba(52,211,153,0.25)' },
            { href: '/community', icon: MessageSquare, label: t('qaCommunity'), color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-400/20', glow: 'rgba(14,165,233,0.25)' },
          ].map(({ href, icon: Icon, label, color, bg, glow }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border shrink-0 shadow-card-sm',
                'hover:scale-[1.03] active:scale-[0.97] transition-all',
                bg,
              )}
            >
              <Icon className={cn('size-5', color)} style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
              <span className="text-[10px] font-bold text-white/60">{label}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* ── 1b. SPOTLIGHT ── */}
      {playersLoading ? (
        <div className="h-40 bg-surface-base border border-white/10 rounded-2xl animate-pulse motion-reduce:animate-none" />
      ) : (
        <HomeSpotlight
          activeIPOs={activeIPOs}
          nextEvent={nextEvent}
          holdings={holdings}
          trendingPlayers={trendingPlayers}
          players={players}
        />
      )}

      {/* ── 1c. ONBOARDING CHECKLIST (for active users — new users see it above) ── */}
      {!isNewUser && retention?.onboarding && (
        <OnboardingChecklist items={retention.onboarding} />
      )}

      {/* ── 1c-2. Contextual Mission Hints (returns null if no active hints) ── */}
      {!isNewUser && <MissionHintList context="fantasy" />}

      {/* ── 1d. WELCOME BONUS ── */}
      {isNewUser && balanceCents != null && balanceCents > 0 && (
        <NewUserTip
          tipKey="welcome-bonus"
          icon={<Coins className="size-5" />}
          title={t('welcomeBonusTitle')}
          description={t('welcomeBonusDesc', { balance: fmtScout(centsToBsd(balanceCents)) })}
          action={{ label: t('welcomeBonusAction'), href: '/market' }}
          show={true}
        />
      )}

      <div className="divider-gradient" aria-hidden="true" />

      {/* ══════════════════════════════════════════════════════════
          DESKTOP: 2-column layout (main + sidebar)
          MOBILE: single column, natural DOM order
          ══════════════════════════════════════════════════════════ */}
      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">

        {/* ── LEFT COLUMN (Main Content) ── */}
        <div className="space-y-8 md:space-y-10 min-w-0">
          {/* Dein letzter Spieltag — last scored fantasy event with lineup
              grid. Active users see score/rank/reward + full per-slot
              scores; new users see an empty state with a CTA to /fantasy.
              Track B1 of polish-sweep.md Home Pass 2. */}
          <LastGameweekWidget uid={uid} players={players} />

          {/* Top Mover der Woche — own holdings winner/loser.
              Empty-state shown when user holds players but there's no
              price movement yet (Track A3 empty-state, Anil option A).
              Note: change24h used as fallback until the 7d RPC ships
              (scope-creep in polish-sweep.md). */}
          {holdings.length > 0 && (
            <div>
              <SectionHeader title={t('topMoversWeek')} href="/market" />
              {topMovers.length > 0 ? (
                <div className="flex gap-2.5 mt-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {topMovers.map(h => {
                    const up = h.change24h >= 0;
                    return (
                      <Link
                        key={h.playerId}
                        href={`/player/${h.playerId}`}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border card-showcase shrink-0 min-w-[180px] shadow-card-md"
                        style={{
                          borderColor: up ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          background: `linear-gradient(135deg, ${up ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)'} 0%, rgba(255,255,255,0.02) 100%)`,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{h.player}</div>
                          <div className="text-[10px] text-white/40">{h.club}</div>
                        </div>
                        <div className={cn('flex items-center gap-0.5 ml-auto font-mono font-bold text-sm tabular-nums shrink-0', up ? 'text-green-500' : 'text-red-400')}>
                          {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                          {up ? '+' : ''}{h.change24h.toFixed(1)}%
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 px-4 py-5 rounded-2xl border border-white/[0.06] bg-surface-minimal text-center shadow-card-sm">
                  <div className="text-xs text-white/40 max-w-[280px] mx-auto">
                    {t('topMoversWeekEmpty')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Global Top Movers */}
          {!playersLoading && hasGlobalMovers && (
            <div>
              <SectionHeader title={t('globalMovers')} href="/market" />
              <div className="mt-2">
                <TopMoversStrip players={players} />
              </div>
            </div>
          )}

          {/* Most Watched */}
          {uid && <MostWatchedStrip userId={uid} />}
        </div>

        {/* ── RIGHT COLUMN (Sidebar — sticky on desktop) ── */}
        <div className="space-y-8 mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-20 space-y-6">

          {/* Next Event */}
          {!playersLoading && nextEvent && spotlightType !== 'event' && (
            <div>
              <SectionHeader
                title={t('nextEvent')}
                href="/fantasy"
                badge={
                  <span className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full border',
                    isEventLive
                      ? 'bg-gold/15 border-gold/25'
                      : 'bg-purple-500/15 border-purple-400/25'
                  )}>
                    <Clock className={cn('size-3', isEventLive ? 'text-gold' : 'text-purple-400')} />
                    <span className={cn('text-[10px] font-bold', isEventLive ? 'text-gold' : 'text-purple-300')}>
                      {isEventLive ? getTimeUntil(nextEvent.ends_at) : getTimeUntil(nextEvent.starts_at)}
                    </span>
                  </span>
                }
              />
              <Link href="/fantasy" className="block mt-3">
                <div className={cn(
                  'relative overflow-hidden rounded-2xl border shadow-lg transition-shadow',
                  isEventLive
                    ? 'border-gold/40 bg-gold/[0.06] shadow-glow-gold hover:shadow-[0_0_32px_rgba(255,215,0,0.25)]'
                    : 'border-purple-500/30 bg-purple-500/10'
                )}>
                  {isEventLive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-gold/[0.04] via-gold/[0.10] to-gold/[0.04] motion-safe:animate-pulse" />
                  )}
                  <div className="relative p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className={cn('size-4', isEventLive ? 'text-gold' : 'text-purple-400')} />
                          <span className={cn('text-[10px] font-black uppercase', isEventLive ? 'text-gold' : 'text-purple-400')}>
                            {isEventLive ? 'LIVE' : nextEvent.format}
                          </span>
                          {isEventLive && (
                            <span className="relative flex size-2">
                              <span className="animate-ping motion-reduce:animate-none absolute inline-flex size-full rounded-full bg-gold opacity-75" />
                              <span className="relative inline-flex rounded-full size-2 bg-gold" />
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-balance">{nextEvent.name}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
                          <span className={cn(
                            'flex items-center gap-1 px-1.5 py-0.5 rounded-md',
                            isEventLive ? 'bg-gold/10' : 'bg-transparent'
                          )}>
                            <Users className="size-3.5" />
                            <span className={cn('font-bold tabular-nums', isEventLive ? 'text-gold' : 'text-white/60')}>
                              {nextEvent.current_entries}
                            </span>
                            <span className="text-white/30">/{nextEvent.max_entries ?? '\u221E'}</span>
                          </span>
                          <span>{t('entryLabel')}{(nextEvent.ticket_cost ?? nextEvent.entry_fee) === 0 ? t('entryFree') : nextEvent.currency === 'scout' ? `${fmtScout(centsToBsd(nextEvent.ticket_cost ?? nextEvent.entry_fee))} CR` : `${nextEvent.ticket_cost ?? nextEvent.entry_fee} Tickets`}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-white/40 mb-0.5">{t('prizeMoney')}</div>
                        <div className={cn(
                          'text-xl font-black font-mono tabular-nums text-gold',
                          isEventLive && 'gold-glow'
                        )}>
                          {formatPrize(centsToBsd(nextEvent.prize_pool))}
                        </div>
                        <div className="text-[10px] text-white/40">Credits</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Active IPO */}
          {!playersLoading && activeIPOs.length > 0 && spotlightType !== 'ipo' && (
            <Link href={`/player/${activeIPOs[0].id}`} className="block">
              <div className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-card-glow-green shadow-card-md">
                <div className="relative flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-2xl bg-green-500/15 border border-green-500/25 shrink-0">
                      <Rocket className="size-5 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase text-green-500">{t('liveIPO')}</span>
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
                    <div className="text-[10px] text-white/40">CR/SC</div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Mystery Box — always visible */}
          {uid && (
            <Card className="p-3 md:p-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-white/50">
                <Ticket className="size-4 text-gold/60" />
                <span className="font-mono font-bold text-white/70">{ticketData?.balance ?? 0}</span>
                {' Tickets'}
              </span>
              <button
                onClick={() => setShowMysteryBox(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/[0.08] border border-gold/15 text-xs font-bold text-gold hover:bg-gold/[0.12] active:scale-[0.97] transition-colors"
              >
                <Gift className="size-4" />
                Mystery Box
              </button>
            </Card>
          )}

          {/* Mystery Box Modal — daily free open only (no ticket purchase).
              Daily gate is server-authoritative via useHasFreeBoxToday: counts
              ticket_cost=0 rows in mystery_box_results for today's UTC day. */}
          {uid && <MysteryBoxModal
            open={showMysteryBox}
            onClose={() => setShowMysteryBox(false)}
            onOpen={handleOpenMysteryBox}
            ticketBalance={ticketData?.balance ?? 0}
            hasFreeBox={hasFreeBoxToday}
            ticketDiscount={streakBenefits.mysteryBoxTicketDiscount}
          />}

          {/* Scout Activity (Following Feed) — active users only */}
          {uid && !isNewUser && (
            <FollowingFeedRail userId={uid} players={players} limit={5} />
          )}

          {/* My Clubs */}
          {followedClubs.length > 0 && (
            <div>
              <SectionHeader title={t('myClubs')} href="/clubs" />
              <div className="flex lg:flex-col gap-2 mt-3 overflow-x-auto lg:overflow-x-visible scrollbar-hide pb-1 lg:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                {followedClubs.map(club => {
                  const color = club.primary_color ?? '#FFD700';
                  return (
                    <Link
                      key={club.id}
                      href={`/club/${club.slug}`}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-subtle border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/15 transition-colors shrink-0 lg:shrink"
                    >
                      <div className="size-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                        {club.logo_url ? (
                          <Image src={club.logo_url} alt="" width={20} height={20} className="size-5 object-contain" />
                        ) : (
                          <Shield className="size-3.5" style={{ color }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate max-w-[100px] lg:max-w-none">{club.name}</div>
                        <div className="text-[10px] text-white/30">{club.league}</div>
                      </div>
                    </Link>
                  );
                })}
                <Link href="/clubs" className="flex items-center gap-2 px-3 py-2 bg-gold/[0.03] border border-gold/10 rounded-xl hover:bg-gold/[0.06] transition-colors shrink-0 lg:shrink">
                  <Compass className="size-4 text-gold/60" />
                  <span className="text-xs font-medium text-gold/60">{t('discover')}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Sponsor */}
          <SponsorBanner placement="home_mid" />

          </div>
        </div>
      </div>
    </div>
  );
}
