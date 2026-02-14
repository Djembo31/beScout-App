'use client';

/**
 * Dynamic Gameweek Selector — generates GWs 1-38 with status based on activeGameweek.
 * Replaces the old hardcoded GAMEWEEKS array.
 */
export const GameweekSelector = ({
  activeGameweek,
  selectedGameweek,
  onSelect,
  compact = false,
}: {
  activeGameweek: number;
  selectedGameweek: number;
  onSelect: (gw: number) => void;
  compact?: boolean;
}) => {
  const gws = Array.from({ length: 38 }, (_, i) => i + 1);

  // In compact mode, show a range around the active GW
  const visibleGws = compact
    ? gws.filter(gw => gw >= activeGameweek - 3 && gw <= activeGameweek + 3)
    : gws;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
      {visibleGws.map(gw => {
        const status: 'past' | 'current' | 'upcoming' =
          gw < activeGameweek ? 'past' : gw === activeGameweek ? 'current' : 'upcoming';
        const isSelected = gw === selectedGameweek;

        return (
          <button
            key={gw}
            onClick={() => onSelect(gw)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all text-center min-w-[52px] ${
              isSelected
                ? 'bg-[#FFD700]/10 border-[#FFD700]/30'
                : status === 'current'
                  ? 'bg-[#22C55E]/5 border-[#22C55E]/20'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className={`text-sm font-black ${
              isSelected ? 'text-[#FFD700]'
              : status === 'current' ? 'text-[#22C55E]'
              : status === 'past' ? 'text-white/40'
              : 'text-white/70'
            }`}>
              {gw}
            </div>
            {status === 'current' && (
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-[8px] font-bold text-[#22C55E]">AKTIV</span>
              </div>
            )}
            {status === 'past' && (
              <div className="text-[8px] text-white/25 mt-0.5">✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
};
