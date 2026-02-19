'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Shield,
} from 'lucide-react';
import { PositionBadge } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtBSD, cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import {
  StatusPill, MinutesPill, PerfPills, NextMatchBadge, MarketBadges,
} from './bestandHelpers';
import type { BestandLens } from './bestandHelpers';
import type { Player } from '@/types';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

// ============================================
// TYPES
// ============================================

export type BestandPlayer = {
  player: Player;
  quantity: number;
  avgBuyPriceBsd: number;
  floorBsd: number | null;
  ipoPriceBsd: number | null;
  valueBsd: number;
  pnlBsd: number;
  pnlPct: number;
  purchasedAt: string;
  myListings: { id: string; qty: number; priceBsd: number }[];
  listedQty: number;
  availableToSell: number;
  offers: { id: string; sender_handle: string; quantity: number; price: number }[];
  hasActiveIpo: boolean;
};

interface BestandPlayerRowProps {
  item: BestandPlayer;
  lens: BestandLens;
  minutes?: number[];
  nextFixture?: NextFixtureInfo;
  inLineup: boolean;
  onSellClick: (playerId: string) => void;
}

// ============================================
// LENS-SPECIFIC COLUMNS
// ============================================

function PerformanceCols({ item, minutes, nextFixture }: { item: BestandPlayer; minutes?: number[]; nextFixture?: NextFixtureInfo }) {
  const p = item.player;
  return (
    <>
      {/* Desktop columns */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <PerfPills l5={p.perf.l5} l15={p.perf.l15} trend={p.perf.trend} />
        <span className="text-[10px] font-mono text-white/50">
          {p.stats.matches}<span className="text-white/35">S</span>{' '}
          {p.stats.goals}<span className="text-white/35">T</span>{' '}
          {p.stats.assists}<span className="text-white/35">A</span>
        </span>
        <MinutesPill minutes={minutes} />
        <StatusPill status={p.status} />
        <NextMatchBadge fixture={nextFixture} />
      </div>
      {/* Mobile row 2 */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5">
        <PerfPills l5={p.perf.l5} l15={p.perf.l15} trend={p.perf.trend} />
        <span className="text-[10px] font-mono text-white/50">
          {p.stats.matches}<span className="text-white/35">S</span>{' '}
          {p.stats.goals}<span className="text-white/35">T</span>{' '}
          {p.stats.assists}<span className="text-white/35">A</span>
        </span>
        <MinutesPill minutes={minutes} />
        <StatusPill status={p.status} />
      </div>
    </>
  );
}

function MarktCols({ item }: { item: BestandPlayer }) {
  const pnlColor = item.pnlBsd >= 0 ? 'text-[#22C55E]' : 'text-red-300';
  const TrendIcon = item.pnlBsd > 0 ? TrendingUp : item.pnlBsd < 0 ? TrendingDown : Minus;
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono">
        <span className="text-white/50">{item.quantity}<span className="text-white/25">×</span></span>
        <span className="text-white/40">EK {fmtBSD(item.avgBuyPriceBsd)}</span>
        <span className="text-white/50">Floor {item.floorBsd != null ? fmtBSD(item.floorBsd) : '—'}</span>
        <span className="text-[#FFD700] font-bold">{fmtBSD(item.valueBsd * item.quantity)}</span>
        <span className={cn('flex items-center gap-0.5', pnlColor)}>
          <TrendIcon className="w-2.5 h-2.5" />
          {item.pnlBsd >= 0 ? '+' : ''}{fmtBSD(Math.round(item.pnlBsd))}
          <span className="text-white/30 ml-0.5">({item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%)</span>
        </span>
        <MarketBadges hasIpo={item.hasActiveIpo} listedQty={0} offerCount={0} />
      </div>
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5 text-[10px] font-mono">
        <span className="text-white/50">{item.quantity}<span className="text-white/25">×</span> EK {fmtBSD(item.avgBuyPriceBsd)}</span>
        <span className="text-[#FFD700] font-bold">{fmtBSD(item.valueBsd * item.quantity)}</span>
        <span className={cn('flex items-center gap-0.5', pnlColor)}>
          <TrendIcon className="w-2.5 h-2.5" />
          {item.pnlBsd >= 0 ? '+' : ''}{fmtBSD(Math.round(item.pnlBsd))}
        </span>
      </div>
    </>
  );
}

function HandelCols({ item }: { item: BestandPlayer }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono">
        {item.listedQty > 0 ? (
          <span className="text-[#FFD700]">{item.listedQty} gelistet</span>
        ) : (
          <span className="text-white/30">Nicht gelistet</span>
        )}
        {item.offers.length > 0 ? (
          <span className="text-sky-300">{item.offers.length} Angebot{item.offers.length > 1 ? 'e' : ''}</span>
        ) : (
          <span className="text-white/30">Kein Angebot</span>
        )}
        <span className="text-white/50">{item.availableToSell} verfügbar</span>
        <span className="text-white/50">Floor {item.floorBsd != null ? fmtBSD(item.floorBsd) : '—'}</span>
      </div>
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5 text-[10px] font-mono">
        <MarketBadges hasIpo={item.hasActiveIpo} listedQty={item.listedQty} offerCount={item.offers.length} />
        <span className="text-white/40">{item.availableToSell} verfüg.</span>
        <span className="text-white/50">Floor {item.floorBsd != null ? fmtBSD(item.floorBsd) : '—'}</span>
      </div>
    </>
  );
}

function VertragCols({ item }: { item: BestandPlayer }) {
  const p = item.player;
  const months = p.contractMonthsLeft;
  const contractColor = months <= 6 ? 'text-red-400' : months <= 12 ? 'text-orange-400' : 'text-white/60';
  const clubData = p.clubId ? getClub(p.clubId) : null;
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono">
        <span className="text-white/50">{p.age} J.</span>
        <span className="text-white/40">{p.country || '—'}</span>
        <span className={cn('font-bold', contractColor)}>{months}M</span>
        <StatusPill status={p.status} />
        <span className="text-white/40 flex items-center gap-1">
          {clubData?.logo ? (
            <img src={clubData.logo} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
          ) : clubData?.colors?.primary ? (
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: clubData.colors.primary }} />
          ) : null}
          {p.club}
        </span>
      </div>
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5 text-[10px] font-mono">
        <span className="text-white/50">{p.age} J.</span>
        <span className={cn('font-bold', contractColor)}>{months}M</span>
        <StatusPill status={p.status} />
      </div>
    </>
  );
}

// ============================================
// MAIN ROW
// ============================================

function BestandPlayerRowInner({ item, lens, minutes, nextFixture, inLineup, onSellClick }: BestandPlayerRowProps) {
  const p = item.player;
  const clubData = p.clubId ? getClub(p.clubId) : null;

  return (
    <div
      className={cn(
        'bg-white/[0.02] border border-white/[0.06] rounded-xl transition-all hover:bg-white/[0.04] border-l-2',
      )}
      style={{ borderLeftColor: posTintColors[p.pos] }}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5">
        {/* Photo 32px */}
        <Link href={`/player/${p.id}`} className="shrink-0">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[9px] font-bold text-white/30">
              {p.first[0]}{p.last[0]}
            </div>
          )}
        </Link>

        {/* Identity + Lens-specific data */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <PositionBadge pos={p.pos} size="sm" />
            <Link href={`/player/${p.id}`} className="font-bold text-xs hover:text-[#FFD700] transition-colors truncate">
              {p.first} {p.last}
            </Link>
            {clubData?.logo ? (
              <img src={clubData.logo} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
            ) : clubData?.colors?.primary ? (
              <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: clubData.colors.primary }} />
            ) : null}
            <span className="text-[10px] text-white/40 hidden sm:inline">{p.club}</span>
            {inLineup && <span className="shrink-0" title="In Aufstellung"><Shield className="w-3 h-3 text-[#22C55E]" /></span>}
          </div>

          {/* Lens columns */}
          {lens === 'performance' && <PerformanceCols item={item} minutes={minutes} nextFixture={nextFixture} />}
          {lens === 'markt' && <MarktCols item={item} />}
          {lens === 'handel' && <HandelCols item={item} />}
          {lens === 'vertrag' && <VertragCols item={item} />}
        </div>

        {/* Right: Value (markt lens shows in cols) + Sell Button */}
        <div className="shrink-0 flex items-center gap-2">
          {lens === 'performance' && (
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono font-bold text-[#FFD700]">{fmtBSD(item.valueBsd * item.quantity)}</div>
              <div className={cn('text-[9px] font-mono', item.pnlBsd >= 0 ? 'text-[#22C55E]' : 'text-red-300')}>
                {item.pnlBsd >= 0 ? '+' : ''}{fmtBSD(Math.round(item.pnlBsd))}
              </div>
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSellClick(p.id); }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#FFD700] hover:border-[#FFD700]/20 hover:bg-[#FFD700]/5 transition-all"
            title="Verkaufen"
          >
            <DollarSign className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const BestandPlayerRow = memo(BestandPlayerRowInner);
