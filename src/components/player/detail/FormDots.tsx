'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { getL5Hex } from '@/components/player';
import type { MatchTimelineEntry } from '@/lib/services/scoring';

interface FormDotsProps {
  /** All timeline entries — component filters to last 5 played */
  entries: MatchTimelineEntry[];
  className?: string;
}

/**
 * 5 colored dots showing L5 score history.
 * Left = oldest, Right = newest. Dot color matches getL5Color scale.
 * Hover tooltip: GW{n} vs {opponent} · {score}
 */
function FormDotsInner({ entries, className }: FormDotsProps) {
  const played = entries
    .filter(e => e.status === 'played' && e.score > 0)
    .slice(0, 5)
    .reverse(); // oldest → newest (left to right)

  if (played.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {played.map((e) => {
        const hex = getL5Hex(e.score);
        const label = `GW${e.gameweek} vs ${e.opponent} · ${e.score}`;
        return (
          <div
            key={`${e.gameweek}-${e.fixtureId}`}
            className="relative group/dot"
          >
            <div
              className="size-3 rounded-full shrink-0 cursor-default"
              style={{ backgroundColor: hex }}
              aria-label={label}
            />
            {/* CSS hover tooltip */}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/dot:block z-20 pointer-events-none"
              role="tooltip"
            >
              <div className="bg-[#1c1c1c] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                {label}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-px border-4 border-transparent border-t-white/10" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(FormDotsInner);
