'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, PiggyBank, Tag, ShoppingCart } from 'lucide-react';
import type { Pos, PlayerStatus, Player } from '@/types';
import { getClub } from '@/lib/clubs';
import { cn, fmtScout } from '@/lib/utils';

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
    <span className={cn('inline-flex items-center justify-center rounded-xl border font-black', posBadgeClasses[pos], sizes[size])}>
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
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-black', statusClasses[status])}>
      <AlertTriangle className="size-3.5" />
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
  const tp = useTranslations('player');
  const scoreTooltips: Record<string, string> = { L5: tp('l5Tooltip'), L15: tp('l15Tooltip') };
  const tone = value >= L5_THRESHOLDS.good ? 'good' : value >= L5_THRESHOLDS.mid ? 'mid' : value > 0 ? 'bad' : 'neutral';
  return (
    <div
      className={cn('rounded-full border flex flex-col items-center justify-center', toneClasses[tone])}
      style={{ width: size, height: size }}
      title={scoreTooltips[label] ?? label}
    >
      <div className="text-[10px] font-black opacity-70 leading-none">{label}</div>
      <div className="text-base font-black leading-none mt-1 tabular-nums">{Math.round(value)}</div>
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

  const coords = values.map((v, i) => ({
    x: 2 + (i * (width - 4)) / (values.length - 1),
    y: 2 + (1 - norm(v)) * (height - 4),
  }));

  const pts = coords.map(c => `${c.x},${c.y}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  const color = up ? '#00E676' : '#FF3B69';
  const last = coords[coords.length - 1];
  const gradId = `spark-${up ? 'up' : 'dn'}`;

  // Area fill polygon: line points + bottom-right + bottom-left
  const areaPts = `${pts} ${coords[coords.length - 1].x},${height} ${coords[0].x},${height}`;

  return (
    <svg width={width} height={height} className="opacity-90">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r="2" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
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
        className={cn('rounded-full overflow-hidden shrink-0 border', borderColor, className)}
        style={{ width: s, height: s }}
      >
        <img src={imageUrl} alt={`${first} ${last}`} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-full shrink-0 border bg-white/[0.06] flex items-center justify-center', borderColor, className)}
      style={{ width: s, height: s }}
    >
      <span className="font-bold text-white/30" style={{ fontSize: `${size * 0.28}px` }}>
        {first[0]}{last[0]}
      </span>
    </div>
  );
}

// ============================================
// GOAL BADGE (football icon overlay for pitch nodes)
// ============================================

/** Compact goal-count badge using /goal_icon.png.
 *  - 0 goals → renders nothing
 *  - 1 goal → ball icon only
 *  - 2+ goals → ball icon with count inside
 *
 *  Usage: place in a `relative` container (e.g. wrapping PlayerPhoto)
 *  and position via className (default: bottom-right). */
export function GoalBadge({ goals, size = 18, className = '' }: {
  goals: number;
  size?: number;
  className?: string;
}) {
  if (goals <= 0) return null;

  const s = `${size / 16}rem`;

  return (
    <div
      className={cn(
        'absolute z-20 flex items-center justify-center',
        className || '-bottom-0.5 -right-0.5'
      )}
      style={{ width: s, height: s }}
      aria-label={`${goals} ${goals === 1 ? 'Tor' : 'Tore'}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/goal_icon.png"
        alt=""
        aria-hidden="true"
        className="w-full h-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
      />
      {goals >= 2 && (
        <span
          className="absolute inset-0 flex items-center justify-center font-black text-white tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
          style={{ fontSize: `${size * 0.52}px`, lineHeight: 1 }}
        >
          {goals}
        </span>
      )}
    </div>
  );
}

// ============================================
// IPO BADGE
// ============================================

export function IPOBadge({ status, progress }: { status: string; progress?: number }) {
  const tp = useTranslations('player');
  const isLive = status === 'open' || status === 'early_access';
  const isAnnounced = status === 'announced';
  if (!isLive && !isAnnounced) return null;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[11px] font-black', isLive ? 'bg-green-500/15 border-green-500/25 text-green-500' : 'bg-gold/15 border-gold/25 text-gold')}
    >
      {isLive ? tp('ipoFirstSale') : tp('ipoSoon')}
      {isLive && progress !== undefined && <span className="font-mono tabular-nums">{progress}%</span>}
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
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {/* Photo with ClubLogo overlay */}
      <div className="relative shrink-0">
        <PlayerPhoto imageUrl={player.imageUrl} first={player.first} last={player.last} pos={player.pos} size={photoSize} />
        {clubData && (
          <div
            className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-bg-main overflow-hidden bg-bg-main"
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
          <span className={cn('font-bold break-words', nameClass)}>
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
  const tp = useTranslations('player');
  const badges: React.ReactNode[] = [];
  const chipCls = size === 'md'
    ? 'px-2 py-0.5 text-[10px] font-bold rounded border'
    : 'px-1.5 py-0.5 text-[9px] font-bold rounded border';

  // 1. Status (only if not fit — duplicates StatusBadge but as inline chip)
  if (player.status === 'injured') {
    badges.push(<span key="st" className={cn('inline-flex items-center gap-0.5 bg-red-500/10 border-red-500/20 text-red-300', chipCls)}><AlertTriangle className="size-2.5" />{tp('injured')}</span>);
  } else if (player.status === 'suspended') {
    badges.push(<span key="st" className={cn('inline-flex items-center gap-0.5 bg-purple-500/10 border-purple-500/20 text-purple-300', chipCls)}>{tp('suspended')}</span>);
  } else if (player.status === 'doubtful') {
    badges.push(<span key="st" className={cn('inline-flex items-center gap-0.5 bg-yellow-500/10 border-yellow-500/20 text-yellow-300', chipCls)}>{tp('doubtful')}</span>);
  }

  // 2. Liquidated
  if (player.isLiquidated) {
    badges.push(<span key="liq" className={cn('inline-flex items-center gap-0.5 bg-red-500/10 border-red-500/20 text-red-300', chipCls)}>{tp('liquidatedBadge')}</span>);
  }

  // 3. Contract <= 12M
  if (player.contractMonthsLeft <= 12) {
    const urgent = player.contractMonthsLeft <= 6;
    badges.push(
      <span key="ctr" className={cn('inline-flex items-center gap-0.5', chipCls, urgent ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-300')}>
        {player.contractMonthsLeft}M
      </span>
    );
  }

  // 4. IPO
  if (player.ipo.status === 'open' || player.ipo.status === 'early_access') {
    badges.push(
      <span key="ipo" className={cn('inline-flex items-center gap-0.5 bg-green-500/10 border-green-500/20 text-green-500', chipCls)}>
        <ShoppingCart className="size-2.5" />{tp('newIpo', { progress: player.ipo.progress ?? 0 })}
      </span>
    );
  }

  // 5. Listed
  if (holding?.isOnTransferList) {
    badges.push(
      <span key="list" className={cn('inline-flex items-center gap-0.5 bg-sky-500/10 border-sky-400/20 text-sky-300', chipCls)}>
        <Tag className="size-2.5" />{tp('listed')}
      </span>
    );
  }

  // 6. PBT
  if (player.pbt && player.pbt.balance > 0) {
    badges.push(
      <span key="pbt" className={cn('inline-flex items-center gap-0.5 bg-gold/10 border-gold/20 text-gold/80', chipCls)}>
        <PiggyBank className="size-2.5" />PBT {fmtScout(player.pbt.balance)}
      </span>
    );
  }

  // 7. Owned (only when NOT in holding context)
  if (!holding && player.dpc.owned > 0) {
    badges.push(
      <span key="own" className={cn('inline-flex items-center gap-0.5 bg-green-500/10 border-green-500/20 text-green-500/80', chipCls)}>
        {tp('ownedBadge', { count: player.dpc.owned })}
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
  const tp = useTranslations('player');
  const floor = player.listings.length > 0
    ? Math.min(...player.listings.map(l => l.price))
    : player.prices.floor ?? 0;
  const l5 = player.perf.l5;
  const l5Color = getL5Color(l5);
  const up = player.prices.change24h >= 0;

  const kpiCls = 'text-[10px] md:text-[11px] font-mono tabular-nums';
  const labelCls = 'text-white/30 mr-0.5';

  const kpis: React.ReactNode[] = [];

  switch (context) {
    case 'portfolio': {
      const pnl = holding ? (floor - holding.avgBuyPriceBsd) * holding.quantity : 0;
      const pnlPct = holding && holding.avgBuyPriceBsd > 0 ? ((floor - holding.avgBuyPriceBsd) / holding.avgBuyPriceBsd) * 100 : 0;
      const upPnl = pnl >= 0;
      kpis.push(<span key="fl" className={cn(kpiCls, 'text-gold')}><span className={labelCls}>Floor</span>{fmtScout(floor)}</span>);
      kpis.push(
        <span key="pnl" className={cn(kpiCls, upPnl ? 'text-vivid-green' : 'text-vivid-red')}>
          <span className={labelCls}>G/V</span>{upPnl ? '+' : ''}{fmtScout(Math.round(pnl))} ({upPnl ? '+' : ''}{pnlPct.toFixed(1)}%)
        </span>
      );
      kpis.push(
        <span key="ch" className={cn(kpiCls, up ? 'text-vivid-green' : 'text-vivid-red')}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      if (holding) {
        kpis.push(<span key="qty" className={cn(kpiCls, 'text-white/60')}>{holding.quantity} DPC</span>);
        kpis.push(<span key="ek" className={cn(kpiCls, 'text-white/40')}><span className={labelCls}>EK</span>{fmtScout(holding.avgBuyPriceBsd)}</span>);
      }
      break;
    }
    case 'market':
      kpis.push(<span key="fl" className={cn(kpiCls, 'text-gold')}><span className={labelCls}>Floor</span>{fmtScout(floor)}</span>);
      kpis.push(
        <span key="ch" className={cn(kpiCls, up ? 'text-vivid-green' : 'text-vivid-red')}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      kpis.push(<span key="l5" className={cn(kpiCls, l5Color)}><span className={labelCls}>L5</span>{l5}</span>);
      if (player.dpc.onMarket > 0) kpis.push(<span key="om" className={cn(kpiCls, 'text-white/50')}>{tp('onMarketCount', { count: player.dpc.onMarket })}</span>);
      kpis.push(
        <span key="st" className={cn(kpiCls, 'text-white/50')}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-vivid-green">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      break;

    case 'lineup':
      kpis.push(<span key="l5" className={cn(kpiCls, l5Color)}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(<span key="l15" className={cn(kpiCls, 'text-white/60')}><span className={labelCls}>L15</span>{player.perf.l15}</span>);
      kpis.push(
        <span key="st" className={cn(kpiCls, 'text-white/50')}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-green-500">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      kpis.push(<span key="ctr" className={cn(kpiCls, 'text-white/40')}>{player.contractMonthsLeft}M</span>);
      kpis.push(<span key="tr" className={cn(kpiCls, 'text-white/40')}>{player.perf.trend === 'UP' ? '↑' : player.perf.trend === 'DOWN' ? '↓' : '→'}</span>);
      break;

    case 'result':
      if (score !== undefined) kpis.push(<span key="sc" className={cn(kpiCls, 'font-bold text-white')}>{score} Pkt</span>);
      kpis.push(<span key="l5" className={cn(kpiCls, l5Color)}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={cn(kpiCls, 'text-white/50')}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-green-500">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      kpis.push(
        <span key="ch" className={cn(kpiCls, up ? 'text-green-500' : 'text-red-400')}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      break;

    case 'picker':
      kpis.push(<span key="l5" className={cn(kpiCls, l5Color)}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={cn(kpiCls, 'text-white/50')}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-green-500">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      kpis.push(<span key="fl" className={cn(kpiCls, 'text-gold')}>{fmtScout(floor)}</span>);
      kpis.push(<span key="ctr" className={cn(kpiCls, 'text-white/40')}>{player.contractMonthsLeft}M</span>);
      kpis.push(<span key="tr" className={cn(kpiCls, 'text-white/40')}>{player.perf.trend === 'UP' ? '↑' : player.perf.trend === 'DOWN' ? '↓' : '→'}</span>);
      break;

    case 'ipo':
      kpis.push(<span key="pr" className={cn(kpiCls, 'text-gold font-bold')}>{fmtScout(ipoData?.price ?? player.ipo.price ?? 0)}</span>);
      if (ipoData) {
        kpis.push(<span key="pg" className={cn(kpiCls, 'text-green-500')}>{ipoData.progress.toFixed(0)}%</span>);
        if (ipoData.remaining != null) kpis.push(<span key="rem" className={cn(kpiCls, 'text-white/50')}>{tp('ipoRemainingCount', { count: fmtScout(ipoData.remaining) })}</span>);
      }
      kpis.push(<span key="l5" className={cn(kpiCls, l5Color)}><span className={labelCls}>L5</span>{l5}</span>);
      break;

    case 'search':
      kpis.push(<span key="fl" className={cn(kpiCls, 'text-gold')}>{fmtScout(floor)}</span>);
      kpis.push(<span key="l5" className={cn(kpiCls, l5Color)}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={cn(kpiCls, 'text-white/50')}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-green-500">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      break;

    default: // 'default'
      kpis.push(<span key="fl" className={cn(kpiCls, 'text-gold')}><span className={labelCls}>Floor</span>{fmtScout(floor)}</span>);
      kpis.push(
        <span key="ch" className={cn(kpiCls, up ? 'text-green-500' : 'text-red-400')}>
          {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
        </span>
      );
      kpis.push(<span key="l5" className={cn(kpiCls, l5Color)}><span className={labelCls}>L5</span>{l5}</span>);
      kpis.push(
        <span key="st" className={cn(kpiCls, 'text-white/50')}>
          {player.stats.matches}<span className="text-white/20">/</span>
          <span className="text-green-500">{player.stats.goals}</span><span className="text-white/20">/</span>
          <span className="text-sky-300">{player.stats.assists}</span>
        </span>
      );
      if (player.dpc.onMarket > 0) kpis.push(<span key="om" className={cn(kpiCls, 'text-white/50')}>{tp('onMarketCount', { count: player.dpc.onMarket })}</span>);
      break;
  }

  if (kpis.length === 0) return null;
  return <div className="flex items-center gap-2 flex-wrap">{kpis}</div>;
}

