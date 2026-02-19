'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Loader2 } from 'lucide-react';
import { PositionBadge } from '@/components/player';
import { fmtBSD, cn } from '@/lib/utils';
import { getRelativeTime } from '@/lib/activityHelpers';
import type { Player } from '@/types';

export type DiscoveryVariant = 'ipo' | 'trending' | 'deal' | 'new';

interface DiscoveryCardProps {
  player: Player;
  variant: DiscoveryVariant;
  ipoProgress?: number;
  ipoPrice?: number;
  tradeCount?: number;
  change24h?: number;
  valueRatio?: number;
  listingPrice?: number;
  listedAt?: string;
  isWatchlisted?: boolean;
  onWatch?: (id: string) => void;
  onBuy?: (id: string) => void;
  buying?: boolean;
}

const VARIANT_STYLES: Record<DiscoveryVariant, { border: string; badge: string; badgeBg: string; label: string }> = {
  ipo: { border: 'border-[#22C55E]/20', badge: 'text-[#22C55E]', badgeBg: 'bg-[#22C55E]/15', label: 'Live' },
  trending: { border: 'border-orange-400/20', badge: 'text-orange-300', badgeBg: 'bg-orange-500/15', label: '' },
  deal: { border: 'border-[#22C55E]/20', badge: 'text-[#22C55E]', badgeBg: 'bg-[#22C55E]/15', label: 'Wert!' },
  new: { border: 'border-sky-400/20', badge: 'text-sky-300', badgeBg: 'bg-sky-500/15', label: 'Neu' },
};

export default function DiscoveryCard({
  player: p, variant,
  ipoProgress, ipoPrice,
  tradeCount, change24h,
  valueRatio, listingPrice, listedAt,
  isWatchlisted, onWatch, onBuy, buying,
}: DiscoveryCardProps) {
  const l5 = p.perf.l5;
  const l5Color = l5 >= 65 ? 'text-emerald-300' : l5 >= 45 ? 'text-amber-300' : l5 > 0 ? 'text-red-300' : 'text-white/50';
  const vs = VARIANT_STYLES[variant];

  const price = variant === 'ipo' ? (ipoPrice ?? 0)
    : variant === 'new' ? (listingPrice ?? 0)
    : p.prices.floor ?? 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className={cn(
        'flex-shrink-0 w-[140px] bg-white/[0.03] border rounded-xl p-2.5 hover:bg-white/[0.06] transition-all group relative',
        vs.border
      )}
    >
      {/* Top row: Position + Watch */}
      <div className="flex items-center justify-between mb-1.5">
        <PositionBadge pos={p.pos} size="sm" />
        {onWatch && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(p.id); }}
            className={cn('p-0.5 rounded transition-colors', isWatchlisted ? 'text-[#FFD700]' : 'text-white/20 hover:text-white/40')}
          >
            <Star className="w-3 h-3" fill={isWatchlisted ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Name */}
      <div className="text-[11px] text-white/50 truncate">{p.first}</div>
      <div className="font-bold text-xs truncate group-hover:text-[#FFD700] transition-colors uppercase">{p.last}</div>

      {/* Club + Number */}
      <div className="text-[10px] text-white/40 truncate mt-0.5">
        {p.club}
        {p.ticket > 0 && <span className="font-mono text-white/25"> #{p.ticket}</span>}
      </div>

      {/* Separator */}
      <div className="h-px bg-white/5 my-1.5" />

      {/* Metrics: L5 + OnMarket + Price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className={cn('font-mono font-bold text-[11px]', l5Color)}>L5: {l5}</span>
          {p.dpc.onMarket > 0 && variant !== 'new' && (
            <span className="text-[8px] font-bold text-[#FFD700]/70 bg-[#FFD700]/10 px-1 py-0.5 rounded">{p.dpc.onMarket}×</span>
          )}
        </div>
        {price > 0 && <span className="font-mono font-bold text-[11px] text-[#FFD700]">{fmtBSD(price)}</span>}
      </div>

      {/* Variant-specific indicator */}
      {variant === 'ipo' && ipoProgress !== undefined && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
            <div className="h-full bg-[#22C55E] rounded-full transition-all" style={{ width: `${Math.min(ipoProgress, 100)}%` }} />
          </div>
          <span className="text-[9px] font-mono text-white/30">{ipoProgress.toFixed(0)}%</span>
        </div>
      )}

      {variant === 'trending' && tradeCount !== undefined && (
        <div className="mt-1.5 flex items-center justify-between">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', vs.badgeBg, vs.badge)}>{tradeCount}× Trades</span>
          {change24h !== undefined && (
            <span className={cn('text-[10px] font-mono', change24h >= 0 ? 'text-[#22C55E]' : 'text-red-300')}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {variant === 'deal' && (
        <div className="mt-1.5">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', vs.badgeBg, vs.badge)}>Wert!</span>
        </div>
      )}

      {variant === 'new' && listedAt && (
        <div className="mt-1.5">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', vs.badgeBg, vs.badge)}>{getRelativeTime(listedAt)}</span>
        </div>
      )}

      {/* Badge */}
      {vs.label && variant !== 'trending' && variant !== 'new' && (
        <div className={cn('absolute top-1.5 right-1.5 text-[8px] font-black px-1 py-0.5 rounded', vs.badgeBg, vs.badge)}>
          {vs.label}
        </div>
      )}

      {/* Buy button */}
      {onBuy && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
          disabled={buying}
          className="mt-2 w-full py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] rounded-lg text-[10px] font-bold hover:bg-[#FFD700]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Kaufen'}
        </button>
      )}
    </Link>
  );
}
