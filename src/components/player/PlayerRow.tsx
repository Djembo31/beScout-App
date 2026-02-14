'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Star,
  PiggyBank,
  AlertTriangle,
  Tag,
  ShoppingCart,
  Loader2,
  Target,
  MessageSquare,
} from 'lucide-react';
import type { Player, Pos, DpcHolding } from '@/types';
import { fmtBSD } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { PositionBadge, StatusBadge, MiniSparkline } from './index';

// ============================================
// SHARED DESIGN TOKENS
// ============================================

export const posColors: Record<Pos, { bg: string; border: string; text: string }> = {
  GK: { bg: 'bg-emerald-500/20', border: 'border-emerald-400/30', text: 'text-emerald-200' },
  DEF: { bg: 'bg-amber-500/20', border: 'border-amber-400/30', text: 'text-amber-200' },
  MID: { bg: 'bg-sky-500/20', border: 'border-sky-400/30', text: 'text-sky-200' },
  ATT: { bg: 'bg-rose-500/20', border: 'border-rose-400/30', text: 'text-rose-200' },
};

export const posTintColors: Record<Pos, string> = {
  GK: '#34d399',   // emerald-400
  DEF: '#fbbf24',  // amber-400
  MID: '#38bdf8',  // sky-400
  ATT: '#fb7185',  // rose-400
};

const getPerfColor = (l5: number) =>
  l5 >= 65 ? 'text-emerald-300' : l5 >= 45 ? 'text-amber-300' : l5 > 0 ? 'text-red-300' : 'text-white/50';

/** Returns true if a hex color is too dark to read on a dark background */
const isColorDark = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.4;
};

const getFloor = (p: Player) =>
  p.listings.length > 0 ? Math.min(...p.listings.map((l) => l.price)) : p.prices.floor ?? 0;

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
        className={`relative ${isLg ? 'w-14 h-14 rounded-2xl border-2' : 'w-8 h-8 rounded-lg border'} flex items-center justify-center shrink-0`}
        style={{ backgroundColor: `${primary}33`, borderColor: `${primary}66` }}
      >
        <svg viewBox="0 0 24 24" className={`absolute ${isLg ? 'w-10 h-10' : 'w-6 h-6'} opacity-30`} style={{ color: primary }}>
          <path fill="currentColor" d="M16.21 3L12 7.21 7.79 3H2v6l4 3v9h12v-9l4-3V3h-5.79zM6 7V5h2.29L12 8.71 15.71 5H18v2l-4 3v8H10v-8l-4-3z" />
        </svg>
        <span className={`relative font-mono font-black ${isLg ? 'text-xl' : 'text-sm'}`} style={{ color: isColorDark(secondary) ? '#FFFFFF' : secondary }}>{number}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${isLg ? 'w-14 h-14 rounded-2xl border-2' : 'w-8 h-8 rounded-lg border'} ${c.bg} ${c.border} flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 24 24" className={`absolute ${isLg ? 'w-10 h-10' : 'w-6 h-6'} ${c.text} opacity-30`}>
        <path fill="currentColor" d="M16.21 3L12 7.21 7.79 3H2v6l4 3v9h12v-9l4-3V3h-5.79zM6 7V5h2.29L12 8.71 15.71 5H18v2l-4 3v8H10v-8l-4-3z" />
      </svg>
      <span className={`relative font-mono font-black ${isLg ? 'text-xl' : 'text-sm'} ${c.text}`}>{number}</span>
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

type SuccessFeeTier = { minValue: number; maxValue: number; fee: number; label: string };

const SUCCESS_FEE_TIERS: SuccessFeeTier[] = [
  { minValue: 0, maxValue: 100000, fee: 2500, label: '< 100K' },
  { minValue: 100000, maxValue: 300000, fee: 5000, label: '100K-300K' },
  { minValue: 300000, maxValue: 500000, fee: 8000, label: '300K-500K' },
  { minValue: 500000, maxValue: 1000000, fee: 12000, label: '500K-1M' },
  { minValue: 1000000, maxValue: 2000000, fee: 20000, label: '1M-2M' },
  { minValue: 2000000, maxValue: 5000000, fee: 35000, label: '2M-5M' },
  { minValue: 5000000, maxValue: 10000000, fee: 60000, label: '5M-10M' },
  { minValue: 10000000, maxValue: 20000000, fee: 100000, label: '10M-20M' },
  { minValue: 20000000, maxValue: 50000000, fee: 200000, label: '20M-50M' },
  { minValue: 50000000, maxValue: Infinity, fee: 300000, label: '> 50M' },
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

export interface HoldingData {
  quantity: number;
  avgBuyPriceBsd: number;
  isOnTransferList?: boolean;
  hasActiveIpo?: boolean;
  purchasedAt?: string;
}

export interface IpoDisplayData {
  status: string;
  progress: number;
  price: number;
  remaining?: number;
  totalOffered?: number;
  endsAt?: number;
}

interface PlayerDisplayProps {
  player: Player;
  variant?: PlayerDisplayVariant;
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

// ── Indicator Chips (card only) ─────────────

function IndicatorChips({ player, holding }: { player: Player; holding?: HoldingData }) {
  const chips: React.ReactNode[] = [];

  // PBT > 0
  if (player.pbt && player.pbt.balance > 0) {
    chips.push(
      <span key="pbt" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded text-[9px] font-bold text-[#FFD700]/80">
        <PiggyBank className="w-2.5 h-2.5" />
        PBT {fmtBSD(player.pbt.balance)}
      </span>
    );
  }

  // Contract <= 12M
  if (player.contractMonthsLeft <= 12) {
    const urgent = player.contractMonthsLeft <= 6;
    chips.push(
      <span key="contract" className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${urgent ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-300'}`}>
        <AlertTriangle className="w-2.5 h-2.5" />
        {player.contractMonthsLeft}M
      </span>
    );
  }

  // Owned > 0 (only when NOT in holding context)
  if (!holding && player.dpc.owned > 0) {
    chips.push(
      <span key="owned" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded text-[9px] font-bold text-[#22C55E]/80">
        Du: {player.dpc.owned}
      </span>
    );
  }

  // On transfer list
  if (holding?.isOnTransferList) {
    chips.push(
      <span key="listed" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-500/10 border border-sky-400/20 rounded text-[9px] font-bold text-sky-300">
        <Tag className="w-2.5 h-2.5" />
        Gelistet
      </span>
    );
  }

  // Active IPO
  if (holding?.hasActiveIpo || (player.ipo.status === 'open' || player.ipo.status === 'early_access')) {
    chips.push(
      <span key="ipo" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/10 border border-purple-400/20 rounded text-[9px] font-bold text-purple-300">
        <ShoppingCart className="w-2.5 h-2.5" />
        IPO
      </span>
    );
  }

  if (chips.length === 0) return null;
  return <div className="flex items-center gap-1 flex-wrap">{chips}</div>;
}

// ── Main Component ──────────────────────────

export const PlayerDisplay = React.memo(function PlayerDisplay({
  player,
  variant = 'card',
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

  const floor = getFloor(player);
  const up = player.prices.change24h >= 0;
  const isIPO = ipoData != null || player.ipo.status === 'open' || player.ipo.status === 'early_access';
  const useTrikot = player.ticket > 0;

  // Club mini-badge helper
  const clubData = getClub(player.club);

  // ─── COMPACT ────────────────────────────────
  if (variant === 'compact') {
    // Holding context: show qty, avgBuy, floor, P&L, L5 bar, stats
    if (holding) {
      const pnl = (floor - holding.avgBuyPriceBsd) * holding.quantity;
      const pnlPct = holding.avgBuyPriceBsd > 0 ? ((floor - holding.avgBuyPriceBsd) / holding.avgBuyPriceBsd) * 100 : 0;
      const upPnl = pnl >= 0;
      const l5 = player.perf.l5;
      const l5Color = l5 >= 70 ? '#22C55E' : l5 >= 50 ? '#FBBF24' : l5 > 0 ? '#F87171' : '#555';
      const l5Bg = l5 >= 70 ? 'bg-emerald-500/15' : l5 >= 50 ? 'bg-amber-500/15' : l5 > 0 ? 'bg-red-500/15' : 'bg-white/5';

      return (
        <Link
          href={`/player/${player.id}`}
          className={`
            block p-3 rounded-xl
            bg-white/[0.02] border-2
            hover:bg-white/[0.04] transition-all group
            ${className}
          `}
          style={{ borderColor: posTintColors[player.pos] }}
        >
          {/* Row 1: Identity + Holding data */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {useTrikot ? (
                <TrikotBadge number={player.ticket} pos={player.pos} club={player.club} />
              ) : (
                <PositionBadge pos={player.pos} size="sm" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm truncate group-hover:text-[#FFD700] transition-colors">
                    {player.first} {player.last}
                  </span>
                  {useTrikot && <PositionBadge pos={player.pos} size="sm" />}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                  {clubData?.logo ? (
                    <img src={clubData.logo} alt={player.club} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                  ) : clubData ? (
                    <span className="inline-block w-3.5 h-3.5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: clubData.colors.primary }} />
                  ) : null}
                  <span className="truncate">
                    {useTrikot && <span className="font-mono text-white/30">#{player.ticket}</span>}{useTrikot && ' · '}
                    {player.club}
                    {player.age > 0 && <> · {player.age}J.</>}
                    {player.league && <> · {player.league}</>}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Qty + EK */}
              <div className="hidden sm:block text-right text-[11px] font-mono">
                <div className="text-white/70">{holding.quantity} DPC</div>
                <div className="text-white/40">EK {fmtBSD(holding.avgBuyPriceBsd)}</div>
              </div>

              {/* Floor */}
              <div className="text-right min-w-[60px]">
                <div className="font-mono font-bold text-sm text-[#FFD700]">
                  {fmtBSD(floor)}
                </div>
                <div className="text-[10px] text-white/30">Floor</div>
              </div>

              {/* P&L */}
              <div className="text-right min-w-[70px]">
                <div className={`font-mono font-bold text-sm ${upPnl ? 'text-[#22C55E]' : 'text-red-400'}`}>
                  {upPnl ? '+' : ''}{fmtBSD(Math.round(pnl))}
                </div>
                <div className={`text-[10px] font-mono ${upPnl ? 'text-[#22C55E]/60' : 'text-red-400/60'}`}>
                  {upPnl ? '+' : ''}{pnlPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: L5 Score + Bar + Stats (Sorare-inspired) */}
          <div className="flex items-center gap-2.5 mt-2 pl-[42px]">
            {/* L5 Score Pill */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${l5Bg}`}>
              <span className="text-[9px] font-bold text-white/50">L5</span>
              <span className="font-mono font-black text-xs" style={{ color: l5Color }}>{l5}</span>
            </div>

            {/* L5 Segmented Bar (5 segments) */}
            <div className="flex items-center gap-[2px] shrink-0">
              {[0, 1, 2, 3, 4].map(i => {
                const segThreshold = (i + 1) * 20;
                const filled = l5 >= segThreshold;
                const partial = !filled && l5 > i * 20;
                return (
                  <div key={i} className="w-3 h-2 rounded-[2px] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {(filled || partial) && (
                      <div
                        className="h-full rounded-[2px]"
                        style={{
                          width: filled ? '100%' : `${((l5 - i * 20) / 20) * 100}%`,
                          backgroundColor: l5Color,
                          opacity: filled ? 1 : 0.6,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <span className="hidden sm:block w-px h-3 bg-white/10" />

            {/* Stats Pills */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                <span className="text-white/30 mr-0.5">Sp</span>{player.stats.matches}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/8 text-emerald-300/80">
                <span className="text-emerald-300/40 mr-0.5">T</span>{player.stats.goals}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/8 text-sky-300/80">
                <span className="text-sky-300/40 mr-0.5">A</span>{player.stats.assists}
              </span>
            </div>
          </div>
        </Link>
      );
    }

    // IPO context: show IPO status/progress/price
    if (ipoData) {
      const statusLabel = ipoData.status === 'live' || ipoData.status === 'Live' ? 'Live' :
        ipoData.status === 'early_access' || ipoData.status === 'Vorkaufsrecht' ? 'Vorkauf' :
        ipoData.status === 'announced' || ipoData.status === 'Angekündigt' ? 'Soon' : ipoData.status;

      return (
        <Link
          href={`/player/${player.id}`}
          className={`
            flex items-center justify-between gap-3 p-3 rounded-xl
            bg-white/[0.02] border-2
            hover:bg-white/[0.04] transition-all group
            ${className}
          `}
          style={{ borderColor: posTintColors[player.pos] }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {onWatch && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(); }}
                className={`p-1 rounded-lg transition-colors shrink-0 ${isWatchlisted ? 'text-[#FFD700]' : 'text-white/25 hover:text-white/50'}`}
              >
                <Star className="w-3.5 h-3.5" fill={isWatchlisted ? 'currentColor' : 'none'} />
              </button>
            )}
            {useTrikot ? (
              <TrikotBadge number={player.ticket} pos={player.pos} club={player.club} />
            ) : (
              <PositionBadge pos={player.pos} size="sm" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm truncate group-hover:text-[#FFD700] transition-colors">
                  {player.first} {player.last}
                </span>
                {useTrikot && <PositionBadge pos={player.pos} size="sm" />}
                <StatusBadge status={player.status} />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-white/40 truncate">
                {clubData?.logo ? (
                  <img src={clubData.logo} alt={player.club} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                ) : clubData ? (
                  <span className="inline-block w-3.5 h-3.5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: clubData.colors.primary }} />
                ) : null}
                <span className="truncate">
                  {player.club}
                  {player.age > 0 && <> · {player.age}J.</>}
                  {player.league && <> · {player.league}</>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-white/50">{player.stats.matches}</span>
              <span className="text-white/20">/</span>
              <span className="text-[#22C55E]">{player.stats.goals}</span>
              <span className="text-white/20">/</span>
              <span className="text-sky-300">{player.stats.assists}</span>
            </div>

            {/* L5 */}
            <div className={`hidden sm:block font-mono font-bold text-sm ${getPerfColor(player.perf.l5)}`}>
              {player.perf.l5}
            </div>

            {/* IPO Status */}
            <div className="text-right min-w-[80px]">
              <div className="text-[10px] font-bold text-[#22C55E]">
                IPO {statusLabel} {ipoData.progress.toFixed(0)}%
              </div>
              {ipoData.remaining != null && (
                <div className="text-[9px] text-white/30">{fmtBSD(ipoData.remaining)} verf.</div>
              )}
            </div>

            {/* Price */}
            <div className="text-right min-w-[60px]">
              <div className="font-mono font-bold text-sm text-[#FFD700]">
                {fmtBSD(ipoData.price)}
              </div>
              <div className="text-[10px] text-white/30">BSD</div>
            </div>
          </div>
        </Link>
      );
    }

    // Default compact: stats + L5 + sparkline + floor + change%
    return (
      <Link
        href={`/player/${player.id}`}
        className={`
          flex items-center justify-between gap-3 p-3 rounded-xl
          bg-white/[0.02] border-2
          hover:bg-white/[0.04] transition-all group
          ${className}
        `}
        style={{ borderColor: posTintColors[player.pos] }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {onWatch && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(); }}
              className={`p-1 rounded-lg transition-colors shrink-0 ${isWatchlisted ? 'text-[#FFD700]' : 'text-white/25 hover:text-white/50'}`}
            >
              <Star className="w-3.5 h-3.5" fill={isWatchlisted ? 'currentColor' : 'none'} />
            </button>
          )}
          {rank !== undefined && (
            <span className="text-xs font-mono text-white/25 w-5 text-right shrink-0">{rank}.</span>
          )}
          {useTrikot ? (
            <TrikotBadge number={player.ticket} pos={player.pos} club={player.club} />
          ) : (
            <PositionBadge pos={player.pos} size="sm" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate group-hover:text-[#FFD700] transition-colors">
                {player.first} {player.last}
              </span>
              {useTrikot && <PositionBadge pos={player.pos} size="sm" />}
              <StatusBadge status={player.status} />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/40 truncate">
              {clubData?.logo ? (
                <img src={clubData.logo} alt={player.club} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
              ) : clubData ? (
                <span className="inline-block w-3.5 h-3.5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: clubData.colors.primary }} />
              ) : null}
              <span className="truncate">
                {player.club}
                {player.age > 0 && <> · {player.age}J.</>}
                {player.league && <> · {player.league}</>}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Inline Stats */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-white/50">{player.stats.matches}</span>
            <span className="text-white/20">/</span>
            <span className="text-[#22C55E]">{player.stats.goals}</span>
            <span className="text-white/20">/</span>
            <span className="text-sky-300">{player.stats.assists}</span>
          </div>

          {/* L5 Score */}
          <div className={`hidden sm:block font-mono font-bold text-sm ${getPerfColor(player.perf.l5)}`}>
            {player.perf.l5}
          </div>

          {showSparkline && player.prices.history7d && (
            <MiniSparkline values={player.prices.history7d} width={56} height={20} />
          )}

          {/* Price */}
          <div className="text-right min-w-[70px]">
            <div className="font-mono font-bold text-sm text-white/90">
              {isIPO ? player.ipo.price : floor} <span className="text-white/30 text-[10px]">BSD</span>
            </div>
            {isIPO ? (
              <div className="text-[11px] font-mono text-[#22C55E]">IPO · {player.ipo.progress}%</div>
            ) : (
              <div className={`text-[11px] font-mono font-bold ${up ? 'text-[#22C55E]' : 'text-red-400'}`}>
                {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
              </div>
            )}
          </div>

          {/* Buy button */}
          {showActions && onBuy && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(player.id); }}
              disabled={buying}
              className="hidden md:flex py-1.5 px-3 bg-[#FFD700] text-black text-xs font-bold rounded-lg hover:bg-[#FFD700]/90 transition-all items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {buying ? 'Kaufe...' : 'Verpflichten'}
            </button>
          )}
        </div>
      </Link>
    );
  }

  // ─── CARD (~170px) ──────────────────────────

  const contract = getContractInfo(player.contractMonthsLeft);

  return (
    <Link
      href={`/player/${player.id}`}
      className={`block bg-white/[0.02] border-2 rounded-xl overflow-hidden transition-all hover:bg-white/[0.04] ${className}`}
      style={{ borderColor: posTintColors[player.pos] }}
    >
      {/* Header Row */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {useTrikot ? (
              <TrikotBadge number={player.ticket} pos={player.pos} club={player.club} />
            ) : (
              <PositionBadge pos={player.pos} size="sm" />
            )}
            <div className="min-w-0">
              <div className="font-black text-sm leading-tight truncate">{player.first} {player.last}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {clubData?.logo ? (
                  <img src={clubData.logo} alt={player.club} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                ) : clubData ? (
                  <span className="inline-block w-3.5 h-3.5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: clubData.colors.primary }} />
                ) : null}
                <span className="text-[10px] text-white/40 truncate">
                  {useTrikot && <span className="font-mono text-white/30">#{player.ticket}</span>}{useTrikot && ' · '}
                  {player.club}
                  {player.age > 0 && <> · {player.age}J.</>}
                  {player.league && <> · {player.league}</>}
                </span>
                {useTrikot && <PositionBadge pos={player.pos} size="sm" />}
                <StatusBadge status={player.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* L5 Score */}
            <div className={`font-mono font-bold text-sm ${getPerfColor(player.perf.l5)}`}>
              {player.perf.l5}
            </div>
            {onWatch && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(); }}
                className={`p-1 rounded-lg transition-colors ${isWatchlisted ? 'text-[#FFD700]' : 'text-white/25 hover:text-white/50'}`}
              >
                <Star className="w-3.5 h-3.5" fill={isWatchlisted ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5 mx-3" />

      {/* Floor + Change + Indicator Chips */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-black text-[#FFD700] text-lg">
              {ipoData ? fmtBSD(ipoData.price) : fmtBSD(floor)}
            </span>
            <span className="text-white/30 text-[10px]">BSD</span>
            {!ipoData && (
              <span className={`text-[11px] font-mono font-bold ml-1 ${up ? 'text-[#22C55E]' : 'text-red-400'}`}>
                {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
              </span>
            )}
          </div>
          {player.prices.history7d && !ipoData && (
            <MiniSparkline values={player.prices.history7d} width={48} height={18} />
          )}
        </div>
        <IndicatorChips player={player} holding={holding} />
      </div>

      {/* Context Line */}
      <div className="px-3 pb-2.5">
        {holding ? (
          // Holding context
          (() => {
            const pnl = (floor - holding.avgBuyPriceBsd) * holding.quantity;
            const pnlPct = holding.avgBuyPriceBsd > 0 ? ((floor - holding.avgBuyPriceBsd) / holding.avgBuyPriceBsd) * 100 : 0;
            const upPnl = pnl >= 0;
            return (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/40">{holding.quantity} DPC · EK {fmtBSD(holding.avgBuyPriceBsd)}</span>
                <span className={`font-mono font-bold ${upPnl ? 'text-[#22C55E]' : 'text-red-400'}`}>
                  G/V: {upPnl ? '+' : ''}{fmtBSD(Math.round(pnl))} ({upPnl ? '+' : ''}{pnlPct.toFixed(1)}%)
                </span>
              </div>
            );
          })()
        ) : ipoData ? (
          // IPO context
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${ipoData.status === 'live' || ipoData.status === 'Live' ? 'text-[#22C55E]' : 'text-[#FFD700]'}`}>
                {ipoData.status === 'live' || ipoData.status === 'Live' ? 'Live' : ipoData.status} {ipoData.progress.toFixed(0)}%
              </span>
              <div className="w-16 h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFD700] rounded-full" style={{ width: `${ipoData.progress}%` }} />
              </div>
            </div>
            {ipoData.remaining != null && (
              <span className="text-white/40">{fmtBSD(ipoData.remaining)} verfügbar</span>
            )}
          </div>
        ) : (
          // Default context: market count + actions
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30">
              {player.dpc.onMarket > 0 ? `${player.dpc.onMarket} auf Markt` : 'Nicht auf Markt'}
            </span>
            {showActions && (
              <div className="flex items-center gap-1.5">
                {onBuy && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(player.id); }}
                    disabled={buying}
                    className="py-1 px-2.5 bg-[#FFD700] text-black text-[10px] font-bold rounded-lg hover:bg-[#FFD700]/90 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {buying ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Target className="w-2.5 h-2.5" />}
                    {buying ? 'Kaufe...' : 'Verpflichten'}
                  </button>
                )}
                <span className="py-1 px-2.5 bg-white/5 border border-white/10 text-[10px] font-bold rounded-lg text-white/60 flex items-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5" />
                  Details
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
});


