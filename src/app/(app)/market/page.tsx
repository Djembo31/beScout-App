'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Filter, Grid, List,
  Star, Target, Users, Briefcase,
  Zap, Layers, Shield, GitCompareArrows,
  Flame, Award, PiggyBank,
  TrendingDown as PriceDown, X, ChevronDown, ChevronRight, ArrowUpDown,
  Package,
} from 'lucide-react';
import { Card, ErrorState, Skeleton, SkeletonCard, TabBar, TabPanel } from '@/components/ui';
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
const ManagerOffersTab = dynamic(() => import('@/components/manager/ManagerOffersTab'), { ssr: false });

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
// TABS CONFIG — 4 Tabs
// ============================================

type NewTab = 'portfolio' | 'kaufen' | 'angebote' | 'spieler';

const TABS: { id: NewTab; label: string }[] = [
  { id: 'portfolio', label: 'Mein Kader' },
  { id: 'kaufen', label: 'Kaufen' },
  { id: 'angebote', label: 'Angebote' },
  { id: 'spieler', label: 'Alle Spieler' },
];

// Map old tab IDs to new ones for backward compat
const TAB_ALIAS: Record<string, NewTab> = {
  kader: 'portfolio',
  bestand: 'portfolio',
  compare: 'spieler',
  transferlist: 'kaufen',
  scouting: 'kaufen',
  offers: 'angebote',
};

const VALID_TABS = new Set<string>(TABS.map(t => t.id));

// ============================================
// IPO DATA HELPERS
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
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-9 w-48 mb-1" />
        <Skeleton className="h-4 w-36 mt-1" />
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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

export default function MarketPage() {
  const { user } = useUser();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<NewTab>(() => {
    if (initialTab) {
      if (VALID_TABS.has(initialTab)) return initialTab as NewTab;
      if (TAB_ALIAS[initialTab]) return TAB_ALIAS[initialTab];
    }
    return 'portfolio';
  });
  const [portfolioView, setPortfolioView] = useState<'kader' | 'portfolio'>('kader');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>(loadWatchlist);
  const [query, setQuery] = useState('');
  const [showCompare, setShowCompare] = useState(false);

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

  // Phase 1: Players + Holdings
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
          return { ...p, dpc: { ...p.dpc, owned: h?.quantity ?? 0 } };
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

  // Phase 2: Enrichment
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
        // Enrichment failure is non-critical
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

  // Buy handler
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
          return { ...p, dpc: { ...p.dpc, onMarket, owned: h?.quantity ?? 0 }, listings };
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

  // Derived data
  const availableClubs = useMemo(() => Array.from(new Set(players.map(p => p.club))).sort(), [players]);
  const filteredClubs = clubSearch ? availableClubs.filter(c => c.toLowerCase().includes(clubSearch.toLowerCase())) : availableClubs;

  const togglePos = (pos: Pos) => {
    setPosFilter(prev => { const next = new Set(prev); next.has(pos) ? next.delete(pos) : next.add(pos); return next; });
  };
  const toggleClub = (club: string) => {
    setClubFilter(prev => { const next = new Set(prev); next.has(club) ? next.delete(club) : next.add(club); return next; });
  };

  const activeFilterCount = (posFilter.size > 0 ? 1 : 0) + (clubFilter.size > 0 ? 1 : 0)
    + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (onlyAvailable ? 1 : 0) + (onlyOwned ? 1 : 0) + (onlyWatched ? 1 : 0);

  const resetFilters = () => {
    setPosFilter(new Set()); setClubFilter(new Set()); setPriceMin(''); setPriceMax('');
    setOnlyAvailable(false); setOnlyOwned(false); setOnlyWatched(false); setSortBy('floor_asc'); setQuery('');
  };

  const getFloor = (p: Player) => p.listings.length > 0 ? Math.min(...p.listings.map(l => l.price)) : p.prices.floor ?? 0;

  const hasActiveFilters = query !== '' || posFilter.size > 0 || clubFilter.size > 0
    || priceMin !== '' || priceMax !== '' || onlyAvailable || onlyOwned || onlyWatched;

  // "Kaufen" tab: IPOs + P2P listings merged
  const ipoItems = useMemo(() => {
    return ipoList.map(ipo => {
      const player = players.find(p => p.id === ipo.player_id);
      if (!player) return null;
      return { player, ipo: dbIpoToLocal(ipo) };
    }).filter((x): x is { player: Player; ipo: IPOData } => x !== null);
  }, [ipoList, players]);

  const transferPlayers = useMemo(() => {
    let result = [...players].filter(p => p.listings.length > 0 && !p.isLiquidated);
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(p => `${p.first} ${p.last} ${p.club} ${p.league || ''}`.toLowerCase().includes(q));
    }
    if (posFilter.size > 0) result = result.filter(p => posFilter.has(p.pos));
    if (clubFilter.size > 0) result = result.filter(p => clubFilter.has(p.club));
    if (priceMin) { const min = parseFloat(priceMin); if (!isNaN(min)) result = result.filter(p => getFloor(p) >= min); }
    if (priceMax) { const max = parseFloat(priceMax); if (!isNaN(max)) result = result.filter(p => getFloor(p) <= max); }
    if (onlyAvailable) result = result.filter(p => p.dpc.onMarket > 0);
    if (onlyOwned) result = result.filter(p => p.dpc.owned > 0);
    if (onlyWatched) result = result.filter(p => watchlist[p.id]);
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'floor_asc': return getFloor(a) - getFloor(b);
        case 'floor_desc': return getFloor(b) - getFloor(a);
        case 'l5': return b.perf.l5 - a.perf.l5;
        case 'change': return b.prices.change24h - a.prices.change24h;
        case 'name': return `${a.last}`.localeCompare(`${b.last}`);
        default: return 0;
      }
    });
  }, [players, query, posFilter, clubFilter, priceMin, priceMax, onlyAvailable, onlyOwned, onlyWatched, watchlist, sortBy]);

  const filteredIPOs = useMemo(() => {
    let result = ipoItems;
    if (query) { const q = query.toLowerCase(); result = result.filter(({ player: p }) => `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q)); }
    if (posFilter.size > 0) result = result.filter(({ player: p }) => posFilter.has(p.pos));
    if (clubFilter.size > 0) result = result.filter(({ player: p }) => clubFilter.has(p.club));
    return [...result].sort((a, b) => {
      const order: Record<LocalIPOStatus, number> = { live: 0, early_access: 1, announced: 2, ended: 3 };
      return (order[a.ipo.status] ?? 4) - (order[b.ipo.status] ?? 4);
    });
  }, [ipoItems, query, posFilter, clubFilter]);

  const mySquadPlayers = useMemo(() => {
    let result = players.filter(p => p.dpc.owned > 0 && !p.isLiquidated);
    if (query) { const q = query.toLowerCase(); result = result.filter(p => `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q)); }
    if (posFilter.size > 0) result = result.filter(p => posFilter.has(p.pos));
    if (clubFilter.size > 0) result = result.filter(p => clubFilter.has(p.club));
    return result;
  }, [players, query, posFilter, clubFilter]);

  // Spieler tab: club groups
  const POS_ORDER: Record<Pos, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

  const clubGroups = useMemo(() => {
    let filtered = players.filter(p => !p.isLiquidated);
    if (spielerQuery) {
      const q = spielerQuery.toLowerCase();
      filtered = filtered.filter(p => `${p.first} ${p.last} ${p.club} ${p.pos}`.toLowerCase().includes(q));
    }
    if (spielerPosFilter.size > 0) filtered = filtered.filter(p => spielerPosFilter.has(p.pos));
    const map = new Map<string, Player[]>();
    for (const p of filtered) { const arr = map.get(p.club) ?? []; arr.push(p); map.set(p.club, arr); }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([clubName, clubPlayers]) => ({
        clubName,
        clubData: getClub(clubName),
        players: clubPlayers.sort((a, b) => {
          const posDiff = POS_ORDER[a.pos] - POS_ORDER[b.pos];
          return posDiff !== 0 ? posDiff : a.last.localeCompare(b.last);
        }),
      }));
  }, [players, spielerQuery, spielerPosFilter]);

  if (!spielerInitialized && clubGroups.length > 0) {
    setExpandedClubs(new Set([clubGroups[0].clubName]));
    setSpielerInitialized(true);
  }

  const totalSpielerCount = clubGroups.reduce((s, g) => s + g.players.length, 0);

  const toggleSpielerPos = (pos: Pos) => {
    setSpielerPosFilter(prev => { const next = new Set(prev); next.has(pos) ? next.delete(pos) : next.add(pos); return next; });
  };
  const toggleClubExpand = (clubName: string) => {
    setExpandedClubs(prev => { const next = new Set(prev); next.has(clubName) ? next.delete(clubName) : next.add(clubName); return next; });
  };

  if (dataLoading) return <MarketSkeleton />;

  if (dataError && players.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto py-12">
        <ErrorState onRetry={() => { setDataLoading(true); setDataError(false); setRetryCount(c => c + 1); }} />
      </div>
    );
  }

  const getIpoDisplayData = (ipo: IPOData) => {
    let currentPrice = ipo.price;
    if (ipo.type === 'tiered' && ipo.tiers) {
      const currentTier = ipo.tiers.find(t => t.sold < t.quantity);
      if (currentTier) currentPrice = currentTier.price;
    }
    return {
      status: getIPOStatusStyle(ipo.status).label,
      progress: (ipo.sold / ipo.totalOffered) * 100,
      price: currentPrice,
      remaining: ipo.totalOffered - ipo.sold,
      totalOffered: ipo.totalOffered,
      endsAt: ipo.endsAt,
    };
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
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
      <div>
        <div className="text-xs text-white/50">Manager Office</div>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3">
          <Briefcase className="w-7 h-7 text-[#FFD700]" />
          Manager Office
        </h1>
        <div className="mt-1 text-sm text-white/50">
          Guthaben: <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(balanceCents))} BSD</span>
        </div>
      </div>

      {/* 4 Tabs */}
      <TabBar tabs={TABS} activeTab={tab} onChange={(id) => setTab(id as NewTab)} />

      {/* ━━━ TAB: MEIN KADER ━━━ */}
      <TabPanel id="portfolio" activeTab={tab}>
        {/* Toggle: Kader / Portfolio */}
        <div className="flex items-center gap-1 mb-4 p-1 bg-white/[0.02] border border-white/10 rounded-xl w-fit">
          <button
            onClick={() => setPortfolioView('kader')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
              portfolioView === 'kader' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-white/40 border border-transparent'
            )}
          >Kader-Ansicht</button>
          <button
            onClick={() => setPortfolioView('portfolio')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
              portfolioView === 'portfolio' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-white/40 border border-transparent'
            )}
          >Portfolio-Ansicht</button>
        </div>
        {portfolioView === 'kader' ? (
          <ManagerKaderTab players={players} ownedPlayers={mySquadPlayers} />
        ) : (
          <ManagerBestandTab players={players} holdings={holdings} ipoList={ipoList} userId={user?.id} />
        )}
      </TabPanel>

      {/* ━━━ TAB: KAUFEN (IPOs + P2P) ━━━ */}
      <TabPanel id="kaufen" activeTab={tab}>
        {/* Trending Strip */}
        {trending.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400/80">Trending</span>
            </div>
            {trending.map(t => {
              const up = t.change24h >= 0;
              return (
                <Link key={t.playerId} href={`/player/${t.playerId}`}
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

        {/* IPOs Section (prominent) */}
        {filteredIPOs.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#22C55E]" />
              <span className="text-sm font-black uppercase tracking-wider">Club Sales (IPO)</span>
              <span className="px-1.5 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold rounded-full">
                {filteredIPOs.filter(i => i.ipo.status === 'live' || i.ipo.status === 'early_access').length} Live
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredIPOs.map(({ player: p, ipo }) => (
                <PlayerDisplay key={ipo.id} variant="card" player={p}
                  ipoData={getIpoDisplayData(ipo)}
                  isWatchlisted={watchlist[p.id]} onWatch={() => toggleWatch(p.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4 space-y-3 mb-4">
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
              className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0',
                showFilters || activeFilterCount > 0
                  ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              )}
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
          {/* Position Toggles */}
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
                <button key={pos} onClick={() => togglePos(pos)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${active ? `${c.bg} ${c.border} ${c.text}` : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'}`}
                >{pos}</button>
              );
            })}
          </div>
          {/* Advanced Filters */}
          {showFilters && (
            <div className="flex items-start gap-3 flex-wrap pt-2 border-t border-white/5">
              <div className="relative">
                <button onClick={() => setShowClubDropdown(!showClubDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 transition-all min-w-[160px]"
                >
                  <Users className="w-3.5 h-3.5 text-white/40" />
                  {clubFilter.size > 0 ? `${clubFilter.size} Verein${clubFilter.size > 1 ? 'e' : ''}` : 'Alle Vereine'}
                  <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showClubDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showClubDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl z-50">
                    <div className="p-2 border-b border-white/10">
                      <input type="text" placeholder="Verein suchen..." value={clubSearch} onChange={(e) => setClubSearch(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30" autoFocus />
                    </div>
                    <div className="p-1">
                      {filteredClubs.map(club => (
                        <button key={club} onClick={() => toggleClub(club)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${clubFilter.has(club) ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'text-white/70 hover:bg-white/10'}`}
                        >
                          <span>{club}</span>
                          {clubFilter.has(club) && <span className="text-[#FFD700]">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-white/40" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
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
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/40">Preis:</span>
                <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                  className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25" />
                <span className="text-white/20">–</span>
                <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                  className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25" />
                <span className="text-[10px] text-white/30">BSD</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                    onlyAvailable ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70')}>
                  <Package className="w-3.5 h-3.5" />Verfügbar
                </button>
                <button onClick={() => setOnlyWatched(!onlyWatched)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                    onlyWatched ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70')}>
                  <Star className="w-3.5 h-3.5" />Beobachtet
                </button>
              </div>
            </div>
          )}
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
              <button onClick={resetFilters} className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-1">Alle zurücksetzen</button>
            </div>
          )}
        </Card>

        {/* P2P Listings */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-white/50">{transferPlayers.length} Spieler am Transfermarkt</div>
        </div>
        {transferPlayers.length === 0 ? (
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
        ) : view === 'grid' ? (
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
      </TabPanel>

      {/* ━━━ TAB: ANGEBOTE ━━━ */}
      <TabPanel id="angebote" activeTab={tab}>
        <ManagerOffersTab players={players} />
      </TabPanel>

      {/* ━━━ TAB: ALLE SPIELER ━━━ */}
      <TabPanel id="spieler" activeTab={tab}>
        <div className="space-y-3">
          {/* Search + Position Filter + Compare Button */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="text" placeholder="Spieler suchen..." value={spielerQuery} onChange={(e) => setSpielerQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30" />
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
                    <button key={pos} onClick={() => toggleSpielerPos(pos)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-black border transition-all',
                        active ? `${c.bg} ${c.border} ${c.text}` : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
                      )}>{pos}</button>
                  );
                })}
              </div>
              <button onClick={() => setShowCompare(!showCompare)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0',
                  showCompare ? 'bg-purple-500/15 border-purple-400/30 text-purple-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                )}>
                <GitCompareArrows className="w-3.5 h-3.5" />
                Vergleich
              </button>
            </div>
          </Card>

          {/* Compare Modal-inline */}
          {showCompare && (
            <Card className="p-4">
              <ManagerCompareTab players={players} />
            </Card>
          )}

          {/* Result Counter */}
          <div className="text-sm text-white/50">{totalSpielerCount} Spieler in {clubGroups.length} Clubs</div>

          {/* Club Sections */}
          {clubGroups.map(({ clubName, clubData, players: clubPlayers }) => {
            const isExpanded = expandedClubs.has(clubName);
            const primaryColor = clubData?.colors.primary ?? '#666';
            return (
              <div key={clubName} className="border border-white/[0.06] rounded-2xl overflow-hidden">
                <button onClick={() => toggleClubExpand(clubName)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-all"
                  style={{ borderLeft: `3px solid ${primaryColor}` }}
                >
                  {clubData?.logo ? (
                    <img src={clubData.logo} alt={clubName} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
                  )}
                  <span className="font-bold text-sm">{clubName}</span>
                  {clubData && <span className="text-[10px] font-mono text-white/30">{clubData.short}</span>}
                  <span className="text-xs text-white/40 ml-auto mr-2">{clubPlayers.length} Spieler</span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-white/[0.06]">
                    <div className="space-y-0.5 p-1.5">
                      {clubPlayers.map(player => (
                        <PlayerDisplay key={player.id} variant="compact" player={player}
                          isWatchlisted={watchlist[player.id]} onWatch={() => toggleWatch(player.id)} />
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
      </TabPanel>
    </div>
  );
}
