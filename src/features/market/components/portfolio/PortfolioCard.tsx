'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Pos } from '@/types';
import { cn, fmtScout } from '@/lib/utils';
import { PlayerPhoto, PositionBadge } from '@/components/player/index';
import { Button } from '@/components/ui/index';

// ============================================
// SPARKLINE (inline SVG)
// ============================================

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 30;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  const isPositive = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} className={className} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================
// PORTFOLIO CARD
// ============================================

interface PortfolioCardProps {
  player: {
    id: string;
    first: string;
    last: string;
    pos: Pos;
    club: string;
  };
  quantity: number;
  avgBuyPriceCents: number;
  floorPriceCents: number;
  pnlCents: number;
  pnlPct: number;
  priceHistory7d: number[];
  onSell: () => void;
  onViewInManager: () => void;
}

export default function PortfolioCard({
  player,
  quantity,
  avgBuyPriceCents,
  floorPriceCents,
  pnlCents,
  pnlPct,
  priceHistory7d,
  onSell,
  onViewInManager,
}: PortfolioCardProps) {
  const t = useTranslations('market');

  const isPositive = pnlCents >= 0;
  const pnlColorClass = isPositive ? 'text-emerald-400' : 'text-red-400';
  const pnlSign = isPositive ? '+' : '';

  const floorDisplay = fmtScout(Math.round(floorPriceCents) / 100);
  const avgBuyDisplay = fmtScout(Math.round(avgBuyPriceCents) / 100);
  const pnlDisplay = fmtScout(Math.round(Math.abs(pnlCents)) / 100);

  return (
    <div
      className={cn(
        'bg-white/[0.02] border border-white/10 rounded-2xl',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        'p-3 sm:p-4',
        'flex flex-col gap-2.5'
      )}
    >
      {/* Row 1: Player info */}
      <div className="flex items-center gap-3">
        <PlayerPhoto
          first={player.first}
          last={player.last}
          pos={player.pos}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white truncate">
              {player.first} {player.last}
            </span>
            <PositionBadge pos={player.pos} size="sm" />
            <span className="font-mono tabular-nums text-white/60 text-sm flex-shrink-0">
              {t('portfolioCardQty', { count: quantity })}
            </span>
          </div>
          <p className="text-white/40 text-xs truncate">{player.club}</p>
        </div>
      </div>

      {/* Row 2: Sparkline + P&L */}
      <div className="flex items-center gap-3">
        <Sparkline data={priceHistory7d} className="flex-shrink-0" />
        <div className={cn('flex items-baseline gap-2 font-mono tabular-nums text-sm', pnlColorClass)}>
          <span>{pnlSign}{pnlPct.toFixed(1)}%</span>
          <span>{pnlSign}{pnlDisplay}</span>
        </div>
      </div>

      {/* Row 3: Floor + Avg buy price */}
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span>
          {t('portfolioCardFloor')}:{' '}
          <span className="font-mono tabular-nums text-white/70">{floorDisplay}</span>
        </span>
        <span>
          {t('portfolioCardAvgBuy')}:{' '}
          <span className="font-mono tabular-nums text-white/70">{avgBuyDisplay}</span>
        </span>
      </div>

      {/* Row 4: Action buttons */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onSell}
          aria-label={`${t('sell')} ${player.first} ${player.last}`}
        >
          {t('sell')}
        </Button>
        <button
          type="button"
          onClick={onViewInManager}
          className={cn(
            'inline-flex items-center gap-1 text-sm text-gold hover:text-gold/80',
            'transition-colors min-h-[44px] px-2'
          )}
          aria-label={`${t('portfolioCardToManager')} ${player.first} ${player.last}`}
        >
          <ArrowRight className="size-3.5" aria-hidden="true" />
          {t('portfolioCardToManager')}
        </button>
      </div>
    </div>
  );
}
