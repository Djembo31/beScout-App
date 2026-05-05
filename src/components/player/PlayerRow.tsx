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
import { computePlayerFloor } from '@/lib/playerMath';
import { getClub } from '@/lib/clubs';
import {
  MiniSparkline, PlayerPhoto, getL5Color, getL5Hex, getL5Bg, fmtPerfL5, getL5ColorWithMatches,
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

const getFloor = computePlayerFloor; // Slice 052: DRY extraction

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
// SUCCESS FEE HELPER (Shared) — Slice 108 Linear Formula
// ============================================
//
// CEO Pricing-Asset-Model (Anil 2026-04-20, Sivasspor-DB-verifiziert):
//   fee_per_card_cents = MV_EUR / 10
//   1 Mio € MV → 100.000 cents = 1.000 $SCOUT = 10 €/Card (Bekir-Baseline)
//   Bei voll 10.000 Cards ergibt sich automatisch 10% Community-Pool
//
// RPC-SYNC: MUSS mit liquidate_player SQL-Migration 20260420210000 matchen.
// Siehe worklog/specs/108-liquidate-player-linear-formula.md

export type SuccessFeeTier = { minValue: number; maxValue: number; fee: number; label: string };

/**
 * Lineare CEO-Formel: Payout pro Card in cents = MV_EUR / 10.
 * Matched `liquidate_player` RPC exakt.
 */
export const calcSuccessFee = (marketValueEur: number): number => {
  if (!Number.isFinite(marketValueEur) || marketValueEur <= 0) return 0;
  return Math.floor(marketValueEur / 10);
};

// Bucket-Definition für Ladder-UI (RewardsTab). Fees werden dynamisch aus calcSuccessFee(minValue) abgeleitet.
const SUCCESS_FEE_BUCKETS: ReadonlyArray<Omit<SuccessFeeTier, 'fee'>> = [
  { minValue: 0, maxValue: 100_000, label: '< 100K' },
  { minValue: 100_000, maxValue: 300_000, label: '100K-300K' },
  { minValue: 300_000, maxValue: 500_000, label: '300K-500K' },
  { minValue: 500_000, maxValue: 1_000_000, label: '500K-1M' },
  { minValue: 1_000_000, maxValue: 2_000_000, label: '1M-2M' },
  { minValue: 2_000_000, maxValue: 5_000_000, label: '2M-5M' },
  { minValue: 5_000_000, maxValue: 10_000_000, label: '5M-10M' },
  { minValue: 10_000_000, maxValue: 20_000_000, label: '10M-20M' },
  { minValue: 20_000_000, maxValue: 50_000_000, label: '20M-50M' },
  { minValue: 50_000_000, maxValue: Infinity, label: '> 50M' },
];

// Ladder-Array für UI — fee am Bucket-Einstieg (Milestone-Visualization).
export const SUCCESS_FEE_TIERS: SuccessFeeTier[] = SUCCESS_FEE_BUCKETS.map(b => ({
  ...b,
  fee: calcSuccessFee(b.minValue),
}));

/**
 * Für gegebenen MV: Bucket-Metadaten + echte lineare Fee für diesen MV.
 * Admin-UI Liquidation-Preview nutzt das → zeigt exakten RPC-Payout an.
 */
export const getSuccessFeeTier = (marketValue: number): SuccessFeeTier => {
  const bucket = SUCCESS_FEE_BUCKETS.find(b => marketValue >= b.minValue && marketValue < b.maxValue) ?? SUCCESS_FEE_BUCKETS[0];
  return { ...bucket, fee: calcSuccessFee(marketValue) };
};


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
            <div className={cn('font-mono font-bold text-sm tabular-nums', getL5ColorWithMatches(player.perf.l5, player.stats.matches))}>
              {fmtPerfL5(player.perf.l5, player.stats.matches)}
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
