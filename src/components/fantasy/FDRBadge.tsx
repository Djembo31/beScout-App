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

/** Compute average L5 for a club's players.
 *  Slice 420: filtert über die Club-UUID (`p.clubId`), NICHT über den Short-String —
 *  `club`-Shorts kollidieren (6 reale Fälle, BAY = Leverkusen↔Bayern in derselben
 *  Liga) und mischten sonst die L5 zweier Clubs in die FDR (S276). */
export function getClubAvgL5(opponentClubId: string, allPlayers: Pick<Player, 'clubId' | 'perf'>[]): number {
  const clubPlayers = allPlayers.filter(p => p.clubId === opponentClubId);
  if (clubPlayers.length === 0) return 0;
  return Math.round(clubPlayers.reduce((s, p) => s + p.perf.l5, 0) / clubPlayers.length);
}
