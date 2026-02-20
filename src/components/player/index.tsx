'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, PiggyBank, Tag, ShoppingCart } from 'lucide-react';
import type { Pos, PlayerStatus, Player } from '@/types';
import { getClub } from '@/lib/clubs';
import { fmtScout } from '@/lib/utils';

// ============================================
// L5 COLOR TOKENS (Single Source of Truth)
// ============================================

/** Canonical L5 color thresholds — use EVERYWHERE for consistency.
 *  ≥65 = good (emerald), ≥45 = mid (amber), >0 = bad (red), 0 = neutral */
export const L5_THRESHOLDS = { good: 65, mid: 45 } as const;

/** Returns a Tailwind text-color class for an L5 score */
export function getL5Color(l5: number): string {
  if (l5 >= L5_THRESHOLDS.good) return 'text-emerald-300';
  if (l5 >= L5_THRESHOLDS.mid) return 'text-amber-300';
  if (l5 > 0) return 'text-red-300';
  return 'text-white/50';
}

/** Returns a hex color string for L5 (used in inline styles, e.g. SVG fill) */
export function getL5Hex(l5: number): string {
  if (l5 >= L5_THRESHOLDS.good) return '#6ee7b7'; // emerald-300
  if (l5 >= L5_THRESHOLDS.mid) return '#fcd34d';  // amber-300
  if (l5 > 0) return '#fca5a5';                    // red-300
  return '#555';
}

/** Returns a Tailwind bg class for L5 pill backgrounds */
export function getL5Bg(l5: number): string {
  if (l5 >= L5_THRESHOLDS.good) return 'bg-emerald-500/15';
  if (l5 >= L5_THRESHOLDS.mid) return 'bg-amber-500/15';
  if (l5 > 0) return 'bg-red-500/15';
  return 'bg-white/5';
}

// ============================================
// POSITION BADGE
// ============================================

const posBadgeClasses: Record<Pos, string> = {
  GK: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200',
  DEF: 'bg-amber-500/15 border-amber-400/25 text-amber-200',
  MID: 'bg-sky-500/15 border-sky-400/25 text-sky-200',
  ATT: 'bg-rose-500/15 border-rose-400/25 text-rose-200',
};

export function PositionBadge({ pos, size = 'md' }: { pos: Pos; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'px-1.5 py-0.5 text-[10px]', md: 'px-2 py-1 text-[11px]', lg: 'px-3 py-1.5 text-xs' };
  return (
    <span className={`inline-flex items-center justify-center rounded-xl border font-black ${posBadgeClasses[pos]} ${sizes[size]}`}>
      {pos}
    </span>
  );
}

// ============================================
// STATUS BADGE
// ============================================

const statusClasses: Record<PlayerStatus, string> = {
  fit: 'bg-green-500/15 text-green-300 border-green-500/25',
  injured: 'bg-red-500/15 text-red-300 border-red-500/25',
  suspended: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  doubtful: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
};

export function StatusBadge({ status }: { status: PlayerStatus }) {
  if (status === 'fit') return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-black ${statusClasses[status]}`}>
      <AlertTriangle className="w-3.5 h-3.5" />
      {status.toUpperCase()}
    </span>
  );
}

// ============================================
// SCORE CIRCLE
// ============================================

const toneClasses = {
  good: 'border-emerald-400/25 bg-emerald-500/12 text-emerald-200',
  mid: 'border-amber-400/25 bg-amber-500/12 text-amber-200',
  bad: 'border-rose-400/25 bg-rose-500/12 text-rose-200',
  neutral: 'border-white/10 bg-white/5 text-white/70',
};

export function ScoreCircle({ label, value, size = 48 }: { label: string; value: number; size?: number }) {
  const tone = value >= L5_THRESHOLDS.good ? 'good' : value >= L5_THRESHOLDS.mid ? 'mid' : value > 0 ? 'bad' : 'neutral';
  return (
    <div
      className={`rounded-full border flex flex-col items-center justify-center ${toneClasses[tone]}`}
      style={{ width: size, height: size }}
    >
      <div className="text-[10px] font-black opacity-70 leading-none">{label}</div>
      <div className="text-base font-black leading-none mt-1">{Math.round(value)}</div>
    </div>
  );
}

// ============================================
// MINI SPARKLINE
// ============================================

export function MiniSparkline({ values, width = 100, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  const pts = values
    .map((v, i) => {
      const x = 2 + (i * (width - 4)) / (values.length - 1);
      const y = 2 + (1 - norm(v)) * (height - 4);
      return `${x},${y}`;
    })
    .join(' ');

  const up = values[values.length - 1] >= values[0];

  return (
    <svg width={width} height={height} className="opacity-80">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={up ? 'text-[#22C55E]' : 'text-red-400'}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================
// PLAYER PHOTO (Unified avatar — use EVERYWHERE)
// ============================================

/** Consistent player photo with fallback hierarchy:
 *  1. Image (if imageUrl exists) → rounded circle
 *  2. Initials (first+last) → colored circle
 *  Always: position-tinted border, configurable size */
export function PlayerPhoto({ imageUrl, first, last, pos, size = 32, className = '' }: {
  imageUrl?: string | null;
  first: string;
  last: string;
  pos: Pos;
  size?: number;
  className?: string;
}) {
  const borderColor = {
    GK: 'border-emerald-400/40',
    DEF: 'border-amber-400/40',
    MID: 'border-sky-400/40',
    ATT: 'border-rose-400/40',
  }[pos];

  const s = `${size / 16}rem`;

  if (imageUrl) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 border ${borderColor} ${className}`}
        style={{ width: s, height: s }}
      >
        <img src={imageUrl} alt={`${first} ${last}`} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full shrink-0 border ${borderColor} bg-white/[0.06] flex items-center justify-center ${className}`}
      style={{ width: s, height: s }}
    >
      <span className="font-bold text-white/30" style={{ fontSize: `${size * 0.28}px` }}>
        {first[0]}{last[0]}
      </span>
    </div>
  );
}

// ============================================
// IPO BADGE
// ============================================

export function IPOBadge({ status, progress }: { status: string; progress?: number }) {
  const isLive = status === 'open' || status === 'early_access';
  const isAnnounced = status === 'announced';
  if (!isLive && !isAnnounced) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[11px] font-black ${isLive ? 'bg-[#22C55E]/15 border-[#22C55E]/25 text-[#22C55E]' : 'bg-[#FFD700]/15 border-[#FFD700]/25 text-[#FFD700]'
        }`}
    >
      {isLive ? 'LIVE IPO' : 'SOON'}
      {isLive && progress !== undefined && <span className="font-mono">{progress}%</span>}
    </span>
  );
}

// ============================================
// PLAYER CONTEXT TYPE
// ============================================

export type PlayerContext = 'portfolio' | 'market' | 'lineup' | 'result' | 'picker' | 'ipo' | 'search' | 'default';

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

// ============================================
// PLAYER IDENTITY (Sacred — never changes)
// ============================================

/** The sacred identity row — always the same everywhere.
 *  Photo (with club-logo overlay) + Name + PosBadge + StatusBadge + Meta line */
export function PlayerIdentity({ player, size = 'md', showMeta = true, showStatus = true, className = '' }: {
  player: Pick<Player, 'first' | 'last' | 'pos' | 'status' | 'club' | 'clubId' | 'ticket' | 'age' | 'imageUrl' | 'league'>;
  size?: 'sm' | 'md' | 'lg';
  showMeta?: boolean;
  showStatus?: boolean;
  className?: string;
}) {
  const photoSize = size === 'sm' ? 32 : size === 'md' ? 40 : 48;
  const clubLogoSize = size === 'sm' ? 14 : 16;
  const nameClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const posBadgeSize = size === 'lg' ? 'md' as const : 'sm' as const;
  const clubData = getClub(player.club);
  const useTrikot = player.ticket > 0;

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {/* Photo with ClubLogo overlay */}
      <div className="relative shrink-0">
        <PlayerPhoto imageUrl={player.imageUrl} first={player.first} last={player.last} pos={player.pos} size={photoSize} />
        {clubData && (
          <div
            className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-[#0a0a0a] overflow-hidden bg-[#0a0a0a]"
            style={{ width: clubLogoSize, height: clubLogoSize }}
          >
            {clubData.logo ? (
              <img src={clubData.logo} alt={player.club} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full rounded-full border border-white/10" style={{ backgroundColor: clubData.colors.primary }} />
            )}
          </div>
        )}
      </div>

      {/* Name + Meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-bold ${nameClass} break-words`}>
            {player.first} {player.last}
          </span>
          <PositionBadge pos={player.pos} size={posBadgeSize} />
          {showStatus && <StatusBadge status={player.status} />}
        </div>
        {showMeta && (
          <div className="flex items-center gap-1 text-[10px] md:text-[11px] text-white/40">
            <span className="truncate">
              {player.club}
              {useTrikot && <> · <span className="font-mono text-white/30">#{player.ticket}</span></>}
              {player.age > 0 && <> · {player.age}J.</>}
              {player.league && <> · {player.league}</>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// PLAYER BADGE STRIP (Priority-ordered badges)
// ============================================

/** Priority-ordered badge strip. Shows max N badges. */
export function PlayerBadgeStrip({ player, holding, maxBadges = 4, size = 'sm' }: {
  player: Pick<Player, 'status' | 'isLiquidated' | 'contractMonthsLeft' | 'ipo' | 'dpc' | 'pbt'>;
  holding?: HoldingData;
  maxBadges?: number;
  size?: 'sm' | 'md';
}) {
  const badges: React.ReactNode[] = [];
  const chipCls = size === 'md'
    ? 'px-2 py-0.5 text-[10px] font-bold rounded border'
    : 'px-1.5 py-0.5 text-[9px] font-bold rounded border';

  // 1. Status (only if not fit — duplicates StatusBadge but as inline chip)
  if (player.status === 'injured') {
    badges.push(<span key="st" className={`inline-flex items-center gap-0.5 ${chipCls} bg-red-500/10 border-red-500/20 text-red-300`}><AlertTriangle className="w-2.5 h-2.5" />Verletzt</span>);
  } else if (player.status === 'suspended') {
    badges.push(<span key="st" className={`inline-flex items-center gap-0.5 ${chipCls} bg-purple-500/10 border-purple-500/20 text-purple-300`}>Gesperrt</span>);
  } else if (player.status === 'doubtful') {
    badges.push(<span key="st" className={`inline-flex items-center gap-0.5 ${chipCls} bg-yellow-500/10 border-yellow-500/20 text-yellow-300`}>Fraglich</span>);
  }

  // 2. Liquidated
  if (player.isLiquidated) {
    badges.push(<span key="liq" className={`inline-flex items-center gap-0.5 ${chipCls} bg-red-500/10 border-red-500/20 text-red-300`}>LIQUIDIERT</span>);
  }

  // 3. Contract <= 12M
  if (player.contractMonthsLeft <= 12) {
    const urgent = player.contractMonthsLeft <= 6;
    badges.push(
      <span key="ctr" className={`inline-flex items-center gap-0.5 ${chipCls} ${urgent ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-300'}`}>
        {player.contractMonthsLeft}M
      </span>
    );
  }

  // 4. IPO
  if (player.ipo.status === 'open' || player.ipo.status === 'early_access') {
    badges.push(
      <span key="ipo" className={`inline-flex items-center gap-0.5 ${chipCls} bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]`}>
        <ShoppingCart className="w-2.5 h-2.5" />IPO {player.ipo.progress ?? 0}%
      </span>
    );
  }

  // 5. Listed
  if (holding?.isOnTransferList) {
    badges.push(
      <span key="list" className={`inline-flex items-center gap-0.5 ${chipCls} bg-sky-500/10 border-sky-400/20 text-sky-300`}>
        <Tag className="w-2.5 h-2.5" />Gelistet
      </span>
    );
  }

  // 6. PBT
  if (player.pbt && player.pbt.balance > 0) {
    badges.push(
      <span key="pbt" className={`inline-flex items-center gap-0.5 ${chipCls} bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700]/80`}>
        <PiggyBank className="w-2.5 h-2.5" />PBT {fmtScout(player.pbt.balance)}
      </span>
    );
  }

  // 7. Owned (only when NOT in holding context)
  if (!holding && player.dpc.owned > 0) {
    badges.push(
      <span key="own" className={`inline-flex items-center gap-0.5 ${chipCls} bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]/80`}>
        Du: {player.dpc.owned}
      </span>
    );
  }

  if (badges.length === 0) return null;
  return <div className="flex items-center gap-1 flex-wrap mt-1">{badges.slice(0, maxBadges)}</div>;
}

// ============================================
// PLAYER KPIs (Context-dependent metrics)
// ============================================

/** Context-dependent KPI strip — 4-5 metrics based on context */
export function PlayerKPIs({ player, context = 'default', holding, ipoData, score, rank }: {
  player: Pick<Player, 'perf' | 'prices' | 'stats' | 'dpc' | 'ipo' | 'contractMonthsLeft' | 'listings'>;
  context?: PlayerContext;
  holding?: HoldingData;
  ipoData?: IpoDisplayData;
  score?: number;
  rank?: number;
}) {
  const floor = player.listings.length > 0
    ? Math.min(...player.listings.map(l => l.price))
    : player.prices.floor ?? 0;
  const l5 = player.perf.l5;
  const l5Color = getL5Color(l5);
  const up = player.prices.change24h >= 0;

  const kpiCls = 'text-[10px] md:text-[11px] font-mono';
  const labelCls = 'text-white/30 mr-0.5';

  const kpis: React.ReactNode[] = [];

  switch (context) {
    case 'portfolio': {
      const pnl = holding ? (floor - holding.avgBuyPriceBsd) * holding.quantity : 0;
      const pnlPct = holding && holding.avgBuyPriceBsd > 0 ? ((floor - holding.avgBuyPriceBsd) / holding.avgBuyPriceBsd) * 100 : 0;
      const upPnl = pnl >= 0;
      kpis.push(<span key="fl" className={`${kpiCls} text-[#FFD700]`}><span className={labelCls}>Floor</span>{fmtScout(floor)}</span>);
      kpis.push(
        <span key="pnl" className={`${kpiCls} ${upPnl ? 'text-[#22C55E]' : 'text-red-400'}`}>
          <span className={labelCls}>G/V</span>{upPnl ? '+' : ''}{fmtScout(Math.round(pnl))} ({upPnl ? '+' : ''}{pnlPct.toFixed(1)}%)
        </span>
      );
      kpis.push(
        <span key="ch" className={`${kpiCls} ${up ? 'text-[#22C55E]' : 'text-red-400'}`}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      if (holding) {
        kpis.push(<span key="qty" className={`${kpiCls} text-white/60`}>{holding.quantity} DPC</span>);
        kpis.push(<span key="ek" className={`${kpiCls} text-white/40`}><span className={labelCls}>EK</span>{fmtScout(holding.avgBuyPriceBsd)}</span>);
      }
      break;
    }
    case 'market':
      kpis.push(<span key="fl" className={`${kpiCls} text-[#FFD700]`}><span className={labelCls}>Floor</span>{fmtScout(floor)}</span>);
      kpis.push(
        <span key="ch" className={`${kpiCls} ${up ? 'text-[#22C55E]' : 'text-red-400'}`}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      kpis.push(<span key="l5" className={`${kpiCls} ${l5Color}`}><span className={labelCls}>L5</span>{l5}</span>);
      if (player.dpc.onMarket > 0) kpis.push(<span key="om" className={`${kpiCls} text-white/50`}>{player.dpc.onMarket} am Markt</span>);
      kpis.push(
        <span key="st" className={`${kpiCls} text-white/50`}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-[#22C55E]">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      break;

    case 'lineup':
      kpis.push(<span key="l5" className={`${kpiCls} ${l5Color}`}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(<span key="l15" className={`${kpiCls} text-white/60`}><span className={labelCls}>L15</span>{player.perf.l15}</span>);
      kpis.push(
        <span key="st" className={`${kpiCls} text-white/50`}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-[#22C55E]">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      kpis.push(<span key="ctr" className={`${kpiCls} text-white/40`}>{player.contractMonthsLeft}M</span>);
      kpis.push(<span key="tr" className={`${kpiCls} text-white/40`}>{player.perf.trend === 'UP' ? '↑' : player.perf.trend === 'DOWN' ? '↓' : '→'}</span>);
      break;

    case 'result':
      if (score !== undefined) kpis.push(<span key="sc" className={`${kpiCls} font-bold text-white`}>{score} Pkt</span>);
      kpis.push(<span key="l5" className={`${kpiCls} ${l5Color}`}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={`${kpiCls} text-white/50`}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-[#22C55E]">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      kpis.push(
        <span key="ch" className={`${kpiCls} ${up ? 'text-[#22C55E]' : 'text-red-400'}`}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      break;

    case 'picker':
      kpis.push(<span key="l5" className={`${kpiCls} ${l5Color}`}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={`${kpiCls} text-white/50`}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-[#22C55E]">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      kpis.push(<span key="fl" className={`${kpiCls} text-[#FFD700]`}>{fmtScout(floor)}</span>);
      kpis.push(<span key="ctr" className={`${kpiCls} text-white/40`}>{player.contractMonthsLeft}M</span>);
      kpis.push(<span key="tr" className={`${kpiCls} text-white/40`}>{player.perf.trend === 'UP' ? '↑' : player.perf.trend === 'DOWN' ? '↓' : '→'}</span>);
      break;

    case 'ipo':
      kpis.push(<span key="pr" className={`${kpiCls} text-[#FFD700] font-bold`}>{fmtScout(ipoData?.price ?? player.ipo.price ?? 0)}</span>);
      if (ipoData) {
        kpis.push(<span key="pg" className={`${kpiCls} text-[#22C55E]`}>{ipoData.progress.toFixed(0)}%</span>);
        if (ipoData.remaining != null) kpis.push(<span key="rem" className={`${kpiCls} text-white/50`}>{fmtScout(ipoData.remaining)} verf.</span>);
      }
      kpis.push(<span key="l5" className={`${kpiCls} ${l5Color}`}><span className={labelCls}>L5</span>{l5}</span>);
      break;

    case 'search':
      kpis.push(<span key="fl" className={`${kpiCls} text-[#FFD700]`}>{fmtScout(floor)}</span>);
      kpis.push(<span key="l5" className={`${kpiCls} ${l5Color}`}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={`${kpiCls} text-white/50`}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-[#22C55E]">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      break;

    default: // 'default'
      kpis.push(<span key="fl" className={`${kpiCls} text-[#FFD700]`}><span className={labelCls}>Floor</span>{fmtScout(floor)}</span>);
      kpis.push(
        <span key="ch" className={`${kpiCls} ${up ? 'text-[#22C55E]' : 'text-red-400'}`}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      kpis.push(<span key="l5" className={`${kpiCls} ${l5Color}`}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={`${kpiCls} text-white/50`}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-[#22C55E]">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      if (player.dpc.onMarket > 0) kpis.push(<span key="om" className={`${kpiCls} text-white/50`}>{player.dpc.onMarket} am Markt</span>);
      break;
  }

  if (kpis.length === 0) return null;
  return <div className="flex items-center gap-2 flex-wrap">{kpis}</div>;
}

