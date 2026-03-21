'use client';

import { cn } from '@/lib/utils';
import type { Player } from '@/types';

type FDR = 'easy' | 'medium' | 'hard';

interface FDRBadgeProps {
  opponentAvgL5: number;
  className?: string;
}

function getFDR(avgL5: number): FDR {
  if (avgL5 >= 55) return 'hard';
  if (avgL5 >= 40) return 'medium';
  return 'easy';
}

const fdrStyles: Record<FDR, string> = {
  easy: 'bg-emerald-500',
  medium: 'bg-amber-500',
  hard: 'bg-rose-500',
};

export default function FDRBadge({ opponentAvgL5, className }: FDRBadgeProps) {
  const fdr = getFDR(opponentAvgL5);
  return (
    <span
      className={cn('inline-block size-2 rounded-full shrink-0', fdrStyles[fdr], className)}
      title={`FDR: ${fdr}`}
    />
  );
}

/** Compute average L5 for a club's players */
export function getClubAvgL5(clubShort: string, allPlayers: Pick<Player, 'club' | 'perf'>[]): number {
  const clubPlayers = allPlayers.filter(p => p.club === clubShort);
  if (clubPlayers.length === 0) return 0;
  return Math.round(clubPlayers.reduce((s, p) => s + p.perf.l5, 0) / clubPlayers.length);
}
