'use client';

import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Search, Filter, Grid, List,
  Zap, Flame, Gem, Star, Clock, Users, Tag,
  ChevronDown, ChevronRight, ArrowUpDown, X,
  Package, Trophy, Layers, Heart,
} from 'lucide-react';
import { Card, SearchInput, PosFilter, EmptyState } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import DiscoveryCard from './DiscoveryCard';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getClub } from '@/lib/clubs';
import { useMarketStore } from '@/lib/stores/marketStore';
import type { SortOption } from '@/lib/stores/marketStore';
import type { Player, Pos, DbOrder, DbClub } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';
import dynamic from 'next/dynamic';

const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });

// ============================================
// TYPES
// ============================================

type LocalIPOStatus = 'announced' | 'early_access' | 'live' | 'ended';

type IPOData = {
  id: string;
  status: LocalIPOStatus;
  price: number;
  totalOffered: number;
  sold: number;
  startsAt: number;
  endsAt: number;
  earlyAccessEndsAt?: number;
  userLimit: number;
  portfolioLimit: number;
  userPurchased: number;
};

interface KaufenDiscoveryProps {
  players: Player[];
  ipoItems: { player: Player; ipo: IPOData }[];
  trending: TrendingPlayer[];
  recentOrders: DbOrder[];
  watchlist: Record<string, boolean>;
  followedClubs: DbClub[];
  getFloor: (p: Player) => number;
  onBuy: (playerId: string, qty?: number) => void;
  onIpoBuy: (playerId: string, qty?: number) => void;
  onWatch: (id: string) => void;
  buyingId: string | null;
}

// ============================================
// HELPERS
// ============================================

const POS_ORDER: Record<Pos, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
const POS_LABELS: Record<Pos, string> = { GK: 'TW', DEF: 'DEF', MID: 'MID', ATT: 'STU' };

function applySortOption(a: Player, b: Player, sort: SortOption, getFloor: (p: Player) => number): number {
  switch (sort) {
    case 'floor_asc': return getFloor(a) - getFloor(b);
    case 'floor_desc': return getFloor(b) - getFloor(a);
    case 'l5': return b.perf.l5 - a.perf.l5;
    case 'l15': return b.perf.l15 - a.perf.l15;
    case 'change': return b.prices.change24h - a.prices.change24h;
    case 'name': return `${a.last}`.localeCompare(`${b.last}`);
    case 'goals': return b.stats.goals - a.stats.goals;
    case 'assists': return b.stats.assists - a.stats.assists;
    case 'matches': return b.stats.matches - a.stats.matches;
    case 'age_asc': return a.age - b.age;
    case 'age_desc': return b.age - a.age;
    default: return 0;
  }
}

function applyDiscoveryFilters(
  pool: Player[],
  minL5: number,
  onlyFit: boolean,
  pos: Pos | null,
): Player[] {
  let result = pool;
  if (minL5 > 0) result = result.filter(p => p.perf.l5 >= minL5);
  if (onlyFit) result = result.filter(p => p.status === 'fit');
  if (pos) result = result.filter(p => p.pos === pos);
  return result;
}

function DiscoverySection({ icon, title, accent, onShowAll, showAllLabel, children }: {
  icon: React.ReactNode;
  title: string;
  accent?: string;
  onShowAll?: () => void;
  showAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {icon}
          <span className={cn('text-xs font-black uppercase', accent || 'text-white/50')}>{title}</span>
        </div>
        {onShowAll && (
          <button onClick={onShowAll} className="text-[11px] font-bold text-white/30 hover:text-gold transition-colors flex items-center gap-1 min-h-[44px]">
            {showAllLabel || 'Alle'} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
      <div className="floodlight-divider mt-3" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function KaufenDiscovery({
  players, ipoItems, trending, recentOrders,
  watchlist, followedClubs, getFloor,
  onBuy, onIpoBuy, onWatch, buyingId,
}: KaufenDiscoveryProps) {
  const t = useTranslations('market');
  const {
    kaufenMode, setKaufenMode,
    query, setQuery,
    posFilter, togglePos, clearPosFilter,
    clubFilter, toggleClub,
    leagueFilter, setLeagueFilter,
    sortBy, setSortBy,
    priceMin, setPriceMin,
    priceMax, setPriceMax,
    onlyAvailable, setOnlyAvailable,
    onlyOwned, setOnlyOwned,
    onlyWatched, setOnlyWatched,
    showFilters, setShowFilters,
    clubSearch, setClubSearch,
    showClubDropdown, setShowClubDropdown,
    view, setView,
    discoveryPos, setDiscoveryPos,
    expandedDiscoveryClubs, toggleDiscoveryClub,
    discoverySortBy, setDiscoverySortBy,
    discoveryMinL5, setDiscoveryMinL5,
    discoveryOnlyFit, setDiscoveryOnlyFit,
    resetFilters,
  } = useMarketStore();

  const [showMoreClubs, setShowMoreClubs] = useState(false);
  const [posMode, setPosMode] = useState<'ipo' | 'listing'>('ipo');

  const followedClubNames = useMemo(
    () => new Set(followedClubs.map(c => c.name)),
    [followedClubs]
  );

  // Determine active mode: query forces search mode
  const isSearchMode = kaufenMode === 'search' || query.length > 0;

  // ── Switch to search with pre-filter ──
  const goSearch = useCallback((opts?: { pos?: Pos; club?: string }) => {
    setKaufenMode('search');
    if (opts?.pos) {
      clearPosFilter();
      togglePos(opts.pos);
    }
    if (opts?.club) {
      toggleClub(opts.club);
    }
  }, [setKaufenMode, clearPosFilter, togglePos, toggleClub]);

  const goDiscovery = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  // ============================================
  // DISCOVERY DATA (memoized)
  // ============================================

  // Section 1: Live IPOs
  const liveIpos = useMemo(() => {
    const live = ipoItems.filter(({ ipo }) => ipo.status === 'live' || ipo.status === 'early_access');
    const filtered = applyDiscoveryFilters(live.map(i => i.player), discoveryMinL5, discoveryOnlyFit, discoveryPos);
    const filteredSet = new Set(filtered.map(p => p.id));
    return live
      .filter(i => filteredSet.has(i.player.id))
      .sort((a, b) => applySortOption(a.player, b.player, discoverySortBy, getFloor))
      .slice(0, 12);
  }, [ipoItems, discoveryMinL5, discoveryOnlyFit, discoveryPos, discoverySortBy, getFloor]);

  // Section 2b: Transferliste (players with active sell listings)
  const transferList = useMemo(() => {
    const ordersByPlayer = new Map<string, { count: number; totalQty: number; floor: number }>();
    for (const o of recentOrders) {
      if (o.status !== 'open' && o.status !== 'partial') continue;
      const prev = ordersByPlayer.get(o.player_id);
      const openQty = o.quantity - (o.filled_qty ?? 0);
      const priceBsd = centsToBsd(o.price);
      if (prev) {
        prev.count += 1;
        prev.totalQty += openQty;
        prev.floor = Math.min(prev.floor, priceBsd);
      } else {
        ordersByPlayer.set(o.player_id, { count: 1, totalQty: openQty, floor: priceBsd });
      }
    }
    const playerMap = new Map(players.map(p => [p.id, p]));
    const raw = Array.from(ordersByPlayer.entries())
      .map(([playerId, info]) => ({ player: playerMap.get(playerId), ...info }))
      .filter((x): x is { player: Player; count: number; totalQty: number; floor: number } => x.player !== undefined && !x.player.isLiquidated);
    const filteredPlayers = applyDiscoveryFilters(raw.map(r => r.player), discoveryMinL5, discoveryOnlyFit, discoveryPos);
    const filteredSet = new Set(filteredPlayers.map(p => p.id));
    return raw
      .filter(r => filteredSet.has(r.player.id))
      .sort((a, b) => applySortOption(a.player, b.player, discoverySortBy, getFloor))
      .slice(0, 12);
  }, [recentOrders, players, discoveryMinL5, discoveryOnlyFit, discoveryPos, discoverySortBy, getFloor]);

  // Section 3: Best Deals (high L5, low price)
  const bestDeals = useMemo(() => {
    const base = players.filter(p => p.perf.l5 > 40 && !p.isLiquidated && getFloor(p) > 0);
    const filtered = applyDiscoveryFilters(base, discoveryMinL5, discoveryOnlyFit, discoveryPos);
    return filtered
      .map(p => ({ player: p, floor: getFloor(p), ratio: p.perf.l5 / Math.max(getFloor(p), 0.01) }))
      .sort((a, b) => applySortOption(a.player, b.player, discoverySortBy, getFloor))
      .slice(0, 8);
  }, [players, getFloor, discoveryMinL5, discoveryOnlyFit, discoveryPos, discoverySortBy]);

  // Section 4: Your Clubs (grouped by followed clubs)
  const clubGroups = useMemo(() => {
    const buyable = players.filter(p => !p.isLiquidated && (p.listings.length > 0 || ipoItems.some(i => i.player.id === p.id)));
    const map = new Map<string, Player[]>();
    for (const p of buyable) {
      const arr = map.get(p.club) ?? [];
      arr.push(p);
      map.set(p.club, arr);
    }
    return Array.from(map.entries())
      .map(([clubName, clubPlayers]) => ({
        clubName,
        clubData: getClub(clubName),
        players: clubPlayers.sort((a, b) => {
          const posDiff = POS_ORDER[a.pos] - POS_ORDER[b.pos];
          return posDiff !== 0 ? posDiff : b.perf.l5 - a.perf.l5;
        }),
        avgPrice: clubPlayers.length > 0
          ? Math.round(clubPlayers.reduce((s, p2) => s + getFloor(p2), 0) / clubPlayers.length)
          : 0,
      }))
      .sort((a, b) => {
        const aFollowed = followedClubNames.has(a.clubName) ? 1000 : 0;
        const bFollowed = followedClubNames.has(b.clubName) ? 1000 : 0;
        return (bFollowed + b.players.length) - (aFollowed + a.players.length);
      });
  }, [players, ipoItems, followedClubNames, getFloor]);

  // Section 5: By Position (switchable IPO / Transferliste)
  const ipoPlayerIdSet = useMemo(() => new Set(ipoItems.filter(i => i.ipo.status === 'live' || i.ipo.status === 'early_access').map(i => i.player.id)), [ipoItems]);

  const byPosition = useMemo(() => {
    let pool: Player[];
    if (posMode === 'ipo') {
      pool = players.filter(p => !p.isLiquidated && ipoPlayerIdSet.has(p.id));
    } else {
      pool = players.filter(p => !p.isLiquidated && p.dpc.onMarket > 0);
    }
    pool = applyDiscoveryFilters(pool, discoveryMinL5, discoveryOnlyFit, discoveryPos);
    return pool.sort((a, b) => applySortOption(a, b, discoverySortBy, getFloor)).slice(0, 12);
  }, [players, ipoPlayerIdSet, discoveryPos, posMode, discoveryMinL5, discoveryOnlyFit, discoverySortBy, getFloor]);

  // Section 6: Newly Listed
  const newlyListed = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const raw = recentOrders
      .filter(o => o.side === 'sell' && (o.status === 'open' || o.status === 'partial'))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map(o => ({ order: o, player: playerMap.get(o.player_id) }))
      .filter((x): x is { order: DbOrder; player: Player } => x.player !== undefined);
    const filteredPlayers = applyDiscoveryFilters(raw.map(r => r.player), discoveryMinL5, discoveryOnlyFit, discoveryPos);
    const filteredSet = new Set(filteredPlayers.map(p => p.id));
    return raw.filter(r => filteredSet.has(r.player.id)).slice(0, 10);
  }, [recentOrders, players, discoveryMinL5, discoveryOnlyFit, discoveryPos]);

  // ============================================
  // SEARCH MODE DATA
  // ============================================

  const availableClubs = useMemo(() => Array.from(new Set(players.map(p => p.club))).sort(), [players]);
  const availableLeagues = useMemo(() => Array.from(new Set(players.map(p => p.league).filter((l): l is string => !!l))).sort(), [players]);
  const filteredClubs = useMemo(() => {
    let clubs = availableClubs;
    if (leagueFilter) {
      const leagueClubSet = new Set(players.filter(p => p.league === leagueFilter).map(p => p.club));
      clubs = clubs.filter(c => leagueClubSet.has(c));
    }
    if (clubSearch) clubs = clubs.filter(c => c.toLowerCase().includes(clubSearch.toLowerCase()));
    return clubs;
  }, [availableClubs, leagueFilter, players, clubSearch]);

  const activeFilterCount = (leagueFilter ? 1 : 0) + (posFilter.size > 0 ? 1 : 0) + (clubFilter.size > 0 ? 1 : 0)
    + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (onlyAvailable ? 1 : 0) + (onlyOwned ? 1 : 0) + (onlyWatched ? 1 : 0);

  // Merged search results: IPO + P2P
  const searchResults = useMemo(() => {
    if (!isSearchMode) return [];

    // Build IPO player ID set for quick lookup
    const ipoPlayerIds = new Set(ipoItems.map(i => i.player.id));

    // All buyable players (has listings OR has IPO)
    let result = players.filter(p => !p.isLiquidated && (p.listings.length > 0 || ipoPlayerIds.has(p.id)));

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(p => `${p.first} ${p.last} ${p.club} ${p.league || ''}`.toLowerCase().includes(q));
    }
    if (leagueFilter) result = result.filter(p => p.league === leagueFilter);
    if (posFilter.size > 0) result = result.filter(p => posFilter.has(p.pos));
    if (clubFilter.size > 0) result = result.filter(p => clubFilter.has(p.club));
    if (priceMin) { const min = parseFloat(priceMin); if (!isNaN(min)) result = result.filter(p => getFloor(p) >= min); }
    if (priceMax) { const max = parseFloat(priceMax); if (!isNaN(max)) result = result.filter(p => getFloor(p) <= max); }
    if (onlyAvailable) result = result.filter(p => p.dpc.onMarket > 0);
    if (onlyOwned) result = result.filter(p => p.dpc.owned > 0);
    if (onlyWatched) result = result.filter(p => watchlist[p.id]);

    return [...result].sort((a, b) => applySortOption(a, b, sortBy, getFloor));
  }, [isSearchMode, players, ipoItems, query, leagueFilter, posFilter, clubFilter, priceMin, priceMax, onlyAvailable, onlyOwned, onlyWatched, watchlist, sortBy, getFloor]);

  const hasActiveFilters = leagueFilter !== '' || query !== '' || posFilter.size > 0 || clubFilter.size > 0
    || priceMin !== '' || priceMax !== '' || onlyAvailable || onlyOwned || onlyWatched;

  // Helper: determine buy handler for a player (IPO or P2P)
  const ipoPlayerIds = useMemo(() => new Set(ipoItems.map(i => i.player.id)), [ipoItems]);
  const handlePlayerBuy = useCallback((playerId: string) => {
    if (ipoPlayerIds.has(playerId)) onIpoBuy(playerId);
    else onBuy(playerId);
  }, [ipoPlayerIds, onBuy, onIpoBuy]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      {/* Search Bar — always visible */}
      <div className="flex items-center gap-2">
        <SearchInput
          value={query}
          onChange={(q) => { setQuery(q); if (q.length > 0 && kaufenMode === 'discovery') setKaufenMode('search'); }}
          placeholder={t('searchPlaceholder')}
          className="flex-1 min-w-0"
        />
        {isSearchMode && (
          <button
            onClick={goDiscovery}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border bg-white/5 border-white/10 text-white/60 hover:text-gold hover:border-gold/30 transition-colors shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            {t('backToDiscovery')}
          </button>
        )}
      </div>

      {/* ━━━ DISCOVERY MODE ━━━ */}
      {!isSearchMode && (
        <div className="space-y-5">

          {/* Discovery Filter-Strip */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Sort select */}
            <select
              value={discoverySortBy}
              onChange={(e) => setDiscoverySortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-[10px] font-bold text-white/60 appearance-none cursor-pointer pr-6 shrink-0"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
            >
              <option value="l5">{t('sortL5')}</option>
              <option value="l15">{t('sortL15')}</option>
              <option value="floor_asc">{t('sortFloorAsc')}</option>
              <option value="floor_desc">{t('sortFloorDesc')}</option>
              <option value="goals">{t('sortGoals')}</option>
              <option value="assists">{t('sortAssists')}</option>
              <option value="matches">{t('sortMatches')}</option>
              <option value="age_asc">{t('sortAgeAsc')}</option>
              <option value="age_desc">{t('sortAgeDesc')}</option>
              <option value="change">{t('sortChange24h')}</option>
              <option value="name">{t('sortName')}</option>
            </select>
            {/* L5 presets */}
            {[40, 60, 75].map(threshold => (
              <button
                key={threshold}
                onClick={() => setDiscoveryMinL5(discoveryMinL5 === threshold ? 0 : threshold)}
                className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 whitespace-nowrap',
                  discoveryMinL5 === threshold
                    ? 'bg-gold/10 border-gold/20 text-gold'
                    : 'bg-surface-subtle border-white/[0.06] text-white/40'
                )}
              >L5 {threshold}+</button>
            ))}
            {/* Only Fit */}
            <button
              onClick={() => setDiscoveryOnlyFit(!discoveryOnlyFit)}
              className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 flex items-center gap-1',
                discoveryOnlyFit
                  ? 'bg-green-500/15 border-green-500/30 text-green-500'
                  : 'bg-surface-subtle border-white/[0.06] text-white/40'
              )}
            >
              <Heart className="w-3 h-3" />{t('discoveryOnlyFit')}
            </button>
            {/* Position pills */}
            {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => (
              <button
                key={pos}
                onClick={() => setDiscoveryPos(discoveryPos === pos ? null : pos)}
                className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0',
                  discoveryPos === pos
                    ? 'bg-gold/10 border-gold/20 text-gold'
                    : 'bg-surface-subtle border-white/[0.06] text-white/40'
                )}
              >{POS_LABELS[pos]}</button>
            ))}
          </div>

          {/* Section 1: Live IPOs */}
          {liveIpos.length > 0 && (
            <DiscoverySection
              icon={<Zap className="w-3.5 h-3.5 text-green-500" />}
              title={t('liveIpos')}
              accent="text-green-500/80"
              onShowAll={() => goSearch()}
              showAllLabel={t('allIpos')}
            >
              {liveIpos.map(({ player, ipo }) => (
                <DiscoveryCard
                  key={player.id}
                  player={player}
                  variant="ipo"
                  ipoProgress={(ipo.sold / ipo.totalOffered) * 100}
                  ipoPrice={ipo.price}
                  isWatchlisted={watchlist[player.id]}
                  onWatch={onWatch}
                  onBuy={onIpoBuy}
                  buying={buyingId === player.id}
                />
              ))}
            </DiscoverySection>
          )}

          {/* Section 2: Trending 24h */}
          {trending.length > 0 && (
            <DiscoverySection
              icon={<Flame className="w-3.5 h-3.5 text-orange-400" />}
              title={t('trendingTitle')}
              accent="text-orange-400/80"
            >
              {trending.map(tp => {
                const fakePlayer: Player | undefined = players.find(p => p.id === tp.playerId);
                if (!fakePlayer) return null;
                return (
                  <DiscoveryCard
                    key={tp.playerId}
                    player={fakePlayer}
                    variant="trending"
                    tradeCount={tp.tradeCount}
                    change24h={tp.change24h}
                    isWatchlisted={watchlist[tp.playerId]}
                    onWatch={onWatch}
                    onBuy={(id) => handlePlayerBuy(id)}
                    buying={buyingId === tp.playerId}
                  />
                );
              })}
            </DiscoverySection>
          )}

          {/* Section 2b: Transferliste */}
          {transferList.length > 0 && (
            <DiscoverySection
              icon={<Tag className="w-3.5 h-3.5 text-gold" />}
              title={t('transferList')}
              accent="text-gold/80"
              onShowAll={() => { goSearch(); setOnlyAvailable(true); }}
              showAllLabel={t('allListings')}
            >
              {transferList.map(({ player, count, floor }) => (
                <DiscoveryCard
                  key={player.id}
                  player={player}
                  variant="listing"
                  listingPrice={floor}
                  listingCount={count}
                  isWatchlisted={watchlist[player.id]}
                  onWatch={onWatch}
                  onBuy={(id) => onBuy(id)}
                  buying={buyingId === player.id}
                />
              ))}
            </DiscoverySection>
          )}

          {/* Section 3: Best Deals */}
          {bestDeals.length > 0 && (
            <DiscoverySection
              icon={<Gem className="w-3.5 h-3.5 text-green-500" />}
              title={t('bestDeals')}
              accent="text-green-500/80"
            >
              {bestDeals.map(({ player, floor }) => (
                <DiscoveryCard
                  key={player.id}
                  player={player}
                  variant="deal"
                  listingPrice={floor}
                  isWatchlisted={watchlist[player.id]}
                  onWatch={onWatch}
                  onBuy={(id) => handlePlayerBuy(id)}
                  buying={buyingId === player.id}
                />
              ))}
            </DiscoverySection>
          )}

          {bestDeals.length === 0 && players.length > 0 && (
            <div className="text-center py-4 text-sm text-white/30">{t('fairlyPriced')}</div>
          )}

          <SponsorBanner placement="market_ipo" className="mb-1" />

          {/* Section 4: Your Clubs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-gold/60" />
                <span className="text-[10px] font-black uppercase text-gold/80">{t('yourClubs')}</span>
              </div>
            </div>

            {clubGroups.length === 0 && (
              <Card className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-white/20" />
                <div className="text-sm text-white/40 mb-2">{t('followClubHint')}</div>
                <Link href="/clubs" className="text-xs font-bold text-gold hover:underline">
                  Clubs entdecken →
                </Link>
              </Card>
            )}

            {(showMoreClubs ? clubGroups : clubGroups.slice(0, 5)).map(({ clubName, clubData, players: clubPlayers, avgPrice }) => {
              const isExpanded = expandedDiscoveryClubs.has(clubName);
              const primaryColor = clubData?.colors.primary ?? '#666';
              const isFollowed = followedClubNames.has(clubName);
              return (
                <div key={clubName} className="border border-white/[0.06] rounded-2xl overflow-hidden mb-1.5">
                  <button
                    onClick={() => toggleDiscoveryClub(clubName)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-subtle transition-colors"
                    style={{ borderLeft: `3px solid ${primaryColor}` }}
                  >
                    {clubData?.logo ? (
                      <img src={clubData.logo} alt={clubName} className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
                    )}
                    <span className="font-bold text-sm">{clubName}</span>
                    {!isFollowed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-bold">Nicht gefolgt</span>
                    )}
                    <span className="text-xs text-white/40 ml-auto mr-2">
                      {t('playersAvailable', { count: clubPlayers.length })}
                    </span>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-white/30" />
                      : <ChevronRight className="w-4 h-4 text-white/30" />
                    }
                  </button>
                  {isExpanded && (
                    <div className="border-t border-white/[0.06]">
                      <div className="p-1.5 space-y-0.5">
                        {clubPlayers.slice(0, 10).map(player => (
                          <PlayerDisplay
                            key={player.id}
                            variant="compact"
                            player={player}
                            isWatchlisted={watchlist[player.id]}
                            onWatch={() => onWatch(player.id)}
                            onBuy={(id) => handlePlayerBuy(id)}
                            buying={buyingId === player.id}
                          />
                        ))}
                        {clubPlayers.length > 10 && (
                          <button
                            onClick={() => goSearch({ club: clubName })}
                            className="w-full py-2 text-center text-[10px] font-bold text-white/30 hover:text-gold transition-colors"
                          >
                            {t('showAllPos', { pos: clubName })} →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {clubGroups.length > 5 && (
              <button
                onClick={() => setShowMoreClubs(!showMoreClubs)}
                className="w-full py-2.5 text-center text-xs font-bold text-white/40 hover:text-white/70 border border-white/[0.06] rounded-xl hover:bg-surface-subtle transition-colors mt-1"
              >
                {showMoreClubs ? t('showLessClubs') : t('moreClubs')}
              </button>
            )}
          </div>

          {/* Section 5: By Position (IPO / Transferliste Toggle) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400/60" />
                <span className="text-[10px] font-black uppercase text-purple-400/80">{t('byPosition')}</span>
              </div>
              {/* IPO / Transferliste Toggle */}
              <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => setPosMode('ipo')}
                  className={cn('px-2.5 py-1 text-[10px] font-bold transition-colors',
                    posMode === 'ipo' ? 'bg-green-500/15 text-green-500' : 'text-white/30 hover:text-white/50'
                  )}
                >{t('posModeIpo')}</button>
                <button
                  onClick={() => setPosMode('listing')}
                  className={cn('px-2.5 py-1 text-[10px] font-bold transition-colors border-l border-white/[0.06]',
                    posMode === 'listing' ? 'bg-gold/15 text-gold' : 'text-white/30 hover:text-white/50'
                  )}
                >{t('posModeListing')}</button>
              </div>
            </div>
            {/* Player list */}
            {byPosition.length > 0 ? (
              <div className="space-y-0.5">
                {byPosition.map(player => (
                  <PlayerDisplay
                    key={player.id}
                    variant="compact"
                    player={player}
                    isWatchlisted={watchlist[player.id]}
                    onWatch={() => onWatch(player.id)}
                    onBuy={(id) => posMode === 'ipo' ? onIpoBuy(id) : onBuy(id)}
                    buying={buyingId === player.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-white/30">
                {posMode === 'ipo' ? t('noIpoForPos') : t('noListingForPos')}
              </div>
            )}
            {discoveryPos && byPosition.length > 0 && (
              <button
                onClick={() => goSearch({ pos: discoveryPos })}
                className="w-full py-2 mt-2 text-center text-[10px] font-bold text-white/30 hover:text-gold border border-white/[0.06] rounded-xl hover:bg-surface-subtle transition-colors"
              >
                {t('showAllPos', { pos: POS_LABELS[discoveryPos] })} →
              </button>
            )}
          </div>

          {/* Section 6: Newly Listed */}
          {newlyListed.length > 0 && (
            <DiscoverySection
              icon={<Clock className="w-3.5 h-3.5 text-sky-400/60" />}
              title={t('newlyListed')}
              accent="text-sky-400/80"
            >
              {newlyListed.map(({ order, player }) => (
                <DiscoveryCard
                  key={order.id}
                  player={player}
                  variant="new"
                  listingPrice={centsToBsd(order.price)}
                  listedAt={order.created_at}
                  isWatchlisted={watchlist[player.id]}
                  onWatch={onWatch}
                  onBuy={(id) => onBuy(id)}
                  buying={buyingId === player.id}
                />
              ))}
            </DiscoverySection>
          )}

          {/* Empty state when discovery filters hide everything */}
          {(discoveryMinL5 > 0 || discoveryOnlyFit || discoveryPos !== null) &&
            liveIpos.length === 0 && transferList.length === 0 && bestDeals.length === 0 && byPosition.length === 0 && newlyListed.length === 0 && (
            <div className="text-center py-8">
              <Search className="w-8 h-8 mx-auto mb-2 text-white/15" />
              <p className="text-sm text-white/40">{t('noPlayersForFilter')}</p>
            </div>
          )}
        </div>
      )}

      {/* ━━━ SEARCH MODE ━━━ */}
      {isSearchMode && (
        <div className="space-y-4">
          {/* Filter Card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors shrink-0',
                  showFilters || activeFilterCount > 0
                    ? 'bg-gold/15 border-gold/30 text-gold'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('filter')}</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-gold text-black text-[10px] font-black rounded-full">{activeFilterCount}</span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              <div className="hidden md:flex items-center border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setView('grid')} className={`p-2.5 transition-colors ${view === 'grid' ? 'bg-gold/20 text-gold' : 'text-white/40 hover:text-white hover:bg-white/5'}`}><Grid className="w-4 h-4" /></button>
                <button onClick={() => setView('list')} className={`p-2.5 transition-colors ${view === 'list' ? 'bg-gold/20 text-gold' : 'text-white/40 hover:text-white hover:bg-white/5'}`}><List className="w-4 h-4" /></button>
              </div>
            </div>
            {/* Position Toggles */}
            <PosFilter multi selected={posFilter} onChange={togglePos} />

            {/* ── Desktop: Inline Advanced Filters ── */}
            {showFilters && (
              <div className="hidden md:flex items-start gap-2.5 flex-wrap pt-2 border-t border-white/5">
                {availableLeagues.length > 0 && (
                  <select value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)}
                    className={cn('px-3 py-2 bg-white/5 border rounded-xl text-xs focus:outline-none focus:border-gold/40 appearance-none cursor-pointer pr-8',
                      leagueFilter ? 'border-gold/30 text-gold' : 'border-white/10 text-white/70')}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                  >
                    <option value="">{t('allLeagues')}</option>
                    {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
                <div className="relative">
                  <button onClick={() => setShowClubDropdown(!showClubDropdown)}
                    className={cn('flex items-center gap-2 px-3 py-2 border rounded-xl text-xs hover:bg-white/10 transition-colors min-w-[160px]',
                      clubFilter.size > 0 ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-white/5 border-white/10 text-white/70')}
                  >
                    <Users className="w-3.5 h-3.5 opacity-50" />
                    {clubFilter.size > 0 ? (clubFilter.size > 1 ? t('clubCountPlural', { count: clubFilter.size }) : t('clubCount', { count: clubFilter.size })) : t('allClubs')}
                    <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showClubDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showClubDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl z-[60]">
                      <div className="p-2 border-b border-white/10">
                        <input type="text" placeholder={t('clubSearch')} value={clubSearch} onChange={(e) => setClubSearch(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-gold/40 placeholder:text-white/30" autoFocus />
                      </div>
                      <div className="p-1">
                        {filteredClubs.map(club => (
                          <button key={club} onClick={() => toggleClub(club)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${clubFilter.has(club) ? 'bg-gold/15 text-gold' : 'text-white/70 hover:bg-white/10'}`}
                          >
                            <span>{club}</span>
                            {clubFilter.has(club) && <span className="text-gold">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-white/40" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 focus:outline-none focus:border-gold/40 appearance-none cursor-pointer pr-8"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                  >
                    <option value="floor_asc">{t('sortFloorAsc')}</option>
                    <option value="floor_desc">{t('sortFloorDesc')}</option>
                    <option value="l5">{t('sortL5')}</option>
                    <option value="l15">{t('sortL15')}</option>
                    <option value="goals">{t('sortGoals')}</option>
                    <option value="assists">{t('sortAssists')}</option>
                    <option value="matches">{t('sortMatches')}</option>
                    <option value="age_asc">{t('sortAgeAsc')}</option>
                    <option value="age_desc">{t('sortAgeDesc')}</option>
                    <option value="change">{t('sortChange24h')}</option>
                    <option value="name">{t('sortName')}</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/40">{t('priceLabel')}</span>
                  <input type="number" inputMode="numeric" placeholder={t('min')} value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                    className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
                  <span className="text-white/20">–</span>
                  <input type="number" inputMode="numeric" placeholder={t('max')} value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                    className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
                  <span className="text-[10px] text-white/30">bCredits</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOnlyAvailable(!onlyAvailable)}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors',
                      onlyAvailable ? 'bg-green-500/15 border-green-500/30 text-green-500' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70')}>
                    <Package className="w-3.5 h-3.5" />{t('available')}
                  </button>
                  <button onClick={() => setOnlyWatched(!onlyWatched)}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors',
                      onlyWatched ? 'bg-gold/15 border-gold/30 text-gold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70')}>
                    <Star className="w-3.5 h-3.5" />{t('watched')}
                  </button>
                </div>
              </div>
            )}

            {/* ── Mobile: Full-Screen Filter Modal ── */}
            {showFilters && (
              <div className="md:hidden fixed inset-0 z-[70] bg-bg-main flex flex-col">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gold" />
                    <h2 className="text-lg font-black">{t('filterTitle')}</h2>
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 bg-gold text-black text-[10px] font-black rounded-full">{activeFilterCount}</span>
                    )}
                  </div>
                  <button onClick={() => setShowFilters(false)} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                  {availableLeagues.length > 0 && (
                    <div>
                      <div className="text-[10px] font-black uppercase text-white/40 mb-2.5">{t('leagueLabel')}</div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setLeagueFilter('')}
                          className={cn('px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors active:scale-95',
                            !leagueFilter ? 'bg-gold/10 border-gold/20 text-gold' : 'bg-surface-subtle border-white/[0.06] text-white/50'
                          )}>{t('allLeagues')}</button>
                        {availableLeagues.map(l => (
                          <button key={l} onClick={() => setLeagueFilter(leagueFilter === l ? '' : l)}
                            className={cn('px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors active:scale-95 flex items-center gap-1.5',
                              leagueFilter === l ? 'bg-gold/10 border-gold/20 text-gold' : 'bg-surface-subtle border-white/[0.06] text-white/50'
                            )}
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-black uppercase text-white/40 mb-2.5">{t('clubLabel')}</div>
                    <input type="text" placeholder={t('clubSearch')} value={clubSearch} onChange={(e) => setClubSearch(e.target.value)}
                      className="w-full mb-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-gold/40 placeholder:text-white/30" />
                    <div className="grid grid-cols-4 gap-2">
                      {filteredClubs.map(club => {
                        const cd = getClub(club);
                        const active = clubFilter.has(club);
                        const color = cd?.colors.primary ?? '#666';
                        return (
                          <button key={club} onClick={() => toggleClub(club)}
                            className={cn('flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-colors active:scale-95',
                              active
                                ? 'border-gold/40 bg-gold/10'
                                : 'border-white/[0.06] bg-surface-base'
                            )}
                            style={active ? { boxShadow: `0 0 16px ${color}25` } : undefined}
                          >
                            {cd?.logo ? (
                              <img src={cd.logo} alt={club} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                            )}
                            <span className={cn('text-[10px] font-bold truncate w-full text-center', active ? 'text-gold' : 'text-white/50')}>
                              {cd?.short || club.slice(0, 3).toUpperCase()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-white/40 mb-2.5">{t('positionLabel')}</div>
                    <PosFilter multi selected={posFilter} onChange={togglePos} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-white/40 mb-2.5">{t('sortLabel')}</div>
                    <div className="space-y-1.5">
                      {([
                        { value: 'floor_asc' as SortOption, label: t('sortFloorAsc') },
                        { value: 'floor_desc' as SortOption, label: t('sortFloorDesc') },
                        { value: 'l5' as SortOption, label: t('sortL5') },
                        { value: 'l15' as SortOption, label: t('sortL15') },
                        { value: 'goals' as SortOption, label: t('sortGoals') },
                        { value: 'assists' as SortOption, label: t('sortAssists') },
                        { value: 'matches' as SortOption, label: t('sortMatches') },
                        { value: 'age_asc' as SortOption, label: t('sortAgeAsc') },
                        { value: 'age_desc' as SortOption, label: t('sortAgeDesc') },
                        { value: 'change' as SortOption, label: t('sortChange24h') },
                        { value: 'name' as SortOption, label: t('sortName') },
                      ]).map(opt => (
                        <button key={opt.value} onClick={() => setSortBy(opt.value)}
                          className={cn('w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors',
                            sortBy === opt.value
                              ? 'bg-gold/10 border border-gold/20 text-gold'
                              : 'bg-surface-base border border-white/[0.06] text-white/50'
                          )}
                        >
                          <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                            sortBy === opt.value ? 'border-gold' : 'border-white/20'
                          )}>
                            {sortBy === opt.value && <div className="w-2 h-2 rounded-full bg-gold" />}
                          </div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-white/40 mb-2.5">{t('priceLabel')}</div>
                    <div className="flex items-center gap-2">
                      <input type="number" inputMode="numeric" placeholder={t('min')} value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
                      <span className="text-white/20 font-bold">–</span>
                      <input type="number" inputMode="numeric" placeholder={t('max')} value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
                      <span className="text-xs text-white/30 font-bold shrink-0">bCredits</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOnlyAvailable(!onlyAvailable)}
                      className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-colors active:scale-95',
                        onlyAvailable ? 'bg-green-500/15 border-green-500/30 text-green-500' : 'bg-surface-base border-white/[0.06] text-white/40')}>
                      <Package className="w-4 h-4" />{t('available')}
                    </button>
                    <button onClick={() => setOnlyWatched(!onlyWatched)}
                      className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-colors active:scale-95',
                        onlyWatched ? 'bg-gold/15 border-gold/30 text-gold' : 'bg-surface-base border-white/[0.06] text-white/40')}>
                      <Star className="w-4 h-4" />{t('watched')}
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3 shrink-0 pb-6">
                  <button onClick={resetFilters} className="text-sm text-white/40 hover:text-white transition-colors">
                    {t('resetAll')}
                  </button>
                  <button onClick={() => setShowFilters(false)}
                    className="flex-1 py-3.5 bg-gold text-black font-black text-sm rounded-xl active:scale-[0.98] transition-transform"
                  >
                    {t('showResults', { count: searchResults.length })}
                  </button>
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {leagueFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                    {leagueFilter}
                    <button onClick={() => setLeagueFilter('')} className="ml-0.5 hover:text-white" aria-label={t('removeFilter', { filter: leagueFilter })}><X className="w-3 h-3" aria-hidden="true" /></button>
                  </span>
                )}
                {posFilter.size > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                    Pos: {Array.from(posFilter).join(', ')}
                    <button onClick={clearPosFilter} className="ml-0.5 hover:text-white" aria-label={t('removeFilter', { filter: 'Position' })}><X className="w-3 h-3" aria-hidden="true" /></button>
                  </span>
                )}
                {Array.from(clubFilter).map(club => (
                  <span key={club} className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                    {club}
                    <button onClick={() => toggleClub(club)} className="ml-0.5 hover:text-white" aria-label={t('removeFilter', { filter: club })}><X className="w-3 h-3" aria-hidden="true" /></button>
                  </span>
                ))}
                <button onClick={resetFilters} className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-1">{t('resetAll')}</button>
              </div>
            )}
          </Card>

          <SponsorBanner placement="market_transferlist" className="mb-2" />

          {/* Results count */}
          <div className="text-sm text-white/50">{t('playerCount', { count: searchResults.length })}</div>

          {/* Results list */}
          {searchResults.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState icon={<Search />} title={t('noPlayersFound')} description={t('noPlayersHint')} action={{ label: t('resetFilters'), onClick: resetFilters }} />
            ) : (
              <EmptyState icon={<Package />} title={t('emptyMarket')} description={t('emptyMarketHint')} />
            )
          ) : (
            <>
              {/* Mobile: always list */}
              <div className="md:hidden space-y-1.5">
                {searchResults.map(player => (
                  <PlayerDisplay key={player.id} variant="compact" player={player}
                    isWatchlisted={watchlist[player.id]} onWatch={() => onWatch(player.id)}
                    onBuy={(id) => handlePlayerBuy(id)} buying={buyingId === player.id} />
                ))}
              </div>
              {/* Desktop: view toggle */}
              <div className="hidden md:block">
                {view === 'grid' ? (
                  <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {searchResults.map(player => (
                      <PlayerDisplay key={player.id} variant="card" player={player}
                        isWatchlisted={watchlist[player.id]} onWatch={() => onWatch(player.id)}
                        onBuy={(id) => handlePlayerBuy(id)} buying={buyingId === player.id} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.map(player => (
                      <PlayerDisplay key={player.id} variant="compact" player={player}
                        isWatchlisted={watchlist[player.id]} onWatch={() => onWatch(player.id)}
                        onBuy={(id) => handlePlayerBuy(id)} buying={buyingId === player.id} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
