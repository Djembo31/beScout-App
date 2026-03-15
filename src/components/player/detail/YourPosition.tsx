'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { MASTERY_XP_THRESHOLDS } from '@/lib/services/mastery';
import type { DbTrade } from '@/types';

interface YourPositionProps {
  holdingQty: number;
  floorPrice: number;
  trades: DbTrade[];
  userId: string;
  mastery?: { level: number; xp: number } | null;
}

export default function YourPosition({
  holdingQty, floorPrice, trades, userId, mastery,
}: YourPositionProps) {
  const t = useTranslations('playerDetail');
  const totalValue = holdingQty * floorPrice;

  const avgCost = useMemo(() => {
    const buyTrades = trades.filter((tr) => tr.buyer_id === userId);
    if (buyTrades.length === 0) return null;
    let totalCostCents = 0;
    let totalQty = 0;
    for (const tr of buyTrades) {
      totalCostCents += tr.price * tr.quantity;
      totalQty += tr.quantity;
    }
    if (totalQty === 0) return null;
    return centsToBsd(totalCostCents / totalQty);
  }, [trades, userId]);

  const pnl = useMemo(() => {
    if (avgCost == null || avgCost <= 0) return null;
    const pctChange = ((floorPrice - avgCost) / avgCost) * 100;
    const absoluteChange = (floorPrice - avgCost) * holdingQty;
    return { pct: pctChange, absolute: absoluteChange };
  }, [avgCost, floorPrice, holdingQty]);

  const pnlColor = pnl != null ? (pnl.pct >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white/40';

  const masteryProgress = useMemo(() => {
    if (!mastery || mastery.level >= 5) return null;
    const threshold = MASTERY_XP_THRESHOLDS[mastery.level] || 1;
    return Math.min((mastery.xp / threshold) * 100, 100);
  }, [mastery]);

  if (holdingQty <= 0) return null;

  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{t('positionTitle')}</span>
        {mastery && (
          <span className="px-2 py-0.5 rounded-lg bg-gold/15 text-gold text-[10px] font-black border border-gold/25">
            Lv {mastery.level}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <span className="text-[10px] text-white/35 uppercase tracking-wider block mb-0.5">{t('positionTotalValue')}</span>
          <span className="font-mono font-bold tabular-nums text-gold text-lg">{fmtScout(totalValue)}</span>
        </div>
        <div>
          <span className="text-[10px] text-white/35 uppercase tracking-wider block mb-0.5">{t('positionAvgCost')}</span>
          <span className="font-mono font-bold tabular-nums text-sm text-white">{avgCost != null ? fmtScout(avgCost) : '\u2014'}</span>
        </div>
        <div>
          <span className="text-[10px] text-white/35 uppercase tracking-wider block mb-0.5">{t('positionPnL')}</span>
          {pnl != null ? (
            <div className="flex flex-col">
              <span className={`font-mono font-bold tabular-nums text-sm ${pnlColor}`}>
                {pnl.pct >= 0 ? '+' : ''}{pnl.pct.toFixed(1)}%
              </span>
              <span className={`font-mono tabular-nums text-[10px] ${pnlColor}`}>
                {pnl.absolute >= 0 ? '+' : ''}{fmtScout(pnl.absolute)}
              </span>
            </div>
          ) : (
            <span className="font-mono tabular-nums text-sm text-white/40">{'\u2014'}</span>
          )}
        </div>
      </div>
      {mastery && masteryProgress != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/30">{t('positionMastery')}</span>
            <span className="text-[10px] font-mono text-white/30">{mastery.xp} / {MASTERY_XP_THRESHOLDS[mastery.level] || 'MAX'} XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-gold/40 to-gold/20 transition-all" style={{ width: `${masteryProgress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
