'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Filter, ChevronDown, ChevronUp, X, ArrowUpDown,
  Package, Tag, MessageSquare, Loader2, Trash2, DollarSign,
  TrendingUp, TrendingDown, Minus, AlertCircle,
} from 'lucide-react';
import { Card, Button, SearchInput, PosFilter, EmptyState } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { fmtBSD, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getClub } from '@/lib/clubs';
import type { Player, Pos, DbIpo, OfferWithDetails } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
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
  floorBsd: number;
  pnlBsd: number;
  pnlPct: number;
  purchasedAt: string;
  myListings: { id: string; qty: number; priceBsd: number }[];
  listedQty: number;
  availableToSell: number;
  offers: OfferWithDetails[];
};

type SortOption = 'name' | 'value_desc' | 'l5' | 'date' | 'pnl_desc' | 'pnl_asc';

const FEE_RATE = 0.06; // 6% total fee

// ============================================
// INLINE SELL FORM
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
    const base = item.floorBsd > 0 ? item.floorBsd : item.avgBuyPriceBsd;
    setPriceBsd((base * multiplier).toFixed(2));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-wider font-black">
        <DollarSign className="w-3 h-3" />
        Verkaufen
        <span className="font-normal normal-case text-white/25">
          ({item.availableToSell} von {item.quantity} verfügbar)
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Quantity */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-1.5 py-2 text-white/40 hover:text-white text-sm font-bold">−</button>
          <span className="w-6 text-center text-sm font-mono font-bold">{qty}</span>
          <button onClick={() => setQty(Math.min(item.availableToSell, qty + 1))} className="px-1.5 py-2 text-white/40 hover:text-white text-sm font-bold">+</button>
        </div>

        {/* Price */}
        <div className="relative flex-1">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={priceBsd}
            onChange={(e) => setPriceBsd(e.target.value)}
            placeholder="Preis pro DPC"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25 pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-bold">BSD</span>
        </div>
      </div>

      {/* Quick Price Buttons */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-white/25 mr-1">Schnellwahl:</span>
        {item.floorBsd > 0 && (
          <button onClick={() => setQuickPrice(1)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#FFD700] hover:border-[#FFD700]/20 transition-all">
            Floor {fmtBSD(item.floorBsd)}
          </button>
        )}
        <button onClick={() => setQuickPrice(1.05)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#22C55E] hover:border-[#22C55E]/20 transition-all">+5%</button>
        <button onClick={() => setQuickPrice(1.10)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#22C55E] hover:border-[#22C55E]/20 transition-all">+10%</button>
        <button onClick={() => setQuickPrice(1.20)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-[#22C55E] hover:border-[#22C55E]/20 transition-all">+20%</button>
      </div>

      {/* Fee Breakdown */}
      {priceNum > 0 && (
        <div className="flex items-center gap-4 text-[11px] font-mono bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2">
          <span className="text-white/40">Brutto: <span className="text-white/70">{fmtBSD(gross)}</span></span>
          <span className="text-white/40">Gebühr: <span className="text-red-300/70">−{fmtBSD(fee)}</span> <span className="text-white/20">(6%)</span></span>
          <span className="text-white/40">Netto: <span className="text-[#FFD700] font-bold">{fmtBSD(net)}</span></span>
        </div>
      )}

      {/* Submit */}
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
// PLAYER ROW (EXPANDABLE)
// ============================================

function PlayerCard({ item, isExpanded, onToggle, onSell, onCancelOrder }: {
  item: BestandPlayer;
  isExpanded: boolean;
  onToggle: () => void;
  onSell: (playerId: string, qty: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
      'bg-white/[0.02] border rounded-2xl transition-all overflow-hidden',
      isExpanded ? 'border-[#FFD700]/20 shadow-[0_0_20px_rgba(255,215,0,0.05)]' : 'border-white/[0.06] hover:border-white/10'
    )}>
      {/* Header Row */}
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        {/* Position + Name */}
        <PositionBadge pos={p.pos} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/player/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-sm hover:text-[#FFD700] transition-colors truncate">
              {p.first} {p.last}
            </Link>
            <span className="text-[10px] text-white/25 shrink-0">{p.club}</span>
          </div>
          {/* Status Badges */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/30 font-mono">{item.quantity} DPC · EK {fmtBSD(item.avgBuyPriceBsd)}</span>
            {item.listedQty > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded text-[9px] font-bold text-[#FFD700]">
                <Tag className="w-2.5 h-2.5" />
                {item.listedQty} gelistet
              </span>
            )}
            {item.offers.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-500/10 border border-sky-400/20 rounded text-[9px] font-bold text-sky-300">
                <MessageSquare className="w-2.5 h-2.5" />
                {item.offers.length} {item.offers.length === 1 ? 'Angebot' : 'Angebote'}
              </span>
            )}
          </div>
        </div>

        {/* Value + P&L */}
        <div className="text-right shrink-0">
          <div className="text-sm font-mono font-bold text-[#FFD700]">{fmtBSD(item.floorBsd * item.quantity)}</div>
          <div className={cn('text-[10px] font-mono flex items-center justify-end gap-0.5', pnlColor)}>
            <TrendIcon className="w-2.5 h-2.5" />
            {item.pnlBsd >= 0 ? '+' : ''}{fmtBSD(Math.round(item.pnlBsd))}
            <span className="text-white/20 ml-0.5">({item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Expand Toggle */}
        <div className="shrink-0 ml-1">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#FFD700]/50" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4 anim-dropdown">
          {/* My Listings */}
          {item.myListings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[10px] text-[#FFD700]/60 uppercase tracking-wider font-black mb-2">
                <Tag className="w-3 h-3" />
                Meine Listings
              </div>
              <div className="space-y-1.5">
                {item.myListings.map(listing => (
                  <div key={listing.id} className="flex items-center justify-between px-3 py-2 bg-[#FFD700]/[0.03] border border-[#FFD700]/10 rounded-xl">
                    <div className="text-sm">
                      <span className="font-mono font-bold">{listing.qty}×</span>
                      <span className="text-[#FFD700] font-mono font-bold ml-2">{fmtBSD(listing.priceBsd)} BSD</span>
                      <span className="text-white/25 text-xs ml-2">
                        (Netto {fmtBSD(listing.priceBsd * listing.qty * (1 - FEE_RATE))})
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancel(listing.id)}
                      disabled={cancellingId === listing.id}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      {cancellingId === listing.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
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
                <MessageSquare className="w-3 h-3" />
                Eingehende Angebote
              </div>
              <div className="space-y-1.5">
                {item.offers.map(offer => (
                  <Link
                    key={offer.id}
                    href="/market?tab=angebote"
                    className="flex items-center justify-between px-3 py-2 bg-sky-500/[0.03] border border-sky-400/10 rounded-xl hover:bg-sky-500/[0.06] transition-all"
                  >
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
  const [leagueFilter, setLeagueFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('value_desc');
  const [showFilters, setShowFilters] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build bestand data
  const bestandItems = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const ipoMap = new Map(ipoList.map(ipo => [ipo.player_id, ipo]));

    // Group offers by player
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
      const floorBsd = player.listings.length > 0
        ? Math.min(...player.listings.map(l => l.price))
        : player.prices.floor ?? 0;
      const pnlBsd = (floorBsd - avgBuyBsd) * h.quantity;
      const pnlPct = avgBuyBsd > 0 ? ((floorBsd - avgBuyBsd) / avgBuyBsd) * 100 : 0;

      // User's own listings
      const myListings = userId
        ? player.listings.filter(l => l.sellerId === userId).map(l => ({
            id: l.id,
            qty: l.qty ?? 1,
            priceBsd: l.price,
          }))
        : [];
      const listedQty = myListings.reduce((sum, l) => sum + l.qty, 0);

      items.push({
        player,
        quantity: h.quantity,
        avgBuyPriceBsd: avgBuyBsd,
        floorBsd,
        pnlBsd,
        pnlPct,
        purchasedAt: h.created_at,
        myListings,
        listedQty,
        availableToSell: h.quantity - listedQty,
        offers: offersByPlayer.get(player.id) ?? [],
      });
    }
    return items;
  }, [players, holdings, ipoList, userId, incomingOffers]);

  // Derive unique countries, leagues, clubs from ALL players (not just owned)
  const filterOptions = useMemo(() => {
    const countries = new Set<string>();
    const leagues = new Map<string, Set<string>>(); // country → leagues
    const clubs = new Map<string, Set<string>>();   // league → clubs
    for (const p of players) {
      const cl = getClub(p.club);
      const country = cl?.country ?? 'Unbekannt';
      const league = cl?.league ?? p.league ?? 'Unbekannt';
      const club = p.club;
      countries.add(country);
      if (!leagues.has(country)) leagues.set(country, new Set());
      leagues.get(country)!.add(league);
      if (!clubs.has(league)) clubs.set(league, new Set());
      clubs.get(league)!.add(club);
    }
    return {
      countries: Array.from(countries).sort(),
      leagues,
      clubs,
    };
  }, [players]);

  // Cascade: when country changes, reset league if not in that country
  const availableLeagues = useMemo(() => {
    if (!countryFilter) {
      const all = new Set<string>();
      filterOptions.leagues.forEach(set => set.forEach(l => all.add(l)));
      return Array.from(all).sort();
    }
    return Array.from(filterOptions.leagues.get(countryFilter) ?? []).sort();
  }, [countryFilter, filterOptions]);

  const availableClubs = useMemo(() => {
    if (!leagueFilter) {
      const all = new Set<string>();
      // If country filter is set, only show clubs from that country's leagues
      if (countryFilter) {
        const countryLeagues = filterOptions.leagues.get(countryFilter) ?? new Set();
        countryLeagues.forEach(lg => {
          (filterOptions.clubs.get(lg) ?? new Set()).forEach(c => all.add(c));
        });
      } else {
        filterOptions.clubs.forEach(set => set.forEach(c => all.add(c)));
      }
      return Array.from(all).sort();
    }
    return Array.from(filterOptions.clubs.get(leagueFilter) ?? []).sort();
  }, [leagueFilter, countryFilter, filterOptions]);

  // Summary stats
  const summary = useMemo(() => {
    let totalPlayers = 0, totalValue = 0, totalInvested = 0, totalListed = 0, totalOffers = 0;
    for (const item of bestandItems) {
      totalPlayers++;
      totalValue += item.floorBsd * item.quantity;
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
    if (leagueFilter) result = result.filter(item => {
      const cl = getClub(item.player.club);
      return (cl?.league ?? item.player.league) === leagueFilter;
    });
    if (countryFilter) result = result.filter(item => {
      const cl = getClub(item.player.club);
      return (cl?.country ?? 'Unbekannt') === countryFilter;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return `${a.player.last}`.localeCompare(`${b.player.last}`);
        case 'value_desc': return (b.floorBsd * b.quantity) - (a.floorBsd * a.quantity);
        case 'l5': return b.player.perf.l5 - a.player.perf.l5;
        case 'date': return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
        case 'pnl_desc': return b.pnlBsd - a.pnlBsd;
        case 'pnl_asc': return a.pnlBsd - b.pnlBsd;
        default: return 0;
      }
    });
    return result;
  }, [bestandItems, query, posFilter, clubFilter, leagueFilter, countryFilter, sortBy]);

  const togglePos = useCallback((pos: Pos) => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  }, []);

  const getPnlColor = (pnl: number) => pnl >= 0 ? 'text-[#22C55E]' : 'text-red-300';

  return (
    <div className="space-y-5">
      {/* Summary Stats — 2×2 Grid */}
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

      <SponsorBanner placement="market_portfolio" className="mb-3" />

      {/* Search + Filters */}
      <div className="flex items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Spieler suchen..." className="flex-1 min-w-0" />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0',
            showFilters ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]' : 'bg-white/5 border-white/10 text-white/50'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          <ChevronDown className={cn('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
        </button>
      </div>

      {/* Filters (collapsible) */}
      {showFilters && (
        <div className="space-y-3 anim-dropdown">
          {/* Position Chips + Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <PosFilter multi selected={posFilter} onChange={togglePos} />
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 focus:outline-none"
              >
                <option value="value_desc">Wert ↓</option>
                <option value="pnl_desc">G/V ↓</option>
                <option value="pnl_asc">G/V ↑</option>
                <option value="l5">L5 Score</option>
                <option value="name">Name A-Z</option>
                <option value="date">Kaufdatum</option>
              </select>
            </div>
          </div>

          {/* Land / Liga / Verein Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Land */}
            <select
              value={countryFilter}
              onChange={(e) => { setCountryFilter(e.target.value); setLeagueFilter(''); setClubFilter(''); }}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 focus:outline-none focus:border-[#FFD700]/40"
            >
              <option value="">Alle Länder</option>
              {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Liga */}
            <select
              value={leagueFilter}
              onChange={(e) => { setLeagueFilter(e.target.value); setClubFilter(''); }}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 focus:outline-none focus:border-[#FFD700]/40"
            >
              <option value="">Alle Ligen</option>
              {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {/* Verein */}
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 focus:outline-none focus:border-[#FFD700]/40"
            >
              <option value="">Alle Vereine</option>
              {availableClubs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Reset all */}
            {(posFilter.size > 0 || clubFilter || leagueFilter || countryFilter) && (
              <button
                onClick={() => { setPosFilter(new Set()); setClubFilter(''); setLeagueFilter(''); setCountryFilter(''); }}
                className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 ml-auto"
              >
                <X className="w-3 h-3" />Zurücksetzen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result Count */}
      <div className="text-sm text-white/50">{filtered.length} Spieler im Bestand</div>

      {/* Empty State */}
      {filtered.length === 0 && (
        bestandItems.length === 0 ? (
          <EmptyState icon={<Package />} title="Noch keine Spieler im Bestand" description="Kaufe DPCs über Club Sales oder den Transfermarkt." />
        ) : (
          <EmptyState icon={<Package />} title="Keine Spieler gefunden" description="Versuche andere Suchbegriffe oder Filter" action={{ label: 'Filter zurücksetzen', onClick: () => { setPosFilter(new Set()); setClubFilter(''); setLeagueFilter(''); setCountryFilter(''); setQuery(''); }}} />
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
