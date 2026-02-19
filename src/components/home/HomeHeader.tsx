import { Flame, Shield } from 'lucide-react';
import { fmtBSD, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { TierBadge } from '@/components/ui/TierBadge';
import { InfoTooltip } from '@/components/ui';
import { getGesamtRang } from '@/lib/gamification';
import { getGreetingKey } from './helpers';
import { useTranslations } from 'next-intl';
import type { DbUserStats } from '@/types';
import type { ScoutScoreRow } from '@/lib/services/scoutScores';

interface HomeHeaderProps {
  loading: boolean;
  firstName: string;
  streak: number;
  shieldsRemaining: number | null;
  userStats: DbUserStats | null;
  portfolioValue: number;
  holdingsCount: number;
  totalDpcs: number;
  pnl: number;
  pnlPct: number;
  balanceCents: number | null;
  scoutScores: ScoutScoreRow | null;
}

export default function HomeHeader({
  loading, firstName, streak, shieldsRemaining, userStats,
  portfolioValue, holdingsCount, totalDpcs, pnl, pnlPct, balanceCents, scoutScores,
}: HomeHeaderProps) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tg = useTranslations('gamification');

  return (
    <>
      {/* ━━━ GREETING + STREAK ━━━ */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/40 tracking-wide">{t(getGreetingKey())},</div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight" suppressHydrationWarning>
            {loading ? '...' : firstName}
            <span className="text-[#FFD700]">.</span>
          </h1>
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

      {/* ━━━ STAT CARDS — 2x2 mobile, 4-col desktop ━━━ */}
      <div data-tour-id="home-stats" className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">{t('portfolioRoster')}</span>
            <InfoTooltip text={t('portfolioRosterTooltip')} />
          </div>
          <div className="font-mono font-black text-base md:text-xl text-white truncate">{fmtBSD(portfolioValue)}</div>
          <div className="text-[10px] text-white/40">{holdingsCount} Spieler · {totalDpcs} DPC</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">{t('pnl')}</span>
            <InfoTooltip text={t('pnlTooltip')} />
          </div>
          <div className={cn('font-mono font-black text-base md:text-xl truncate', pnl >= 0 ? 'text-[#22C55E]' : 'text-red-400')}>
            {pnl >= 0 ? '+' : ''}{fmtBSD(pnl)}
          </div>
          <div className={cn('text-[10px]', pnl >= 0 ? 'text-[#22C55E]/60' : 'text-red-400/60')}>
            {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">{tc('balance')}</span>
            <InfoTooltip text={t('balanceTooltip')} />
          </div>
          {balanceCents === null ? (
            <div className="h-6 md:h-7 w-20 rounded bg-[#FFD700]/10 animate-pulse mt-1" />
          ) : (
            <div className="font-mono font-black text-base md:text-xl text-[#FFD700] truncate">{fmtBSD(centsToBsd(balanceCents))}</div>
          )}
          <div className="text-[10px] text-white/40">BSD</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">{t('bescoutScore')}</span>
            <InfoTooltip text={t('bescoutScoreTooltip')} />
          </div>
          {scoutScores ? (
            <>
              <div className={`font-black text-base md:text-xl ${getGesamtRang(scoutScores).color}`}>
                {tg(`rang.${getGesamtRang(scoutScores).i18nKey}`)}
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] text-sky-400 font-mono">T {scoutScores.trader_score}</span>
                <span className="text-[9px] text-purple-400 font-mono">M {scoutScores.manager_score}</span>
                <span className="text-[9px] text-emerald-400 font-mono">A {scoutScores.analyst_score}</span>
              </div>
            </>
          ) : (
            <div className="font-black text-base md:text-xl text-amber-600">{tg('rang.bronzeI')}</div>
          )}
        </div>
      </div>
    </>
  );
}
