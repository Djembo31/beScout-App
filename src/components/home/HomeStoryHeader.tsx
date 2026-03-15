'use client';

import { useState, useEffect } from 'react';
import { useNumTick } from '@/lib/hooks/useNumTick';
import Link from 'next/link';
import { Flame, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fmtScout, cn } from '@/lib/utils';
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
}

export default function HomeStoryHeader({
  loading, firstName, streak, shieldsRemaining, userStats,
  portfolioValue, holdingsCount, pnl, pnlPct, storyMessage,
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
    <div>
      {/* ━━━ GREETING + STREAK ━━━ */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <div className="absolute -inset-6 bg-gold/[0.10] rounded-full blur-2xl -z-10" />
          <div className="text-sm text-white/40" suppressHydrationWarning>{t(greetingKey)},</div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {loading ? '...' : firstName}
            <span className="text-gold">.</span>
          </h1>
          {storyMessage && (
            <p className="text-xs text-white/50 mt-1 max-w-[300px] leading-relaxed">
              {t(storyMessage.key, storyMessage.params)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {userStats?.tier && <TierBadge tier={userStats.tier} size="md" />}
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-400/20 anim-fade">
              <Flame className="size-4 text-orange-400" />
              <span className="text-sm font-black text-orange-300">{streak}</span>
              <span className="text-[11px] text-orange-400/60 hidden sm:inline">{t('streakDays')}</span>
            </div>
          )}
          {shieldsRemaining != null && shieldsRemaining > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/20 anim-fade"
              title={tg('streak.shieldHint')}
            >
              <Shield className="size-3.5 text-sky-400" />
              <span className="text-xs font-black text-sky-300">{shieldsRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* ━━━ COMPACT STAT STRIP — grid fills portrait width ━━━ */}
      <div data-tour-id="home-stats" className="mt-3 grid grid-cols-3 gap-2">
        <Link
          href="/market?tab=portfolio"
          className="flex flex-col items-center justify-center py-2.5 bg-surface-subtle border border-white/[0.08] rounded-xl hover:bg-white/[0.06] transition-colors"
        >
          <span className={cn('font-mono font-black text-sm gold-glow', portfolioTick)}>{fmtScout(portfolioValue)}</span>
          <span className="text-[11px] text-white/40 uppercase font-semibold mt-0.5 inline-flex items-center gap-0.5">{t('portfolioRoster')} <InfoTooltip text={t('portfolioRosterTooltip')} /></span>
        </Link>

        <div className={cn(
          'flex flex-col items-center justify-center py-2.5 rounded-xl border',
          pnlPositive
            ? 'bg-vivid-green/[0.06] border-vivid-green/15'
            : 'bg-vivid-red/[0.06] border-vivid-red/15'
        )}>
          <div className="flex items-center gap-1">
            <PnlIcon className={cn('size-3', pnlPositive ? 'text-vivid-green' : 'text-vivid-red')} />
            <span className={cn('font-mono font-black text-sm', pnlPositive ? 'text-vivid-green' : 'text-vivid-red')} style={{ textShadow: `0 0 12px ${pnlPositive ? 'rgba(0,230,118,0.4)' : 'rgba(255,59,105,0.4)'}` }}>
              {pnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-white/40 uppercase font-semibold mt-0.5 inline-flex items-center gap-0.5">{t('pnl')} <InfoTooltip text={t('pnlTooltip')} /></span>
        </div>

        <div className="flex flex-col items-center justify-center py-2.5 bg-surface-base border border-white/[0.08] rounded-xl">
          <span className="font-mono font-bold text-sm text-white">{holdingsCount}</span>
          <span className="text-[11px] text-white/40 uppercase font-semibold mt-0.5">{t('players')}</span>
        </div>
      </div>
    </div>
  );
}
