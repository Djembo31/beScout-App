'use client';

import { useMemo } from 'react';
import type { Player } from '@/types';

interface PositionPercentileResult {
  percentile: number;
  rank: number;
  total: number;
}

export function usePositionPercentile(
  position: string,
  l5: number,
  allPlayers: Player[],
): PositionPercentileResult | null {
  return useMemo(() => {
    if (l5 <= 0) return null;
    const samePosPlayers = allPlayers.filter((p) => p.pos === position && p.perf.l5 > 0);
    if (samePosPlayers.length === 0) return null;
    const belowCount = samePosPlayers.filter((p) => p.perf.l5 < l5).length;
    const percentile = Math.round((belowCount / samePosPlayers.length) * 100);
    return { percentile, rank: samePosPlayers.length - belowCount, total: samePosPlayers.length };
  }, [position, l5, allPlayers]);
}
