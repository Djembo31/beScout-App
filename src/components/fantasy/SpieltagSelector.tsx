'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type SpieltagSelectorProps = {
  gameweek: number;
  activeGameweek: number;
  maxGameweek?: number;
  status: 'open' | 'simulated' | 'empty';
  fixtureCount: number;
  eventCount: number;
  onGameweekChange: (gw: number) => void;
};

export function SpieltagSelector({
  gameweek,
  activeGameweek,
  maxGameweek = 38,
  status,
  fixtureCount,
  eventCount,
  onGameweekChange,
}: SpieltagSelectorProps) {
  const t = useTranslations('spieltag');
  const tc = useTranslations('common');
  const isCurrentGw = gameweek === activeGameweek;
  const isFinished = status === 'simulated';
  const isPast = gameweek < activeGameweek;

  const isLive = isCurrentGw && !isFinished;
  const isUpcoming = !isFinished && !isPast && !isLive;

  const statusColor = isLive
    ? 'text-green-500'
    : isFinished
    ? 'text-red-400'
    : isUpcoming
    ? 'text-sky-400'
    : 'text-white/30';

  const statusLabel = isLive
    ? t('statusOpen')
    : isFinished
    ? t('statusEnded')
    : isPast
    ? t('statusPast')
    : t('statusUpcoming');

  const borderColor = isLive
    ? 'border-gold/20'
    : isFinished
    ? 'border-red-400/15'
    : isUpcoming
    ? 'border-sky-400/15'
    : 'border-white/[0.08]';

  return (
    <div className={cn('flex items-center gap-2 p-2.5 rounded-2xl border bg-surface-minimal', borderColor)}>
      {/* Prev */}
      <button
        onClick={() => onGameweekChange(Math.max(1, gameweek - 1))}
        disabled={gameweek <= 1}
        aria-label={tc('prevGameweek')}
        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface-subtle border border-white/[0.08] hover:bg-surface-elevated disabled:opacity-20 transition-colors active:scale-[0.95]"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {/* Center info */}
      <div className="flex-1 text-center min-w-0">
        <div className="flex items-center justify-center gap-2">
          <Calendar className="size-3.5 text-white/30" aria-hidden="true" />
          <span className="font-black text-base">
            {t('label')} {gameweek}
          </span>
          {isLive && (
            <span className="size-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-white/40 mt-0.5">
          <span className={cn('font-bold', statusColor)}>{statusLabel}</span>
          {fixtureCount > 0 && <span>· {fixtureCount} {t('fixturesShort')}</span>}
          {eventCount > 0 && <span>· {eventCount} Events</span>}
        </div>
      </div>

      {/* Next */}
      <button
        onClick={() => onGameweekChange(Math.min(maxGameweek, gameweek + 1))}
        disabled={gameweek >= maxGameweek}
        aria-label={tc('nextGameweek')}
        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface-subtle border border-white/[0.08] hover:bg-surface-elevated disabled:opacity-20 transition-colors active:scale-[0.95]"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
