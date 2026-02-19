'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Loader2, User } from 'lucide-react';
import { PositionBadge } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { getClub } from '@/lib/clubs';
import { fmtBSD, cn } from '@/lib/utils';
import { getRelativeTime } from '@/lib/activityHelpers';
import type { Player } from '@/types';

export type DiscoveryVariant = 'ipo' | 'trending' | 'deal' | 'new' | 'listing';

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
  listingCount?: number;
  isWatchlisted?: boolean;
  onWatch?: (id: string) => void;
  onBuy?: (id: string) => void;
  buying?: boolean;
}

const VARIANT_STYLES: Record<DiscoveryVariant, { badge: string; badgeBg: string; label: string }> = {
  ipo: { badge: 'text-[#22C55E]', badgeBg: 'bg-[#22C55E]/15', label: 'Live' },
  trending: { badge: 'text-orange-300', badgeBg: 'bg-orange-500/15', label: '' },
  deal: { badge: 'text-[#22C55E]', badgeBg: 'bg-[#22C55E]/15', label: 'Wert!' },
  new: { badge: 'text-sky-300', badgeBg: 'bg-sky-500/15', label: 'Neu' },
  listing: { badge: 'text-[#FFD700]', badgeBg: 'bg-[#FFD700]/15', label: 'Am Markt' },
};

export default function DiscoveryCard({
  player: p, variant,
  ipoProgress, ipoPrice,
  tradeCount, change24h,
  valueRatio, listingPrice, listedAt, listingCount,
  isWatchlisted, onWatch, onBuy, buying,
}: DiscoveryCardProps) {
  const l5 = p.perf.l5;
  const l5Color = l5 >= 65 ? 'text-emerald-300' : l5 >= 45 ? 'text-amber-300' : l5 > 0 ? 'text-red-300' : 'text-white/50';
  const vs = VARIANT_STYLES[variant];
  const clubData = getClub(p.club);
  const posBorderColor = posTintColors[p.pos];

  const price = variant === 'ipo' ? (ipoPrice ?? 0)
    : variant === 'new' || variant === 'listing' ? (listingPrice ?? p.prices.floor ?? 0)
    : p.prices.floor ?? 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className="flex-shrink-0 w-[140px] bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 hover:bg-white/[0.06] transition-all group relative overflow-hidden"
      style={{ borderLeftColor: posBorderColor, borderLeftWidth: 2 }}
    >
      {/* Top row: Photo + Identity */}
      <div className="flex items-start gap-2 mb-1.5">
        {/* Player Photo */}
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/5 border border-white/10">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.last} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-4 h-4 text-white/20" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
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
        </div>
      </div>

      {/* Name */}
      <div className="text-[11px] text-white/50 truncate">{p.first}</div>
      <div className="font-bold text-xs truncate group-hover:text-[#FFD700] transition-colors uppercase">{p.last}</div>

      {/* Club + Logo + Number */}
      <div className="flex items-center gap-1 mt-0.5">
        {clubData?.logo ? (
          <img src={clubData.logo} alt={p.club} className="w-3 h-3 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-3 h-3 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: clubData?.colors.primary ?? '#666' }} />
        )}
        <span className="text-[10px] text-white/40 truncate">{clubData?.short || p.club}</span>
        {p.ticket > 0 && <span className="font-mono text-[10px] text-white/20">#{p.ticket}</span>}
      </div>

      {/* Separator */}
      <div className="h-px bg-white/5 my-1.5" />

      {/* Metrics: L5 + Price */}
      <div className="flex items-center justify-between">
        <span className={cn('font-mono font-bold text-[11px]', l5Color)}>L5: {l5}</span>
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

      {variant === 'listing' && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/40">
          <span className="font-mono font-bold text-[#FFD700]/70">{p.dpc.onMarket} DPC</span>
          {listingCount !== undefined && listingCount > 1 && (
            <><span className="text-white/15">·</span><span>{listingCount} Seller</span></>
          )}
        </div>
      )}

      {/* Badge */}
      {vs.label && variant !== 'trending' && variant !== 'new' && variant !== 'listing' && (
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
