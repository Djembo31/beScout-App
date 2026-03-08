'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

/**
 * Compact Gameweek Selector — [<] Spieltag 11 [>]
 * Replaces the old 38-item horizontal scroll.
 */
export const GameweekSelector = ({
  activeGameweek,
  selectedGameweek,
  onSelect,
}: {
  activeGameweek: number;
  selectedGameweek: number;
  onSelect: (gw: number) => void;
  compact?: boolean;
}) => {
  const t = useTranslations('fantasy');
  const isActive = selectedGameweek === activeGameweek;
  const canPrev = selectedGameweek > 1;
  const canNext = selectedGameweek < 38;

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => canPrev && onSelect(selectedGameweek - 1)}
        disabled={!canPrev}
        aria-label={t('prevGameweek')}
        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>

      <button
        onClick={() => onSelect(activeGameweek)}
        className={cn(
          'flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold transition-colors min-w-[180px] justify-center',
          isActive
            ? 'bg-green-500/10 border-green-500/30 text-green-500'
            : 'bg-white/5 border-white/10 text-white hover:border-white/20'
        )}
      >
        <span className="text-base font-black">{t('gameweekN', { gw: selectedGameweek })}</span>
        {isActive && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
            <span className="text-xs font-bold">{t('active')}</span>
          </span>
        )}
      </button>

      <button
        onClick={() => canNext && onSelect(selectedGameweek + 1)}
        disabled={!canNext}
        aria-label={t('nextGameweek')}
        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
};
