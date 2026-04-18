'use client';

import { useState, useEffect, memo } from 'react';
import { useNumTick } from '@/lib/hooks/useNumTick';
import Link from 'next/link';
import { Flame, Shield, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { TierBadge } from '@/components/ui/TierBadge';
import { InfoTooltip } from '@/components/ui';
import { getGreetingKey } from './helpers';
import { useTranslations } from 'next-intl';
import type { DbUserStats } from '@/types';

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
}

function HomeStoryHeaderInner({
  loading, firstName, streak, shieldsRemaining, userStats,
  portfolioValue, holdingsCount, pnl, pnlPct, storyMessage, balanceCents,
}: HomeStoryHeaderProps) {
  const portfolioTick = useNumTick(portfolioValue);
  const t = useTranslations('home');
  const tg = useTranslations('gamification');

  // Greeting depends on local time — compute client-only to avoid SSR timezone mismatch
  const [greetingKey, setGreetingKey] = useState('greeting');
  useEffect(() => { setGreetingKey(getGreetingKey()); }, []);

  const pnlPositive = pnl >= 0;
  const PnlIcon = pnlPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="relative -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 pt-6 pb-6 lg:px-6 lg:pt-8 lg:pb-8 bg-hero-stadium overflow-hidden">
      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 bg-hero-vignette pointer-events-none" aria-hidden="true" />

      <div className="relative z-10">
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
                {fmtScout(centsToBsd(balanceCents))}
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

          {storyMessage && (
            <p className="text-[11px] text-white/40 ml-auto max-w-[180px] text-right leading-snug hidden md:block">
              {t(storyMessage.key, storyMessage.params)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(HomeStoryHeaderInner);
