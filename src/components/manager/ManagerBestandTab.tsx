'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Package, Tag, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, Pos, DbIpo, OfferWithDetails } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { useRecentMinutes, useNextFixtures, usePlayerEventUsage } from '@/lib/queries/managerData';
import { useMarketStore } from '@/lib/stores/marketStore';
import SponsorBanner from '@/components/player/detail/SponsorBanner';
import { DEFAULT_SORT } from './bestand/bestandHelpers';
import type { BestandLens } from './bestand/bestandHelpers';
import { BestandPlayerRow } from './bestand/BestandPlayerRow';
import type { BestandPlayer } from './bestand/BestandPlayerRow';
import BestandSellModal from './bestand/BestandSellModal';
import BestandToolbar from './bestand/BestandToolbar';
import BestandClubGroup from './bestand/BestandClubGroup';
import { useTranslations } from 'next-intl';

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

// ============================================
// SORT FUNCTION
// ============================================

function sortItems(items: BestandPlayer[], sortBy: string, minutesMap: Map<string, number[]> | undefined): BestandPlayer[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.player.last.localeCompare(b.player.last);
      case 'value_desc': return (b.valueBsd * b.quantity) - (a.valueBsd * a.quantity);
      case 'l5': return b.player.perf.l5 - a.player.perf.l5;
      case 'pnl_desc': return b.pnlBsd - a.pnlBsd;
      case 'pnl_asc': return a.pnlBsd - b.pnlBsd;
      case 'minutes': {
        const aMin = minutesMap?.get(a.player.id);
        const bMin = minutesMap?.get(b.player.id);
        const aAvg = aMin && aMin.length > 0 ? aMin.reduce((s, m) => s + m, 0) / aMin.length : 0;
        const bAvg = bMin && bMin.length > 0 ? bMin.reduce((s, m) => s + m, 0) / bMin.length : 0;
        return bAvg - aAvg;
      }
      case 'offers_desc': return b.offers.length - a.offers.length;
      case 'listed_desc': return b.listedQty - a.listedQty;
      case 'floor_asc': return (a.floorBsd ?? Infinity) - (b.floorBsd ?? Infinity);
      case 'contract_asc': return a.player.contractMonthsLeft - b.player.contractMonthsLeft;
      case 'age_asc': return a.player.age - b.player.age;
      case 'age_desc': return b.player.age - a.player.age;
      default: return 0;
    }
  });
  return sorted;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ManagerBestandTab({
  players, holdings, ipoList, userId, incomingOffers, onSell, onCancelOrder,
}: ManagerBestandTabProps) {
  const t = useTranslations('market');

  // Store state
  const lens = useMarketStore(s => s.bestandLens);
  const setLens = useMarketStore(s => s.setBestandLens);
  const groupByClub = useMarketStore(s => s.bestandGroupByClub);
  const setGroupByClub = useMarketStore(s => s.setBestandGroupByClub);
  const sellPlayerId = useMarketStore(s => s.bestandSellPlayerId);
  const setSellPlayerId = useMarketStore(s => s.setBestandSellPlayerId);
  const expandedClubs = useMarketStore(s => s.expandedClubs);
  const toggleClubExpand = useMarketStore(s => s.toggleClubExpand);

  // Local state
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Set<Pos>>(new Set());
  const [clubFilter, setClubFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortByMap, setSortByMap] = useState<Partial<Record<BestandLens, string>>>({});
  const sortBy = sortByMap[lens] ?? DEFAULT_SORT[lens];

  const setSortBy = useCallback((sort: string) => {
    setSortByMap(prev => ({ ...prev, [lens]: sort }));
  }, [lens]);

  const togglePos = useCallback((pos: Pos) => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  }, []);

  // Manager Data Hooks
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
      const hasListings = player.listings.length > 0;
      const floorBsd = hasListings ? Math.min(...player.listings.map(l => l.price)) : null;
      const activeIpo = ipoList.find(ipo => ipo.player_id === player.id && (ipo.status === 'open' || ipo.status === 'early_access' || ipo.status === 'announced'));
      const hasActiveIpo = !!activeIpo;
      const ipoPriceBsd = activeIpo ? centsToBsd(activeIpo.price) : null;
      const valueBsd = floorBsd ?? ipoPriceBsd ?? avgBuyBsd;
      const pnlBsd = (valueBsd - avgBuyBsd) * h.quantity;
      const pnlPct = avgBuyBsd > 0 ? ((valueBsd - avgBuyBsd) / avgBuyBsd) * 100 : 0;

      const myListings = userId
        ? player.listings.filter(l => l.sellerId === userId).map(l => ({
            id: l.id, qty: l.qty ?? 1, priceBsd: l.price,
          }))
        : [];
      const listedQty = myListings.reduce((sum, l) => sum + l.qty, 0);

      const playerOffers = offersByPlayer.get(player.id) ?? [];

      items.push({
        player, quantity: h.quantity, avgBuyPriceBsd: avgBuyBsd,
        floorBsd, ipoPriceBsd, valueBsd,
        pnlBsd, pnlPct, purchasedAt: h.created_at,
        myListings, listedQty, availableToSell: h.quantity - listedQty,
        offers: playerOffers.map(o => ({ id: o.id, sender_handle: o.sender_handle, quantity: o.quantity, price: o.price })),
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
    return sortItems(result, sortBy, minutesMap);
  }, [bestandItems, query, posFilter, clubFilter, sortBy, minutesMap]);

  // Club-grouped data
  const clubGroups = useMemo(() => {
    if (!groupByClub) return null;
    const groups = new Map<string, { clubId: string; clubName: string; items: BestandPlayer[] }>();
    for (const item of filtered) {
      const key = item.player.clubId ?? item.player.club;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, { clubId: item.player.clubId ?? '', clubName: item.player.club, items: [item] });
      }
    }
    return Array.from(groups.values());
  }, [filtered, groupByClub]);

  // Sell modal item
  const sellItem = useMemo(() =>
    sellPlayerId ? bestandItems.find(i => i.player.id === sellPlayerId) ?? null : null,
    [sellPlayerId, bestandItems]
  );

  const getPnlColor = (pnl: number) => pnl >= 0 ? 'text-[#22C55E]' : 'text-red-300';

  const renderRow = (item: BestandPlayer) => (
    <BestandPlayerRow
      key={item.player.id}
      item={item}
      lens={lens}
      minutes={minutesMap?.get(item.player.id)}
      nextFixture={nextFixturesMap?.get(item.player.clubId ?? '')}
      inLineup={eventUsageMap?.has(item.player.id) ?? false}
      onSellClick={setSellPlayerId}
    />
  );

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
          <div className="text-xl font-black font-mono text-[#FFD700]">{fmtScout(Math.round(summary.totalValue))}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">G/V</div>
          <div className={cn('text-xl font-black font-mono', getPnlColor(summary.pnl))}>
            {summary.pnl >= 0 ? '+' : ''}{fmtScout(Math.round(summary.pnl))}
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

      {/* Toolbar */}
      <BestandToolbar
        lens={lens}
        onLensChange={setLens}
        sortBy={sortBy}
        onSortChange={setSortBy}
        query={query}
        onQueryChange={setQuery}
        posFilter={posFilter}
        onTogglePos={togglePos}
        clubFilter={clubFilter}
        onClubFilterChange={setClubFilter}
        availableClubs={availableClubs}
        groupByClub={groupByClub}
        onGroupByClubChange={setGroupByClub}
        showFilters={showFilters}
        onShowFiltersChange={setShowFilters}
      />

      {/* Result Count */}
      <div className="text-sm text-white/50">
        {t('bestandPlayersInSquad', { count: filtered.length })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        bestandItems.length === 0 ? (
          <EmptyState icon={<Package />} title="Noch keine Spieler im Kader" description="Kaufe DPCs über Club Sales oder den Transfermarkt." />
        ) : (
          <EmptyState icon={<Package />} title="Keine Spieler gefunden" description="Versuche andere Suchbegriffe oder Filter"
            action={{ label: t('resetFilters'), onClick: () => { setPosFilter(new Set()); setClubFilter(''); setQuery(''); }}} />
        )
      )}

      {/* Player List */}
      {filtered.length > 0 && (
        groupByClub && clubGroups ? (
          <div className="space-y-2">
            {clubGroups.map(group => (
              <BestandClubGroup
                key={group.clubId || group.clubName}
                clubId={group.clubId}
                clubName={group.clubName}
                playerCount={group.items.length}
                isExpanded={expandedClubs.has(group.clubId || group.clubName)}
                onToggle={() => toggleClubExpand(group.clubId || group.clubName)}
              >
                {group.items.map(renderRow)}
              </BestandClubGroup>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(renderRow)}
          </div>
        )
      )}

      {/* Sell Modal */}
      <BestandSellModal
        item={sellItem}
        open={!!sellPlayerId}
        onClose={() => setSellPlayerId(null)}
        onSell={onSell}
        onCancelOrder={onCancelOrder}
      />
    </div>
  );
}
