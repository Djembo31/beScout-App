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
    <div data-tour-id="global-movers" aria-live="polite" aria-label="Top Movers" className="flex gap-3 overflow-x-auto scrollbar-hide scroll-touch pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
      {movers.map((p, i) => {
        const up = p.prices.change24h >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        const changeText = `${up ? '+' : ''}${p.prices.change24h.toFixed(1)}%`;
        const tintColor = up ? 'rgba(34,197,94,' : 'rgba(239,68,68,';
        return (
          <Link
            key={p.id}
            href={`/player/${p.id}`}
            aria-label={`${p.first} ${p.last}, ${p.club}, ${changeText}`}
            className={cn(
              'flex items-center gap-3 px-3.5 py-3 rounded-2xl border card-showcase shrink-0 min-w-[210px] shadow-card-md card-entrance focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
              `card-stagger-${Math.min(i + 1, 6)}`,
            )}
            style={{
              borderColor: `${tintColor}0.15)`,
              background: `linear-gradient(135deg, ${tintColor}0.06) 0%, rgba(255,255,255,0.02) 100%)`,
            }}
          >
            <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{p.last}</div>
              <div className="text-[10px] text-white/30 truncate">{p.club}</div>
            </div>
            <div className="text-right shrink-0">
              <div className={cn('flex items-center justify-end gap-0.5 font-mono font-black text-base tabular-nums', up ? 'text-vivid-green' : 'text-vivid-red')}>
                <Icon className="size-3.5" aria-hidden="true" />
                {changeText}
              </div>
              <div className="text-[10px] text-white/30 font-mono tabular-nums mt-0.5">{fmtScout(p.prices.floor ?? p.prices.lastTrade ?? p.prices.referencePrice ?? 0)} CR</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default memo(TopMoversStripInner);
