'use client';

import { useState } from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, InfoTooltip } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { DbOrder } from '@/types';
import type { OfferWithDetails } from '@/types';
import OrderbookDepth from './OrderbookDepth';

interface OrderbookSummaryProps {
  sellOrders: DbOrder[];
  bids: OfferWithDetails[];
  className?: string;
}

export default function OrderbookSummary({ sellOrders, bids, className = '' }: OrderbookSummaryProps) {
  const t = useTranslations('playerDetail');
  const [expanded, setExpanded] = useState(false);

  const bestAsk = sellOrders.length > 0
    ? Math.min(...sellOrders.map(o => centsToBsd(o.price)))
    : null;
  const bestBid = bids.length > 0
    ? Math.max(...bids.map(b => centsToBsd(b.price)))
    : null;

  const spreadPct = bestAsk && bestBid && bestAsk > 0
    ? (((bestAsk - bestBid) / bestAsk) * 100).toFixed(1)
    : null;

  const spreadColor = spreadPct
    ? Number(spreadPct) < 5
      ? 'text-green-500'
      : Number(spreadPct) < 15
        ? 'text-amber-400'
        : 'text-red-400'
    : 'text-white/40';

  // Volume balance
  const askVol = sellOrders.reduce((s, o) => s + (o.quantity - o.filled_qty), 0);
  const bidVol = bids.reduce((s, b) => s + b.quantity, 0);
  const totalVol = askVol + bidVol || 1;
  const bidPct = (bidVol / totalVol) * 100;

  if (sellOrders.length === 0 && bids.length === 0) return null;

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400" aria-hidden="true" />
          {t('orderbookTitle')}
          <InfoTooltip text={t('orderbookTooltip')} />
        </h3>

        {/* Best Bid / Spread / Best Ask */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">{t('bestBid')}</p>
            <p className="font-mono font-bold text-green-500 tabular-nums">
              {bestBid ? fmtScout(bestBid) : '\u2013'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">{t('quickStatsSpread')}</p>
            <p className={cn('font-mono font-bold tabular-nums', spreadColor)}>
              {spreadPct ? `${spreadPct}%` : '\u2013'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">{t('bestAsk')}</p>
            <p className="font-mono font-bold text-red-400 tabular-nums">
              {bestAsk ? fmtScout(bestAsk) : '\u2013'}
            </p>
          </div>
        </div>

        {/* Balance bar */}
        <div className="h-2 rounded-full overflow-hidden flex bg-white/[0.06]">
          <div
            className="h-full bg-green-500/40 transition-colors"
            style={{ width: `${bidPct}%` }}
          />
          <div
            className="h-full bg-red-400/40 transition-colors"
            style={{ width: `${100 - bidPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>{bidVol} {t('bidLabel')}</span>
          <span>{askVol} {t('askLabel')}</span>
        </div>
      </div>

      {/* Expand to full depth */}
      {sellOrders.length > 0 && (
        <div className="border-t border-white/[0.06]">
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {expanded ? t('hideDepth') : t('showDepth')}
            <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
          {expanded && (
            <div className="px-4 pb-4">
              <OrderbookDepth orders={sellOrders} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
