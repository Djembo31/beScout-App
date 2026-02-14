'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Star, Share2, Bell, TrendingUp, TrendingDown,
  Users, BarChart3, Clock, BadgeCheck, ShoppingCart, Send,
  Calendar, AlertTriangle, Target, Zap, Layers, PiggyBank,
  Award, Flame, Crown, Lock, Unlock, Info, ChevronRight,
  Activity, FileText, MessageSquare, ExternalLink, Shield,
  Briefcase, ArrowRight, CheckCircle2, XCircle,
  TrendingDown as PriceDown, Gift, Coins, History, Loader2,
} from 'lucide-react';
import { Card, Button, Chip, StatCard, ErrorState, Skeleton, SkeletonCard } from '@/components/ui';
import { PositionBadge, StatusBadge, ScoreCircle, MiniSparkline } from '@/components/player';
import { fmtBSD } from '@/lib/utils';
import { getResearchPosts, unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import ResearchCard from '@/components/community/ResearchCard';
import type { ResearchPostWithAuthor } from '@/types';
import { getClub } from '@/lib/clubs';
import type { Player, Pos, DbIpo } from '@/types';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getPlayerById, dbToPlayer, centsToBsd } from '@/lib/services/players';
import { getHoldingQty, getPlayerHolderCount, formatBsd } from '@/lib/services/wallet';
import { useWallet } from '@/components/providers/WalletProvider';
import { buyFromMarket, placeSellOrder, cancelOrder, getSellOrders, getPlayerTrades } from '@/lib/services/trading';
import { getIpoForPlayer, getUserIpoPurchases, buyFromIpo } from '@/lib/services/ipo';
import { getProfilesByIds } from '@/lib/services/profiles';
import { invalidateTradeData, withTimeout } from '@/lib/cache';
import { val } from '@/lib/settledHelpers';
import { getPlayerGameweekScores } from '@/lib/services/scoring';
import type { PlayerGameweekScore } from '@/lib/services/scoring';
import { getPbtForPlayer } from '@/lib/services/pbt';
import { getLiquidationEvent } from '@/lib/services/liquidation';
import type { DbOrder, DbTrade, DbPbtTreasury, DbLiquidationEvent } from '@/types';

// ============================================
// TYPES
// ============================================

type Tab = 'overview' | 'pbt' | 'market' | 'research' | 'activity';

type SuccessFeeTier = {
  minValue: number;
  maxValue: number;
  fee: number;
  label: string;
};

// ============================================
// SUCCESS FEE TIERS (Option C v2.0)
// ============================================

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

const getSuccessFeeTier = (marketValue: number): SuccessFeeTier => {
  return SUCCESS_FEE_TIERS.find(t => marketValue >= t.minValue && marketValue < t.maxValue) || SUCCESS_FEE_TIERS[0];
};

// ============================================
// POSITION COLORS
// ============================================

const posColors: Record<Pos, { bg: string; border: string; text: string; gradient: string }> = {
  GK: { bg: 'bg-emerald-500/20', border: 'border-emerald-400/30', text: 'text-emerald-300', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  DEF: { bg: 'bg-amber-500/20', border: 'border-amber-400/30', text: 'text-amber-300', gradient: 'from-amber-500/20 to-amber-500/5' },
  MID: { bg: 'bg-sky-500/20', border: 'border-sky-400/30', text: 'text-sky-300', gradient: 'from-sky-500/20 to-sky-500/5' },
  ATT: { bg: 'bg-rose-500/20', border: 'border-rose-400/30', text: 'text-rose-300', gradient: 'from-rose-500/20 to-rose-500/5' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getContractInfo = (monthsLeft: number) => {
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + monthsLeft);
  const dateStr = endDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  let color = 'text-white/60';
  let urgency: 'normal' | 'warning' | 'critical' = 'normal';
  if (monthsLeft <= 6) { color = 'text-red-400'; urgency = 'critical'; }
  else if (monthsLeft <= 12) { color = 'text-orange-400'; urgency = 'warning'; }
  return { dateStr, monthsLeft, color, urgency };
};

const formatMarketValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K€`;
  return `${value}€`;
};

const isColorDark = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.4;
};

const TrikotBadge = ({ number, pos, club }: { number: number; pos: Pos; club?: string }) => {
  const colors = posColors[pos];
  const clubData = club ? getClub(club) : null;

  if (clubData?.colors) {
    const { primary, secondary } = clubData.colors;
    return (
      <div className="relative w-14 h-14 border-2 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${primary}33`, borderColor: `${primary}66` }}>
        <svg viewBox="0 0 24 24" className="absolute w-10 h-10 opacity-20" style={{ color: primary }}>
          <path fill="currentColor" d="M16.21 3L12 7.21 7.79 3H2v6l4 3v9h12v-9l4-3V3h-5.79zM6 7V5h2.29L12 8.71 15.71 5H18v2l-4 3v8H10v-8l-4-3z" />
        </svg>
        <span className="relative font-mono font-black text-xl" style={{ color: isColorDark(secondary) ? '#FFFFFF' : secondary }}>{number}</span>
      </div>
    );
  }

  return (
    <div className={`relative w-14 h-14 ${colors.bg} ${colors.border} border-2 rounded-2xl flex items-center justify-center`}>
      <svg viewBox="0 0 24 24" className={`absolute w-10 h-10 ${colors.text} opacity-20`}>
        <path fill="currentColor" d="M16.21 3L12 7.21 7.79 3H2v6l4 3v9h12v-9l4-3V3h-5.79zM6 7V5h2.29L12 8.71 15.71 5H18v2l-4 3v8H10v-8l-4-3z" />
      </svg>
      <span className={`relative font-mono font-black text-xl ${colors.text}`}>{number}</span>
    </div>
  );
};

// ============================================
// HELPERS: IPO Format Labels
// ============================================

const getIPOFormatLabel = (format: string) => {
  switch (format) {
    case 'fixed': return 'Festpreis';
    case 'tiered': return 'Staffelpreis';
    case 'dutch': return 'Sinkender Preis';
    default: return format;
  }
};

const formatCountdown = (isoDate: string) => {
  const ms = Math.max(0, new Date(isoDate).getTime() - Date.now());
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
};

// ============================================
// PBT WIDGET COMPONENT
// ============================================

const PBTWidget = ({
  player,
}: {
  player: Player;
}) => {
  const pbt = player.pbt || { balance: 0, sources: { trading: 0, votes: 0, content: 0, ipo: 0 } };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className={`${player.isLiquidated ? 'bg-gradient-to-r from-white/5 to-white/[0.02]' : 'bg-gradient-to-r from-[#FFD700]/20 to-orange-500/10'} border-b border-[#FFD700]/20 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className={`w-5 h-5 ${player.isLiquidated ? 'text-white/30' : 'text-[#FFD700]'}`} />
            <span className="font-black">Player Bound Treasury</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Info className="w-3 h-3" />
            <span>{player.isLiquidated ? 'PBT wurde an Holder verteilt' : 'Wird bei Liquidierung an DPC-Holder ausgeschüttet'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance */}
        <div className="bg-black/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">{player.isLiquidated ? 'Reserviert (Success Fee)' : 'Treasury Guthaben'}</span>
            <span className={`font-mono font-black text-2xl ${player.isLiquidated ? 'text-white/30' : 'text-[#FFD700]'}`}>{fmtBSD(pbt.balance)} BSD</span>
          </div>
        </div>

        {/* Sources Breakdown */}
        {pbt.sources && (
          <div>
            <div className="text-xs text-white/40 mb-2">Zuflüsse nach Quelle</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                <span className="text-xs text-white/50">Trading Fees</span>
                <span className="font-mono text-sm">{fmtBSD(pbt.sources.trading)}</span>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                <span className="text-xs text-white/50">Votes</span>
                <span className="font-mono text-sm">{fmtBSD(pbt.sources.votes)}</span>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                <span className="text-xs text-white/50">Content</span>
                <span className="font-mono text-sm">{fmtBSD(pbt.sources.content)}</span>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                <span className="text-xs text-white/50">IPO Seed</span>
                <span className="font-mono text-sm">{fmtBSD(pbt.sources.ipo)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// ============================================
// CONTRACT STATUS WIDGET
// ============================================

const ContractWidget = ({ player }: { player: Player }) => {
  const contract = getContractInfo(player.contractMonthsLeft);
  const progressPercent = Math.max(0, Math.min(100, ((36 - player.contractMonthsLeft) / 36) * 100));

  return (
    <Card className="overflow-hidden">
      <div className={`p-4 ${contract.urgency === 'critical' ? 'bg-red-500/10' : contract.urgency === 'warning' ? 'bg-orange-500/10' : 'bg-white/[0.02]'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white/50" />
            <span className="font-bold">Vertragsstatus</span>
          </div>
          {contract.urgency !== 'normal' && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${contract.urgency === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'}`}>
              <AlertTriangle className="w-3 h-3" />
              {contract.urgency === 'critical' ? 'Bald auslaufend!' : 'Läuft aus'}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-xs text-white/40">Vertragsende</div>
            <div className={`font-mono font-bold text-lg ${contract.color}`}>{contract.dateStr}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40">Restlaufzeit</div>
            <div className={`font-mono font-bold text-lg ${contract.color}`}>{contract.monthsLeft} Monate</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${contract.urgency === 'critical' ? 'bg-red-400' : contract.urgency === 'warning' ? 'bg-orange-400' : 'bg-[#22C55E]'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* DPC Burn Info */}
      {contract.urgency !== 'normal' && (
        <div className={`p-4 border-t ${contract.urgency === 'critical' ? 'border-red-500/20 bg-red-500/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
          <div className="flex items-start gap-3">
            <Flame className={`w-5 h-5 mt-0.5 ${contract.urgency === 'critical' ? 'text-red-400' : 'text-orange-400'}`} />
            <div>
              <div className={`font-bold text-sm ${contract.urgency === 'critical' ? 'text-red-300' : 'text-orange-300'}`}>
                DPC Burn in {contract.monthsLeft} Monaten
              </div>
              <div className="text-xs text-white/50 mt-1">
                Bei Vertragsende werden alle DPCs liquidiert. Der PBT wird anteilig an alle Holder ausgezahlt.
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                <span className="text-white/60">PBT Reward wird automatisch verteilt</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// ============================================
// BUY WIDGET - IPO VERSION (Real Data)
// ============================================

const IPOBuyWidget = ({
  ipo,
  userPurchased,
  balanceCents,
  onBuy,
  buying,
}: {
  ipo: DbIpo;
  userPurchased: number;
  balanceCents: number | null;
  onBuy: (qty: number) => void;
  buying: boolean;
}) => {
  const [buyQty, setBuyQty] = useState(1);

  const priceBsd = centsToBsd(ipo.price);
  const remaining = ipo.total_offered - ipo.sold;
  const progress = (ipo.sold / ipo.total_offered) * 100;
  const canBuyMore = userPurchased < ipo.max_per_user;
  const maxBuy = Math.min(ipo.max_per_user - userPurchased, remaining);
  const totalCents = ipo.price * buyQty;
  const totalBsd = centsToBsd(totalCents);
  const canAfford = balanceCents !== null && balanceCents >= totalCents;
  const isActive = ipo.status === 'open' || ipo.status === 'early_access';

  if (!isActive) return null;

  return (
    <Card className="overflow-hidden">
      {/* IPO Header */}
      <div className="bg-gradient-to-r from-[#22C55E]/20 to-[#22C55E]/5 border-b border-[#22C55E]/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="font-black text-[#22C55E]">IPO LIVE</span>
            <span className="text-[10px] text-white/40 ml-1">{getIPOFormatLabel(ipo.format)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Clock className="w-3 h-3" />
            <span>Endet in {formatCountdown(ipo.ends_at)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white/50">Fortschritt</span>
            <span className="font-mono font-bold text-[#FFD700]">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-white/40 mt-1">
            <span>{fmtBSD(ipo.sold)} verkauft</span>
            <span>{fmtBSD(remaining)} verfügbar</span>
          </div>
        </div>

        {/* Price */}
        <div className="bg-black/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/50 text-sm">IPO Preis</span>
            <span className="font-mono font-black text-2xl text-[#FFD700]">{fmtBSD(priceBsd)} BSD</span>
          </div>
          {ipo.member_discount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">Club-Mitglied: -{ipo.member_discount}%</span>
              <span className="font-mono font-bold text-purple-300 ml-auto">{fmtBSD(priceBsd * (1 - ipo.member_discount / 100))} BSD</span>
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/[0.02] rounded-lg p-3">
            <div className="text-xs text-white/40">Dein Limit</div>
            <div className="font-mono font-bold">{ipo.max_per_user} DPC</div>
          </div>
          <div className="bg-white/[0.02] rounded-lg p-3">
            <div className="text-xs text-white/40">Bereits gekauft</div>
            <div className="font-mono font-bold">{userPurchased} DPC</div>
          </div>
        </div>

        {/* Quantity + Buy */}
        {canBuyMore && maxBuy > 0 ? (
          <>
            <div>
              <label className="text-xs text-white/50 mb-2 block">Anzahl</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">-</button>
                <input type="number" value={buyQty} min={1} max={maxBuy}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(maxBuy, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 font-mono font-bold" />
                <button onClick={() => setBuyQty(Math.min(maxBuy, buyQty + 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">+</button>
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total</span>
                <span className="font-mono font-black text-xl text-[#FFD700]">{fmtBSD(totalBsd)} BSD</span>
              </div>
              <div className="text-xs text-white/40 mt-1">
                Balance: {balanceCents !== null ? formatBsd(balanceCents) : '...'} BSD
              </div>
            </div>

            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={() => onBuy(buyQty)}
              disabled={buying || !canAfford}
            >
              {buying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              {buying ? 'Wird gekauft...' : `${buyQty} DPC verpflichten`}
            </Button>

            {!canAfford && !buying && (
              <div className="text-xs text-red-400 text-center">Nicht genug BSD</div>
            )}
          </>
        ) : (
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-white/30" />
            <div className="text-white/50">Limit erreicht</div>
            <div className="text-xs text-white/30">Du hast das Maximum für diesen IPO erreicht</div>
          </div>
        )}
      </div>
    </Card>
  );
};

// ============================================
// BUY WIDGET - TRANSFER LIST VERSION
// ============================================

const TransferBuyWidget = ({
  player,
  balanceCents,
  holdingQty,
  sellOrderCount,
  onBuy,
  buying
}: {
  player: Player;
  balanceCents: number | null;
  holdingQty: number;
  sellOrderCount: number;
  onBuy: (qty: number) => void;
  buying: boolean;
}) => {
  const [buyQty, setBuyQty] = useState(1);
  const floorCents = Math.round((player.prices.floor ?? 0) * 100);
  const floorBsd = player.prices.floor ?? 0;
  const totalBsd = floorBsd * buyQty;
  const canAfford = balanceCents !== null && balanceCents >= floorCents * buyQty;
  const hasOrders = sellOrderCount > 0;
  const maxQty = hasOrders
    ? Math.min(sellOrderCount, balanceCents !== null ? Math.floor(balanceCents / Math.max(floorCents, 1)) : 0)
    : 0;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500/10 to-sky-500/5 border-b border-sky-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-300" />
            <span className="font-black text-sky-300">Transfermarkt</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            <span>{holdingQty} im Besitz</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {hasOrders ? (
          <>
            {/* User Orders */}
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-sky-300" />
                  <span className="text-sm text-sky-300 font-bold">User-Angebote</span>
                </div>
                <span className="font-mono font-black text-lg text-[#FFD700]">{fmtBSD(floorBsd)} BSD</span>
              </div>
              <div className="text-[10px] text-white/40 mt-1">{sellOrderCount} Angebot{sellOrderCount !== 1 ? 'e' : ''} von Usern</div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs text-white/50 mb-2 block">Anzahl</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">-</button>
                <input type="number" value={buyQty} min={1} max={maxQty || undefined}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 font-mono font-bold" />
                <button onClick={() => setBuyQty(Math.min(maxQty || buyQty + 1, buyQty + 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">+</button>
              </div>
            </div>

            {/* Total */}
            <div className="bg-white/[0.03] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total</span>
                <span className="font-mono font-black text-xl text-[#FFD700]">{fmtBSD(totalBsd)} BSD</span>
              </div>
              <div className="text-xs text-white/40 mt-1">
                Balance: {balanceCents !== null ? formatBsd(balanceCents) : '...'} BSD
              </div>
            </div>

            {/* Buy Button */}
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={() => onBuy(buyQty)}
              disabled={buying || !canAfford}
            >
              {buying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Target className="w-5 h-5" />
              )}
              {buying ? 'Wird gekauft...' : `${buyQty} DPC kaufen`}
            </Button>

            {!canAfford && !buying && (
              <div className="text-xs text-red-400 text-center">Nicht genug BSD</div>
            )}
          </>
        ) : (
          <div className="py-6 text-center">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <div className="text-white/50 mb-1">Keine User-Angebote</div>
            <div className="text-xs text-white/30">Noch hat niemand DPCs dieses Spielers zum Verkauf gelistet</div>
          </div>
        )}
      </div>
    </Card>
  );
};

// ============================================
// YOUR HOLDINGS WIDGET
// ============================================

const YourHoldingsWidget = ({
  player,
  floorPriceCents,
  userOrders,
  onSell,
  onCancelOrder,
  selling,
  cancellingId,
}: {
  player: Player;
  floorPriceCents: number;
  userOrders: DbOrder[];
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  selling: boolean;
  cancellingId: string | null;
}) => {
  const owned = player.dpc.owned;
  const circulation = player.dpc.circulation || 1;
  const share = owned / circulation;

  const [showSellForm, setShowSellForm] = useState(false);
  const [sellQty, setSellQty] = useState(1);
  const [sellPriceBsd, setSellPriceBsd] = useState('');

  // Open sell orders reduce available qty
  const listedQty = userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
  const availableToSell = owned - listedQty;

  // Default price suggestion: floor price in BSD
  const floorBsd = floorPriceCents / 100;

  if (owned === 0 && userOrders.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-[#22C55E]/20 to-[#22C55E]/5 border-b border-[#22C55E]/20 p-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#22C55E]" />
          <span className="font-black text-[#22C55E]">Deine Position</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {owned > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-white/50">DPC Besitz</span>
              <span className="font-mono font-bold text-lg">{owned} DPC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Anteil am Float</span>
              <span className="font-mono font-bold">{(share * 100).toFixed(2)}%</span>
            </div>
            {listedQty > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-white/50">Davon gelistet</span>
                <span className="font-mono font-bold text-orange-300">{listedQty} DPC</span>
              </div>
            )}
          </>
        )}

        {/* Sell Button / Form */}
        {availableToSell > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-3">
            {!showSellForm ? (
              <Button variant="outline" fullWidth size="sm" onClick={() => {
                setSellPriceBsd(floorBsd > 0 ? floorBsd.toString() : '');
                setSellQty(1);
                setShowSellForm(true);
              }}>
                <ShoppingCart className="w-4 h-4" />
                Verkaufen
              </Button>
            ) : (
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">DPC verkaufen</span>
                  <button onClick={() => setShowSellForm(false)} className="text-white/40 hover:text-white text-xs">
                    Abbrechen
                  </button>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Anzahl (max. {availableToSell})</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSellQty(Math.max(1, sellQty - 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">-</button>
                    <input type="number" value={sellQty} min={1} max={availableToSell}
                      onChange={(e) => setSellQty(Math.max(1, Math.min(availableToSell, parseInt(e.target.value) || 1)))}
                      className="flex-1 text-center bg-white/5 border border-white/10 rounded-lg py-1.5 font-mono font-bold text-sm" />
                    <button onClick={() => setSellQty(Math.min(availableToSell, sellQty + 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">+</button>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Preis pro DPC (BSD)</label>
                  <input
                    type="number"
                    value={sellPriceBsd}
                    min={1}
                    step={1}
                    placeholder={floorBsd > 0 ? `z.B. ${floorBsd}` : 'Preis eingeben'}
                    onChange={(e) => setSellPriceBsd(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-mono font-bold text-sm"
                  />
                  {floorBsd > 0 && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSellPriceBsd(floorBsd.toString())}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        >
                          Floor
                        </button>
                        <button
                          onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.05).toString())}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        >
                          +5%
                        </button>
                        <button
                          onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.10).toString())}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        >
                          +10%
                        </button>
                        <span className="text-[10px] text-white/25 ml-1">Floor: {fmtBSD(floorBsd)}</span>
                      </div>
                      {sellPriceBsd && Number(sellPriceBsd) <= floorBsd && Number(sellPriceBsd) > 0 && (
                        <div className="text-[10px] text-[#22C55E]/60">Zum Floor-Preis = schnellster Verkauf</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fee Breakdown */}
                {sellPriceBsd && Number(sellPriceBsd) > 0 && (() => {
                  const gross = sellQty * Number(sellPriceBsd);
                  const feePct = 5;
                  const fee = gross * feePct / 100;
                  const net = gross - fee;
                  return (
                    <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Brutto</span>
                        <span className="font-mono text-white/40">{fmtBSD(gross)} BSD</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Gebühr ({feePct}%)</span>
                        <span className="font-mono text-red-400/70">-{fmtBSD(fee)} BSD</span>
                      </div>
                      <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-sm">
                        <span className="text-white/50">Netto-Erlös</span>
                        <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(net)} BSD</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Submit */}
                <Button
                  variant="gold"
                  fullWidth
                  size="sm"
                  onClick={() => {
                    const priceCents = Math.round(Number(sellPriceBsd) * 100);
                    if (priceCents > 0 && sellQty > 0) {
                      onSell(sellQty, priceCents);
                      setShowSellForm(false);
                    }
                  }}
                  disabled={selling || !sellPriceBsd || Number(sellPriceBsd) <= 0}
                >
                  {selling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {selling ? 'Wird gelistet...' : `${sellQty} DPC listen`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Active Sell Orders */}
        {userOrders.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2">Deine aktiven Angebote</div>
            <div className="space-y-2">
              {userOrders.map((order) => {
                const remaining = order.quantity - order.filled_qty;
                return (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg border border-white/10">
                    <div>
                      <div className="font-mono font-bold text-sm text-[#FFD700]">
                        {formatBsd(order.price)} BSD
                      </div>
                      <div className="text-[10px] text-white/40">
                        {remaining}/{order.quantity} DPC
                        {order.filled_qty > 0 && <span className="text-[#22C55E]"> • {order.filled_qty} verkauft</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => onCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                      {cancellingId === order.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Stornieren'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// ============================================
// TOP OWNERS WIDGET
// ============================================

const TopOwnersWidget = ({ player }: { player: Player }) => {
  if (player.topOwners.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white/50" />
          <span className="font-bold">Top Besitzer</span>
        </div>
        <span className="text-xs text-white/40">{player.topOwners.length} Holder</span>
      </div>
      <div className="space-y-3">
        {player.topOwners.map((owner, i) => (
          <div key={owner.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : i === 1 ? 'bg-white/10 text-white/70' : i === 2 ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-white/50'}`}>
                #{i + 1}
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1">
                  {owner.name}
                  {owner.verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
                </div>
                <div className="text-[10px] text-white/40">Lv {owner.level}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-sm">{owner.owned}</div>
              <div className="text-[10px] text-white/40">{owner.acceptance}% accept</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ============================================
// LISTINGS WIDGET
// ============================================

const ListingsWidget = ({ player }: { player: Player }) => {
  if (player.listings.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-white/50" />
          <span className="font-bold">Aktive Angebote</span>
        </div>
        <span className="text-xs text-white/40">{player.listings.length} Listings</span>
      </div>
      <div className="space-y-2">
        {player.listings.map((listing) => (
          <div key={listing.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10 hover:bg-white/[0.04] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                <span className="font-bold text-xs">Lv{listing.sellerLevel}</span>
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1">
                  {listing.sellerName}
                  {listing.verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
                </div>
                <div className="text-[10px] text-white/40">{listing.qty || 1} DPC</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[#FFD700]">{fmtBSD(listing.price)}</div>
              <div className="text-[10px] text-white/40 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {Math.floor((listing.expiresAt - Date.now()) / 3600000)}h
              </div>
            </div>
            <Button variant="gold" size="sm" className="ml-3">Kaufen</Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ============================================
// RESEARCH PREVIEW
// ============================================

const ResearchPreview = ({ posts }: { posts: ResearchPostWithAuthor[] }) => {
  const topPosts = posts.slice(0, 2);
  if (topPosts.length === 0) return null;

  const callColors: Record<string, string> = {
    Bullish: 'bg-[#22C55E]/20 text-[#22C55E]',
    Bearish: 'bg-red-500/20 text-red-300',
    Neutral: 'bg-white/10 text-white/60',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-white/50" />
          <span className="font-bold">Research Hub</span>
        </div>
        <Link href="/community" className="text-xs text-[#FFD700] flex items-center gap-1 hover:underline">
          Alle anzeigen <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {topPosts.map((post) => (
          <div key={post.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-sm line-clamp-1">{post.title}</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {post.author_display_name || post.author_handle} • {new Date(post.created_at).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${callColors[post.call] ?? callColors.Neutral}`}>
                {post.call}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ============================================
// SKELETON
// ============================================

function PlayerSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Back Button */}
      <Skeleton className="h-8 w-20 rounded-lg" />
      {/* Player Header */}
      <div className="flex items-start gap-4 md:gap-6">
        <Skeleton className="w-16 h-20 md:w-20 md:h-24 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="text-right space-y-1 shrink-0">
          <Skeleton className="h-8 w-24 ml-auto" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-36" />
        </div>
        <div className="space-y-4">
          <SkeletonCard className="h-56" />
          <SkeletonCard className="h-32" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PRICE ALERTS (localStorage)
// ============================================
const PRICE_ALERTS_KEY = 'bescout-price-alerts';

function loadPriceAlerts(): Record<string, { target: number; dir: 'above' | 'below' }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PRICE_ALERTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePriceAlerts(alerts: Record<string, { target: number; dir: 'above' | 'below' }>): void {
  localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function PlayerContent({ playerId }: { playerId: string }) {
  const { user } = useUser();
  const { balanceCents, setBalanceCents } = useWallet();
  const { addToast } = useToast();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [holdingQty, setHoldingQty] = useState(0);
  const [holderCount, setHolderCount] = useState(0);
  const [dpcAvailable, setDpcAvailable] = useState(0);
  const [buying, setBuying] = useState(false);
  const [activeIpo, setActiveIpo] = useState<DbIpo | null>(null);
  const [userIpoPurchased, setUserIpoPurchased] = useState(0);
  const [ipoBuying, setIpoBuying] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [userOrders, setUserOrders] = useState<DbOrder[]>([]);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [trades, setTrades] = useState<DbTrade[]>([]);
  const [allSellOrders, setAllSellOrders] = useState<DbOrder[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { handle: string; display_name: string | null }>>({});
  const [gwScores, setGwScores] = useState<PlayerGameweekScore[]>([]);
  const [priceAlert, setPriceAlert] = useState<{ target: number; dir: 'above' | 'below' } | null>(null);
  const [alertInput, setAlertInput] = useState('');
  const [pbtTreasury, setPbtTreasury] = useState<DbPbtTreasury | null>(null);
  const [liquidationEvent, setLiquidationEvent] = useState<DbLiquidationEvent | null>(null);
  const [playerResearch, setPlayerResearch] = useState<ResearchPostWithAuthor[]>([]);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);

  // Helper: Profile-Map aus Trades + Orders aufbauen
  const loadProfiles = async (tradeList: DbTrade[], orderList: DbOrder[]) => {
    const userIds: string[] = [];
    for (const t of tradeList) {
      if (t.buyer_id) userIds.push(t.buyer_id);
      if (t.seller_id) userIds.push(t.seller_id);
    }
    for (const o of orderList) {
      if (o.user_id) userIds.push(o.user_id);
    }
    if (userIds.length > 0) {
      const map = await getProfilesByIds(userIds);
      setProfileMap(map);
    }
  };

  // Helper: refresh only orders + trades (lightweight post-trade refresh)
  const refreshOrdersAndTrades = async () => {
    const [allOrders, playerTrades] = await Promise.all([
      getSellOrders(playerId),
      getPlayerTrades(playerId, 50),
    ]);
    setAllSellOrders(allOrders);
    if (user) {
      setUserOrders(allOrders.filter((o) => o.user_id === user.id));
    }
    setTrades(playerTrades);
    await loadProfiles(playerTrades, allOrders);
  };

  // Load player data + IPO data (only depends on playerId)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setDataError(false);
      // Fire-and-forget: resolve expired research calls
      resolveExpiredResearch().catch(() => {});
      try {
        const currentUserId = user?.id;
        const results = await withTimeout(Promise.allSettled([
          getPlayerById(playerId),
          getIpoForPlayer(playerId),
          getPlayerGameweekScores(playerId),
          getPbtForPlayer(playerId),
          getResearchPosts({ playerId, currentUserId }),
          getLiquidationEvent(playerId),
        ]), 10000);
        if (cancelled) return;
        const dbPlayer = val(results[0], null);
        // Player data is critical — if it fails, show error
        if (!dbPlayer) {
          if (results[0].status === 'rejected') { setDataError(true); }
          setLoading(false);
          return;
        }
        setPlayer(dbToPlayer(dbPlayer));
        setDpcAvailable(dbPlayer.dpc_available);
        setActiveIpo(val(results[1], null));
        setGwScores(val(results[2], []));
        setPbtTreasury(val(results[3], null));
        setPlayerResearch(val(results[4], []));
        setLiquidationEvent(val(results[5], null));
      } catch {
        if (!cancelled) setDataError(true);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [playerId, addToast, retryCount]);

  // Price alert: load + check trigger
  useEffect(() => {
    if (!player) return;
    const alerts = loadPriceAlerts();
    const existing = alerts[playerId];
    if (existing) {
      const floor = player.prices.floor ?? 0;
      const floorBsd = centsToBsd(floor);
      const triggered = existing.dir === 'below'
        ? floorBsd <= existing.target
        : floorBsd >= existing.target;
      if (triggered && floorBsd > 0) {
        addToast(
          `Preis-Alert: ${player.first} ${player.last} ist ${existing.dir === 'below' ? 'unter' : 'über'} ${fmtBSD(existing.target)} BSD (aktuell ${fmtBSD(floorBsd)} BSD)`,
          'success'
        );
        delete alerts[playerId];
        savePriceAlerts(alerts);
        setPriceAlert(null);
      } else {
        setPriceAlert(existing);
        setAlertInput(existing.target.toString());
      }
    }
  }, [player, playerId, addToast]);

  // Load wallet + holdings + user orders + trades + IPO purchases
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function loadUserData() {
      setTradesLoading(true);
      try {
        const userResults = await withTimeout(Promise.allSettled([
          getHoldingQty(uid, playerId),
          getSellOrders(playerId),
          getPlayerTrades(playerId, 50),
          getPlayerHolderCount(playerId),
        ]), 10000);
        const qty = val(userResults[0], 0);
        const allOrders = val(userResults[1], []);
        const playerTrades = val(userResults[2], []);
        const holders = val(userResults[3], 0);
        if (!cancelled) {
          setHoldingQty(qty);
          setHolderCount(holders);
          setAllSellOrders(allOrders);
          setUserOrders(allOrders.filter((o) => o.user_id === uid));
          setTrades(playerTrades);
          // Profile-Handles laden
          const userIds: string[] = [];
          for (const t of playerTrades) {
            if (t.buyer_id) userIds.push(t.buyer_id);
            if (t.seller_id) userIds.push(t.seller_id);
          }
          for (const o of allOrders) {
            if (o.user_id) userIds.push(o.user_id);
          }
          if (userIds.length > 0) {
            const map = await getProfilesByIds(userIds);
            if (!cancelled) setProfileMap(map);
          }
        }
        // Load IPO purchases if active IPO exists
        if (activeIpo) {
          const purchased = await getUserIpoPurchases(uid, activeIpo.id);
          if (!cancelled) setUserIpoPurchased(purchased);
        }
      } catch {
        // User-specific data failure is non-blocking (player data already loaded)
      }
      if (!cancelled) setTradesLoading(false);
    }
    loadUserData();
    return () => { cancelled = true; };
  }, [user, playerId, activeIpo]);

  // Set real ownership data on player for sub-components
  // (must be before early returns to keep hooks order stable)
  const playerWithOwnership = useMemo(() => {
    if (!player) return null;
    const centsToBsdVal = (c: number) => c / 100;
    return {
      ...player,
      dpc: { ...player.dpc, owned: holdingQty },
      pbt: pbtTreasury ? {
        balance: centsToBsdVal(pbtTreasury.balance),
        lastInflow: pbtTreasury.last_inflow_at ? centsToBsdVal(pbtTreasury.trading_inflow + pbtTreasury.ipo_inflow) : undefined,
        sources: {
          trading: centsToBsdVal(pbtTreasury.trading_inflow),
          ipo: centsToBsdVal(pbtTreasury.ipo_inflow),
          votes: centsToBsdVal(pbtTreasury.votes_inflow),
          content: centsToBsdVal(pbtTreasury.content_inflow),
        },
      } : player.pbt,
    };
  }, [player, holdingQty, pbtTreasury]);

  // Buy confirmation state (when user has own sell orders)
  const [pendingBuyQty, setPendingBuyQty] = useState<number | null>(null);

  // Buy handler — checks for own sell orders first
  const handleBuy = (quantity: number) => {
    if (!user || !player || player.isLiquidated) return;
    // If user has active sell orders for this player → show confirmation
    if (userOrders.length > 0) {
      setPendingBuyQty(quantity);
      return;
    }
    executeBuy(quantity);
  };

  // Confirmed buy — actually executes the purchase
  const executeBuy = async (quantity: number) => {
    if (!user || !player) return;
    setPendingBuyQty(null);
    setBuying(true);
    setBuyError(null);
    setBuySuccess(null);
    setShared(false);
    try {
      const result = await buyFromMarket(user.id, playerId, quantity);
      if (!result.success) {
        setBuyError(result.error || 'Kauf fehlgeschlagen');
      } else {
        const source = 'vom Transfermarkt';
        const priceBsd = result.price_per_dpc ? formatBsd(result.price_per_dpc) : '?';
        setBuySuccess(`${quantity} DPC ${source} für ${priceBsd} BSD gekauft`);
        // Optimistic: update balance + holdings locally
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        setHoldingQty((prev) => prev + quantity);
        // Invalidate stale caches, then refresh only orders + trades
        invalidateTradeData(playerId, user.id);
        await refreshOrdersAndTrades();
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setBuying(false);
    }
  };

  // IPO Buy handler
  const handleIpoBuy = async (quantity: number) => {
    if (!user || !activeIpo) return;
    setIpoBuying(true);
    setBuyError(null);
    setBuySuccess(null);
    setShared(false);
    try {
      const result = await buyFromIpo(user.id, activeIpo.id, quantity);
      if (!result.success) {
        setBuyError(result.error || 'IPO-Kauf fehlgeschlagen');
      } else {
        const priceBsd = result.price_per_dpc ? formatBsd(result.price_per_dpc) : '?';
        setBuySuccess(`${quantity} DPC per IPO für ${priceBsd} BSD gekauft`);
        // Optimistic: update balance + holdings + IPO purchased locally
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        setHoldingQty((prev) => prev + quantity);
        setUserIpoPurchased(result.user_total_purchased ?? userIpoPurchased + quantity);
        // Invalidate caches, refresh only trades
        invalidateTradeData(playerId, user.id);
        const playerTrades = await getPlayerTrades(playerId, 50);
        setTrades(playerTrades);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIpoBuying(false);
    }
  };

  // Sell handler
  const handleSell = async (quantity: number, priceCents: number) => {
    if (!user || player?.isLiquidated) return;
    setSelling(true);
    setBuyError(null);
    setBuySuccess(null);
    setShared(false);
    try {
      const result = await placeSellOrder(user.id, playerId, quantity, priceCents);
      if (!result.success) {
        setBuyError(result.error || 'Listing fehlgeschlagen');
      } else {
        setBuySuccess(`${quantity} DPC für ${formatBsd(priceCents)} BSD gelistet`);
        // Invalidate caches, refresh only orders
        invalidateTradeData(playerId, user.id);
        const allOrders = await getSellOrders(playerId);
        setAllSellOrders(allOrders);
        setUserOrders(allOrders.filter((o) => o.user_id === user.id));
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSelling(false);
    }
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    setCancellingId(orderId);
    setBuyError(null);
    try {
      const result = await cancelOrder(user.id, orderId);
      if (!result.success) {
        setBuyError(result.error || 'Stornierung fehlgeschlagen');
      } else {
        setBuySuccess('Order storniert!');
        // Optimistic: remove order locally
        const remaining = allSellOrders.filter((o) => o.id !== orderId);
        setAllSellOrders(remaining);
        setUserOrders(remaining.filter((o) => o.user_id === user.id));
        // Recalculate floor from remaining orders
        if (player && remaining.length > 0) {
          const newFloor = Math.min(...remaining.map((o) => o.price)) / 100;
          setPlayer({ ...player, prices: { ...player.prices, floor: newFloor } });
        }
        invalidateTradeData(playerId, user.id);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setCancellingId(null);
    }
  };

  const handleShareTrade = async () => {
    if (!user || !player || shared) return;
    try {
      const p = player;
      const { createPost } = await import('@/lib/services/posts');
      await createPost(
        user.id,
        playerId,
        p.club,
        `Ich habe gerade ${p.first} ${p.last} DPCs gekauft! ${p.pos === 'ATT' ? '⚽' : p.pos === 'GK' ? '🧤' : '🏃'} #Trading`,
        [p.last.toLowerCase(), p.club.toLowerCase()],
        'Trading'
      );
      setShared(true);
      addToast('In der Community geteilt!', 'success');
    } catch {
      addToast('Teilen fehlgeschlagen', 'error');
    }
  };

  // Loading state
  if (loading) {
    return <PlayerSkeleton />;
  }

  if (dataError) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <ErrorState onRetry={() => setRetryCount((c) => c + 1)} />
      </div>
    );
  }

  // Not found
  if (!player || !playerWithOwnership) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <XCircle className="w-12 h-12 text-white/20 mb-4" />
        <div className="text-white/50 mb-2">Spieler nicht gefunden</div>
        <Link href="/market">
          <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Zurück zum Markt</Button>
        </Link>
      </div>
    );
  }

  // Derived data
  const isIPO = activeIpo !== null && (activeIpo.status === 'open' || activeIpo.status === 'early_access');
  const floor = player.prices.floor ?? 0;
  const up = player.prices.change24h >= 0;
  const contract = getContractInfo(player.contractMonthsLeft);
  const successFeeTier = getSuccessFeeTier(player.marketValue || 500000);
  const colors = posColors[player.pos];
  const clubData = player.club ? getClub(player.club) : null;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Übersicht', icon: Activity },
    { id: 'pbt', label: 'PBT Treasury', icon: PiggyBank },
    { id: 'market', label: 'Markt', icon: ShoppingCart },
    { id: 'research', label: 'Research', icon: FileText },
    { id: 'activity', label: 'Aktivität', icon: History },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">

      {/* ========== STICKY HEADER ========== */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/market">
              <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-3 md:gap-4">
              <TrikotBadge number={player.ticket} pos={player.pos} club={player.club} />
              <div>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black">{player.first} {player.last}</h1>
                  <StatusBadge status={player.status} />
                  {isIPO && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#22C55E]/20 border border-[#22C55E]/30 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                      <span className="text-xs font-bold text-[#22C55E]">IPO LIVE</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-white/60 mt-0.5 flex-wrap">
                  <span className="font-mono text-white/40">#{player.ticket}</span>
                  <span className="text-white/30">•</span>
                  <span className="flex items-center gap-1.5">
                    {clubData?.logo && (
                      <img src={clubData.logo} alt={clubData.name} className="w-4 h-4 rounded-full object-cover" />
                    )}
                    {player.club}
                  </span>
                  <span className="text-white/30 hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{player.league || 'TFF 1. Lig'}</span>
                  <span className="text-white/30">•</span>
                  <span>{player.age} Jahre</span>
                  <span className="text-white/30">•</span>
                  <span className={contract.color}>{contract.monthsLeft}M Vertrag</span>
                  {holderCount > 0 && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="flex items-center gap-1 text-sky-300">
                        <Users className="w-3 h-3" />
                        {holderCount} {holderCount === 1 ? 'Scout hält' : 'Scouts halten'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsWatchlisted(!isWatchlisted)}
              className={isWatchlisted ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]' : ''}>
              <Star className="w-4 h-4" fill={isWatchlisted ? 'currentColor' : 'none'} />
            </Button>
            <Button variant="outline" size="sm"><Bell className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className={shared ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]' : ''}
              onClick={async () => {
                const url = window.location.href;
                const text = `${player.first} ${player.last} auf BeScout — ${fmtBSD(centsToBsd(player.prices.floor ?? 0))} BSD`;
                if (navigator.share) {
                  try { await navigator.share({ title: text, url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(url);
                  setShared(true);
                  addToast('Link kopiert!', 'success');
                  setTimeout(() => setShared(false), 2000);
                }
              }}>
              {shared ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ========== LIQUIDATION BANNER ========== */}
      {player.isLiquidated && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <Flame className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-black text-red-300">Dieser Spieler wurde liquidiert</div>
            <div className="text-sm text-white/60 mt-1">
              Alle DPCs wurden gelöscht und die PBT-Balance an Holder ausgeschüttet. Trading ist nicht mehr möglich.
            </div>
            {liquidationEvent && (
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                <div><span className="text-white/40">Ausgeschüttet:</span> <span className="font-mono font-bold text-[#22C55E]">{fmtBSD(liquidationEvent.distributed_cents / 100)} BSD</span></div>
                <div><span className="text-white/40">Success Fee:</span> <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(liquidationEvent.success_fee_cents / 100)} BSD</span></div>
                <div><span className="text-white/40">Holder:</span> <span className="font-mono font-bold">{liquidationEvent.holder_count}</span></div>
                <div><span className="text-white/40">Datum:</span> <span className="font-mono">{new Date(liquidationEvent.created_at).toLocaleDateString('de-DE')}</span></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== TABS ========== */}
      <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3 font-semibold transition-all relative whitespace-nowrap flex items-center gap-2 ${tab === t.id ? 'text-[#FFD700]' : 'text-white/60 hover:text-white'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD700]" />}
          </button>
        ))}
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* ===== LEFT COLUMN (2/3) ===== */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          {/* Price & Performance Card */}
          <Card className={`overflow-hidden bg-gradient-to-br ${colors.gradient}`}>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Price Section */}
                <div>
                  <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
                    {isIPO ? (
                      <><Zap className="w-3 h-3 text-[#22C55E]" /> IPO Preis</>
                    ) : (
                      <><Target className="w-3 h-3" /> Floor Price</>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl md:text-4xl font-mono font-black text-[#FFD700]">
                      {isIPO && activeIpo ? fmtBSD(centsToBsd(activeIpo.price)) : fmtBSD(floor)}
                    </span>
                    <span className="text-white/60 mb-1">BSD</span>
                  </div>
                  {!isIPO && (
                    <div className={`flex items-center gap-1 mt-2 font-mono font-bold ${up ? 'text-[#22C55E]' : 'text-red-300'}`}>
                      {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {up ? '+' : ''}{player.prices.change24h.toFixed(1)}%
                      <span className="text-white/40 ml-1">24h</span>
                    </div>
                  )}
                  {isIPO && activeIpo && (() => {
                    const ipoProg = (activeIpo.sold / activeIpo.total_offered) * 100;
                    const ipoRemaining = activeIpo.total_offered - activeIpo.sold;
                    return (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                          <span className="flex items-center gap-1.5">
                            IPO Progress
                            {ipoProg >= 90 && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded text-[10px] font-bold animate-pulse">Fast ausverkauft!</span>}
                            {ipoProg >= 70 && ipoProg < 90 && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded text-[10px] font-bold">Beliebt</span>}
                          </span>
                          <span className={`font-mono ${ipoProg >= 80 ? 'text-red-400' : ''}`}>{ipoProg.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ipoProg >= 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : ipoProg >= 70 ? 'bg-gradient-to-r from-[#22C55E] to-orange-500' : 'bg-[#22C55E]'}`} style={{ width: `${ipoProg}%` }} />
                        </div>
                        {ipoRemaining > 0 && ipoRemaining <= 10 && (
                          <div className="text-[10px] font-bold text-red-400 mt-1">Nur noch {ipoRemaining} DPC!</div>
                        )}
                      </div>
                    );
                  })()}
                  {player.prices.history7d && !isIPO && (
                    <div className="mt-4">
                      <MiniSparkline values={player.prices.history7d} width={200} height={40} />
                    </div>
                  )}
                  {/* Price Alert */}
                  {!isIPO && (
                    <div className="mt-3">
                      {priceAlert ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl">
                          <Bell className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span className="text-xs text-[#FFD700]/80">
                            Alert: {priceAlert.dir === 'below' ? '≤' : '≥'} {fmtBSD(priceAlert.target)} BSD
                          </span>
                          <button
                            onClick={() => {
                              const alerts = loadPriceAlerts();
                              delete alerts[playerId];
                              savePriceAlerts(alerts);
                              setPriceAlert(null);
                              setAlertInput('');
                            }}
                            className="ml-auto text-white/30 hover:text-white/60"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-3 h-3 text-white/30" />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Zielpreis"
                            value={alertInput}
                            onChange={(e) => setAlertInput(e.target.value)}
                            className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#FFD700]/30"
                          />
                          <button
                            onClick={() => {
                              const target = parseFloat(alertInput);
                              if (!target || target <= 0) return;
                              const currentBsd = centsToBsd(player.prices.floor ?? 0);
                              const dir = target < currentBsd ? 'below' : 'above';
                              const alerts = loadPriceAlerts();
                              alerts[playerId] = { target, dir };
                              savePriceAlerts(alerts);
                              setPriceAlert({ target, dir });
                              addToast(`Preis-Alert gesetzt: ${dir === 'below' ? '≤' : '≥'} ${fmtBSD(target)} BSD`, 'success');
                            }}
                            disabled={!alertInput}
                            className="px-2 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg text-[10px] font-bold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-30 transition-all"
                          >
                            Alert
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Performance Section */}
                <div>
                  <div className="text-xs text-white/50 mb-3">Performance</div>
                  <div className="flex items-center gap-4">
                    <ScoreCircle label="L5" value={player.perf.l5} size={56} />
                    <ScoreCircle label="L15" value={player.perf.l15} size={52} />
                    <div className="text-sm">
                      <div className={`font-bold ${player.perf.trend === 'UP' ? 'text-[#22C55E]' : player.perf.trend === 'DOWN' ? 'text-red-300' : 'text-white/60'}`}>
                        {player.perf.trend === 'UP' ? '🔥 Hot' : player.perf.trend === 'DOWN' ? '❄️ Cold' : '→ Stable'}
                      </div>
                      <div className="text-white/50 text-xs">Form Trend</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6">
                    <div className="text-center bg-black/20 rounded-xl py-3">
                      <div className="text-2xl font-mono font-black">{player.stats.matches}</div>
                      <div className="text-[10px] text-white/50">Spiele</div>
                    </div>
                    <div className="text-center bg-black/20 rounded-xl py-3">
                      <div className="text-2xl font-mono font-black text-[#22C55E]">{player.stats.goals}</div>
                      <div className="text-[10px] text-white/50">Tore</div>
                    </div>
                    <div className="text-center bg-black/20 rounded-xl py-3">
                      <div className="text-2xl font-mono font-black text-sky-300">{player.stats.assists}</div>
                      <div className="text-[10px] text-white/50">Assists</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* DPC Info Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <BarChart3 className="w-3 h-3" />Supply
              </div>
              <div className="font-mono font-bold">{fmtBSD(player.dpc.supply)}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Briefcase className="w-3 h-3" />Float
              </div>
              <div className="font-mono font-bold">{fmtBSD(player.dpc.float)}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Users className="w-3 h-3" />Im Umlauf
              </div>
              <div className="font-mono font-bold">{fmtBSD(player.dpc.circulation)}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Unlock className="w-3 h-3" />Verfügbar
              </div>
              <div className="font-mono font-bold text-[#FFD700]">{fmtBSD(dpcAvailable)}</div>
            </div>
          </div>

          {/* Contract Status */}
          <ContractWidget player={player} />

          {/* TAB CONTENT */}
          {tab === 'overview' && (
            <>
              {/* Player Info */}
              <Card className="p-4 md:p-6">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-white/50" />
                  Spieler-Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <div>
                    <div className="text-xs text-white/50">Marktwert</div>
                    <div className="font-bold">{formatMarketValue(player.marketValue || 500000)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Position</div>
                    <div className="font-bold flex items-center gap-2">
                      <PositionBadge pos={player.pos} size="sm" />
                      {player.pos}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Nationalität</div>
                    <div className="font-bold">{player.country}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Success Fee Tier</div>
                    <div className="font-bold text-purple-300">{successFeeTier.label}</div>
                  </div>
                </div>
              </Card>

              {/* Price Chart */}
              {trades.length >= 2 && (() => {
                const sorted = [...trades].sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());
                const prices = sorted.map(t => centsToBsd(t.price as number));
                const dates = sorted.map(t => new Date(t.executed_at));
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                const range = max - min || 1;
                const W = 400;
                const H = 160;
                const padX = 50;
                const padY = 20;
                const chartW = W - padX - 10;
                const chartH = H - padY * 2;
                const pts = prices.map((v, i) => ({
                  x: padX + (i * chartW) / (prices.length - 1),
                  y: padY + (1 - (v - min) / range) * chartH,
                }));
                const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
                const up = prices[prices.length - 1] >= prices[0];
                const change = prices.length >= 2 ? prices[prices.length - 1] - prices[0] : 0;
                const changePct = prices[0] > 0 ? (change / prices[0]) * 100 : 0;
                // Y-axis labels (5 steps)
                const yLabels = Array.from({ length: 5 }, (_, i) => min + (range * i) / 4);
                // Area fill path
                const areaPath = `M${pts[0].x},${padY + chartH} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length - 1].x},${padY + chartH} Z`;

                return (
                  <Card className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#FFD700]" />
                        Preisverlauf
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold">{fmtBSD(prices[prices.length - 1])} BSD</span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${up ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-red-500/10 text-red-400'}`}>
                          {change >= 0 ? '+' : ''}{fmtBSD(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                      {/* Grid lines */}
                      {yLabels.map((v, i) => {
                        const y = padY + (1 - (v - min) / range) * chartH;
                        return (
                          <g key={i}>
                            <line x1={padX} y1={y} x2={W - 10} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
                            <text x={padX - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
                              {v.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}
                      {/* Area fill */}
                      <path d={areaPath} fill={up ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'} />
                      {/* Line */}
                      <polyline points={polyline} fill="none" stroke={up ? '#22C55E' : '#EF4444'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                      {/* Data points */}
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill={up ? '#22C55E' : '#EF4444'} stroke="#0a0a0a" strokeWidth="1.5" />
                      ))}
                    </svg>
                    <div className="flex justify-between text-[10px] text-white/30 mt-1 px-1">
                      <span>{dates[0].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                      {dates.length > 2 && (
                        <span>{dates[Math.floor(dates.length / 2)].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                      )}
                      <span>{dates[dates.length - 1].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </Card>
                );
              })()}

              {/* Spieltag-Bewertungen */}
              <Card className="p-4 md:p-6">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#FFD700]" />
                  Spieltag-Bewertungen
                </h3>
                {gwScores.length === 0 ? (
                  <div className="text-center py-6 text-white/40">
                    Noch keine Spieltag-Bewertungen
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gwScores.slice(0, 10).map((gw) => {
                      const barWidth = Math.min(100, Math.max(0, ((gw.score - 40) / 110) * 100));
                      const scoreColor = gw.score >= 100 ? 'text-[#FFD700]' : gw.score >= 70 ? 'text-white' : 'text-red-400';
                      const barColor = gw.score >= 100 ? 'bg-[#FFD700]/60' : gw.score >= 70 ? 'bg-white/30' : 'bg-red-400/40';
                      return (
                        <div key={gw.gameweek} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                          <div className="w-8 text-center">
                            <div className="font-mono font-black text-sm text-white/70">
                              {gw.gameweek}
                            </div>
                            <div className="text-[9px] text-white/30">GW</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">Spieltag {gw.gameweek}</div>
                            <div className="text-[10px] text-white/40">
                              {new Date(gw.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="w-24 hidden sm:block">
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                            </div>
                          </div>
                          <div className={`font-mono font-black text-lg w-12 text-right ${scoreColor}`}>
                            {gw.score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Listings */}
              <ListingsWidget player={player} />

              {/* Research Preview */}
              <ResearchPreview posts={playerResearch} />
            </>
          )}

          {tab === 'pbt' && (
            <PBTWidget player={playerWithOwnership} />
          )}

          {tab === 'market' && (
            <>
              <ListingsWidget player={player} />

              {/* Orderbook Depth */}
              {allSellOrders.length > 0 && (() => {
                // Aggregate by price level
                const levels = new Map<number, number>();
                for (const o of allSellOrders) {
                  const price = centsToBsd(o.price);
                  levels.set(price, (levels.get(price) || 0) + (o.quantity - o.filled_qty));
                }
                const sorted = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
                if (sorted.length === 0) return null;
                const maxQty = Math.max(...sorted.map(([, q]) => q));
                // Cumulative volume
                let cumulative = 0;
                const withCum = sorted.map(([price, qty]) => {
                  cumulative += qty;
                  return { price, qty, cumQty: cumulative };
                });
                return (
                  <Card className="p-4 md:p-6">
                    <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-sky-400" />
                      Orderbook-Tiefe
                    </h3>
                    <div className="space-y-1.5">
                      {withCum.map(({ price, qty, cumQty }) => {
                        const barWidth = maxQty > 0 ? (qty / maxQty) * 100 : 0;
                        return (
                          <div key={price} className="flex items-center gap-3">
                            <div className="w-16 text-right shrink-0">
                              <span className="text-xs font-mono font-bold text-[#FFD700]">{fmtBSD(price)}</span>
                            </div>
                            <div className="flex-1 h-5 bg-white/[0.02] rounded relative overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-red-500/15 border-r border-red-500/30 rounded transition-all"
                                style={{ width: `${barWidth}%` }}
                              />
                              <div className="absolute inset-y-0 flex items-center px-2 text-[10px] font-mono text-white/50">
                                {qty} DPC
                              </div>
                            </div>
                            <div className="w-10 text-right shrink-0">
                              <span className="text-[10px] font-mono text-white/30">{cumQty}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
                      <span>Preis (BSD)</span>
                      <span>Σ Kumuliert</span>
                    </div>
                  </Card>
                );
              })()}

              <TopOwnersWidget player={player} />
            </>
          )}

          {tab === 'research' && (
            <div className="space-y-4">
              {playerResearch.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-white/20" />
                  <div className="text-white/50">Noch keine Research-Berichte</div>
                  <div className="text-sm text-white/30">Berichte zu diesem Spieler erscheinen hier</div>
                </Card>
              ) : (
                playerResearch.map(post => (
                  <ResearchCard
                    key={post.id}
                    post={post}
                    onUnlock={async (id) => {
                      if (!user || unlockingId) return;
                      setUnlockingId(id);
                      try {
                        const result = await unlockResearch(user.id, id);
                        if (result.success) {
                          const updated = await getResearchPosts({ playerId, currentUserId: user.id });
                          setPlayerResearch(updated);
                        }
                      } catch { /* silently fail */ } finally {
                        setUnlockingId(null);
                      }
                    }}
                    unlockingId={unlockingId}
                    onRate={async (id, rating) => {
                      if (!user || ratingId) return;
                      setRatingId(id);
                      try {
                        const result = await rateResearch(user.id, id, rating);
                        if (result.success) {
                          setPlayerResearch(prev => prev.map(p =>
                            p.id === id
                              ? { ...p, avg_rating: result.avg_rating ?? p.avg_rating, ratings_count: result.ratings_count ?? p.ratings_count, user_rating: result.user_rating ?? p.user_rating }
                              : p
                          ));
                        }
                      } catch { /* silently fail */ } finally {
                        setRatingId(null);
                      }
                    }}
                    ratingId={ratingId}
                  />
                ))
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-6">
              {/* Order Book (Transfermarkt) */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-b border-orange-500/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-orange-300" />
                      <span className="font-black">Transfermarkt (User-Angebote)</span>
                    </div>
                    <span className="text-xs text-white/40">{allSellOrders.length} Order{allSellOrders.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="p-4">
                  {allSellOrders.length === 0 ? (
                    <div className="text-center py-6 text-white/40 text-sm">Keine offenen User-Angebote</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2 text-[10px] text-white/40 px-3 pb-1 border-b border-white/5">
                        <span>Preis</span>
                        <span>Menge</span>
                        <span>Gesamt</span>
                        <span>Verkäufer</span>
                      </div>
                      {allSellOrders.map((order) => {
                        const remaining = order.quantity - order.filled_qty;
                        const isOwn = user && order.user_id === user.id;
                        const sellerHandle = profileMap[order.user_id]?.handle;
                        return (
                          <div key={order.id} className={`grid grid-cols-4 gap-2 items-center px-3 py-2 rounded-lg text-sm ${isOwn ? 'bg-[#FFD700]/5 border border-[#FFD700]/20' : 'bg-white/[0.02]'}`}>
                            <span className="font-mono font-bold text-[#FFD700]">{formatBsd(order.price)}</span>
                            <span className="font-mono">{remaining} DPC</span>
                            <span className="font-mono text-white/60">{formatBsd(order.price * remaining)}</span>
                            <span className="text-xs">
                              {isOwn
                                ? <span className="text-[#FFD700] font-bold">Du</span>
                                : <span className="text-white/60">@{sellerHandle || order.user_id.slice(0, 8)}</span>
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>

              {/* Trade History */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-sky-500/10 to-sky-500/5 border-b border-sky-500/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-sky-300" />
                      <span className="font-black">Trade-Historie</span>
                    </div>
                    <span className="text-xs text-white/40">{trades.length} Trade{trades.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="p-4">
                  {tradesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                    </div>
                  ) : trades.length === 0 ? (
                    <div className="text-center py-6 text-white/40 text-sm">Noch keine Trades für diesen Spieler</div>
                  ) : (
                    <div className="space-y-1">
                      {trades.map((trade) => {
                        const isIpoBuy = trade.ipo_id !== null || trade.seller_id === null;
                        const isBuyer = user && trade.buyer_id === user.id;
                        const isSeller = user && trade.seller_id === user.id;
                        const buyerHandle = profileMap[trade.buyer_id]?.handle;
                        const sellerHandle = trade.seller_id ? profileMap[trade.seller_id]?.handle : null;
                        const tradeTime = (() => {
                          const d = new Date(trade.executed_at);
                          const diff = Date.now() - d.getTime();
                          if (diff < 60000) return 'gerade eben';
                          if (diff < 3600000) return `vor ${Math.floor(diff / 60000)}m`;
                          if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)}h`;
                          return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        })();

                        return (
                          <div key={trade.id} className={`px-3 py-2.5 rounded-lg text-sm ${isBuyer || isSeller ? 'bg-sky-500/5 border border-sky-500/10' : 'bg-white/[0.02]'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/40 w-20">{tradeTime}</span>
                                {isIpoBuy ? (
                                  <span className="px-1.5 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] font-bold text-[10px]">IPO</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px]">Markt</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#FFD700]">{formatBsd(trade.price)} BSD</span>
                                <span className="text-white/40 font-mono text-xs">×{trade.quantity}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-white/50">
                              <span className={isBuyer ? 'text-[#22C55E] font-bold' : ''}>
                                {isBuyer ? 'Du' : `@${buyerHandle || trade.buyer_id.slice(0, 8)}`}
                              </span>
                              <ArrowRight className="w-3 h-3 text-white/30" />
                              <span className="text-white/30">kauft von</span>
                              <ArrowRight className="w-3 h-3 text-white/30" />
                              <span className={isSeller ? 'text-red-300 font-bold' : ''}>
                                {isIpoBuy
                                  ? <span className="text-[#22C55E]">Club (IPO)</span>
                                  : isSeller
                                    ? 'Du'
                                    : `@${sellerHandle || trade.seller_id?.slice(0, 8)}`
                                }
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>

              {/* Debug Info */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/10 p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-white/50" />
                    <span className="font-black">Preis-Info</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                      <div className="text-xs text-purple-300">Club IPO-Preis</div>
                      <div className="font-mono font-bold text-purple-200">{fmtBSD(player.prices.ipoPrice ?? 0)} BSD</div>
                      <div className="text-[10px] text-white/30 mt-0.5">Fest, vom Club gesetzt</div>
                    </div>
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
                      <div className="text-xs text-sky-300">Markt Floor</div>
                      <div className="font-mono font-bold text-[#FFD700]">{fmtBSD(player.prices.floor ?? 0)} BSD</div>
                      <div className="text-[10px] text-white/30 mt-0.5">Günstigstes User-Angebot</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <div className="text-xs text-white/40">Letzter Trade</div>
                      <div className="font-mono font-bold">{fmtBSD(player.prices.lastTrade ?? 0)} BSD</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <div className="text-xs text-white/40">24h Change</div>
                      <div className={`font-mono font-bold ${player.prices.change24h >= 0 ? 'text-[#22C55E]' : 'text-red-300'}`}>
                        {player.prices.change24h >= 0 ? '+' : ''}{player.prices.change24h.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <div className="text-xs text-white/40">Club-Pool DPCs</div>
                      <div className="font-mono font-bold">{dpcAvailable}</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <div className="text-xs text-white/40">User-Orders</div>
                      <div className="font-mono font-bold">{allSellOrders.length}</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <div className="text-xs text-white/40">Dein Bestand</div>
                      <div className="font-mono font-bold text-[#22C55E]">{holdingQty} DPC</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <div className="text-xs text-white/40">Im Umlauf</div>
                      <div className="font-mono font-bold">{player.dpc.circulation}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ===== RIGHT COLUMN (1/3) ===== */}
        <div className="space-y-6">
          {/* Liquidated state — no trading */}
          {player.isLiquidated && (
            <Card className="p-4 border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 text-red-300 mb-2">
                <Lock className="w-4 h-4" />
                <span className="font-bold text-sm">Trading gesperrt</span>
              </div>
              <div className="text-xs text-white/50">Dieser Spieler wurde liquidiert. Kauf und Verkauf sind nicht mehr möglich.</div>
            </Card>
          )}

          {/* Toast Notifications */}
          {buySuccess && (
            <div className="bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] rounded-xl px-4 py-3 text-sm font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {buySuccess}
              </div>
              {!shared && (
                <button
                  onClick={handleShareTrade}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E]/20 hover:bg-[#22C55E]/30 rounded-lg text-xs font-bold text-[#22C55E] transition-all"
                >
                  <Share2 className="w-3 h-3" />
                  In Community teilen
                </button>
              )}
            </div>
          )}
          {buyError && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {buyError}
            </div>
          )}

          {/* Buy Confirmation Dialog (when user has own sell orders) */}
          {pendingBuyQty !== null && (
            <Card className="overflow-hidden">
              <div className="bg-orange-500/20 border-b border-orange-500/30 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-300" />
                  <span className="font-black text-orange-300">Hinweis</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-sm text-white/80">
                  Du hast aktuell <span className="font-bold text-[#FFD700]">
                    {userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0)} DPC
                  </span> dieses Spielers zum Verkauf gelistet:
                </div>
                <div className="space-y-1">
                  {userOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] rounded-lg text-sm">
                      <span className="font-mono text-[#FFD700]">{formatBsd(order.price)} BSD</span>
                      <span className="text-white/50">×{order.quantity - order.filled_qty}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-white/50 bg-white/[0.02] rounded-lg p-3">
                  Deine eigenen Angebote werden beim Kauf übersprungen.
                  Du kaufst zum besten verfügbaren Preis von einem anderen User.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    className="flex-1"
                    onClick={() => executeBuy(pendingBuyQty)}
                    disabled={buying}
                  >
                    {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Ja, {pendingBuyQty} DPC kaufen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPendingBuyQty(null)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* IPO Buy Widget (green, only when active IPO) */}
          {!player.isLiquidated && activeIpo && (activeIpo.status === 'open' || activeIpo.status === 'early_access') && (
            <IPOBuyWidget
              ipo={activeIpo}
              userPurchased={userIpoPurchased}
              balanceCents={balanceCents}
              onBuy={handleIpoBuy}
              buying={ipoBuying}
            />
          )}

          {/* Transfer Buy Widget (always shown, user-to-user only) */}
          {!player.isLiquidated && (
            <TransferBuyWidget
              player={player}
              balanceCents={balanceCents}
              holdingQty={holdingQty}
              sellOrderCount={allSellOrders.filter(o => user && o.user_id !== user.id).reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0)}
              onBuy={handleBuy}
              buying={buying}
            />
          )}

          {/* Your Holdings */}
          {!player.isLiquidated && (
            <YourHoldingsWidget
              player={playerWithOwnership}
              floorPriceCents={Math.round((player.prices.floor ?? 0) * 100)}
              userOrders={userOrders}
              onSell={handleSell}
              onCancelOrder={handleCancelOrder}
              selling={selling}
              cancellingId={cancellingId}
            />
          )}

          {/* Top Owners */}
          <TopOwnersWidget player={player} />
        </div>
      </div>
    </div>
  );
}
