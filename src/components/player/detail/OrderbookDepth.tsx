'use client';

import { Layers } from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { DbOrder } from '@/types';

interface OrderbookDepthProps {
  orders: DbOrder[];
  className?: string;
}

export default function OrderbookDepth({ orders, className = '' }: OrderbookDepthProps) {
  if (orders.length === 0) return null;

  // Aggregate by price level
  const levels = new Map<number, number>();
  for (const o of orders) {
    const price = centsToBsd(o.price);
    levels.set(price, (levels.get(price) || 0) + (o.quantity - o.filled_qty));
  }
  const sorted = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
  if (sorted.length === 0) return null;
  const maxQty = Math.max(...sorted.map(([, q]) => q));

  // Cumulative volume
  let cumulative = 0;
  const withCum = sorted.map(([price, qty]) => {
    cumulative += qty;
    return { price, qty, cumQty: cumulative };
  });

  return (
    <Card className={`p-4 md:p-6 ${className}`}>
      <h3 className="font-black text-lg mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-sky-400" />
        Orderbook-Tiefe
      </h3>
      <div className="space-y-1.5">
        {withCum.map(({ price, qty, cumQty }) => {
          const barWidth = maxQty > 0 ? (qty / maxQty) * 100 : 0;
          return (
            <div key={price} className="flex items-center gap-3">
              <div className="w-16 text-right shrink-0">
                <span className="text-xs font-mono font-bold text-[#FFD700]">{fmtScout(price)}</span>
              </div>
              <div className="flex-1 h-5 bg-white/[0.02] rounded relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-red-500/15 border-r border-red-500/30 rounded transition-all"
                  style={{ width: `${barWidth}%` }}
                />
                <div className="absolute inset-y-0 flex items-center px-2 text-[10px] font-mono text-white/50">
                  {qty} DPC
                </div>
              </div>
              <div className="w-10 text-right shrink-0">
                <span className="text-[10px] font-mono text-white/30">{cumQty}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
        <span>Preis ($SCOUT)</span>
        <span>&Sigma; Kumuliert</span>
      </div>
    </Card>
  );
}
