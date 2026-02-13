'use client';

import type { Gameweek } from './types';

export const GameweekSelector = ({
  gameweeks,
  selected,
  onSelect,
}: {
  gameweeks: Gameweek[];
  selected: string;
  onSelect: (id: string) => void;
}) => {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
      {gameweeks.map(gw => (
        <button
          key={gw.id}
          onClick={() => onSelect(gw.id)}
          className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all text-center ${
            selected === gw.id
              ? 'bg-[#FFD700]/10 border-[#FFD700]/30'
              : gw.status === 'current'
                ? 'bg-[#22C55E]/5 border-[#22C55E]/20'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
          }`}
        >
          <div className={`text-sm font-black ${
            selected === gw.id ? 'text-[#FFD700]'
            : gw.status === 'current' ? 'text-[#22C55E]'
            : 'text-white/70'
          }`}>
            {gw.label}
          </div>
          <div className="text-[9px] text-white/40 whitespace-nowrap">{gw.dateRange}</div>
          {gw.status === 'current' && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[8px] font-bold text-[#22C55E]">LIVE</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};
