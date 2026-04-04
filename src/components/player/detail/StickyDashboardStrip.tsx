'use client';

import React, { memo } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';
import { getL5Hex } from '@/components/player';
import { useNumTick } from '@/lib/hooks/useNumTick';

interface StickyDashboardStripProps {
  playerName: string;
  position: string;
  floorPrice: number;
  l5Score: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  change24h: number;
  holdingQty: number;
  holderCount: number;
  visible: boolean;
  className?: string;
}

function StickyDashboardStripInner({
  playerName, position, floorPrice, l5Score, trend,
  change24h, holdingQty, holderCount, visible, className,
}: StickyDashboardStripProps) {
  const t = useTranslations('playerDetail');
  const l5Hex = getL5Hex(l5Score);
  const up = change24h >= 0;
  const priceTick = useNumTick(floorPrice);
  const l5Tick = useNumTick(l5Score);

  return (
    <div
      className={cn(
        'sticky top-0 z-40 h-12 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-divider shadow-sm',
        'transition-colors duration-200 ease-out',
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none',
        className,
      )}
    >
      <div className="flex items-center justify-between h-full px-4 max-w-[900px] mx-auto gap-3">
        {/* Name + Position */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ color: l5Hex, backgroundColor: `${l5Hex}15` }}
          >
            {position}
          </span>
          <span className="text-sm font-bold truncate">{playerName}</span>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {/* Floor Price */}
          <span className={cn('font-mono font-bold text-sm text-gold tabular-nums', priceTick)}>
            {fmtScout(floorPrice)}
          </span>

          {/* L5 Score Circle */}
          <div
            className="flex items-center justify-center size-7 rounded-full border-2"
            style={{ borderColor: l5Hex }}
          >
            <span className={cn('font-mono text-[10px] font-bold', l5Tick)} style={{ color: l5Hex }}>
              {l5Score}
            </span>
          </div>

          {/* Trend */}
          <div className="hidden md:flex items-center">
            {trend === 'UP' && <TrendingUp className="size-4 text-green-500" />}
            {trend === 'DOWN' && <TrendingDown className="size-4 text-red-300" />}
            {trend === 'FLAT' && <Minus className="size-4 text-white/40" />}
          </div>

          {/* 24h Change */}
          {change24h !== 0 && (
            <span className={cn(
              'font-mono text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md',
              up ? 'text-green-500 bg-green-500/10' : 'text-red-300 bg-red-500/10',
            )}>
              {up ? '+' : ''}{change24h.toFixed(1)}%
            </span>
          )}

          {/* Holdings or Holders */}
          <span className="hidden md:inline text-xs font-mono tabular-nums text-white/50">
            {holdingQty > 0
              ? <span className="text-green-500 font-bold">{holdingQty} SC</span>
              : <>{holderCount} {t('holder')}</>
            }
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(StickyDashboardStripInner);
