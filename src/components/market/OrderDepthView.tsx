'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { getSellOrders } from '@/lib/services/trading';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { DbOrder } from '@/types';

interface OrderDepthViewProps {
  playerId: string;
}

/** Price level aggregation for depth visualization */
type PriceLevel = {
  price: number;
  priceBsd: number;
  quantity: number;
  orderCount: number;
  cumulative: number;
};

export default function OrderDepthView({ playerId }: OrderDepthViewProps) {
  const t = useTranslations('market');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orderbook', playerId],
    queryFn: () => getSellOrders(playerId),
    staleTime: 30_000,
  });

  // Aggregate orders by price level
  const levels = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const grouped = new Map<number, { qty: number; count: number }>();
    for (const o of orders) {
      const available = o.quantity - o.filled_qty;
      if (available <= 0) continue;
      const existing = grouped.get(o.price);
      if (existing) {
        existing.qty += available;
        existing.count++;
      } else {
        grouped.set(o.price, { qty: available, count: 1 });
      }
    }

    let cumulative = 0;
    const result: PriceLevel[] = [];
    // Already sorted by price ASC from the query
    const entries = Array.from(grouped.entries());
    for (const [price, { qty, count }] of entries) {
      cumulative += qty;
      result.push({
        price,
        priceBsd: centsToBsd(price),
        quantity: qty,
        orderCount: count,
        cumulative,
      });
    }
    return result;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-white/30 motion-reduce:animate-none" />
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="text-center py-3 text-[10px] text-white/30">
        {t('noOrdersForPlayer', { defaultMessage: 'Keine aktiven Angebote' })}
      </div>
    );
  }

  const maxCum = levels[levels.length - 1]?.cumulative ?? 1;

  return (
    <div className="space-y-1 py-2">
      <div className="flex items-center justify-between text-[9px] text-white/30 font-bold uppercase tracking-wider px-1 mb-1">
        <span>{t('depthPrice', { defaultMessage: 'Preis' })}</span>
        <span>{t('depthQty', { defaultMessage: 'Menge' })}</span>
        <span>{t('depthCumulative', { defaultMessage: 'Kumuliert' })}</span>
      </div>
      {levels.map((level, i) => (
        <div key={level.price} className="relative flex items-center justify-between px-2 py-1.5 rounded-lg text-xs">
          {/* Depth bar background */}
          <div
            className={cn(
              'absolute inset-0 rounded-lg',
              i === 0 ? 'bg-green-500/10' : 'bg-sky-500/[0.06]'
            )}
            style={{ width: `${(level.cumulative / maxCum) * 100}%` }}
          />
          <span className={cn(
            'relative font-mono font-bold tabular-nums',
            i === 0 ? 'text-gold' : 'text-white/60'
          )}>
            {fmtScout(level.priceBsd)}
          </span>
          <span className="relative font-mono tabular-nums text-white/50">
            {level.quantity} <span className="text-[9px] text-white/25">({level.orderCount})</span>
          </span>
          <span className="relative font-mono tabular-nums text-white/40">
            {level.cumulative}
          </span>
        </div>
      ))}
      <div className="text-[9px] text-white/20 text-center pt-1">
        {t('depthLevels', { defaultMessage: '{count} Preisstufen', count: levels.length })}
      </div>
    </div>
  );
}
