'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ErrorState } from '@/components/ui';
import { useWallet } from '@/components/providers/WalletProvider';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout, cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  Clock, Trophy, Users, Rocket, Crown,
  Shield, Compass, Coins, TrendingUp, TrendingDown,
  ShoppingCart, Swords, Target, MessageSquare,
} from 'lucide-react';
import { qk } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';

import HomeStoryHeader from '@/components/home/HomeStoryHeader';
import HomeSpotlight from '@/components/home/HomeSpotlight';
import PortfolioStrip from '@/components/home/PortfolioStrip';
import TopMoversStrip from '@/components/home/TopMoversStrip';
import DiscoveryCard from '@/components/market/DiscoveryCard';
import { SectionHeader, formatPrize, getTimeUntil } from '@/components/home/helpers';

const NewUserTip = dynamic(() => import('@/components/onboarding/NewUserTip'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const DailyChallengeCard = dynamic(() => import('@/components/gamification/DailyChallengeCard'), {
  ssr: false,
  loading: () => <div className="h-40 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const MysteryBoxModal = dynamic(() => import('@/components/gamification/MysteryBoxModal'), { ssr: false });
const ScoreRoadStrip = dynamic(() => import('@/components/gamification/ScoreRoadStrip'), {
  ssr: false,
  loading: () => <div className="h-10 rounded-xl bg-white/[0.02] animate-pulse" />,
});
const OnboardingChecklist = dynamic(() => import('@/components/home/OnboardingChecklist'), { ssr: false });
const WelcomeBonusModal = dynamic(() => import('@/components/onboarding/WelcomeBonusModal'), { ssr: false });
const StreakMilestoneBanner = dynamic(() => import('@/components/home/StreakMilestoneBanner'), { ssr: false });
const SuggestedActionBanner = dynamic(() => import('@/components/home/SuggestedActionBanner'), { ssr: false });

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
    userStats, todaysChallenge, todaysAnswer, challengeLoading,
    ticketData, showMysteryBox, setShowMysteryBox,
    isSubmitting, handleChallengeSubmit, handleOpenMysteryBox,
    storyMessage, spotlightType, retention, showQuickActions,
    followedClubs, highestPass,
  } = useHomeData();

  // ── Guards ──
  if (playersError && players.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto py-12">
        <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 md:space-y-8">

      {/* ── 0. WELCOME BONUS MODAL ── */}
      {holdings.length === 0 && balanceCents != null && balanceCents > 0 && (
        <WelcomeBonusModal balanceCents={balanceCents} />
      )}

      {/* ── 0b. FOUNDING PASS UPSELL ── */}
      {uid && !highestPass && (
        <Link
          href="/founding"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-gold/[0.06] to-gold/[0.02] border border-gold/20 hover:border-gold/30 transition-colors group"
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

      {/* ── 1a. QUICK ACTIONS BAR ── */}
      {showQuickActions && (
        <nav aria-label={t('quickActions')} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mt-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[
            { href: '/market?tab=kaufen', icon: ShoppingCart, label: t('qaBuy'), color: 'text-gold', bg: 'bg-gold/10 border-gold/20' },
            { href: '/fantasy', icon: Swords, label: t('qaFantasy'), color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-400/20' },
            { href: '/missions', icon: Target, label: t('qaMissions'), color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-400/20' },
            { href: '/community', icon: MessageSquare, label: t('qaCommunity'), color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-400/20' },
          ].map(({ href, icon: Icon, label, color, bg }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border shrink-0',
                'hover:scale-[1.03] active:scale-[0.97] transition-colors',
                bg,
              )}
            >
              <Icon className={cn('size-5', color)} />
              <span className="text-[11px] font-bold text-white/70">{label}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* ── 1b. SPOTLIGHT ── */}
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

      {/* ── 1c. ONBOARDING CHECKLIST ── */}
      {retention?.onboarding && (
        <OnboardingChecklist items={retention.onboarding} />
      )}

      {/* ── 1d. WELCOME BONUS ── */}
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

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" aria-hidden="true" />

      {/* ── 2. PORTFOLIO + EVENT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <PortfolioStrip holdings={holdings} />

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
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-surface-minimal hover:bg-white/[0.05] transition-colors shrink-0 min-w-[180px] shadow-card-sm"
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
        </div>

        <div className="space-y-6">
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
                    <span className={cn('text-[11px] font-bold', isEventLive ? 'text-gold' : 'text-purple-300')}>
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
                          <span className={cn('text-[11px] font-black uppercase', isEventLive ? 'text-gold' : 'text-purple-400')}>
                            {isEventLive ? 'LIVE' : nextEvent.format}
                          </span>
                          {isEventLive && (
                            <span className="relative flex size-2">
                              <span className="animate-ping motion-reduce:animate-none absolute inline-flex size-full rounded-full bg-gold opacity-75" />
                              <span className="relative inline-flex rounded-full size-2 bg-gold" />
                            </span>
                          )}
                        </div>
                        <h3 className="text-base md:text-lg font-black text-balance">{nextEvent.name}</h3>
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
                        <div className="text-[11px] text-white/40 mb-0.5">{t('prizeMoney')}</div>
                        <div className={cn(
                          'text-xl md:text-2xl font-black font-mono tabular-nums text-gold',
                          isEventLive && 'gold-glow'
                        )}>
                          {formatPrize(centsToBsd(nextEvent.prize_pool))}
                        </div>
                        <div className="text-[11px] text-white/40">Credits</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {!playersLoading && activeIPOs.length > 0 && spotlightType !== 'ipo' && (
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
                    <div className="text-[11px] text-white/40">CR/SC</div>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" aria-hidden="true" />

      {/* ── 2a2. GLOBAL TOP MOVERS ── */}
      {!playersLoading && hasGlobalMovers && (
        <div>
          <SectionHeader title={t('globalMovers')} href="/market" />
          <div className="mt-2">
            <TopMoversStrip players={players} />
          </div>
        </div>
      )}

      {/* ── 2b. SCORE ROAD STRIP ── */}
      {uid && <ScoreRoadStrip userId={uid} />}

      {/* ── 2c. STREAK MILESTONE ── */}
      {retention?.streakMilestone && (
        <StreakMilestoneBanner milestone={retention.streakMilestone} />
      )}

      {/* ── 2d. SUGGESTED ACTION ── */}
      {retention?.suggestedAction && (
        <SuggestedActionBanner action={retention.suggestedAction} />
      )}

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" aria-hidden="true" />

      {/* ── 3. ENGAGEMENT ZONE ── */}
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
            hasFreeBox={(() => {
              if (streakBenefits.freeMysteryBoxesPerWeek <= 0) return false;
              const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
              const lastFreeBoxWeek = parseInt(localStorage.getItem('bescout-free-box-week') || '0');
              return lastFreeBoxWeek < currentWeek;
            })()}
            ticketDiscount={streakBenefits.mysteryBoxTicketDiscount}
          />
        </>
      )}

      {/* ── 4. DYNAMIC FEED ── */}
      {!playersLoading && trendingWithPlayers.length > 0 && (
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

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" aria-hidden="true" />

      {/* ── 5. MY CLUBS ── */}
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
                  className="flex items-center gap-2 px-3 py-2 bg-surface-subtle border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/15 transition-colors shrink-0"
                >
                  <div className="size-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                    {club.logo_url ? (
                      <Image src={club.logo_url} alt="" width={20} height={20} className="size-5 object-contain" />
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

      {/* ── 6. SPONSOR ── */}
      <SponsorBanner placement="home_mid" />
    </div>
  );
}
