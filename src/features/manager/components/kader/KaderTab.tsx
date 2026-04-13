'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Package, Tag, MessageSquare, ShoppingCart, CheckSquare, X, Loader2 } from 'lucide-react';
import { EmptyState, CountryBar, LeagueBar } from '@/components/ui';
import NewUserTip from '@/components/onboarding/NewUserTip';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getCountries, getLeaguesByCountry } from '@/lib/leagues';
import type { Player, Pos, DbIpo, OfferWithDetails } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { useRecentMinutes, useRecentScores, useNextFixtures, usePlayerEventUsage } from '@/lib/queries/managerData';
import { useHoldingLocks } from '@/lib/queries/events';
import { useManagerStore } from '@/features/manager/store/managerStore';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
import { DEFAULT_SORT } from './kaderHelpers';
import type { KaderLens } from './kaderHelpers';
import { KaderPlayerRow } from './KaderPlayerRow';
import type { KaderPlayer } from './KaderPlayerRow';
import KaderSellModal from './KaderSellModal';
import KaderToolbar from './KaderToolbar';
import KaderClubGroup from './KaderClubGroup';
import { useTranslations } from 'next-intl';
import EquipmentShortcut from '../EquipmentShortcut';

// ============================================
// TYPES
// ============================================

interface KaderTabProps {
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

function sortItems(items: KaderPlayer[], sortBy: string, minutesMap: Map<string, number[]> | undefined): KaderPlayer[] {
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

export default function KaderTab({
  players, holdings, ipoList, userId, incomingOffers, onSell, onCancelOrder,
}: KaderTabProps) {
  const t = useTranslations('market');

  // Store state
  const lens = useManagerStore(s => s.kaderLens);
  const setLens = useManagerStore(s => s.setKaderLens);
  const groupByClub = useManagerStore(s => s.kaderGroupByClub);
  const setGroupByClub = useManagerStore(s => s.setKaderGroupByClub);
  const sellPlayerId = useManagerStore(s => s.kaderSellPlayerId);
  const setSellPlayerId = useManagerStore(s => s.setKaderSellPlayerId);
  const expandedClubs = useManagerStore(s => s.expandedClubs);
  const toggleClubExpand = useManagerStore(s => s.toggleClubExpand);
  const setKaderDetailPlayerId = useManagerStore(s => s.setKaderDetailPlayerId);
  const kaderCountry = useManagerStore(s => s.kaderCountry);
  const setKaderCountry = useManagerStore(s => s.setKaderCountry);
  const kaderLeague = useManagerStore(s => s.kaderLeague);
  const setKaderLeague = useManagerStore(s => s.setKaderLeague);

  // Local state
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Set<Pos>>(new Set());
  const [clubFilter, setClubFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortByMap, setSortByMap] = useState<Partial<Record<KaderLens, string>>>({});
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSelling, setBulkSelling] = useState(false);
  const sortBy = sortByMap[lens] ?? DEFAULT_SORT[lens];

  const setSortBy = useCallback((sort: string) => {
    setSortByMap(prev => ({ ...prev, [lens]: sort }));
  }, [lens]);

  const toggleSelect = useCallback((playerId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
  }, []);

  const togglePos = useCallback((pos: Pos) => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  }, []);

  // Manager Data Hooks
  const { data: minutesMap } = useRecentMinutes();
  const { data: scoresMap } = useRecentScores();
  const { data: nextFixturesMap } = useNextFixtures();
  const { data: eventUsageMap } = usePlayerEventUsage(userId);
  const { data: lockedScMap } = useHoldingLocks(userId);

  // Build bestand data
  const bestandItems = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const offersByPlayer = new Map<string, OfferWithDetails[]>();
    for (const offer of incomingOffers) {
      const existing = offersByPlayer.get(offer.player_id) ?? [];
      existing.push(offer);
      offersByPlayer.set(offer.player_id, existing);
    }

    const items: KaderPlayer[] = [];
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
            id: l.id, qty: l.qty ?? 1, priceBsd: l.price, expiresAt: l.expiresAt,
          }))
        : [];
      const listedQty = myListings.reduce((sum, l) => sum + l.qty, 0);

      const playerOffers = offersByPlayer.get(player.id) ?? [];

      const lockedQty = lockedScMap?.get(player.id) ?? 0;

      items.push({
        player, quantity: h.quantity, avgBuyPriceBsd: avgBuyBsd,
        floorBsd, ipoPriceBsd, valueBsd,
        pnlBsd, pnlPct, purchasedAt: h.created_at,
        myListings, listedQty, lockedQty,
        availableToSell: Math.max(0, h.quantity - listedQty - lockedQty),
        offers: playerOffers.map(o => ({ id: o.id, sender_handle: o.sender_handle, quantity: o.quantity, price: o.price })),
        hasActiveIpo,
      });
    }
    return items;
  }, [players, holdings, ipoList, userId, incomingOffers, lockedScMap]);

  const handleBulkSell = useCallback(async () => {
    if (selectedIds.size === 0 || bulkSelling) return;
    setBulkSelling(true);
    for (const playerId of Array.from(selectedIds)) {
      const item = bestandItems.find(i => i.player.id === playerId);
      if (!item || item.availableToSell <= 0 || item.floorBsd == null) continue;
      const priceCents = Math.round(item.floorBsd * 100);
      await onSell(playerId, item.availableToSell, priceCents);
    }
    setBulkSelling(false);
    setSelectedIds(new Set());
    setBulkMode(false);
  }, [selectedIds, bulkSelling, bestandItems, onSell]);

  // Derive unique countries from players in Kader
  const kaderCountries = useMemo(() => {
    const allCountries = getCountries();
    const playerCountryCodes = new Set(
      bestandItems
        .map(i => i.player.leagueCountry)
        .filter((c): c is string => !!c)
    );
    return allCountries.filter(c => playerCountryCodes.has(c.code));
  }, [bestandItems]);

  // Smart collapse: auto-select league when country has only 1 league
  const smartLeague = useMemo(() => {
    if (!kaderCountry) return '';
    const countryLeagues = getLeaguesByCountry(kaderCountry);
    if (countryLeagues.length === 1) return countryLeagues[0].name;
    return kaderLeague;
  }, [kaderCountry, kaderLeague]);

  // Filter available clubs by selected league
  const availableClubs = useMemo(() => {
    let items = bestandItems;
    if (kaderCountry) {
      items = items.filter(i => i.player.leagueCountry === kaderCountry);
    }
    if (smartLeague) {
      items = items.filter(i => i.player.league === smartLeague);
    }
    return Array.from(new Set(items.map(i => i.player.club))).sort();
  }, [bestandItems, kaderCountry, smartLeague]);

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
    // Country / League filter
    if (kaderCountry) {
      result = result.filter(item => item.player.leagueCountry === kaderCountry);
    }
    if (smartLeague) {
      result = result.filter(item => item.player.league === smartLeague);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(item =>
        `${item.player.first} ${item.player.last} ${item.player.club}`.toLowerCase().includes(q)
      );
    }
    if (posFilter.size > 0) result = result.filter(item => posFilter.has(item.player.pos));
    if (clubFilter) result = result.filter(item => item.player.club === clubFilter);
    return sortItems(result, sortBy, minutesMap);
  }, [bestandItems, kaderCountry, smartLeague, query, posFilter, clubFilter, sortBy, minutesMap]);

  // Club-grouped data
  const clubGroups = useMemo(() => {
    if (!groupByClub) return null;
    const groups = new Map<string, { clubId: string; clubName: string; items: KaderPlayer[] }>();
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

  const getPnlColor = (pnl: number) => pnl >= 0 ? 'text-vivid-green' : 'text-vivid-red';

  const renderRow = (item: KaderPlayer) => (
    <KaderPlayerRow
      key={item.player.id}
      item={item}
      lens={lens}
      minutes={minutesMap?.get(item.player.id)}
      scores={scoresMap?.get(item.player.id)}
      nextFixture={nextFixturesMap?.get(item.player.clubId ?? '')}
      inLineup={eventUsageMap?.has(item.player.id) ?? false}
      onSellClick={setSellPlayerId}
      isSelected={bulkMode ? selectedIds.has(item.player.id) : undefined}
      onToggleSelect={bulkMode ? toggleSelect : undefined}
      onRowClick={bulkMode ? undefined : setKaderDetailPlayerId}
    />
  );

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-elevated border border-white/[0.10] rounded-xl px-4 py-3 shadow-card-sm">
          <div className="text-[10px] text-white/50 uppercase font-semibold">{t('bestandSummaryPlayers')}</div>
          <div className="text-xl font-black font-mono tabular-nums">{summary.totalPlayers}</div>
        </div>
        <div className="bg-gold/[0.05] border border-gold/[0.12] rounded-xl px-4 py-3 shadow-card-sm">
          <div className="text-[10px] text-white/50 uppercase font-semibold">{t('bestandSummarySquadValue')}</div>
          <div className="text-xl font-black font-mono tabular-nums text-gold" style={{ textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>{fmtScout(Math.round(summary.totalValue))}</div>
        </div>
        <div className={cn('rounded-xl px-4 py-3 shadow-card-sm border', summary.pnl >= 0 ? 'bg-vivid-green/[0.05] border-vivid-green/[0.12]' : 'bg-vivid-red/[0.05] border-vivid-red/[0.12]')}>
          <div className="text-[10px] text-white/50 uppercase font-semibold">{t('bestandSummaryPnl')}</div>
          <div className={cn('text-xl font-black font-mono tabular-nums', getPnlColor(summary.pnl))}>
            {summary.pnl >= 0 ? '+' : ''}{fmtScout(Math.round(summary.pnl))}
            <span className="text-sm ml-1">({summary.pnlPct >= 0 ? '+' : ''}{summary.pnlPct.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="bg-surface-elevated border border-white/[0.10] rounded-xl px-4 py-3 shadow-card-sm">
          <div className="text-[10px] text-white/50 uppercase font-semibold">{t('bestandSummaryActivity')}</div>
          <div className="flex items-center gap-3 mt-1">
            {summary.totalListed > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-gold">
                <Tag className="size-3" aria-hidden="true" />{t('bestandListedCount', { count: summary.totalListed })}
              </span>
            )}
            {summary.totalOffers > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-sky-300">
                <MessageSquare className="size-3" aria-hidden="true" />{t('bestandOfferCount', { count: summary.totalOffers })}
              </span>
            )}
            {summary.totalListed === 0 && summary.totalOffers === 0 && (
              <span className="text-xs text-white/30">{t('bestandSummaryNone')}</span>
            )}
          </div>
        </div>
      </div>

      <SponsorBanner placement="market_portfolio" className="mb-2" />

      {/* Equipment shortcut → /inventory?tab=equipment */}
      <EquipmentShortcut />

      {/* Country + League Bars */}
      <CountryBar
        countries={kaderCountries}
        selected={kaderCountry}
        onSelect={setKaderCountry}
      />
      <LeagueBar
        selected={smartLeague}
        onSelect={setKaderLeague}
        country={kaderCountry || undefined}
        size="sm"
      />

      {/* Toolbar */}
      <KaderToolbar
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

      {/* Result Count + Bulk Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">
          {t('bestandPlayersInSquad', { count: filtered.length })}
        </span>
        {filtered.length > 1 && (
          <button
            onClick={() => { setBulkMode(v => !v); setSelectedIds(new Set()); }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors',
              bulkMode ? 'bg-gold/10 text-gold border border-gold/20' : 'text-white/40 hover:text-white/60 hover:bg-surface-base',
            )}
          >
            <CheckSquare className="size-3.5" />
            {bulkMode ? t('bestandBulkCancel') : t('bestandBulkSelect')}
          </button>
        )}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        bestandItems.length === 0 ? (
          <NewUserTip
            tipKey="bestand-empty"
            icon={<ShoppingCart className="w-5 h-5" />}
            title={t('bestandEmptyTitle')}
            description={t('bestandEmptyDesc')}
            show
            action={{ label: t('bestandEmptyCta'), href: '/market?tab=kaufen' }}
          />
        ) : (
          <EmptyState icon={<Package />} title={t('bestandFilterEmpty')} description={t('bestandFilterEmptyDesc')}
            action={{ label: t('resetFilters'), onClick: () => { setPosFilter(new Set()); setClubFilter(''); setQuery(''); setKaderCountry(''); }}} />
        )
      )}

      {/* Player List */}
      {filtered.length > 0 && (
        groupByClub && clubGroups ? (
          <div className="space-y-2">
            {clubGroups.map(group => (
              <KaderClubGroup
                key={group.clubId || group.clubName}
                clubId={group.clubId}
                clubName={group.clubName}
                playerCount={group.items.length}
                isExpanded={expandedClubs.has(group.clubId || group.clubName)}
                onToggle={() => toggleClubExpand(group.clubId || group.clubName)}
              >
                {group.items.map(renderRow)}
              </KaderClubGroup>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(renderRow)}
          </div>
        )
      )}

      {/* Bulk Sell Bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="sticky bottom-20 md:bottom-4 z-30 mx-auto max-w-md">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-popover border border-gold/20 shadow-2xl">
            <span className="text-sm font-bold flex-1">
              {t('bestandBulkSelected', { count: selectedIds.size })}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-surface-base transition-colors"
              aria-label={t('bestandBulkClearSelection')}
            >
              <X className="size-4" />
            </button>
            <button
              onClick={handleBulkSell}
              disabled={bulkSelling}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-black text-sm font-bold hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {bulkSelling ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />}
              {t('bestandBulkSellAll')}
            </button>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      <KaderSellModal
        item={sellItem}
        open={!!sellPlayerId}
        onClose={() => setSellPlayerId(null)}
        onSell={onSell}
        onCancelOrder={onCancelOrder}
      />
    </div>
  );
}
