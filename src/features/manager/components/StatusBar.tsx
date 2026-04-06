'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Calendar, TrendingUp, Users } from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';

interface StatusBarProps {
  fitCount: number;
  doubtfulCount: number;
  injuredCount: number;
  nextEvent: { name: string; daysUntil: number; format: string } | null;
  portfolioTrendPct: number | null;
  totalValue: number;
  assignedCount: number;
  totalSlots: number;
}

export default function StatusBar({
  fitCount,
  doubtfulCount,
  injuredCount,
  nextEvent,
  portfolioTrendPct,
  totalValue,
  assignedCount,
  totalSlots,
}: StatusBarProps) {
  const t = useTranslations('manager');

  return (
    <div
      className="bg-white/[0.02] border border-white/10 rounded-2xl p-3"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Health Section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Users className="size-4 text-white/40" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <HealthDot color="bg-emerald-500" count={fitCount} label={t('statusFit')} />
            <HealthDot color="bg-yellow-500" count={doubtfulCount} label={t('statusDoubtful')} />
            <HealthDot color="bg-red-500" count={injuredCount} label={t('statusInjured')} />
          </div>
          <span className="text-xs text-white/50 font-mono tabular-nums">
            {assignedCount}/{totalSlots}
          </span>
        </div>

        {/* Event Section */}
        <Link
          href="/fantasy"
          className="flex items-center gap-3 flex-shrink-0 min-h-[44px] rounded-xl px-2 -mx-2 transition-colors hover:bg-white/[0.04]"
        >
          <Calendar className="size-4 text-white/40" aria-hidden="true" />
          {nextEvent ? (
            <div className="flex flex-col">
              <span className="text-xs text-white/50">{t('nextEvent')}</span>
              <span className="text-sm text-white/80 font-medium truncate max-w-[160px]">
                {nextEvent.name}
              </span>
              <span className="text-xs text-white/50 font-mono tabular-nums">
                {nextEvent.daysUntil === 0
                  ? t('eventToday')
                  : nextEvent.daysUntil === 1
                    ? t('eventDaysOne')
                    : t('eventDays', { count: nextEvent.daysUntil })}
                {' '}&middot; {nextEvent.format}
              </span>
            </div>
          ) : (
            <span className="text-xs text-white/50">{t('nextEvent')}: --</span>
          )}
        </Link>

        {/* Portfolio Section */}
        <Link
          href="/market"
          className="flex items-center gap-3 flex-shrink-0 col-span-2 lg:col-span-1 min-h-[44px] rounded-xl px-2 -mx-2 transition-colors hover:bg-white/[0.04]"
        >
          <TrendingUp className="size-4 text-white/40" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-xs text-white/50">{t('portfolioTrend')}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-mono tabular-nums text-white/80">
                {fmtScout(totalValue)} $SCOUT
              </span>
              {portfolioTrendPct !== null && (
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums',
                    portfolioTrendPct > 0 && 'text-emerald-400',
                    portfolioTrendPct < 0 && 'text-red-400',
                    portfolioTrendPct === 0 && 'text-white/50',
                  )}
                >
                  {portfolioTrendPct > 0 ? '+' : ''}
                  {portfolioTrendPct.toFixed(1)}%
                </span>
              )}
              {portfolioTrendPct === null && (
                <span className="text-xs text-white/50 font-mono tabular-nums">--</span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

/* ---- Health Dot sub-component ---- */

function HealthDot({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className={cn('size-2 rounded-full', color)} aria-hidden="true" />
      <span className="text-xs font-mono tabular-nums text-white/60">{count}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
