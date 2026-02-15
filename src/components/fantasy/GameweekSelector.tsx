'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const isActive = selectedGameweek === activeGameweek;
  const canPrev = selectedGameweek > 1;
  const canNext = selectedGameweek < 38;

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => canPrev && onSelect(selectedGameweek - 1)}
        disabled={!canPrev}
        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => onSelect(activeGameweek)}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold transition-all min-w-[180px] justify-center ${
          isActive
            ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
            : 'bg-white/5 border-white/10 text-white hover:border-white/20'
        }`}
      >
        <span className="text-base font-black">Spieltag {selectedGameweek}</span>
        {isActive && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[10px] font-bold">AKTIV</span>
          </span>
        )}
      </button>

      <button
        onClick={() => canNext && onSelect(selectedGameweek + 1)}
        disabled={!canNext}
        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
