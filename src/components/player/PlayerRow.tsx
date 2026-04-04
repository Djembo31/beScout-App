'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  Loader2,
  Target,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Player, Pos } from '@/types';
import { cn, fmtScout, countryToFlag } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import {
  MiniSparkline, PlayerPhoto, getL5Color, getL5Hex, getL5Bg,
  PlayerIdentity, PlayerBadgeStrip, PlayerKPIs,
  type HoldingData, type IpoDisplayData, type PlayerContext,
} from './index';

// ============================================
// SHARED DESIGN TOKENS — Single Source: positionColors.ts
// ============================================

export { posColors, posTintColors, posCardBg, posGlowShadows } from './positionColors';
import { posColors, posTintColors, posCardBg, posGlowShadows } from './positionColors';

/** Returns true if a hex color is too dark to read on a dark background */
const isColorDark = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.4;
};

const getFloor = (p: Player) =>
  p.listings.length > 0 ? Math.min(...p.listings.map((l) => l.price)) : p.prices.floor ?? p.prices.referencePrice ?? 0;

// ============================================
// TRIKOT BADGE (Shared)
// ============================================

export function TrikotBadge({ number, pos, club, size = 'sm' }: { number: number; pos: Pos; club?: string; size?: 'sm' | 'lg' }) {
  const c = posColors[pos];
  const clubData = club ? getClub(club) : null;
  const isLg = size === 'lg';

  if (clubData?.colors) {
    const { primary, secondary } = clubData.colors;
    return (
      <div
        className={cn('relative flex items-center justify-center shrink-0', isLg ? 'size-14 rounded-2xl border-2' : 'size-8 rounded-lg border')}
        style={{ backgroundColor: `${primary}33`, borderColor: `${primary}66` }}
      >
        <svg viewBox="0 0 24 24" className={cn('absolute opacity-30', isLg ? 'size-10' : 'size-6')} style={{ color: primary }}>
          <path fill="currentColor" d="M16.21 3L12 7.21 7.79 3H2v6l4 3v9h12v-9l4-3V3h-5.79zM6 7V5h2.29L12 8.71 15.71 5H18v2l-4 3v8H10v-8l-4-3z" />
        </svg>
        <span className={cn('relative font-mono font-black', isLg ? 'text-xl' : 'text-sm')} style={{ color: isColorDark(secondary) ? '#FFFFFF' : secondary }}>{number}</span>
      </div>
    );
  }

  return (
    <div className={cn('relative flex items-center justify-center shrink-0', isLg ? 'size-14 rounded-2xl border-2' : 'size-8 rounded-lg border', c.bg, c.border)}>
      <svg viewBox="0 0 24 24" className={cn('absolute opacity-30', isLg ? 'size-10' : 'size-6', c.text)}>
        <path fill="currentColor" d="M16.21 3L12 7.21 7.79 3H2v6l4 3v9h12v-9l4-3V3h-5.79zM6 7V5h2.29L12 8.71 15.71 5H18v2l-4 3v8H10v-8l-4-3z" />
      </svg>
      <span className={cn('relative font-mono font-black', isLg ? 'text-xl' : 'text-sm', c.text)}>{number}</span>
    </div>
  );
}

// ============================================
// CONTRACT HELPER (Shared)
// ============================================

export function getContractInfo(monthsLeft: number) {
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + monthsLeft);
  const dateStr = endDate.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
  let color = 'text-white/60';
  let urgent = false;
  if (monthsLeft <= 6) { color = 'text-red-400'; urgent = true; }
  else if (monthsLeft <= 12) { color = 'text-orange-400'; }
  return { dateStr, monthsLeft, color, urgent };
}

// ============================================
// SUCCESS FEE HELPER (Shared)
// ============================================

export type SuccessFeeTier = { minValue: number; maxValue: number; fee: number; label: string };

// Fee per DPC (in cents) scales with market value so that
// 10x market-value growth ≈ 10x reward on IPO price.
// Formula: fee ≈ representative_market_value / 10  (same ratio as IPO pricing)
export const SUCCESS_FEE_TIERS: SuccessFeeTier[] = [
  { minValue: 0, maxValue: 100000, fee: 5000, label: '< 100K' },
  { minValue: 100000, maxValue: 300000, fee: 20000, label: '100K-300K' },
  { minValue: 300000, maxValue: 500000, fee: 40000, label: '300K-500K' },
  { minValue: 500000, maxValue: 1000000, fee: 75000, label: '500K-1M' },
  { minValue: 1000000, maxValue: 2000000, fee: 150000, label: '1M-2M' },
  { minValue: 2000000, maxValue: 5000000, fee: 350000, label: '2M-5M' },
  { minValue: 5000000, maxValue: 10000000, fee: 750000, label: '5M-10M' },
  { minValue: 10000000, maxValue: 20000000, fee: 1500000, label: '10M-20M' },
  { minValue: 20000000, maxValue: 50000000, fee: 3500000, label: '20M-50M' },
  { minValue: 50000000, maxValue: Infinity, fee: 7500000, label: '> 50M' },
];

export const getSuccessFeeTier = (marketValue: number): SuccessFeeTier =>
  SUCCESS_FEE_TIERS.find(t => marketValue >= t.minValue && marketValue < t.maxValue) || SUCCESS_FEE_TIERS[0];


// ════════════════════════════════════════════
//
//  PLAYER DISPLAY
//  Ein Component, 2 Varianten:
//
//  compact → Horizontale Zeile (~55px)
//  card    → Kompakte Karte (~170px)
//
// ════════════════════════════════════════════

export type PlayerDisplayVariant = 'compact' | 'card';

// HoldingData + IpoDisplayData are now defined in ./index.tsx — re-export for backward compatibility
export type { HoldingData, IpoDisplayData } from './index';

interface PlayerDisplayProps {
  player: Player;
  variant?: PlayerDisplayVariant;
  context?: PlayerContext;
  holding?: HoldingData;
  ipoData?: IpoDisplayData;
  isWatchlisted?: boolean;
  onWatch?: () => void;
  onBuy?: (playerId: string) => void;
  buying?: boolean;
  rank?: number;
  showSparkline?: boolean;
  showActions?: boolean;
  className?: string;
}

// ── Main Component ──────────────────────────

export const PlayerDisplay = React.memo(function PlayerDisplay({
  player,
  variant = 'card',
  context: explicitContext,
  holding,
  ipoData,
  isWatchlisted,
  onWatch,
  onBuy,
  buying,
  rank,
  showSparkline = false,
  showActions = true,
  className = '',
}: PlayerDisplayProps) {

  const tp = useTranslations('player');

  // Auto-detect context if not explicitly set
  const context: PlayerContext = explicitContext
    ?? (holding ? 'portfolio' : ipoData ? 'ipo' : 'default');

  const floor = getFloor(player);
  const up = player.prices.change24h >= 0;
  const isIPO = ipoData != null || player.ipo.status === 'open' || player.ipo.status === 'early_access';

  // Watchlist button helper
  const watchBtn = onWatch ? (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(); }}
      className={cn('p-1 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center', isWatchlisted ? 'text-gold' : 'text-white/25 hover:text-white/50')}
    >
      <Star className="size-3.5" fill={isWatchlisted ? 'currentColor' : 'none'} />
    </button>
  ) : null;

  // Buy button helper
  const buyBtn = showActions && onBuy ? (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(player.id); }}
      disabled={buying}
      className="py-1.5 px-3 min-h-[44px] bg-gold text-black text-xs font-bold rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
    >
      {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : <Target className="size-3" />}
      {buying ? tp('recruitingBtn') : tp('recruitBtn')}
    </button>
  ) : null;

  // ─── COMPACT ────────────────────────────────
  if (variant === 'compact') {
    return (
      <Link
        href={`/player/${player.id}`}
        className={cn('block p-3 rounded-xl bg-surface-minimal border-2 card-lift group', className)}
        style={{
          borderColor: posTintColors[player.pos],
          backgroundImage: `linear-gradient(to right, transparent 50%, ${posTintColors[player.pos]}15)`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {watchBtn}
            {rank !== undefined && (
              <span className="text-xs font-mono text-white/25 w-5 text-right shrink-0">{rank}.</span>
            )}
            <PlayerIdentity player={player} size="md" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PlayerKPIs player={player} context={context} holding={holding} ipoData={ipoData} />
            {showSparkline && player.prices.history7d && (
              <MiniSparkline values={player.prices.history7d} width={56} height={20} />
            )}
            <div className="hidden md:block">{buyBtn}</div>
          </div>
        </div>
        <div className="pl-[50px] mt-1">
          <PlayerBadgeStrip player={player} holding={holding} />
        </div>
      </Link>
    );
  }

  // ─── CARD (~170px) — Carbon + Gold FIFA UT ──
  const cardFlag = player.country ? countryToFlag(player.country) : '';

  return (
    <Link
      href={`/player/${player.id}`}
      className={cn('block relative rounded-xl overflow-hidden card-lift card-carbon-mini card-gold-frame card-metallic', className)}
    >
      {/* Header: Identity + L5 + Flag + Watch */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <PlayerIdentity player={player} size="md" />
          <div className="flex items-center gap-1.5 shrink-0">
            {cardFlag && <span className="text-sm leading-none">{cardFlag}</span>}
            <div className={cn('font-mono font-bold text-sm tabular-nums', getL5Color(player.perf.l5))}>
              {player.perf.l5}
            </div>
            {watchBtn}
          </div>
        </div>
      </div>

      {/* Gold Divider */}
      <div className="gold-separator mx-3" />

      {/* Price + KPIs + Badges */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-black text-gold text-lg gold-glow tabular-nums">
              {ipoData ? fmtScout(ipoData.price) : fmtScout(floor)}
            </span>
            <span className="text-white/30 text-[10px]">Credits</span>
            {!ipoData && (
              <span className={cn('text-[10px] font-mono font-bold ml-1 tabular-nums', up ? 'text-green-500' : 'text-red-400')}>
                {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
              </span>
            )}
          </div>
          {player.prices.history7d && !ipoData && (
            <MiniSparkline values={player.prices.history7d} width={48} height={18} />
          )}
        </div>
        <PlayerBadgeStrip player={player} holding={holding} />
      </div>

      {/* Context KPIs + Action */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between">
          <PlayerKPIs player={player} context={context} holding={holding} ipoData={ipoData} />
          {buyBtn}
        </div>
      </div>

      {/* Footer: BeScout micro-logo */}
      <div className="flex justify-center pb-2">
        <Image src="/logo_schrift.svg" alt="BeScout" width={60} height={10} className="h-2.5 w-auto logo-veredelt" />
      </div>
    </Link>
  );
});
