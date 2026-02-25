'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Loader2 } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PlayerIdentity, PlayerKPIs, PlayerBadgeStrip, getL5Color } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
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

const VARIANT_STYLES: Record<DiscoveryVariant, { badge: string; badgeBg: string; label: string; glow?: string }> = {
  ipo: { badge: 'text-[#00E676]', badgeBg: 'bg-[#00E676]/15', label: 'Live', glow: 'shadow-[0_0_8px_rgba(0,230,118,0.3)]' },
  trending: { badge: 'text-white', badgeBg: 'bg-gradient-to-r from-[#FF3B69] to-[#FF6B3B]', label: 'HOT', glow: 'shadow-[0_0_8px_rgba(255,59,105,0.3)]' },
  deal: { badge: 'text-[#00E676]', badgeBg: 'bg-[#00E676]/15', label: 'Wert!' },
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
  const vs = VARIANT_STYLES[variant];
  const posBorderColor = posTintColors[p.pos];

  const price = variant === 'ipo' ? (ipoPrice ?? 0)
    : variant === 'new' || variant === 'listing' ? (listingPrice ?? p.prices.floor ?? 0)
    : p.prices.floor ?? 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className={cn(
        'flex-shrink-0 w-[calc((100vw-48px)/2.5)] md:w-[140px] max-w-[160px] bg-surface-base border border-white/[0.10] rounded-xl p-2.5 card-lift group relative overflow-hidden',
        variant === 'ipo' && 'shadow-glow-live',
        variant === 'trending' && 'shadow-[0_0_16px_rgba(255,59,105,0.15)]',
        (variant === 'ipo' || variant === 'trending') && p.perf.l5 >= 65 && 'foil-shimmer',
        p.perf.l5 >= 80 && 'holo-rainbow',
      )}
      style={{
        borderLeftColor: posBorderColor,
        borderLeftWidth: 2,
        backgroundImage: `linear-gradient(to bottom right, ${posBorderColor}20, transparent 60%)`,
      }}
    >
      {/* Identity: Photo+ClubLogo + Name + Pos */}
      <div className="flex items-start gap-2 mb-1">
        <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />
        {onWatch && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(p.id); }}
            className={cn('p-2 -m-1.5 rounded transition-all active:scale-[0.90] shrink-0', isWatchlisted ? 'text-[#FFD700]' : 'text-white/20 hover:text-white/40')}
          >
            <Star className="w-3 h-3" fill={isWatchlisted ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Separator — floodlight style */}
      <div className="h-px my-1.5" style={{ background: `linear-gradient(90deg, transparent, ${posBorderColor}40, transparent)` }} />

      {/* Metrics: L5 + Price */}
      <div className="flex items-center justify-between">
        <span className={cn('font-mono font-bold text-[11px]', getL5Color(p.perf.l5))} style={{ textShadow: p.perf.l5 >= 65 ? '0 0 8px currentColor' : undefined }}>{p.perf.l5}</span>
        {price > 0 && <span className="font-mono font-black text-[11px] gold-glow">{fmtScout(price)}</span>}
      </div>

      {/* Stat micro-row: Goals · Assists · Matches  Trend  Age */}
      <div className="flex items-center justify-between mt-0.5 text-[9px] font-mono leading-none">
        <div className="flex items-center gap-0.5">
          <span className="text-[#00E676]">{p.stats.goals}T</span>
          <span className="text-white/15">·</span>
          <span className="text-sky-300">{p.stats.assists}A</span>
          <span className="text-white/15">·</span>
          <span className="text-white/40">{p.stats.matches}Sp</span>
        </div>
        <div className="flex items-center gap-0.5">
          {p.perf.trend === 'UP' && <TrendingUp className="w-2.5 h-2.5 text-[#00E676]" />}
          {p.perf.trend === 'DOWN' && <TrendingDown className="w-2.5 h-2.5 text-[#FF3B69]" />}
          {p.perf.trend === 'FLAT' && <Minus className="w-2.5 h-2.5 text-white/30" />}
          <span className="text-white/40">{p.age}J.</span>
        </div>
      </div>

      {/* Variant-specific indicator */}
      {variant === 'ipo' && ipoProgress !== undefined && (
        <div className="relative mt-1.5">
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00E676] to-[#FFD700] transition-all duration-500"
              style={{
                width: `${Math.min(ipoProgress, 100)}%`,
                boxShadow: '0 0 8px rgba(0,230,118,0.3)',
              }}
            />
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {ipoProgress.toFixed(0)}% verkauft
          </span>
        </div>
      )}

      {variant === 'trending' && tradeCount !== undefined && (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white/60">{tradeCount}× Trades</span>
          {change24h !== undefined && (
            <span className={cn('text-[10px] font-mono font-bold', change24h >= 0 ? 'text-[#00E676]' : 'text-[#FF3B69]')}>
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
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded', vs.badgeBg, vs.badge)}>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            {getRelativeTime(listedAt)}
          </span>
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
      {variant === 'trending' && (
        <div className={cn('absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md', vs.badgeBg, vs.badge, vs.glow)}>
          {vs.label}
        </div>
      )}
      {variant === 'ipo' && (
        <div className={cn('absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md', vs.badgeBg, vs.badge, vs.glow)}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] live-ring" />
          {vs.label}
        </div>
      )}
      {vs.label && variant !== 'trending' && variant !== 'ipo' && variant !== 'new' && variant !== 'listing' && (
        <div className={cn('absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md', vs.badgeBg, vs.badge, vs.glow)}>
          {vs.label}
        </div>
      )}

      {/* Buy button */}
      {onBuy && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
          disabled={buying}
          className="mt-2 w-full py-2 min-h-[44px] bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] rounded-lg text-xs font-black hover:bg-[#FFD700]/20 hover:btn-gold-glow transition-all active:scale-[0.95] disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Kaufen'}
        </button>
      )}
    </Link>
  );
}
