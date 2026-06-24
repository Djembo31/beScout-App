'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { PublicTrade } from '@/types';

interface YourPositionProps {
  holdingQty: number;
  floorPrice: number;
  trades: PublicTrade[];
  userId: string;
}

export default function YourPosition({
  holdingQty, floorPrice, trades,
}: YourPositionProps) {
  const t = useTranslations('playerDetail');
  const totalValue = holdingQty * floorPrice;

  // Slice 095: is_buyer_own kommt von RPC (auth.uid() = buyer_id), ersetzt userId-compare.
  const avgCost = useMemo(() => {
    const buyTrades = trades.filter((tr) => tr.is_buyer_own);
    if (buyTrades.length === 0) return null;
    let totalCostCents = 0;
    let totalQty = 0;
    for (const tr of buyTrades) {
      totalCostCents += tr.price * tr.quantity;
      totalQty += tr.quantity;
    }
    if (totalQty === 0) return null;
    return centsToBsd(totalCostCents / totalQty);
  }, [trades]);

  const pnl = useMemo(() => {
    if (avgCost == null || avgCost <= 0) return null;
    const pctChange = ((floorPrice - avgCost) / avgCost) * 100;
    const absoluteChange = (floorPrice - avgCost) * holdingQty;
    return { pct: pctChange, absolute: absoluteChange };
  }, [avgCost, floorPrice, holdingQty]);

  const pnlColor = pnl != null ? (pnl.pct >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white/40';

  if (holdingQty <= 0) return null;

  return (
    <div className="bg-surface-minimal rounded-xl border border-divider p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{t('positionTitle')}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5">{t('positionTotalValue')}</span>
          <span className="font-mono font-bold tabular-nums text-gold text-lg">{fmtScout(totalValue)}</span>
        </div>
        <div>
          <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5">{t('positionAvgCost')}</span>
          <span className="font-mono font-bold tabular-nums text-sm text-white">{avgCost != null ? fmtScout(avgCost) : '\u2014'}</span>
        </div>
        <div>
          <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-0.5">{t('positionPnL')}</span>
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
    </div>
  );
}
