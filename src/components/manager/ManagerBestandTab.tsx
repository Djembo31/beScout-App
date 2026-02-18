'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Filter, ChevronDown, ChevronUp, X, ArrowUpDown,
  Package, Tag, MessageSquare, Loader2, Trash2, DollarSign,
  TrendingUp, TrendingDown, Minus, AlertCircle,
  Shield, Clock, Heart, AlertTriangle, HelpCircle,
  ExternalLink, Calendar, Rocket,
} from 'lucide-react';
import { Card, Button, SearchInput, PosFilter, EmptyState } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { posColors } from '@/components/player/PlayerRow';
import { fmtBSD, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getClub } from '@/lib/clubs';
import type { Player, Pos, PlayerStatus, DbIpo, OfferWithDetails } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import type { NextFixtureInfo } from '@/lib/services/fixtures';
import { useRecentMinutes, useNextFixtures, usePlayerEventUsage } from '@/lib/queries/managerData';
import SponsorBanner from '@/components/player/detail/SponsorBanner';

// ============================================
// TYPES
// ============================================

interface ManagerBestandTabProps {
  players: Player[];
  holdings: HoldingWithPlayer[];
  ipoList: DbIpo[];
  userId: string | undefined;
  incomingOffers: OfferWithDetails[];
  onSell: (playerId: string, quantity: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
}

type BestandPlayer = {
  player: Player;
  quantity: number;
  avgBuyPriceBsd: number;
  floorBsd: number | null;       // null = kein Listing & keine IPO → nicht frei kaufbar
  ipoPriceBsd: number | null;    // IPO-Preis wenn aktive IPO existiert
  valueBsd: number;              // Bewertung: floor > ipoPrice > EK (Fallback-Kette)
  pnlBsd: number;
  pnlPct: number;
  purchasedAt: string;
  myListings: { id: string; qty: number; priceBsd: number }[];
  listedQty: number;
  availableToSell: number;
  offers: OfferWithDetails[];
  hasActiveIpo: boolean;
};

type SortOption = 'name' | 'value_desc' | 'l5' | 'date' | 'pnl_desc' | 'pnl_asc';
type ExpandTab = 'overview' | 'sell';

const FEE_RATE = 0.06;

// ============================================
// STATUS HELPERS
// ============================================

const STATUS_CONFIG: Record<PlayerStatus, { label: string; short: string; bg: string; border: string; text: string; icon: typeof Heart }> = {
  fit: { label: 'Fit', short: 'Fit', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/20', text: 'text-[#22C55E]', icon: Heart },
  injured: { label: 'Verletzt', short: 'Verl.', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: AlertTriangle },
  suspended: { label: 'Gesperrt', short: 'Gesp.', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
  doubtful: { label: 'Fraglich', short: 'Fragl.', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: HelpCircle },
};

function StatusPill({ status }: { status: PlayerStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border', cfg.bg, cfg.border, cfg.text)}>
      <Icon className="w-2.5 h-2.5" />
      <span className="hidden sm:inline">{cfg.short}</span>
    </span>
  );
}

// ============================================
// MINUTES HELPERS
// ============================================

function MinutesPill({ minutes }: { minutes: number[] | undefined }) {
  if (!minutes || minutes.length === 0) {
    return <span className="text-[10px] text-white/30 font-mono">—&apos;</span>;
  }
  const avg = Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length);
  const color = avg >= 75 ? 'text-[#22C55E]' : avg >= 45 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={cn('text-[10px] font-mono font-bold', color)}>
      ∅{avg}&apos;
    </span>
  );
}

function MinutesBar({ minutes }: { minutes: number[] }) {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {minutes.slice(0, 5).map((m, i) => {
        const pct = Math.min(100, (m / 90) * 100);
        const color = m >= 75 ? 'bg-[#22C55E]' : m >= 45 ? 'bg-yellow-400' : m > 0 ? 'bg-red-400' : 'bg-white/10';
        return (
          <div key={i} className="w-2.5 rounded-sm relative group" style={{ height: `${Math.max(2, pct)}%` }}>
            <div className={cn('w-full h-full rounded-sm', color)} />
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// PERF TREND
// ============================================

function PerfPills({ l5, l15, trend }: { l5: number; l15: number; trend: string }) {
  const TrendIcon = trend === 'UP' ? TrendingUp : trend === 'DOWN' ? TrendingDown : Minus;
  const trendColor = trend === 'UP' ? 'text-[#22C55E]' : trend === 'DOWN' ? 'text-red-400' : 'text-white/40';
  const l5Color = l5 >= 70 ? 'text-[#FFD700]' : l5 >= 50 ? 'text-white' : 'text-red-300';

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('text-[11px] font-mono font-black', l5Color)}>L5 {l5}</span>
      <span className="text-[10px] font-mono text-white/40">L15 {l15}</span>
      <TrendIcon className={cn('w-3 h-3', trendColor)} />
    </div>
  );
}

// ============================================
// NEXT MATCH
// ============================================

function NextMatchBadge({ fixture }: { fixture: NextFixtureInfo | undefined }) {
  if (!fixture) return <span className="text-[10px] text-white/30">—</span>;
  return (
    <span className="text-[10px] text-white/50 font-mono">
      <span className={fixture.isHome ? 'text-[#22C55E]' : 'text-sky-300'}>
        {fixture.isHome ? 'H' : 'A'}
      </span>
      {' '}{fixture.opponentShort}
    </span>
  );
}

// ============================================
// MARKET ACTIVITY BADGE (IPO + Listed + Offers)
// ============================================

function MarketBadges({ hasIpo, listedQty, offerCount }: { hasIpo: boolean; listedQty: number; offerCount: number }) {
  const hasAny = hasIpo || listedQty > 0 || offerCount > 0;
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-1">
      {hasIpo && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/10 border border-purple-400/20 rounded text-[9px] font-bold text-purple-300" title="Aktive IPO">
          <Rocket className="w-2.5 h-2.5" />IPO
        </span>
      )}
      {listedQty > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded text-[9px] font-bold text-[#FFD700]" title="Auf Transferliste">
          <Tag className="w-2.5 h-2.5" />{listedQty}
        </span>
      )}
      {offerCount > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-500/10 border border-sky-400/20 rounded text-[9px] font-bold text-sky-300" title="Eingehende Angebote">
          <MessageSquare className="w-2.5 h-2.5" />{offerCount}
        </span>
      )}
    </div>
  );
}

// ============================================
// INLINE SELL FORM (kept from original)
// ============================================

function SellForm({ item, onSell }: {
  item: BestandPlayer;
  onSell: (playerId: string, qty: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
}) {
  const [qty, setQty] = useState(1);
  const [priceBsd, setPriceBsd] = useState('');
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const priceNum = parseFloat(priceBsd) || 0;
  const gross = qty * priceNum;
  const fee = gross * FEE_RATE;
  const net = gross - fee;
  const isValid = qty > 0 && qty <= item.availableToSell && priceNum > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSelling(true);
    setError(null);
    setSuccess(null);
    const priceCents = Math.round(priceNum * 100);
    const result = await onSell(item.player.id, qty, priceCents);
    if (result.success) {
      setSuccess(`${qty}× für ${fmtBSD(priceNum)} BSD gelistet`);
      setPriceBsd('');
      setQty(1);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(result.error || 'Fehler');
    }
    setSelling(false);
  };

  const setQuickPrice = (multiplier: number) => {
    const base = (item.floorBsd != null && item.floorBsd > 0) ? item.floorBsd : item.avgBuyPriceBsd;
    setPriceBsd((base * multiplier).toFixed(2));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-1.5 py-2 text-white/40 hover:text-white text-sm font-bold">−</button>
          <span className="w-6 text-center text-sm font-mono font-bold">{qty}</span>
          <button onClick={() => setQty(Math.min(item.availableToSell, qty + 1))} className="px-1.5 py-2 text-white/40 hover:text-white text-sm font-bold">+</button>
        </div>
        <div className="relative flex-1">
          <input type="number" step="0.01" min="0.01" value={priceBsd} onChange={(e) => setPriceBsd(e.target.value)}
            placeholder="Preis pro DPC"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25 pr-12" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-bold">BSD</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-white/25 mr-1">Schnellwahl:</span>
        {item.floorBsd != null && item.floorBsd > 0 && (
          <button onClick={() => setQuickPrice(1)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#FFD700] hover:border-[#FFD700]/20 transition-all">
            Floor {fmtBSD(item.floorBsd)}
          </button>
        )}
        <button onClick={() => setQuickPrice(1.05)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#22C55E] hover:border-[#22C55E]/20 transition-all">+5%</button>
        <button onClick={() => setQuickPrice(1.10)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#22C55E] hover:border-[#22C55E]/20 transition-all">+10%</button>
        <button onClick={() => setQuickPrice(1.20)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#22C55E] hover:border-[#22C55E]/20 transition-all">+20%</button>
      </div>
      {priceNum > 0 && (
        <div className="flex items-center gap-4 text-[11px] font-mono bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2">
          <span className="text-white/40">Brutto: <span className="text-white/70">{fmtBSD(gross)}</span></span>
          <span className="text-white/40">Gebühr: <span className="text-red-300/70">−{fmtBSD(fee)}</span> <span className="text-white/20">(6%)</span></span>
          <span className="text-white/40">Netto: <span className="text-[#FFD700] font-bold">{fmtBSD(net)}</span></span>
        </div>
      )}
      <Button onClick={handleSubmit} disabled={!isValid || selling} variant="gold" className="w-full">
        {selling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Tag className="w-4 h-4 mr-2" />}
        {selling ? 'Wird gelistet...' : `${qty}× für ${priceNum > 0 ? fmtBSD(priceNum) : '–'} BSD listen`}
      </Button>
      {error && <div className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</div>}
      {success && <div className="text-xs text-[#22C55E] font-bold">{success}</div>}
    </div>
  );
}

// ============================================
// PLAYER CARD (MANAGER-STYLE)
// ============================================

function PlayerCard({ item, isExpanded, onToggle, onSell, onCancelOrder, minutes, nextFixture, inLineup }: {
  item: BestandPlayer;
  isExpanded: boolean;
  onToggle: () => void;
  onSell: (playerId: string, qty: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  minutes: number[] | undefined;
  nextFixture: NextFixtureInfo | undefined;
  inLineup: boolean;
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [expandTab, setExpandTab] = useState<ExpandTab>('overview');
  const p = item.player;
  const pnlColor = item.pnlBsd >= 0 ? 'text-[#22C55E]' : 'text-red-300';
  const TrendIcon = item.pnlBsd > 0 ? TrendingUp : item.pnlBsd < 0 ? TrendingDown : Minus;

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    await onCancelOrder(orderId);
    setCancellingId(null);
  };

  return (
    <div className={cn(
      'bg-white/[0.02] border rounded-2xl transition-all overflow-hidden border-l-2',
      posColors[p.pos].border,
      isExpanded ? 'border-[#FFD700]/20 border-l-2 shadow-[0_0_20px_rgba(255,215,0,0.05)]' : 'border-white/[0.06] hover:border-white/10'
    )} style={{ borderLeftColor: p.pos === 'GK' ? '#34d399' : p.pos === 'DEF' ? '#fbbf24' : p.pos === 'MID' ? '#38bdf8' : '#fb7185' }}>

      {/* ── Closed Card (Manager KPIs) ── */}
      <button onClick={onToggle} className="w-full px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 text-left">
        {/* Player Photo */}
        <div className="shrink-0">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-bold text-white/30">
              {p.first[0]}{p.last[0]}
            </div>
          )}
        </div>

        {/* Identity + Club + Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <PositionBadge pos={p.pos} size="sm" />
            <span className="text-[10px] font-mono text-white/50">#{p.ticket}</span>
            <Link href={`/player/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-sm hover:text-[#FFD700] transition-colors truncate">
              {p.first} {p.last}
            </Link>
            {inLineup && (
              <span className="shrink-0" title="In aktiver Aufstellung">
                <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {(() => {
              const clubData = p.clubId ? getClub(p.clubId) : null;
              return clubData?.logo ? (
                <img src={clubData.logo} alt={p.club} className="w-4 h-4 rounded-full object-cover shrink-0" />
              ) : clubData?.colors?.primary ? (
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: clubData.colors.primary }} />
              ) : null;
            })()}
            <span className="text-[11px] text-white/60 font-semibold">{p.club}</span>
            <span className="text-[10px] text-white/40 font-mono">{p.age} J.</span>
            <StatusPill status={p.status} />
            <MarketBadges hasIpo={item.hasActiveIpo} listedQty={item.listedQty} offerCount={item.offers.length} />
          </div>
        </div>

        {/* Manager KPIs (center) — hidden on small mobile */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <PerfPills l5={p.perf.l5} l15={p.perf.l15} trend={p.perf.trend} />
          <span className="text-[10px] font-mono text-white/50" title="Spiele / Tore / Assists">
            {p.stats.matches}<span className="text-white/35">S</span>{' '}
            {p.stats.goals}<span className="text-white/35">T</span>{' '}
            {p.stats.assists}<span className="text-white/35">A</span>
          </span>
          <MinutesPill minutes={minutes} />
          <NextMatchBadge fixture={nextFixture} />
        </div>

        {/* Finance (right) */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-[10px] text-white/35 font-mono">{item.quantity}×</span>
            <span className="text-sm font-mono font-bold text-[#FFD700]">{fmtBSD(item.valueBsd * item.quantity)}</span>
          </div>
          <div className={cn('text-[10px] font-mono flex items-center justify-end gap-0.5', pnlColor)}>
            <TrendIcon className="w-2.5 h-2.5" />
            {item.pnlBsd >= 0 ? '+' : ''}{fmtBSD(Math.round(item.pnlBsd))}
            <span className="text-white/30 ml-0.5 hidden sm:inline">({item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%)</span>
          </div>
          <div className="text-[9px] font-mono text-white/35 mt-0.5 hidden sm:flex items-center gap-2 justify-end">
            <span>EK {fmtBSD(item.avgBuyPriceBsd)}</span>
            <span className="text-white/20">|</span>
            <span>VK {fmtBSD(p.prices.lastTrade)}</span>
            {item.floorBsd != null && (
              <>
                <span className="text-white/20">|</span>
                <span>Floor {fmtBSD(item.floorBsd)}</span>
              </>
            )}
          </div>
          {/* Liquiditäts-Hinweis wenn kein Floor und keine IPO */}
          {item.floorBsd == null && !item.hasActiveIpo && (
            <div className="text-[8px] text-orange-400/60 mt-0.5 hidden sm:block">Kein Angebot</div>
          )}
        </div>

        {/* Expand Toggle */}
        <div className="shrink-0 ml-0.5">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#FFD700]/50" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
        </div>
      </button>

      {/* Mobile KPIs strip (below name, visible only on small screens) */}
      {!isExpanded && (
        <div className="md:hidden flex items-center gap-3 px-3 pb-2 -mt-1 flex-wrap">
          <PerfPills l5={p.perf.l5} l15={p.perf.l15} trend={p.perf.trend} />
          <span className="text-[10px] font-mono text-white/50">
            {p.stats.matches}<span className="text-white/35">S</span>{' '}
            {p.stats.goals}<span className="text-white/35">T</span>{' '}
            {p.stats.assists}<span className="text-white/35">A</span>
          </span>
          <MinutesPill minutes={minutes} />
          <NextMatchBadge fixture={nextFixture} />
          <span className="text-[9px] font-mono text-white/35">EK {fmtBSD(item.avgBuyPriceBsd)} <span className="text-white/20">|</span> VK {fmtBSD(p.prices.lastTrade)}</span>
        </div>
      )}

      {/* ── Expanded View (Tabbed) ── */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] anim-dropdown">
          {/* Tab Switcher */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setExpandTab('overview')}
              className={cn('flex-1 py-2.5 text-xs font-bold text-center transition-all',
                expandTab === 'overview' ? 'text-[#FFD700] border-b-2 border-[#FFD700]' : 'text-white/40 hover:text-white/60'
              )}
            >Übersicht</button>
            <button
              onClick={() => setExpandTab('sell')}
              className={cn('flex-1 py-2.5 text-xs font-bold text-center transition-all',
                expandTab === 'sell' ? 'text-[#FFD700] border-b-2 border-[#FFD700]' : 'text-white/40 hover:text-white/60',
                (item.listedQty > 0 || item.offers.length > 0) && expandTab !== 'sell' && 'text-sky-300'
              )}
            >
              Verkaufen
              {(item.listedQty + item.offers.length) > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-white/10 rounded-full">{item.listedQty + item.offers.length}</span>
              )}
            </button>
          </div>

          {/* ── Tab: Übersicht ── */}
          {expandTab === 'overview' && (
            <div className="p-4 space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* L5 */}
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider">L5 Score</div>
                  <div className={cn('text-lg font-black font-mono', p.perf.l5 >= 70 ? 'text-[#FFD700]' : p.perf.l5 >= 50 ? 'text-white' : 'text-red-300')}>
                    {p.perf.l5}
                  </div>
                </div>
                {/* L15 */}
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider">L15 Score</div>
                  <div className="text-lg font-black font-mono text-white/70">{p.perf.l15}</div>
                </div>
                {/* Minutes */}
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider">Minuten (L5)</div>
                  {minutes && minutes.length > 0 ? (
                    <div className="flex items-end gap-2 mt-1">
                      <MinutesBar minutes={minutes} />
                      <span className="text-xs font-mono font-bold text-white/60">
                        ∅{Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length)}&apos;
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-white/20 mt-1">Keine Daten</div>
                  )}
                </div>
                {/* Status */}
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider">Status</div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusPill status={p.status} />
                    <span className="text-xs text-white/40">{STATUS_CONFIG[p.status].label}</span>
                  </div>
                </div>
              </div>

              {/* Next Match + Ownership */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Next Match */}
                <div className="bg-white/[0.03] rounded-xl px-3 py-2.5 flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-white/30 shrink-0" />
                  {nextFixture ? (
                    <div>
                      <div className="text-xs text-white/50">Nächstes Spiel</div>
                      <div className="text-sm font-bold">
                        <span className={nextFixture.isHome ? 'text-[#22C55E]' : 'text-sky-300'}>
                          {nextFixture.isHome ? 'Heim' : 'Auswärts'}
                        </span>
                        {' vs '}
                        <span className="text-white">{nextFixture.opponentName}</span>
                        <span className="text-white/25 ml-1.5 text-xs">GW {nextFixture.gameweek}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-white/30">Kein Spiel geplant</div>
                  )}
                </div>

                {/* Ownership */}
                <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Bestand</span>
                    <span className="font-mono font-bold">{item.quantity} DPC</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-white/40">EK ∅</span>
                    <span className="font-mono text-white/60">{fmtBSD(item.avgBuyPriceBsd)} BSD</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-white/40">Letzter VK</span>
                    <span className="font-mono text-white/60">{fmtBSD(p.prices.lastTrade)} BSD</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-white/40">Floor</span>
                    {item.floorBsd != null ? (
                      <span className="font-mono text-white/60">{fmtBSD(item.floorBsd)} BSD</span>
                    ) : (
                      <span className="font-mono text-orange-400/60 text-[10px]">Kein Angebot</span>
                    )}
                  </div>
                  {item.hasActiveIpo && item.ipoPriceBsd != null && (
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-purple-300/70">IPO-Preis</span>
                      <span className="font-mono text-purple-300">{fmtBSD(item.ipoPriceBsd)} BSD</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Link href={`/player/${p.id}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Spieler-Detail
                </Link>
                <button onClick={() => setExpandTab('sell')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl text-xs font-bold text-[#FFD700] hover:bg-[#FFD700]/20 transition-all">
                  <DollarSign className="w-3.5 h-3.5" /> Verkaufen
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Verkaufen ── */}
          {expandTab === 'sell' && (
            <div className="p-4 space-y-4">
              {/* My Listings */}
              {item.myListings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-[#FFD700]/60 uppercase tracking-wider font-black mb-2">
                    <Tag className="w-3 h-3" /> Meine Listings
                  </div>
                  <div className="space-y-1.5">
                    {item.myListings.map(listing => (
                      <div key={listing.id} className="flex items-center justify-between px-3 py-2 bg-[#FFD700]/[0.03] border border-[#FFD700]/10 rounded-xl">
                        <div className="text-sm">
                          <span className="font-mono font-bold">{listing.qty}×</span>
                          <span className="text-[#FFD700] font-mono font-bold ml-2">{fmtBSD(listing.priceBsd)} BSD</span>
                          <span className="text-white/25 text-xs ml-2">(Netto {fmtBSD(listing.priceBsd * listing.qty * (1 - FEE_RATE))})</span>
                        </div>
                        <button onClick={() => handleCancel(listing.id)} disabled={cancellingId === listing.id}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">
                          {cancellingId === listing.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Stornieren
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Incoming Offers */}
              {item.offers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-sky-400/60 uppercase tracking-wider font-black mb-2">
                    <MessageSquare className="w-3 h-3" /> Eingehende Angebote
                  </div>
                  <div className="space-y-1.5">
                    {item.offers.map(offer => (
                      <Link key={offer.id} href="/market?tab=angebote"
                        className="flex items-center justify-between px-3 py-2 bg-sky-500/[0.03] border border-sky-400/10 rounded-xl hover:bg-sky-500/[0.06] transition-all">
                        <div className="text-sm">
                          <span className="text-sky-300 font-bold">@{offer.sender_handle}</span>
                          <span className="text-white/40 mx-2">bietet</span>
                          <span className="font-mono font-bold">{offer.quantity}×</span>
                          <span className="text-[#FFD700] font-mono font-bold ml-1">{fmtBSD(centsToBsd(offer.price))} BSD</span>
                        </div>
                        <span className="text-[10px] text-sky-400/50 font-bold">Ansehen →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Sell Form */}
              {item.availableToSell > 0 ? (
                <SellForm item={item} onSell={onSell} />
              ) : (
                <div className="text-center py-3 text-xs text-white/25">
                  Alle DPCs sind bereits gelistet
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ManagerBestandTab({
  players, holdings, ipoList, userId, incomingOffers, onSell, onCancelOrder,
}: ManagerBestandTabProps) {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Set<Pos>>(new Set());
  const [clubFilter, setClubFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('value_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Manager Data Hooks ──
  const { data: minutesMap } = useRecentMinutes();
  const { data: nextFixturesMap } = useNextFixtures();
  const { data: eventUsageMap } = usePlayerEventUsage(userId);

  // Build bestand data
  const bestandItems = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const offersByPlayer = new Map<string, OfferWithDetails[]>();
    for (const offer of incomingOffers) {
      const existing = offersByPlayer.get(offer.player_id) ?? [];
      existing.push(offer);
      offersByPlayer.set(offer.player_id, existing);
    }

    const items: BestandPlayer[] = [];
    for (const h of holdings) {
      const player = playerMap.get(h.player_id);
      if (!player || player.isLiquidated) continue;

      const avgBuyBsd = centsToBsd(h.avg_buy_price);

      // Floor = echte Liquidität (nur wenn Sell-Orders existieren)
      const hasListings = player.listings.length > 0;
      const floorBsd = hasListings ? Math.min(...player.listings.map(l => l.price)) : null;

      // IPO-Preis nur wenn aktive IPO
      const activeIpo = ipoList.find(ipo => ipo.player_id === player.id && (ipo.status === 'open' || ipo.status === 'early_access' || ipo.status === 'announced'));
      const hasActiveIpo = !!activeIpo;
      const ipoPriceBsd = activeIpo ? centsToBsd(activeIpo.price) : null;

      // Bewertung: Floor > IPO-Preis > EK (letzte Instanz)
      const valueBsd = floorBsd ?? ipoPriceBsd ?? avgBuyBsd;
      const pnlBsd = (valueBsd - avgBuyBsd) * h.quantity;
      const pnlPct = avgBuyBsd > 0 ? ((valueBsd - avgBuyBsd) / avgBuyBsd) * 100 : 0;

      const myListings = userId
        ? player.listings.filter(l => l.sellerId === userId).map(l => ({
            id: l.id, qty: l.qty ?? 1, priceBsd: l.price,
          }))
        : [];
      const listedQty = myListings.reduce((sum, l) => sum + l.qty, 0);

      items.push({
        player, quantity: h.quantity, avgBuyPriceBsd: avgBuyBsd,
        floorBsd, ipoPriceBsd, valueBsd,
        pnlBsd, pnlPct, purchasedAt: h.created_at,
        myListings, listedQty, availableToSell: h.quantity - listedQty,
        offers: offersByPlayer.get(player.id) ?? [],
        hasActiveIpo,
      });
    }
    return items;
  }, [players, holdings, ipoList, userId, incomingOffers]);

  const availableClubs = useMemo(() =>
    Array.from(new Set(bestandItems.map(i => i.player.club))).sort(),
    [bestandItems]
  );

  // Summary stats
  const summary = useMemo(() => {
    let totalPlayers = 0, totalValue = 0, totalInvested = 0, totalListed = 0, totalOffers = 0;
    for (const item of bestandItems) {
      totalPlayers++;
      totalValue += item.valueBsd * item.quantity;
      totalInvested += item.avgBuyPriceBsd * item.quantity;
      totalListed += item.listedQty;
      totalOffers += item.offers.length;
    }
    const pnl = totalValue - totalInvested;
    const pnlPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
    return { totalPlayers, totalValue, totalInvested, pnl, pnlPct, totalListed, totalOffers };
  }, [bestandItems]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = [...bestandItems];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(item =>
        `${item.player.first} ${item.player.last} ${item.player.club}`.toLowerCase().includes(q)
      );
    }
    if (posFilter.size > 0) result = result.filter(item => posFilter.has(item.player.pos));
    if (clubFilter) result = result.filter(item => item.player.club === clubFilter);

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return `${a.player.last}`.localeCompare(`${b.player.last}`);
        case 'value_desc': return (b.valueBsd * b.quantity) - (a.valueBsd * a.quantity);
        case 'l5': return b.player.perf.l5 - a.player.perf.l5;
        case 'date': return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
        case 'pnl_desc': return b.pnlBsd - a.pnlBsd;
        case 'pnl_asc': return a.pnlBsd - b.pnlBsd;
        default: return 0;
      }
    });
    return result;
  }, [bestandItems, query, posFilter, clubFilter, sortBy]);

  const togglePos = useCallback((pos: Pos) => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  }, []);

  const getPnlColor = (pnl: number) => pnl >= 0 ? 'text-[#22C55E]' : 'text-red-300';

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Spieler</div>
          <div className="text-xl font-black font-mono">{summary.totalPlayers}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Kaderwert</div>
          <div className="text-xl font-black font-mono text-[#FFD700]">{fmtBSD(Math.round(summary.totalValue))}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">G/V</div>
          <div className={cn('text-xl font-black font-mono', getPnlColor(summary.pnl))}>
            {summary.pnl >= 0 ? '+' : ''}{fmtBSD(Math.round(summary.pnl))}
            <span className="text-sm ml-1">({summary.pnlPct >= 0 ? '+' : ''}{summary.pnlPct.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Aktivität</div>
          <div className="flex items-center gap-3 mt-1">
            {summary.totalListed > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-[#FFD700]">
                <Tag className="w-3 h-3" />{summary.totalListed} gelistet
              </span>
            )}
            {summary.totalOffers > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-sky-300">
                <MessageSquare className="w-3 h-3" />{summary.totalOffers} Angebote
              </span>
            )}
            {summary.totalListed === 0 && summary.totalOffers === 0 && (
              <span className="text-xs text-white/25">Keine</span>
            )}
          </div>
        </div>
      </div>

      <SponsorBanner placement="market_portfolio" className="mb-2" />

      {/* Search + Sort + Filter Toggle */}
      <div className="flex items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Spieler suchen..." className="flex-1 min-w-0" />
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/60 focus:outline-none">
            <option value="value_desc">Wert ↓</option>
            <option value="l5">L5 Score</option>
            <option value="pnl_desc">G/V ↓</option>
            <option value="pnl_asc">G/V ↑</option>
            <option value="name">Name A-Z</option>
            <option value="date">Kaufdatum</option>
          </select>
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0',
            showFilters || posFilter.size > 0 || clubFilter
              ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
              : 'bg-white/5 border-white/10 text-white/50'
          )}>
          <Filter className="w-3.5 h-3.5" />
          {(posFilter.size > 0 || clubFilter) && (
            <span className="px-1.5 py-0.5 bg-[#FFD700] text-black text-[10px] font-black rounded-full">
              {(posFilter.size > 0 ? 1 : 0) + (clubFilter ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap anim-dropdown">
          <PosFilter multi selected={posFilter} onChange={togglePos} />
          <select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 focus:outline-none">
            <option value="">Alle Vereine</option>
            {availableClubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(posFilter.size > 0 || clubFilter) && (
            <button onClick={() => { setPosFilter(new Set()); setClubFilter(''); }}
              className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 ml-auto">
              <X className="w-3 h-3" />Zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Result Count */}
      <div className="text-sm text-white/50">{filtered.length} Spieler im Kader</div>

      {/* Empty State */}
      {filtered.length === 0 && (
        bestandItems.length === 0 ? (
          <EmptyState icon={<Package />} title="Noch keine Spieler im Kader" description="Kaufe DPCs über Club Sales oder den Transfermarkt." />
        ) : (
          <EmptyState icon={<Package />} title="Keine Spieler gefunden" description="Versuche andere Suchbegriffe oder Filter"
            action={{ label: 'Filter zurücksetzen', onClick: () => { setPosFilter(new Set()); setClubFilter(''); setQuery(''); }}} />
        )
      )}

      {/* Player Cards */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(item => (
            <PlayerCard
              key={item.player.id}
              item={item}
              isExpanded={expandedId === item.player.id}
              onToggle={() => setExpandedId(prev => prev === item.player.id ? null : item.player.id)}
              onSell={onSell}
              onCancelOrder={onCancelOrder}
              minutes={minutesMap?.get(item.player.id)}
              nextFixture={nextFixturesMap?.get(item.player.clubId ?? '')}
              inLineup={eventUsageMap?.has(item.player.id) ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
