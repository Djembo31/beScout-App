'use client';

import { useState, useEffect, memo } from 'react';
import { useNumTick } from '@/lib/hooks/useNumTick';
import Link from 'next/link';
import { Flame, Shield, ArrowUpRight, ArrowDownRight, Wallet, Calendar } from 'lucide-react';
import { fmtScout, cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import { TierBadge } from '@/components/ui/TierBadge';
import { InfoTooltip } from '@/components/ui';
import { getGreetingKey, getTimeUntil } from './helpers';
import GameweekStatusBar from './GameweekStatusBar';
import ManagerBlock from './ManagerBlock';
import { useTranslations } from 'next-intl';
import type { DbEvent, DbUserStats } from '@/types';

type HeroMode = 'manager' | 'scout' | 'cta-new';

interface HomeStoryHeaderProps {
  loading: boolean;
  firstName: string;
  streak: number;
  shieldsRemaining: number | null;
  userStats: DbUserStats | null;
  portfolioValue: number;
  holdingsCount: number;
  pnl: number;
  pnlPct: number;
  storyMessage: { key: string; params: Record<string, string> } | null;
  balanceCents: number | null;
  // Slice 262 — Hero-Mode-Dispatcher inputs
  heroMode: HeroMode;
  gw: number;
  hasLineup: boolean;
  hasCaptain: boolean;
  captainName: string | null;
  // Slice 263 — Doppel-Identität-Pills inputs
  nextScopedEvent: DbEvent | null;
}

function HomeStoryHeaderInner({
  loading, firstName, streak, shieldsRemaining, userStats,
  portfolioValue, holdingsCount, pnl, pnlPct, storyMessage, balanceCents,
  heroMode, gw, hasLineup, hasCaptain, captainName,
  nextScopedEvent,
}: HomeStoryHeaderProps) {
  return (
    <div className="relative -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 pt-6 pb-6 lg:px-6 lg:pt-8 lg:pb-8 bg-hero-stadium overflow-hidden">
      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 bg-hero-vignette pointer-events-none" aria-hidden="true" />

      <div className="relative z-10">
        {/* ━━━ LAYER 0 — GAMEWEEK STATUS BAR (Slice 261, persistent in beiden Modi) ━━━ */}
        <GameweekStatusBar />

        {/* Slice 262 — Hero-Mode-Dispatcher (D63 Hero-State-Matrix) */}
        {heroMode === 'manager' ? (
          <ManagerBlock
            firstName={firstName}
            streak={streak}
            shieldsRemaining={shieldsRemaining}
            userStats={userStats}
            gw={gw}
            hasLineup={hasLineup}
            hasCaptain={hasCaptain}
            captainName={captainName}
            portfolioValue={portfolioValue}
            pnlPct={pnlPct}
            holdingsCount={holdingsCount}
          />
        ) : (
          <ScoutHero
            loading={loading}
            firstName={firstName}
            streak={streak}
            shieldsRemaining={shieldsRemaining}
            userStats={userStats}
            portfolioValue={portfolioValue}
            holdingsCount={holdingsCount}
            pnl={pnl}
            pnlPct={pnlPct}
            storyMessage={storyMessage}
            balanceCents={balanceCents}
            nextScopedEvent={nextScopedEvent}
          />
        )}
      </div>
    </div>
  );
}

// Slice 262 — Scout-Mode body (status quo from Slice 261, 0-Diff-Refactor in this slice).
// Extracted as inner component so HomeStoryHeader can dispatch between Manager + Scout
// while keeping the wrapper + vignette + GameweekStatusBar persistent.
type ScoutHeroProps = {
  loading: boolean;
  firstName: string;
  streak: number;
  shieldsRemaining: number | null;
  userStats: DbUserStats | null;
  portfolioValue: number;
  holdingsCount: number;
  pnl: number;
  pnlPct: number;
  storyMessage: { key: string; params: Record<string, string> } | null;
  balanceCents: number | null;
  // Slice 263
  nextScopedEvent: DbEvent | null;
};

function ScoutHero({
  loading, firstName, streak, shieldsRemaining, userStats,
  portfolioValue, holdingsCount, pnl, pnlPct, storyMessage, balanceCents,
  nextScopedEvent,
}: ScoutHeroProps) {
  const portfolioTick = useNumTick(portfolioValue);
  const t = useTranslations('home');
  const tScoutHero = useTranslations('home.scoutHero');
  const tg = useTranslations('gamification');
  const [greetingKey, setGreetingKey] = useState('greeting');
  useEffect(() => { setGreetingKey(getGreetingKey()); }, []);

  const pnlPositive = pnl >= 0;
  const PnlIcon = pnlPositive ? ArrowUpRight : ArrowDownRight;
  const managerPillCountdown = nextScopedEvent?.starts_at ? getTimeUntil(nextScopedEvent.starts_at) : null;

  return (
    <>
      {/* ━━━ GREETING + BADGES ━━━ */}
      <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-semibold" suppressHydrationWarning>{t(greetingKey)}</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-0.5">
              {loading ? '...' : firstName}
              <span className="text-gold">.</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {userStats?.tier && <TierBadge tier={userStats.tier} size="md" />}
            {streak >= 2 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-400/20 anim-fade shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                <Flame className="size-5 text-orange-400 motion-safe:animate-pulse" aria-hidden="true" />
                <span className="text-base font-black text-orange-300 font-mono tabular-nums">{streak}</span>
              </div>
            )}
            {shieldsRemaining != null && shieldsRemaining > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/20 anim-fade"
                title={tg('streak.shieldHint')}
              >
                <Shield className="size-3.5 text-sky-400" aria-hidden="true" />
                <span className="text-xs font-black text-sky-300">{shieldsRemaining}</span>
              </div>
            )}
          </div>
        </div>

        {/* ━━━ HERO NUMBER — Portfolio Value ━━━ */}
        <Link href="/manager?tab=kader" data-tour-id="home-stats" className="block mt-5 group">
          <div className="anim-number-reveal">
            <span className={cn('font-mono font-black text-4xl md:text-5xl gold-glow tracking-tight', portfolioTick)}>
              {fmtScout(portfolioValue)}
            </span>
            <span className="text-sm text-white/30 font-medium ml-2">CR</span>
          </div>
          <div className="text-[11px] uppercase tracking-widest text-white/55 font-bold mt-1">
            {t('portfolioRoster')}
            <InfoTooltip text={t('portfolioRosterTooltip')} />
          </div>
        </Link>

        {/* ━━━ INLINE STATS — compact pills ━━━ */}
        <div className="flex items-center gap-2.5 mt-4 flex-wrap">
          {balanceCents != null && (
            <Link
              href="/transactions"
              className="hero-stat-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-gold/20 bg-gold/5 hover:bg-gold/10 transition-colors"
            >
              <Wallet className="size-3.5 text-gold" aria-hidden="true" />
              <span className="font-mono font-bold text-sm text-gold tabular-nums">
                {formatScout(balanceCents)}
              </span>
              <span className="text-[10px] text-white/40 font-medium">{t('balance')}</span>
            </Link>
          )}

          <div className={cn('hero-stat-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg', pnlPositive ? 'border-vivid-green/15' : 'border-vivid-red/15')}>
            <PnlIcon className={cn('size-3.5', pnlPositive ? 'text-vivid-green' : 'text-vivid-red')} aria-hidden="true" />
            <span className={cn('font-mono font-bold text-sm tabular-nums', pnlPositive ? 'text-vivid-green' : 'text-vivid-red')}>
              {pnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-white/40 font-medium">{t('pnl')}</span>
          </div>

          <div className="hero-stat-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
            <span className="font-mono font-bold text-sm text-white tabular-nums">{holdingsCount}</span>
            <span className="text-[10px] text-white/40 font-medium">{t('players')}</span>
          </div>

          {/* Slice 263 — ManagerPill (Cross-Identity) — visible only when nextScopedEvent exists */}
          {nextScopedEvent && nextScopedEvent.gameweek != null && managerPillCountdown && (
            <Link
              href="/fantasy"
              prefetch={false}
              className="hero-stat-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-gold/20 bg-gold/5 hover:bg-gold/10 transition-colors min-h-[44px]"
            >
              <Calendar className="size-3.5 text-gold" aria-hidden="true" />
              <span className="font-bold text-sm text-gold tabular-nums">
                {tScoutHero('managerPillGw', { n: nextScopedEvent.gameweek })}
              </span>
              <span className="text-[10px] text-white/40 font-medium font-mono tabular-nums">
                {tScoutHero('managerPillCountdown', { time: managerPillCountdown })}
              </span>
            </Link>
          )}

          {storyMessage && (
            <p className="text-[11px] text-white/40 ml-auto max-w-[180px] text-right leading-snug hidden md:block">
              {t(storyMessage.key, storyMessage.params)}
            </p>
          )}
        </div>

        {/* Slice 255 (2026-04-28) — K1 Empty-State CTA für 0-Holdings-User
            (Persona-K-Finding aus Slice 252: "Kader-Wert 0 CR" ohne CTA war
             Casual-User-Friction-Point P2). Nur wenn !loading + 0 Holdings. */}
        {!loading && holdingsCount === 0 && (
          <Link
            href="/market"
            className="mt-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gold/10 border border-gold/25 hover:bg-gold/15 transition-colors min-h-[44px]"
          >
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gold">{t('firstCardCta')}</span>
              <span className="text-[11px] text-white/55">{t('firstCardCtaSub')}</span>
            </div>
            <ArrowUpRight className="size-5 text-gold shrink-0" aria-hidden="true" />
          </Link>
        )}
    </>
  );
}

export default memo(HomeStoryHeaderInner);
