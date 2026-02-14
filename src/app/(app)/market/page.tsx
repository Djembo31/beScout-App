'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Filter, Grid, List,
  Star, Target, Users, Briefcase,
  MessageSquare, Zap, Layers, Shield, GitCompareArrows,
  Flame, Award, PiggyBank,
  TrendingDown as PriceDown, X, ChevronDown, ChevronRight, ArrowUpDown,
  Package,
} from 'lucide-react';
import { Card, ErrorState, Skeleton, SkeletonCard } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { fmtBSD, cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { getPlayers, dbToPlayers, centsToBsd } from '@/lib/services/players';
import { getHoldings } from '@/lib/services/wallet';
import { useWallet } from '@/components/providers/WalletProvider';
import { buyFromMarket, getAllOpenSellOrders, getTrendingPlayers, getAllPriceHistories } from '@/lib/services/trading';
import type { TrendingPlayer } from '@/lib/services/trading';
import { getActiveIpos } from '@/lib/services/ipo';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { withTimeout } from '@/lib/cache';
import { val } from '@/lib/settledHelpers';
import dynamic from 'next/dynamic';
import type { Player, Pos, Listing, DbIpo } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import type { ManagerTab } from '@/components/manager/types';

const ManagerKaderTab = dynamic(() => import('@/components/manager/ManagerKaderTab'), { ssr: false });
const ManagerBestandTab = dynamic(() => import('@/components/manager/ManagerBestandTab'), { ssr: false });
const ManagerCompareTab = dynamic(() => import('@/components/manager/ManagerCompareTab'), { ssr: false });

// ============================================
// WATCHLIST (localStorage)
// ============================================
const WATCHLIST_KEY = 'bescout-watchlist';
const WATCHLIST_PRICES_KEY = 'bescout-watchlist-prices';

function loadWatchlist(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveWatchlist(wl: Record<string, boolean>): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(wl));
}

function loadWatchlistPrices(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WATCHLIST_PRICES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveWatchlistPrices(prices: Record<string, number>): void {
  localStorage.setItem(WATCHLIST_PRICES_KEY, JSON.stringify(prices));
}

// ============================================
// TYPES
// ============================================
type IPOType = 'fixed' | 'tiered' | 'dutch';
// Note: DB uses 'open', mapped to 'live' for display. 'cancelled' mapped to 'ended'.
type LocalIPOStatus = 'announced' | 'early_access' | 'live' | 'ended';

type PriceTier = { price: number; quantity: number; sold: number };

type IPOData = {
  id: string;
  type: IPOType;
  status: LocalIPOStatus;
  price: number;
  priceMin?: number;
  priceMax?: number;
  tiers?: PriceTier[];
  totalOffered: number;
  sold: number;
  startsAt: number;
  endsAt: number;
  earlyAccessEndsAt?: number;
  memberDiscount?: number;
  userLimit: number;
  portfolioLimit: number;
  userPurchased: number;
};


// ============================================
// TABS CONFIG
// ============================================

const TABS: { id: ManagerTab; label: string; icon: React.ElementType }[] = [
  { id: 'kader', label: 'Kader', icon: Shield },
  { id: 'bestand', label: 'Bestand', icon: Package },
  { id: 'compare', label: 'Vergleich', icon: GitCompareArrows },
  { id: 'spieler', label: 'Spieler', icon: Users },
  { id: 'transferlist', label: 'Transferliste', icon: ArrowUpDown },
  { id: 'scouting', label: 'Scouting', icon: Zap },
  { id: 'offers', label: 'Angebote', icon: Briefcase },
];

// ============================================
// IPO DATA HELPERS — Convert DbIpo to local IPOData
// ============================================

function dbIpoToLocal(ipo: DbIpo): IPOData {
  const statusMap: Record<string, LocalIPOStatus> = {
    'open': 'live',
    'early_access': 'early_access',
    'announced': 'announced',
    'ended': 'ended',
    'cancelled': 'ended',
  };
  return {
    id: ipo.id,
    type: ipo.format as IPOType,
    status: statusMap[ipo.status] || 'ended',
    price: centsToBsd(ipo.price),
    priceMin: ipo.price_min ? centsToBsd(ipo.price_min) : undefined,
    priceMax: ipo.price_max ? centsToBsd(ipo.price_max) : undefined,
    tiers: ipo.tiers?.map(t => ({ price: centsToBsd(t.price), quantity: t.quantity, sold: t.sold })) ?? undefined,
    totalOffered: ipo.total_offered,
    sold: ipo.sold,
    startsAt: new Date(ipo.starts_at).getTime(),
    endsAt: new Date(ipo.ends_at).getTime(),
    earlyAccessEndsAt: ipo.early_access_ends_at ? new Date(ipo.early_access_ends_at).getTime() : undefined,
    memberDiscount: ipo.member_discount > 0 ? ipo.member_discount : undefined,
    userLimit: ipo.max_per_user,
    portfolioLimit: 500,
    userPurchased: 0,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================


const getIPOStatusStyle = (status: LocalIPOStatus) => {
  switch (status) {
    case 'announced':
      return { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-300', label: 'Angekündigt' };
    case 'early_access':
      return { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300', label: 'Vorkaufsrecht' };
    case 'live':
      return { bg: 'bg-[#22C55E]/15', border: 'border-[#22C55E]/25', text: 'text-[#22C55E]', label: 'Live' };
    case 'ended':
      return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: 'Beendet' };
  }
};





// ============================================
// SKELETON
// ============================================

function MarketSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-9 w-48 mb-1" />
        <Skeleton className="h-4 w-36 mt-1" />
      </div>
      {/* Tabs */}
      <div className="flex gap-1.5">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      {/* Filters */}
      <div className="animate-pulse bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="flex-1 h-10 rounded-xl" />
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-14 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Results count */}
      <Skeleton className="h-4 w-28" />
      {/* Player Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

const VALID_TABS: Set<string> = new Set(TABS.map(t => t.id));

export default function MarketPage() {
  const { user } = useUser();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<ManagerTab>(() => {
    if (initialTab && VALID_TABS.has(initialTab)) return initialTab as ManagerTab;
    return 'kader';
  });
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>(loadWatchlist);
  const [query, setQuery] = useState('');

  // Filter state
  type SortOption = 'floor_asc' | 'floor_desc' | 'l5' | 'change' | 'name';
  const [posFilter, setPosFilter] = useState<Set<Pos>>(new Set());
  const [clubFilter, setClubFilter] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('floor_asc');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [onlyWatched, setOnlyWatched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [clubSearch, setClubSearch] = useState('');
  const [showClubDropdown, setShowClubDropdown] = useState(false);

  // Spieler tab state
  const [spielerQuery, setSpielerQuery] = useState('');
  const [spielerPosFilter, setSpielerPosFilter] = useState<Set<Pos>>(new Set());
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [spielerInitialized, setSpielerInitialized] = useState(false);

  // Real data state
  const [players, setPlayers] = useState<Player[]>([]);
  const [holdings, setHoldings] = useState<HoldingWithPlayer[]>([]);
  const [ipoList, setIpoList] = useState<DbIpo[]>([]);
  const wallet = useWallet();
  const balanceCents = wallet.balanceCents ?? 0;
  const setBalanceCents = wallet.setBalanceCents;
  const [dataLoading, setDataLoading] = useState(true);
  const [enrichLoading, setEnrichLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [trending, setTrending] = useState<TrendingPlayer[]>([]);

  // Phase 1: Players + Holdings (sofort nutzbar für Kader/Spieler/Bestand)
  useEffect(() => {
    let cancelled = false;
    async function loadCore() {
      try {
        const results = await withTimeout(Promise.allSettled([
          getPlayers(),
          user ? getHoldings(user.id) : Promise.resolve([]),
        ]), 10000);
        if (cancelled) return;
        const dbPlayers = val(results[0], []);
        const hlds = val(results[1], []);
        if (results[0].status === 'rejected') {
          if (!cancelled) setDataError(true);
          return;
        }
        const mapped = dbToPlayers(dbPlayers);
        const base = mapped.map(p => {
          const h = hlds.find(h => h.player_id === p.id);
          return {
            ...p,
            dpc: { ...p.dpc, owned: h?.quantity ?? 0 },
          };
        });
        setPlayers(base);
        setHoldings(hlds);
        setDataError(false);
      } catch {
        if (!cancelled) setDataError(true);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadCore();
    return () => { cancelled = true; };
  }, [user, retryCount]);

  // Phase 2: Enrichment (Sell Orders, IPOs, Trending, Price Histories)
  useEffect(() => {
    if (players.length === 0 || dataLoading) return;
    let cancelled = false;
    async function loadEnrichment() {
      try {
        const results = await withTimeout(Promise.allSettled([
          getAllOpenSellOrders(),
          getActiveIpos(),
          getTrendingPlayers(5),
          getAllPriceHistories(10),
        ]), 10000);
        if (cancelled) return;
        const sellOrders = val(results[0], []);
        const ipos = val(results[1], []);
        const trendData = val(results[2], []);
        const priceHistMap = val(results[3], new Map<string, number[]>());

        setPlayers(prev => prev.map(p => {
          const playerOrders = sellOrders.filter(o => o.player_id === p.id);
          const onMarket = playerOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
          const listings: Listing[] = playerOrders.map(o => ({
            id: o.id,
            sellerId: o.user_id,
            sellerName: 'Verkäufer',
            price: centsToBsd(o.price),
            qty: o.quantity - o.filled_qty,
            expiresAt: o.expires_at ? new Date(o.expires_at).getTime() : Date.now() + 86400000,
          }));
          const hist = priceHistMap.get(p.id);
          return {
            ...p,
            dpc: { ...p.dpc, onMarket },
            prices: { ...p.prices, history7d: hist && hist.length >= 2 ? hist : undefined },
            listings,
          };
        }));
        setIpoList(ipos);
        setTrending(trendData);

        // Watchlist price change detection
        const wl = loadWatchlist();
        const savedPrices = loadWatchlistPrices();
        const updatedPrices = { ...savedPrices };
        for (const p of players) {
          if (!wl[p.id]) continue;
          const oldPrice = savedPrices[p.id];
          const newPrice = p.prices.floor ?? 0;
          if (oldPrice && oldPrice > 0 && newPrice > 0) {
            const changePct = ((newPrice - oldPrice) / oldPrice) * 100;
            if (Math.abs(changePct) >= 5) {
              const dir = changePct > 0 ? 'gestiegen' : 'gefallen';
              const sign = changePct > 0 ? '+' : '';
              addToast(`${p.first} ${p.last}: Preis ${dir} (${sign}${changePct.toFixed(1)}%)`, changePct > 0 ? 'success' : 'error');
            }
          }
          updatedPrices[p.id] = newPrice;
        }
        saveWatchlistPrices(updatedPrices);
      } catch {
        // Enrichment failure is non-critical, tabs still work
      } finally {
        if (!cancelled) setEnrichLoading(false);
      }
    }
    loadEnrichment();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, dataLoading]);

  const toggleWatch = (id: string) => {
    setWatchlist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveWatchlist(next);
      // Store current floor price when adding to watchlist
      if (next[id]) {
        const p = players.find(pl => pl.id === id);
        if (p) {
          const prices = loadWatchlistPrices();
          prices[id] = p.prices.floor ?? 0;
          saveWatchlistPrices(prices);
        }
      }
      return next;
    });
  };

  // Buy handler (Verpflichten)
  const handleBuy = async (playerId: string, quantity: number = 1) => {
    if (!user) return;
    setBuyingId(playerId);
    setBuyError(null);
    setBuySuccess(null);
    try {
      const result = await buyFromMarket(user.id, playerId, quantity);
      if (!result.success) {
        setBuyError(result.error || 'Kauf fehlgeschlagen');
      } else {
        setBuySuccess(`${quantity} DPC gekauft!`);
        setBalanceCents(result.new_balance ?? balanceCents);
        // Refresh player data with holdings + orders
        const [dbPlayers, holdings, sellOrders] = await Promise.all([
          getPlayers(),
          getHoldings(user.id),
          getAllOpenSellOrders(),
        ]);
        const mapped = dbToPlayers(dbPlayers);
        setPlayers(mapped.map(p => {
          const h = holdings.find(h => h.player_id === p.id);
          const playerOrders = sellOrders.filter(o => o.player_id === p.id);
          const onMarket = playerOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
          const listings: Listing[] = playerOrders.map(o => ({
            id: o.id,
            sellerId: o.user_id,
            sellerName: 'Verkäufer',
            price: centsToBsd(o.price),
            qty: o.quantity - o.filled_qty,
            expiresAt: o.expires_at ? new Date(o.expires_at).getTime() : Date.now() + 86400000,
          }));
          return {
            ...p,
            dpc: { ...p.dpc, onMarket, owned: h?.quantity ?? 0 },
            listings,
          };
        }));
        setHoldings(holdings);
        setTimeout(() => setBuySuccess(null), 3000);
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setBuyingId(null);
    }
  };

  // Derive unique clubs from data (scales automatically)
  const availableClubs = useMemo(() => {
    const clubs = Array.from(new Set(players.map(p => p.club))).sort();
    return clubs;
  }, [players]);

  const filteredClubs = clubSearch
    ? availableClubs.filter(c => c.toLowerCase().includes(clubSearch.toLowerCase()))
    : availableClubs;

  const togglePos = (pos: Pos) => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  };

  const toggleClub = (club: string) => {
    setClubFilter(prev => {
      const next = new Set(prev);
      next.has(club) ? next.delete(club) : next.add(club);
      return next;
    });
  };

  const activeFilterCount = (posFilter.size > 0 ? 1 : 0) + (clubFilter.size > 0 ? 1 : 0)
    + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (onlyAvailable ? 1 : 0) + (onlyOwned ? 1 : 0) + (onlyWatched ? 1 : 0);

  const resetFilters = () => {
    setPosFilter(new Set());
    setClubFilter(new Set());
    setPriceMin('');
    setPriceMax('');
    setOnlyAvailable(false);
    setOnlyOwned(false);
    setOnlyWatched(false);
    setSortBy('floor_asc');
    setQuery('');
  };

  const getFloor = (p: Player) =>
    p.listings.length > 0 ? Math.min(...p.listings.map(l => l.price)) : p.prices.floor ?? 0;

  const hasActiveFilters = query !== '' || posFilter.size > 0 || clubFilter.size > 0
    || priceMin !== '' || priceMax !== '' || onlyAvailable || onlyOwned || onlyWatched;

  const transferPlayers = useMemo(() => {
    // Only show players with active sell orders (exclude liquidated)
    let result = [...players].filter(p => p.listings.length > 0 && !p.isLiquidated);

    // Text search
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(p => `${p.first} ${p.last} ${p.club} ${p.league || ''}`.toLowerCase().includes(q));
    }
    // Position
    if (posFilter.size > 0) {
      result = result.filter(p => posFilter.has(p.pos));
    }
    // Club
    if (clubFilter.size > 0) {
      result = result.filter(p => clubFilter.has(p.club));
    }
    // Price range (BSD values)
    if (priceMin) {
      const min = parseFloat(priceMin);
      if (!isNaN(min)) result = result.filter(p => getFloor(p) >= min);
    }
    if (priceMax) {
      const max = parseFloat(priceMax);
      if (!isNaN(max)) result = result.filter(p => getFloor(p) <= max);
    }
    // Quick filters
    if (onlyAvailable) result = result.filter(p => p.dpc.onMarket > 0);
    if (onlyOwned) result = result.filter(p => p.dpc.owned > 0);
    if (onlyWatched) result = result.filter(p => watchlist[p.id]);

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'floor_asc': return getFloor(a) - getFloor(b);
        case 'floor_desc': return getFloor(b) - getFloor(a);
        case 'l5': return b.perf.l5 - a.perf.l5;
        case 'change': return b.prices.change24h - a.prices.change24h;
        case 'name': return `${a.last}`.localeCompare(`${b.last}`);
        default: return 0;
      }
    });

    return result;
  }, [players, query, posFilter, clubFilter, priceMin, priceMax, onlyAvailable, onlyOwned, onlyWatched, watchlist, sortBy]);

  // Build IPO items: join DbIpo with Player data
  const ipoItems = useMemo(() => {
    return ipoList.map(ipo => {
      const player = players.find(p => p.id === ipo.player_id);
      if (!player) return null;
      return { player, ipo: dbIpoToLocal(ipo) };
    }).filter((x): x is { player: Player; ipo: IPOData } => x !== null);
  }, [ipoList, players]);

  const filteredIPOs = useMemo(() => {
    let result = ipoItems;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(({ player: p }) =>
        `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q)
      );
    }
    if (posFilter.size > 0) {
      result = result.filter(({ player: p }) => posFilter.has(p.pos));
    }
    if (clubFilter.size > 0) {
      result = result.filter(({ player: p }) => clubFilter.has(p.club));
    }
    return result;
  }, [ipoItems, query, posFilter, clubFilter]);

  const sortedIPOs = useMemo(() => {
    return [...filteredIPOs].sort((a, b) => {
      const order: Record<LocalIPOStatus, number> = { live: 0, early_access: 1, announced: 2, ended: 3 };
      return (order[a.ipo.status] ?? 4) - (order[b.ipo.status] ?? 4);
    });
  }, [filteredIPOs]);

  const mySquadPlayers = useMemo(() => {
    let result = players.filter(p => p.dpc.owned > 0 && !p.isLiquidated);
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(p => `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q));
    }
    if (posFilter.size > 0) {
      result = result.filter(p => posFilter.has(p.pos));
    }
    if (clubFilter.size > 0) {
      result = result.filter(p => clubFilter.has(p.club));
    }
    return result;
  }, [players, query, posFilter, clubFilter]);

  // Spieler tab: group players by club, filter, sort
  const POS_ORDER: Record<Pos, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

  const clubGroups = useMemo(() => {
    let filtered = players.filter(p => !p.isLiquidated);
    if (spielerQuery) {
      const q = spielerQuery.toLowerCase();
      filtered = filtered.filter(p =>
        `${p.first} ${p.last} ${p.club} ${p.pos}`.toLowerCase().includes(q)
      );
    }
    if (spielerPosFilter.size > 0) {
      filtered = filtered.filter(p => spielerPosFilter.has(p.pos));
    }
    // Group by club
    const map = new Map<string, Player[]>();
    for (const p of filtered) {
      const arr = map.get(p.club) ?? [];
      arr.push(p);
      map.set(p.club, arr);
    }
    // Sort clubs alphabetically, sort players within by pos then last name
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([clubName, clubPlayers]) => ({
        clubName,
        clubData: getClub(clubName),
        players: clubPlayers.sort((a, b) => {
          const posDiff = POS_ORDER[a.pos] - POS_ORDER[b.pos];
          if (posDiff !== 0) return posDiff;
          return a.last.localeCompare(b.last);
        }),
      }));
  }, [players, spielerQuery, spielerPosFilter]);

  // Auto-expand first club on initial load
  if (!spielerInitialized && clubGroups.length > 0) {
    setExpandedClubs(new Set([clubGroups[0].clubName]));
    setSpielerInitialized(true);
  }

  const totalSpielerCount = clubGroups.reduce((s, g) => s + g.players.length, 0);

  const toggleSpielerPos = (pos: Pos) => {
    setSpielerPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  };

  const toggleClubExpand = (clubName: string) => {
    setExpandedClubs(prev => {
      const next = new Set(prev);
      next.has(clubName) ? next.delete(clubName) : next.add(clubName);
      return next;
    });
  };

  if (dataLoading) return <MarketSkeleton />;

  if (dataError && players.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto py-12">
        <ErrorState onRetry={() => { setDataLoading(true); setDataError(false); setRetryCount(c => c + 1); }} />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Buy Feedback */}
      {buySuccess && (
        <div className="fixed top-4 right-4 z-50 bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] px-4 py-3 rounded-xl font-bold text-sm animate-in fade-in">
          {buySuccess}
        </div>
      )}
      {buyError && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => setBuyError(null)}>
          {buyError}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
        <div>
          <div className="text-xs text-white/50">Manager Office</div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3">
            <Briefcase className="w-7 h-7 md:w-8 md:h-8 text-[#FFD700]" />
            Manager Office
          </h1>
          <div className="mt-1 text-sm text-white/50">
            Guthaben: <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(balanceCents))} BSD</span>
          </div>
        </div>
        {/* PBT Info Banner */}
        <div className="hidden md:block bg-gradient-to-r from-[#FFD700]/10 to-purple-500/10 border border-[#FFD700]/20 rounded-xl px-4 py-2">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-[#FFD700]" />
              <span className="text-white/50">PBT:</span>
              <span className="text-[#FFD700] font-bold">Scout Performance Rewards</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-white/50">Burn:</span>
              <span className="text-orange-300 font-bold">Bei Vertragsende</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 sm:overflow-x-auto sm:scrollbar-hide pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          const liveCount = t.id === 'scouting' && ipoItems.length > 0
            ? ipoItems.filter(i => i.ipo.status === 'live' || i.ipo.status === 'early_access').length
            : 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white hover:border-white/15'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              {liveCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[9px] font-bold rounded-full leading-none">
                  {liveCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Trending Players Strip — only on transferlist/scouting */}
      {(tab === 'transferlist' || tab === 'scouting') && trending.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400/80">Trending</span>
          </div>
          {trending.map(t => {
            const up = t.change24h >= 0;
            return (
              <Link
                key={t.playerId}
                href={`/player/${t.playerId}`}
                className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] transition-all shrink-0"
              >
                <PositionBadge pos={t.position} size="sm" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t.firstName} {t.lastName}</div>
                  <div className="text-[10px] text-white/40">{t.tradeCount} Trades</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-[#FFD700]">{fmtBSD(t.floorPrice)}</div>
                  <div className={`text-[10px] font-mono ${up ? 'text-[#22C55E]' : 'text-red-300'}`}>
                    {up ? '+' : ''}{t.change24h.toFixed(1)}%
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Filters — only for transferlist/scouting */}
      {(tab === 'transferlist' || tab === 'scouting') && <Card className="p-4 space-y-3">
        {/* Row 1: Search + Position Toggles + View */}
        {/* Row 1a: Search + Filter Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Spieler, Verein, Liga suchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${showFilters || activeFilterCount > 0
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
          <div className="hidden md:flex items-center border border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-2.5 transition-all ${view === 'grid' ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2.5 transition-all ${view === 'list' ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Row 1b: Position Toggles */}
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
                className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${active
                  ? `${c.bg} ${c.border} ${c.text}`
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
                  }`}
              >
                {pos}
              </button>
            );
          })}
        </div>

        {/* Row 2: Advanced Filters (collapsible) */}
        {showFilters && (
          <div className="flex items-start gap-3 flex-wrap pt-2 border-t border-white/5">
            {/* Club Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowClubDropdown(!showClubDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 transition-all min-w-[160px]"
              >
                <Users className="w-3.5 h-3.5 text-white/40" />
                {clubFilter.size > 0 ? `${clubFilter.size} Verein${clubFilter.size > 1 ? 'e' : ''}` : 'Alle Vereine'}
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showClubDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showClubDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl z-50">
                  <div className="p-2 border-b border-white/10">
                    <input
                      type="text"
                      placeholder="Verein suchen..."
                      value={clubSearch}
                      onChange={(e) => setClubSearch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
                      autoFocus
                    />
                  </div>
                  <div className="p-1">
                    {filteredClubs.map(club => (
                      <button
                        key={club}
                        onClick={() => toggleClub(club)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${clubFilter.has(club)
                          ? 'bg-[#FFD700]/15 text-[#FFD700]'
                          : 'text-white/70 hover:bg-white/10'
                          }`}
                      >
                        <span>{club}</span>
                        {clubFilter.has(club) && <span className="text-[#FFD700]">✓</span>}
                      </button>
                    ))}
                    {filteredClubs.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/30">Kein Verein gefunden</div>
                    )}
                  </div>
                </div>
              )}
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
                <option value="floor_asc">Floor ↑ (günstigste)</option>
                <option value="floor_desc">Floor ↓ (teuerste)</option>
                <option value="l5">L5 Score (beste)</option>
                <option value="change">24h Change (Top)</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">Preis:</span>
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
              <span className="text-white/20">–</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
              <span className="text-[10px] text-white/30">BSD</span>
            </div>

            {/* Quick Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${onlyAvailable
                  ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                  }`}
              >
                <Package className="w-3.5 h-3.5" />
                Verfügbar
              </button>
              <button
                onClick={() => setOnlyOwned(!onlyOwned)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${onlyOwned
                  ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                  }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Meine
              </button>
              <button
                onClick={() => setOnlyWatched(!onlyWatched)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${onlyWatched
                  ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                  }`}
              >
                <Star className="w-3.5 h-3.5" />
                Beobachtet
              </button>
            </div>
          </div>
        )}

        {/* Row 3: Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {posFilter.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                Pos: {Array.from(posFilter).join(', ')}
                <button onClick={() => setPosFilter(new Set())} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {Array.from(clubFilter).map(club => (
              <span key={club} className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                {club}
                <button onClick={() => toggleClub(club)} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {priceMin && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                Min: {priceMin} BSD
                <button onClick={() => setPriceMin('')} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {priceMax && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                Max: {priceMax} BSD
                <button onClick={() => setPriceMax('')} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {onlyAvailable && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg text-[11px] text-[#22C55E]/70">
                Verfügbar
                <button onClick={() => setOnlyAvailable(false)} className="ml-0.5 hover:text-[#22C55E]"><X className="w-3 h-3" /></button>
              </span>
            )}
            {onlyOwned && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-400/20 rounded-lg text-[11px] text-sky-300/70">
                Meine Spieler
                <button onClick={() => setOnlyOwned(false)} className="ml-0.5 hover:text-sky-300"><X className="w-3 h-3" /></button>
              </span>
            )}
            {onlyWatched && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg text-[11px] text-[#FFD700]/70">
                Beobachtet
                <button onClick={() => setOnlyWatched(false)} className="ml-0.5 hover:text-[#FFD700]"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-1"
            >
              Alle zurücksetzen
            </button>
          </div>
        )}
      </Card>}

      {/* Results — only for transferlist/scouting */}
      {(tab === 'transferlist' || tab === 'scouting') && <div className="flex items-center justify-between">
        <div className="text-sm text-white/50">{tab === 'scouting' ? `${filteredIPOs.length} IPOs` : `${transferPlayers.length} Spieler`} gefunden</div>
        <div className="text-xs text-white/30">
          {tab === 'scouting' ? 'Sortiert nach: Status' : {
            floor_asc: 'Sortiert: Floor ↑',
            floor_desc: 'Sortiert: Floor ↓',
            l5: 'Sortiert: L5 Score',
            change: 'Sortiert: 24h Change',
            name: 'Sortiert: Name A-Z',
          }[sortBy]}
        </div>
      </div>}

      {/* TRANSFER LIST */}
      {tab === 'transferlist' && (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {transferPlayers.map((player) => (
                <PlayerDisplay key={player.id} variant="card" player={player} isWatchlisted={watchlist[player.id]} onWatch={() => toggleWatch(player.id)} onBuy={(id) => handleBuy(id)} buying={buyingId === player.id} />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {transferPlayers.map((player) => (
                <PlayerDisplay key={player.id} variant="compact" player={player} isWatchlisted={watchlist[player.id]} onWatch={() => toggleWatch(player.id)} onBuy={(id) => handleBuy(id)} buying={buyingId === player.id} />
              ))}
            </div>
          )}
        </>
      )}

      {/* CLUB SALE (IPO) */}
      {tab === 'scouting' && (
        <>
          <div className="flex items-center gap-4 md:gap-6 text-xs text-white/50 flex-wrap">
            <div className="flex items-center gap-2"><Target className="w-4 h-4" /><span>Festpreis</span></div>
            <div className="flex items-center gap-2"><Layers className="w-4 h-4" /><span>Staffelpreis</span></div>
            <div className="flex items-center gap-2"><PriceDown className="w-4 h-4" /><span>Sinkend (Dutch)</span></div>
            <div className="text-white/30 hidden md:block">|</div>
            <div className="flex items-center gap-2"><PiggyBank className="w-4 h-4 text-[#FFD700]" /><span>10% IPO → PBT</span></div>
            <div className="flex items-center gap-2"><Award className="w-4 h-4 text-purple-400" /><span>Success Fee Tier</span></div>
          </div>

          {(() => {
            const getIpoDisplayData = (ipo: IPOData) => {
              let currentPrice = ipo.price;
              if (ipo.type === 'tiered' && ipo.tiers) {
                const currentTier = ipo.tiers.find(t => t.sold < t.quantity);
                if (currentTier) currentPrice = currentTier.price;
              }
              const statusLabel = getIPOStatusStyle(ipo.status).label;
              return {
                status: statusLabel,
                progress: (ipo.sold / ipo.totalOffered) * 100,
                price: currentPrice,
                remaining: ipo.totalOffered - ipo.sold,
                totalOffered: ipo.totalOffered,
                endsAt: ipo.endsAt,
              };
            };
            return view === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sortedIPOs.map(({ player: p, ipo }) => (
                  <PlayerDisplay key={ipo.id} variant="card" player={p}
                    ipoData={getIpoDisplayData(ipo)}
                    isWatchlisted={watchlist[p.id]} onWatch={() => toggleWatch(p.id)} />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {sortedIPOs.map(({ player: p, ipo }) => (
                  <PlayerDisplay key={ipo.id} variant="compact" player={p}
                    ipoData={getIpoDisplayData(ipo)}
                    isWatchlisted={watchlist[p.id]} onWatch={() => toggleWatch(p.id)} />
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* SPIELER (Alle Spieler — Club-gruppiert) */}
      {tab === 'spieler' && (
        <div className="space-y-3">
          {/* Search + Position Filter */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Spieler suchen..."
                  value={spielerQuery}
                  onChange={(e) => setSpielerQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
                />
              </div>
              <div className="flex gap-1">
                {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => {
                  const active = spielerPosFilter.has(pos);
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
                      onClick={() => toggleSpielerPos(pos)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-black border transition-all',
                        active
                          ? `${c.bg} ${c.border} ${c.text}`
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
                      )}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Result Counter */}
          <div className="text-sm text-white/50">
            {totalSpielerCount} Spieler in {clubGroups.length} Clubs
          </div>

          {/* Club Sections */}
          {clubGroups.map(({ clubName, clubData, players: clubPlayers }) => {
            const isExpanded = expandedClubs.has(clubName);
            const primaryColor = clubData?.colors.primary ?? '#666';
            return (
              <div key={clubName} className="border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Club Header */}
                <button
                  onClick={() => toggleClubExpand(clubName)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-all"
                  style={{ borderLeft: `3px solid ${primaryColor}` }}
                >
                  {clubData?.logo ? (
                    <img src={clubData.logo} alt={clubName} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
                  )}
                  <span className="font-bold text-sm">{clubName}</span>
                  {clubData && (
                    <span className="text-[10px] font-mono text-white/30">{clubData.short}</span>
                  )}
                  <span className="text-xs text-white/40 ml-auto mr-2">
                    {clubPlayers.length} Spieler
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-white/30" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  )}
                </button>

                {/* Players */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06]">
                    <div className="space-y-0.5 p-1.5">
                      {clubPlayers.map(player => (
                        <PlayerDisplay
                          key={player.id}
                          variant="compact"
                          player={player}
                          isWatchlisted={watchlist[player.id]}
                          onWatch={() => toggleWatch(player.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {clubGroups.length === 0 && (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <div className="text-white/30 mb-2">Keine Spieler gefunden</div>
              <div className="text-sm text-white/50">Versuche andere Suchbegriffe oder Filter</div>
            </Card>
          )}
        </div>
      )}

      {/* Kader Tab */}
      {tab === 'kader' && (
        <ManagerKaderTab players={players} ownedPlayers={mySquadPlayers} />
      )}

      {/* Bestand Tab */}
      {tab === 'bestand' && (
        <ManagerBestandTab players={players} holdings={holdings} ipoList={ipoList} userId={user?.id} />
      )}

      {/* Compare Tab */}
      {tab === 'compare' && (
        <ManagerCompareTab players={players} />
      )}

      {/* Offers Tab */}
      {tab === 'offers' && (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Keine offenen Angebote</div>
          <div className="text-sm text-white/50">Verhandle mit Spielerbesitzern</div>
        </Card>
      )}

      {tab === 'transferlist' && transferPlayers.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-white/20" />
          {hasActiveFilters ? (
            <>
              <div className="text-white/30 mb-2">Keine Spieler gefunden</div>
              <div className="text-sm text-white/50">Versuche andere Suchbegriffe oder Filter</div>
            </>
          ) : (
            <>
              <div className="text-white/30 mb-2">Keine Angebote auf dem Transfermarkt</div>
              <div className="text-sm text-white/50">Kaufe DPCs über Club Sale und erstelle dann eigene Verkaufsangebote.</div>
            </>
          )}
        </Card>
      )}

      {tab === 'scouting' && filteredIPOs.length === 0 && (
        <Card className="p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Keine aktiven Club Sales</div>
          <div className="text-sm text-white/50">Aktuell werden keine IPOs angeboten. Schau später wieder vorbei.</div>
        </Card>
      )}
    </div>
  );
}
