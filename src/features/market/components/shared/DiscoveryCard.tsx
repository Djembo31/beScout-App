'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Star, Loader2 } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PlayerIdentity, PlayerKPIs, PlayerBadgeStrip, getL5Color } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { useTilt } from '@/lib/hooks/useTilt';
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

const VARIANT_STYLES: Record<DiscoveryVariant, { badge: string; badgeBg: string; glow?: string }> = {
  ipo: { badge: 'text-vivid-green', badgeBg: 'bg-vivid-green/15', glow: 'shadow-[0_0_8px_rgba(0,230,118,0.3)]' },
  trending: { badge: 'text-white', badgeBg: 'bg-vivid-red', glow: 'shadow-[0_0_8px_rgba(255,59,105,0.3)]' },
  deal: { badge: 'text-vivid-green', badgeBg: 'bg-vivid-green/15' },
  new: { badge: 'text-sky-300', badgeBg: 'bg-sky-500/15' },
  listing: { badge: 'text-gold', badgeBg: 'bg-gold/15' },
};

export default function DiscoveryCard({
  player: p, variant,
  ipoProgress, ipoPrice,
  tradeCount, change24h,
  valueRatio, listingPrice, listedAt, listingCount,
  isWatchlisted, onWatch, onBuy, buying,
}: DiscoveryCardProps) {
  const t = useTranslations('market');
  const ta = useTranslations('activity');
  const { ref, tiltProps } = useTilt<HTMLAnchorElement>({ maxTilt: 8, scale: 1.02 });
  const vs = VARIANT_STYLES[variant];
  const posBorderColor = posTintColors[p.pos];

  const variantLabel: Record<DiscoveryVariant, string> = {
    ipo: 'Live',
    trending: 'HOT',
    deal: t('discoveryDealLabel'),
    new: t('discoveryNewLabel'),
    listing: t('discoveryListingLabel'),
  };

  const price = variant === 'ipo' ? (ipoPrice ?? 0)
    : variant === 'new' || variant === 'listing' ? (listingPrice ?? p.prices.floor ?? p.prices.referencePrice ?? 0)
    : p.prices.floor ?? p.prices.referencePrice ?? 0;

  return (
    <Link
      ref={ref}
      {...tiltProps}
      href={`/player/${p.id}`}
      className={cn(
        'flex-shrink-0 w-[calc((100vw-48px)/2.5)] md:w-[140px] max-w-[160px] bg-surface-base border border-white/[0.10] rounded-xl p-2.5 group relative overflow-hidden card-metallic',
        variant === 'ipo' && 'shadow-glow-live',
        variant === 'trending' && 'shadow-[0_0_16px_rgba(255,59,105,0.15)]',
      )}
      style={{
        ...tiltProps.style,
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
            className={cn('p-2 -m-1.5 rounded transition-colors active:scale-[0.97] shrink-0', isWatchlisted ? 'text-gold' : 'text-white/20 hover:text-white/40')}
          >
            <Star className="w-3 h-3" fill={isWatchlisted ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Separator — floodlight style */}
      <div className="h-px my-1.5" style={{ background: `linear-gradient(90deg, transparent, ${posBorderColor}40, transparent)` }} />

      {/* Metrics: L5 Circle + Price */}
      <div className="flex items-center justify-between">
        <div
          className="size-6 rounded-full flex items-center justify-center border-[1.5px]"
          style={{ backgroundColor: `${posBorderColor}33`, borderColor: `${posBorderColor}99` }}
        >
          <span className="font-mono font-black text-[9px] tabular-nums text-white/90">{Math.round(p.perf.l5)}</span>
        </div>
        {price > 0 && <span className="font-mono font-black text-[10px] gold-glow">{fmtScout(price)}</span>}
      </div>

      {/* 24h Change badge — all non-trending variants */}
      {variant !== 'trending' && p.prices.change24h !== 0 && (
        <div className="flex items-center gap-0.5 mt-0.5">
          {p.prices.change24h > 0
            ? <TrendingUp className="w-2.5 h-2.5 text-vivid-green" aria-hidden="true" />
            : <TrendingDown className="w-2.5 h-2.5 text-vivid-red" aria-hidden="true" />
          }
          <span className={cn('text-[9px] font-mono font-bold', p.prices.change24h > 0 ? 'text-vivid-green' : 'text-vivid-red')}>
            {p.prices.change24h > 0 ? '+' : ''}{p.prices.change24h.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Stat micro-row: Goals · Assists · Matches  Trend  Age */}
      <div className="flex items-center justify-between mt-0.5 text-[9px] font-mono leading-none">
        <div className="flex items-center gap-0.5">
          <span className="text-vivid-green">{p.stats.goals}{t('discoveryGoalsSuffix')}</span>
          <span className="text-white/15">·</span>
          <span className="text-sky-300">{p.stats.assists}{t('discoveryAssistsSuffix')}</span>
          <span className="text-white/15">·</span>
          <span className="text-white/40">{p.stats.matches}{t('discoveryMatchesSuffix')}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {p.perf.trend === 'UP' && <TrendingUp className="w-2.5 h-2.5 text-vivid-green" />}
          {p.perf.trend === 'DOWN' && <TrendingDown className="w-2.5 h-2.5 text-vivid-red" />}
          {p.perf.trend === 'FLAT' && <Minus className="w-2.5 h-2.5 text-white/30" />}
          <span className="text-white/40">{p.age}{t('discoveryAgeSuffix')}</span>
        </div>
      </div>

      {/* Variant-specific indicator */}
      {variant === 'ipo' && ipoProgress !== undefined && (
        <div className="relative mt-1.5">
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden border border-divider">
            <div
              className="h-full rounded-full bg-vivid-green transition-colors duration-500"
              style={{
                width: `${Math.min(ipoProgress, 100)}%`,
                boxShadow: '0 0 8px rgba(0,230,118,0.3)',
              }}
            />
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {t('discoveryIpoSold', { pct: ipoProgress.toFixed(0) })}
          </span>
        </div>
      )}

      {variant === 'trending' && tradeCount !== undefined && (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white/60">{t('discoveryTradeCount', { count: tradeCount })}</span>
          {change24h !== undefined && (
            <span className={cn('text-[10px] font-mono font-bold', change24h >= 0 ? 'text-vivid-green' : 'text-vivid-red')}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {variant === 'deal' && (
        <div className="mt-1.5">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', vs.badgeBg, vs.badge)}>{variantLabel.deal}</span>
        </div>
      )}

      {variant === 'new' && listedAt && (
        <div className="mt-1.5">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded', vs.badgeBg, vs.badge)}>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse motion-reduce:animate-none" />
            {getRelativeTime(listedAt, ta('justNow'))}
          </span>
        </div>
      )}

      {variant === 'listing' && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/40">
          <span className="font-mono font-bold text-gold/70">{p.dpc.onMarket} Lizenzen</span>
          {listingCount !== undefined && listingCount > 1 && (
            <><span className="text-white/15">·</span><span>{t('discoverySellerCount', { count: listingCount })}</span></>
          )}
        </div>
      )}

      {/* Badge */}
      {variant === 'trending' && (
        <div className={cn('absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md', vs.badgeBg, vs.badge, vs.glow)}>
          {variantLabel[variant]}
        </div>
      )}
      {variant === 'ipo' && (
        <div className={cn('absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md', vs.badgeBg, vs.badge, vs.glow)}>
          <span className="w-1.5 h-1.5 rounded-full bg-vivid-green live-ring" />
          {variantLabel[variant]}
        </div>
      )}
      {variantLabel[variant] && variant !== 'trending' && variant !== 'ipo' && variant !== 'new' && variant !== 'listing' && (
        <div className={cn('absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md', vs.badgeBg, vs.badge, vs.glow)}>
          {variantLabel[variant]}
        </div>
      )}

      {/* Buy button */}
      {onBuy && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
          disabled={buying}
          className="mt-2 w-full py-2 min-h-[44px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-xs font-black hover:bg-gold/20 hover:btn-gold-glow transition-colors active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {buying ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
        </button>
      )}
    </Link>
  );
}
