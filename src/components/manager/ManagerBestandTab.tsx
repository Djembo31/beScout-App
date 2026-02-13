'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Filter, ChevronDown, X, ArrowUpDown,
  Package,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, Pos, DbIpo } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';

// ============================================
// TYPES
// ============================================

interface ManagerBestandTabProps {
  players: Player[];
  holdings: HoldingWithPlayer[];
  ipoList: DbIpo[];
  userId: string | undefined;
}

type BestandPlayer = {
  player: Player;
  quantity: number;
  avgBuyPriceBsd: number;
  floorBsd: number;
  pnlBsd: number;
  pnlPct: number;
  purchasedAt: string;
  isOnTransferList: boolean;
  hasActiveIpo: boolean;
};

type SortOption = 'name' | 'value_desc' | 'l5' | 'date' | 'pnl_desc' | 'pnl_asc';
type MarketFilter = 'all' | 'listed' | 'unlisted';

const ACTIVE_IPO_STATUSES = new Set(['announced', 'early_access', 'open']);

// ============================================
// COMPONENT
// ============================================

export default function ManagerBestandTab({ players, holdings, ipoList, userId }: ManagerBestandTabProps) {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Set<Pos>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('value_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');

  // Build bestand data
  const bestandItems = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const ipoMap = new Map(ipoList.map(ipo => [ipo.player_id, ipo]));

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
      const isOnTransferList = player.listings.some(l => l.sellerId === userId);
      const ipo = ipoMap.get(player.id);
      const hasActiveIpo = ipo ? ACTIVE_IPO_STATUSES.has(ipo.status) : false;

      items.push({
        player,
        quantity: h.quantity,
        avgBuyPriceBsd: avgBuyBsd,
        floorBsd,
        pnlBsd,
        pnlPct,
        purchasedAt: h.created_at,
        isOnTransferList,
        hasActiveIpo,
      });
    }
    return items;
  }, [players, holdings, ipoList, userId]);

  // Derive filter options from data
  const { countries, leagues, clubs } = useMemo(() => {
    const countrySet = new Set<string>();
    const leagueSet = new Set<string>();
    const clubSet = new Set<string>();
    for (const item of bestandItems) {
      if (item.player.country) countrySet.add(item.player.country);
      if (item.player.league) leagueSet.add(item.player.league);
      clubSet.add(item.player.club);
    }
    return {
      countries: Array.from(countrySet).sort(),
      leagues: Array.from(leagueSet).sort(),
      clubs: Array.from(clubSet).sort(),
    };
  }, [bestandItems]);

  // Summary stats (always unfiltered)
  const summary = useMemo(() => {
    let totalPlayers = 0;
    let totalValue = 0;
    let totalInvested = 0;
    for (const item of bestandItems) {
      totalPlayers++;
      totalValue += item.floorBsd * item.quantity;
      totalInvested += item.avgBuyPriceBsd * item.quantity;
    }
    const pnl = totalValue - totalInvested;
    const pnlPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
    return { totalPlayers, totalValue, totalInvested, pnl, pnlPct };
  }, [bestandItems]);

  // Filtered + sorted items
  const filtered = useMemo(() => {
    let result = [...bestandItems];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(item =>
        `${item.player.first} ${item.player.last} ${item.player.club}`.toLowerCase().includes(q)
      );
    }
    if (posFilter.size > 0) {
      result = result.filter(item => posFilter.has(item.player.pos));
    }
    if (statusFilter !== 'all') {
      result = result.filter(item => item.player.status === statusFilter);
    }
    if (marketFilter === 'listed') {
      result = result.filter(item => item.isOnTransferList);
    } else if (marketFilter === 'unlisted') {
      result = result.filter(item => !item.isOnTransferList);
    }
    if (countryFilter) {
      result = result.filter(item => item.player.country === countryFilter);
    }
    if (leagueFilter) {
      result = result.filter(item => item.player.league === leagueFilter);
    }
    if (clubFilter) {
      result = result.filter(item => item.player.club === clubFilter);
    }

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
  }, [bestandItems, query, posFilter, statusFilter, marketFilter, countryFilter, leagueFilter, clubFilter, sortBy]);

  const togglePos = (pos: Pos) => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  };

  const activeFilterCount =
    (posFilter.size > 0 ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (marketFilter !== 'all' ? 1 : 0) +
    (countryFilter ? 1 : 0) +
    (leagueFilter ? 1 : 0) +
    (clubFilter ? 1 : 0);

  const resetFilters = () => {
    setPosFilter(new Set());
    setStatusFilter('all');
    setMarketFilter('all');
    setCountryFilter('');
    setLeagueFilter('');
    setClubFilter('');
    setSortBy('value_desc');
    setQuery('');
  };

  const getPnlColor = (pnl: number) => pnl >= 0 ? 'text-[#22C55E]' : 'text-red-300';

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px] bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Spieler</div>
          <div className="text-xl font-black font-mono">{summary.totalPlayers}</div>
        </div>
        <div className="flex-1 min-w-[140px] bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Kaderwert</div>
          <div className="text-xl font-black font-mono text-[#FFD700]">{fmtBSD(Math.round(summary.totalValue))}</div>
        </div>
        <div className="flex-1 min-w-[140px] bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Investiert</div>
          <div className="text-xl font-black font-mono text-white/70">{fmtBSD(Math.round(summary.totalInvested))}</div>
        </div>
        <div className="flex-1 min-w-[140px] bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">G/V</div>
          <div className={`text-xl font-black font-mono ${getPnlColor(summary.pnl)}`}>
            {summary.pnl >= 0 ? '+' : ''}{fmtBSD(Math.round(summary.pnl))}
            <span className="text-sm ml-1">({summary.pnl >= 0 ? '+' : ''}{summary.pnlPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        {/* Search + Filter Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Spieler, Verein suchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-[#FFD700] text-black text-[10px] font-black rounded-full">{activeFilterCount}</span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Position Chips */}
        <div className="flex items-center gap-1">
          {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => {
            const active = posFilter.has(pos);
            const colors: Record<Pos, { bg: string; border: string; text: string }> = {
              GK: { bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-300' },
              DEF: { bg: 'bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-300' },
              MID: { bg: 'bg-sky-500/20', border: 'border-sky-400', text: 'text-sky-300' },
              ATT: { bg: 'bg-rose-500/20', border: 'border-rose-400', text: 'text-rose-300' },
            };
            const c = colors[pos];
            return (
              <button
                key={pos}
                onClick={() => togglePos(pos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${
                  active
                    ? `${c.bg} ${c.border} ${c.text}`
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
                }`}
              >
                {pos}
              </button>
            );
          })}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="flex items-start gap-3 flex-wrap pt-2 border-t border-white/5">
            {/* Country */}
            {countries.length > 1 && (
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 appearance-none cursor-pointer pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="">Alle Länder</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* League */}
            {leagues.length > 1 && (
              <select
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 appearance-none cursor-pointer pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="">Alle Ligen</option>
                {leagues.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}

            {/* Club */}
            {clubs.length > 1 && (
              <select
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 appearance-none cursor-pointer pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="">Alle Vereine</option>
                {clubs.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Status */}
            <div className="flex items-center gap-1">
              {[
                { value: 'all', label: 'Alle' },
                { value: 'fit', label: 'Fit' },
                { value: 'injured', label: 'Verletzt' },
                { value: 'suspended', label: 'Gesperrt' },
                { value: 'doubtful', label: 'Fraglich' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    statusFilter === opt.value
                      ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Market */}
            <div className="flex items-center gap-1">
              {[
                { value: 'all' as MarketFilter, label: 'Alle' },
                { value: 'listed' as MarketFilter, label: 'Gelistet' },
                { value: 'unlisted' as MarketFilter, label: 'Nicht gelistet' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMarketFilter(opt.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    marketFilter === opt.value
                      ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-white/40" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 appearance-none cursor-pointer pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="value_desc">Wert (höchste)</option>
                <option value="name">Name A-Z</option>
                <option value="l5">L5 Score</option>
                <option value="date">Kaufdatum</option>
                <option value="pnl_desc">G/V (beste)</option>
                <option value="pnl_asc">G/V (schlechteste)</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {posFilter.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                Pos: {Array.from(posFilter).join(', ')}
                <button onClick={() => setPosFilter(new Set())} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('all')} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {marketFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-400/20 rounded-lg text-[11px] text-sky-300/70">
                {marketFilter === 'listed' ? 'Gelistet' : 'Nicht gelistet'}
                <button onClick={() => setMarketFilter('all')} className="ml-0.5 hover:text-sky-300"><X className="w-3 h-3" /></button>
              </span>
            )}
            {countryFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                {countryFilter}
                <button onClick={() => setCountryFilter('')} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {leagueFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                {leagueFilter}
                <button onClick={() => setLeagueFilter('')} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {clubFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                {clubFilter}
                <button onClick={() => setClubFilter('')} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={resetFilters} className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-1">
              Alle zurücksetzen
            </button>
          </div>
        )}
      </Card>

      {/* Result count */}
      <div className="text-sm text-white/50">{filtered.length} Spieler im Bestand</div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-white/20" />
          {bestandItems.length === 0 ? (
            <>
              <div className="text-white/30 mb-2">Noch keine Spieler im Bestand</div>
              <div className="text-sm text-white/50">Kaufe DPCs über Scouting oder Transferliste.</div>
            </>
          ) : (
            <>
              <div className="text-white/30 mb-2">Keine Spieler gefunden</div>
              <div className="text-sm text-white/50">Versuche andere Suchbegriffe oder Filter</div>
            </>
          )}
        </Card>
      )}

      {/* Player List */}
      {filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map(item => (
            <PlayerDisplay key={item.player.id} variant="compact" player={item.player}
              holding={{
                quantity: item.quantity,
                avgBuyPriceBsd: item.avgBuyPriceBsd,
                isOnTransferList: item.isOnTransferList,
                hasActiveIpo: item.hasActiveIpo,
                purchasedAt: item.purchasedAt,
              }} />
          ))}
        </div>
      )}
    </div>
  );
}
