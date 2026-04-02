'use client';

import Link from 'next/link';
import { cn, fmtScout } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/index';

interface MarktTabProps {
  playerId: string;
  floorPrice: number;
  avgBuyPrice: number;
  quantityHeld: number;
  priceChange7dPct: number | null;
}

function toCents(cents: number): number {
  return Math.round(cents / 100);
}

export default function MarktTab({
  playerId,
  floorPrice,
  avgBuyPrice,
  quantityHeld,
  priceChange7dPct,
}: MarktTabProps) {
  const floor = toCents(floorPrice);
  const avg = toCents(avgBuyPrice);
  const totalValue = floor * quantityHeld;
  const totalCost = avg * quantityHeld;
  const pnl = totalValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const pnlPositive = pnl >= 0;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-black text-white/40 uppercase tracking-wider mb-3">
        Deine Holdings
      </h3>

      <div className="flex items-center justify-between py-2">
        <span className="text-white/50 text-sm">Anzahl</span>
        <span className="text-white text-sm font-mono tabular-nums">{quantityHeld}x</span>
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-white/50 text-sm">{'\u00D8'} Kaufpreis</span>
        <span className="text-white text-sm font-mono tabular-nums">
          {fmtScout(avg)} $SCOUT
        </span>
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-white/50 text-sm">Floor</span>
        <span className="text-white text-sm font-mono tabular-nums">
          {fmtScout(floor)} $SCOUT
        </span>
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-white/50 text-sm">Wertentwicklung</span>
        <span className={cn(
          'text-sm font-mono tabular-nums font-semibold',
          pnlPositive ? 'text-green-400' : 'text-red-400'
        )}>
          {pnlPositive ? '+' : ''}{fmtScout(pnl)} ({pnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
        </span>
      </div>

      <div className="border-t border-white/[0.06] my-3" />

      {priceChange7dPct != null && (
        <div className="flex items-center justify-between py-2">
          <span className="text-white/50 text-sm">7-Tage Trend</span>
          <span className={cn(
            'flex items-center gap-1 text-sm font-mono tabular-nums font-semibold',
            priceChange7dPct >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {priceChange7dPct >= 0
              ? <TrendingUp className="size-3.5" aria-hidden="true" />
              : <TrendingDown className="size-3.5" aria-hidden="true" />
            }
            {priceChange7dPct >= 0 ? '+' : ''}{priceChange7dPct.toFixed(1)}%
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-4">
        <Button variant="outline" size="sm" aria-label="Scout Card verkaufen">
          Verkaufen
        </Button>
        <Link
          href={`/market?player=${playerId}`}
          className="text-sm font-semibold text-gold hover:text-gold/80 transition-colors"
        >
          Auf Transfermarkt &rarr;
        </Link>
      </div>
    </div>
  );
}
