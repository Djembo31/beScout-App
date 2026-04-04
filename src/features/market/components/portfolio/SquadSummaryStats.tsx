'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { Player } from '@/types';
import { fmtScout } from '@/lib/utils';

interface SquadSummaryStatsProps {
  players: Player[];       // assigned players (on pitch)
  ownedPlayers: Player[];  // all owned players (for position counts + value)
  assignedCount: number;
  totalSlots: number;
}

export default function SquadSummaryStats({ players, ownedPlayers, assignedCount, totalSlots }: SquadSummaryStatsProps) {
  const t = useTranslations('market');
  const totalValue = ownedPlayers.reduce((sum, p) => sum + (p.prices.floor ?? p.prices.referencePrice ?? 0), 0);
  const avgPerf = ownedPlayers.length > 0
    ? Math.round(ownedPlayers.reduce((sum, p) => sum + p.perf.l5, 0) / ownedPlayers.length)
    : 0;

  // Portfolio Wertentwicklung (aggregate)
  const playersWithInitial = ownedPlayers.filter(p => p.prices.initialListingPrice != null && p.prices.initialListingPrice > 0);
  const totalInitial = playersWithInitial.reduce((sum, p) => sum + (p.prices.initialListingPrice ?? 0), 0);
  const totalCurrent = playersWithInitial.reduce((sum, p) => sum + (p.prices.floor ?? p.prices.referencePrice ?? 0), 0);
  const portfolioPctChange = totalInitial > 0 ? ((totalCurrent - totalInitial) / totalInitial * 100) : null;

  const posCounts = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  ownedPlayers.forEach(p => { if (posCounts[p.pos] !== undefined) posCounts[p.pos]++; });

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gold/10 border border-gold/20 rounded-lg">
        <span className="text-white/50">{t('summarySquadValue')}</span>
        <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(totalValue)} CR</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-base border border-white/10 rounded-lg">
        <span className="text-white/50">{t('summaryLineup')}</span>
        <span className="font-mono font-bold tabular-nums">{assignedCount}/{totalSlots}</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-base border border-white/10 rounded-lg">
        <span className="text-emerald-400 font-bold tabular-nums">{posCounts.GK} GK</span>
        <span className="text-white/20">|</span>
        <span className="text-amber-400 font-bold tabular-nums">{posCounts.DEF} DEF</span>
        <span className="text-white/20">|</span>
        <span className="text-sky-400 font-bold tabular-nums">{posCounts.MID} MID</span>
        <span className="text-white/20">|</span>
        <span className="text-rose-400 font-bold tabular-nums">{posCounts.ATT} ATT</span>
      </div>
      {avgPerf > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-base border border-white/10 rounded-lg">
          <span className="text-white/50">{t('summaryPerf')}</span>
          <span className={`font-mono font-bold tabular-nums ${avgPerf >= 70 ? 'text-gold' : avgPerf >= 50 ? 'text-white' : 'text-red-400'}`}>
            {avgPerf}
          </span>
        </div>
      )}
      {portfolioPctChange !== null && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-base border border-white/10 rounded-lg">
          <span className="text-white/50">{t('wertentwicklung')}</span>
          <span className={`font-mono font-bold tabular-nums ${portfolioPctChange >= 0 ? 'text-green-500' : 'text-red-400'}`}>
            {portfolioPctChange >= 0 ? '+' : ''}{portfolioPctChange.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
