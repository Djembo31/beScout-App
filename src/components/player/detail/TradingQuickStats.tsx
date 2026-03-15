'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { DbTrade } from '@/types';

interface TradingQuickStatsProps {
  floorPrice: number;
  bestBid: number | null;
  trades: DbTrade[];
  holderCount: number;
}

export default function TradingQuickStats({
  floorPrice, bestBid, trades, holderCount,
}: TradingQuickStatsProps) {
  const t = useTranslations('playerDetail');
  const bestBidBsd = bestBid != null ? centsToBsd(bestBid) : null;

  const spread = useMemo(() => {
    if (bestBidBsd == null || floorPrice <= 0) return null;
    return ((floorPrice - bestBidBsd) / floorPrice) * 100;
  }, [floorPrice, bestBidBsd]);

  const spreadColor = useMemo(() => {
    if (spread == null) return 'text-white/40';
    if (spread < 5) return 'text-green-400';
    if (spread <= 15) return 'text-amber-400';
    return 'text-red-400';
  }, [spread]);

  const vol7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return trades.filter((tr) => new Date(tr.executed_at).getTime() >= cutoff).length;
  }, [trades]);

  const metrics = [
    { label: t('quickStatsFloor'), value: fmtScout(floorPrice), className: 'text-gold' },
    { label: t('quickStatsSpread'), value: spread != null ? `${spread.toFixed(1)}%` : '\u2014', className: spreadColor },
    { label: t('quickStats7dVol'), value: String(vol7d), className: 'text-white' },
    { label: t('quickStatsHolders'), value: String(holderCount), className: 'text-white' },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
      {metrics.map((m) => (
        <div key={m.label} className="flex flex-col items-center">
          <span className="text-[10px] text-white/35 uppercase tracking-wider leading-none mb-1">{m.label}</span>
          <span className={`font-mono font-bold tabular-nums text-sm ${m.className}`}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}
