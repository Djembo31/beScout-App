'use client';

import React from 'react';
import type { FixturePlayerStat } from '@/types';
import { getPosDotColor } from './helpers';

type Props = {
  scorers: FixturePlayerStat[];
};

export function GoalTicker({ scorers }: Props) {
  // Only scorers with goals
  const goalScorers = scorers.filter(s => s.goals > 0);
  if (goalScorers.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-2">
        Tore dieser Woche
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {goalScorers.map(s => (
          <div
            key={s.id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs"
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPosDotColor(s.player_position)}`} />
            <span className="font-semibold text-white/80">{s.player_last_name}</span>
            {s.goals > 1 && <span className="text-gold font-bold">x{s.goals}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
