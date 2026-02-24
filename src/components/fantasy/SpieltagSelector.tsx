'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const isCurrentGw = gameweek === activeGameweek;
  const isFinished = status === 'simulated';
  const isPast = gameweek < activeGameweek;

  const statusColor = isCurrentGw && !isFinished
    ? 'text-[#22C55E]'
    : isFinished
    ? 'text-[#22C55E]'
    : 'text-white/30';

  const statusLabel = isCurrentGw && !isFinished
    ? t('statusOpen')
    : isFinished
    ? t('statusEnded')
    : isPast
    ? t('statusPast')
    : t('statusUpcoming');

  const borderColor = isCurrentGw && !isFinished
    ? 'border-[#FFD700]/20'
    : isFinished
    ? 'border-[#22C55E]/15'
    : 'border-white/[0.08]';

  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-2xl border ${borderColor} bg-white/[0.02]`}>
      {/* Prev */}
      <button
        onClick={() => onGameweekChange(Math.max(1, gameweek - 1))}
        disabled={gameweek <= 1}
        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-20 transition-all active:scale-[0.95]"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Center info */}
      <div className="flex-1 text-center min-w-0">
        <div className="flex items-center justify-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-white/30" />
          <span className="font-black text-base">
            {t('label')} {gameweek}
          </span>
          {isCurrentGw && !isFinished && (
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/40 mt-0.5">
          <span className={`font-bold ${statusColor}`}>{statusLabel}</span>
          {fixtureCount > 0 && <span>· {fixtureCount} {t('fixturesShort')}</span>}
          {eventCount > 0 && <span>· {eventCount} Events</span>}
        </div>
      </div>

      {/* Next */}
      <button
        onClick={() => onGameweekChange(Math.min(maxGameweek, gameweek + 1))}
        disabled={gameweek >= maxGameweek}
        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-20 transition-all active:scale-[0.95]"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
