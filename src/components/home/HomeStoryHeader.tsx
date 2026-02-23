'use client';

import Link from 'next/link';
import { Flame, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fmtScout, cn } from '@/lib/utils';
import { TierBadge } from '@/components/ui/TierBadge';
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
  const t = useTranslations('home');
  const tg = useTranslations('gamification');

  const pnlPositive = pnl >= 0;
  const PnlIcon = pnlPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div>
      {/* ━━━ GREETING + STREAK ━━━ */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <div className="absolute -inset-6 bg-[#FFD700]/[0.10] rounded-full blur-2xl -z-10" />
          <div className="text-xs text-white/40 tracking-wide">{t(getGreetingKey())},</div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight" suppressHydrationWarning>
            {loading ? '...' : firstName}
            <span className="text-[#FFD700]">.</span>
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
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-black text-orange-300">{streak}</span>
              <span className="text-[10px] text-orange-400/60 hidden sm:inline">{t('streakDays')}</span>
            </div>
          )}
          {shieldsRemaining != null && shieldsRemaining > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/20 anim-fade"
              title={tg('streak.shieldHint')}
            >
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-black text-sky-300">{shieldsRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* ━━━ COMPACT STAT STRIP ━━━ */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Link
          href="/market?tab=portfolio"
          className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] transition-all shrink-0"
        >
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{t('portfolioRoster')}</span>
          <span className="font-mono font-black text-sm text-white">{fmtScout(portfolioValue)}</span>
        </Link>

        <div className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-xl border shrink-0',
          pnlPositive
            ? 'bg-[#00E676]/[0.06] border-[#00E676]/15'
            : 'bg-[#FF3B69]/[0.06] border-[#FF3B69]/15'
        )}>
          <PnlIcon className={cn('w-3 h-3', pnlPositive ? 'text-[#00E676]' : 'text-[#FF3B69]')} />
          <span className={cn('font-mono font-black text-sm', pnlPositive ? 'text-[#00E676]' : 'text-[#FF3B69]')}>
            {pnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl shrink-0">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Spieler</span>
          <span className="font-mono font-bold text-sm text-white">{holdingsCount}</span>
        </div>
      </div>
    </div>
  );
}
