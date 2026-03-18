'use client';

import { memo } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { PlayerPhoto } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import type { Player } from '@/types';

interface TopMoversStripProps {
  players: Player[];
}

function TopMoversStripInner({ players }: TopMoversStripProps) {
  // Global top 5 by absolute 24h change
  const movers = players
    .filter(p => p.prices.change24h !== 0 && !p.isLiquidated)
    .sort((a, b) => Math.abs(b.prices.change24h) - Math.abs(a.prices.change24h))
    .slice(0, 5);

  if (movers.length === 0) return null;

  return (
    <div data-tour-id="global-movers" className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
      {movers.map(p => {
        const up = p.prices.change24h >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        const changeText = `${up ? '+' : ''}${p.prices.change24h.toFixed(1)}%`;
        return (
          <Link
            key={p.id}
            href={`/player/${p.id}`}
            aria-label={`${p.first} ${p.last}, ${p.club}, ${changeText}`}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-surface-minimal hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none transition-colors shrink-0 min-w-[200px] shadow-card-sm"
            style={{ borderColor: up ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
          >
            <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{p.last}</div>
              <div className="text-[11px] text-white/40 truncate">{p.club}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] text-white/40 font-mono tabular-nums">{fmtScout(p.prices.floor ?? p.prices.lastTrade ?? p.prices.referencePrice ?? 0)}</div>
              <div className={cn('flex items-center gap-0.5 font-mono font-bold text-sm tabular-nums', up ? 'text-green-500' : 'text-red-400')}>
                <Icon className="size-3" aria-hidden="true" />
                {changeText}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default memo(TopMoversStripInner);
