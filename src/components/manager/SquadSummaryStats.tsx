'use client';

import React from 'react';
import type { Player } from '@/types';
import { fmtBSD } from '@/lib/utils';

interface SquadSummaryStatsProps {
  players: Player[];       // assigned players (on pitch)
  ownedPlayers: Player[];  // all owned players (for position counts + value)
  assignedCount: number;
  totalSlots: number;
}

export default function SquadSummaryStats({ players, ownedPlayers, assignedCount, totalSlots }: SquadSummaryStatsProps) {
  const totalValue = ownedPlayers.reduce((sum, p) => sum + (p.prices.floor ?? 0), 0);
  const avgPerf = ownedPlayers.length > 0
    ? Math.round(ownedPlayers.reduce((sum, p) => sum + p.perf.l5, 0) / ownedPlayers.length)
    : 0;

  const posCounts = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  ownedPlayers.forEach(p => { if (posCounts[p.pos] !== undefined) posCounts[p.pos]++; });

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg">
        <span className="text-white/50">Kaderwert:</span>
        <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(totalValue)} BSD</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg">
        <span className="text-white/50">Aufstellung:</span>
        <span className="font-mono font-bold">{assignedCount}/{totalSlots}</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg">
        <span className="text-emerald-400 font-bold">{posCounts.GK} GK</span>
        <span className="text-white/20">|</span>
        <span className="text-amber-400 font-bold">{posCounts.DEF} DEF</span>
        <span className="text-white/20">|</span>
        <span className="text-sky-400 font-bold">{posCounts.MID} MID</span>
        <span className="text-white/20">|</span>
        <span className="text-rose-400 font-bold">{posCounts.ATT} ATT</span>
      </div>
      {avgPerf > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg">
          <span className="text-white/50">Perf:</span>
          <span className={`font-mono font-bold ${avgPerf >= 70 ? 'text-[#FFD700]' : avgPerf >= 50 ? 'text-white' : 'text-red-400'}`}>
            {avgPerf}
          </span>
        </div>
      )}
    </div>
  );
}
