'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Filter, Grid, List,
  Star, Users, Briefcase,
  GitCompareArrows,
  MessageSquare, Trophy,
  X, ChevronDown, ChevronRight, ArrowUpDown,
  Package, CheckCircle2,
} from 'lucide-react';
import { Confetti } from '@/components/ui/Confetti';
import { Card, ErrorState, Skeleton, SkeletonCard, TabBar, TabPanel, SearchInput, PosFilter, EmptyState } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { fmtBSD, cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { centsToBsd } from '@/lib/services/players';
import { placeSellOrder, cancelOrder } from '@/lib/services/trading';
import type { TrendingPlayer } from '@/lib/services/trading';
import { addToWatchlist, removeFromWatchlist, migrateLocalWatchlist } from '@/lib/services/watchlist';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import type { OfferWithDetails } from '@/types';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useEnrichedPlayers, useHoldings, invalidateTradeQueries } from '@/lib/queries';
import { useActiveIpos } from '@/lib/queries/ipos';
import { useTrendingPlayers } from '@/lib/queries/trending';
import { useAllPriceHistories } from '@/lib/queries/priceHist';
import { useWatchlist } from '@/lib/queries/watchlist';
import { useIncomingOffers } from '@/lib/queries/offers';
import { useBuyFromMarket, useBuyFromIpo } from '@/lib/mutations/trading';
import { useMarketStore } from '@/lib/stores/marketStore';
import type { MarketTab, SortOption } from '@/lib/stores/marketStore';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import dynamic from 'next/dynamic';
import type { Player, Pos, Listing, DbIpo } from '@/types';

const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
const ManagerKaderTab = dynamic(() => import('@/components/manager/ManagerKaderTab'), { ssr: false });
const ManagerBestandTab = dynamic(() => import('@/components/manager/ManagerBestandTab'), { ssr: false });
const ManagerCompareTab = dynamic(() => import('@/components/manager/ManagerCompareTab'), { ssr: false });
const ManagerOffersTab = dynamic(() => import('@/components/manager/ManagerOffersTab'), { ssr: false });
const KaufenIPOSection = dynamic(() => import('@/components/manager/KaufenIPOSection'), { ssr: false });

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

// ============================================
// TABS CONFIG — 4 Tabs
// ============================================

const TAB_IDS: MarketTab[] = ['portfolio', 'kaufen', 'angebote', 'spieler'];

const TAB_ALIAS: Record<string, MarketTab> = {
  kader: 'portfolio',
  bestand: 'portfolio',
  compare: 'spieler',
  transferlist: 'kaufen',
  scouting: 'kaufen',
  offers: 'angebote',
};

const VALID_TABS = new Set<string>(TAB_IDS);

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
    status: statusMap[ipo.status] || 'ended',
    price: centsToBsd(ipo.price),
    totalOffered: ipo.total_offered,
    sold: ipo.sold,
    startsAt: new Date(ipo.starts_at).getTime(),
    endsAt: new Date(ipo.ends_at).getTime(),
    earlyAccessEndsAt: ipo.early_access_ends_at ? new Date(ipo.early_access_ends_at).getTime() : undefined,
    userLimit: ipo.max_per_user,
    portfolioLimit: 500,
    userPurchased: 0,
  };
}

const IPO_STATUS_STYLES: Record<LocalIPOStatus, { bg: string; border: string; text: string }> = {
  announced: { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-300' },
  early_access: { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300' },
  live: { bg: 'bg-[#22C55E]/15', border: 'border-[#22C55E]/25', text: 'text-[#22C55E]' },
  ended: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50' },
};

const IPO_STATUS_LABEL_KEYS: Record<LocalIPOStatus, string> = {
  announced: 'ipoAnnounced',
  early_access: 'ipoEarlyAccess',
  live: 'ipoLive',
  ended: 'ipoEnded',
};

const POS_ORDER: Record<Pos, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

function getIpoDisplayData(ipo: IPOData, tFn: (key: string) => string) {
  return {
    status: tFn(IPO_STATUS_LABEL_KEYS[ipo.status]),
    progress: (ipo.sold / ipo.totalOffered) * 100,
    price: ipo.price,
    remaining: ipo.totalOffered - ipo.sold,
    totalOffered: ipo.totalOffered,
    endsAt: ipo.endsAt,
  };
}

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
  const { followedClubs } = useClub();
  const { addToast } = useToast();
  const wallet = useWallet();
  const balanceCents = wallet.balanceCents ?? 0;
  const searchParams = useSearchParams();

  // ── Zustand Store (UI state) ──
  const {
    tab, setTab,
    portfolioView, setPortfolioView,
    kaufenView, setKaufenView,
    view, setView,
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
    spielerQuery, setSpielerQuery,
    spielerPosFilter, toggleSpielerPos,
    expandedClubs, toggleClubExpand,
    initExpandedClubs,
    showCompare, setShowCompare,
    resetFilters,
  } = useMarketStore();

  const t = useTranslations('market');
  const tc = useTranslations('common');

  const TAB_LABELS: Record<MarketTab, string> = {
    portfolio: t('myRoster'),
    kaufen: t('buy'),
    angebote: t('offers'),
    spieler: t('allPlayers'),
  };
  const tabs = TAB_IDS.map(id => ({ id, label: TAB_LABELS[id] }));

  // ── Sync URL tab param → store (once on mount) ──
  const tabSyncedRef = useRef(false);
  useEffect(() => {
    if (tabSyncedRef.current) return;
    tabSyncedRef.current = true;
    const initial = searchParams.get('tab');
    if (initial) {
      if (VALID_TABS.has(initial)) setTab(initial as MarketTab);
      else if (TAB_ALIAS[initial]) setTab(TAB_ALIAS[initial]);
    }
  }, [searchParams, setTab]);

  // ── React Query Hooks (data) ──
  const { data: enrichedPlayers = [], isLoading: playersLoading, isError: playersError } = useEnrichedPlayers(user?.id);
  const { data: ipoList = [] } = useActiveIpos();
  const { data: trending = [] } = useTrendingPlayers(5);
  const { data: watchlistEntries = [] } = useWatchlist(user?.id);
  const { data: incomingOffers = [] } = useIncomingOffers(user?.id);
  const { data: priceHistMap } = useAllPriceHistories(10);
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings(user?.id);

  // ── Merge price histories into enriched players ──
  const players = useMemo(() => {
    if (!priceHistMap || priceHistMap.size === 0) return enrichedPlayers;
    return enrichedPlayers.map(p => {
      const hist = priceHistMap.get(p.id);
      if (!hist || hist.length < 2) return p;
      return { ...p, prices: { ...p.prices, history7d: hist } };
    });
  }, [enrichedPlayers, priceHistMap]);

  // ── Watchlist map (derived) ──
  const watchlist = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const e of watchlistEntries) map[e.playerId] = true;
    return map;
  }, [watchlistEntries]);

  const enrichLoading = holdingsLoading;

  // ── Buy mutations ──
  const buyMut = useBuyFromMarket();
  const { mutate: doBuy, isPending: buyPending, isSuccess: buyIsSuccess, isError: buyIsError, error: buyMutError, variables: buyVars, reset: resetBuy } = buyMut;

  const ipoBuyMut = useBuyFromIpo();
  const { mutate: doIpoBuy, isPending: ipoBuyPending, isSuccess: ipoBuyIsSuccess, isError: ipoBuyIsError, error: ipoBuyMutError, variables: ipoBuyVars, reset: resetIpoBuy } = ipoBuyMut;

  const buyingId = (buyPending ? (buyVars?.playerId ?? null) : null) || (ipoBuyPending ? (ipoBuyVars?.playerId ?? null) : null);
  const buySuccess = buyIsSuccess ? t('dpcBought', { count: buyVars?.quantity ?? 1 }) : ipoBuyIsSuccess ? t('dpcBought', { count: ipoBuyVars?.quantity ?? 1 }) : null;
  const lastBoughtId = buyIsSuccess ? (buyVars?.playerId ?? null) : ipoBuyIsSuccess ? (ipoBuyVars?.playerId ?? null) : null;
  const buyError = buyIsError ? (buyMutError?.message ?? tc('unknownError')) : ipoBuyIsError ? (ipoBuyMutError?.message ?? tc('unknownError')) : null;

  // Auto-dismiss success after 3s
  useEffect(() => {
    if (!buyIsSuccess && !ipoBuyIsSuccess) return;
    const reset = buyIsSuccess ? resetBuy : resetIpoBuy;
    const timer = setTimeout(reset, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyIsSuccess, ipoBuyIsSuccess]);

  // ── Watchlist toggle (optimistic via cache) ──
  const toggleWatch = useCallback((id: string) => {
    if (!user) return;
    const isWatched = !!watchlist[id];
    // Optimistic update via React Query cache
    queryClient.setQueryData<WatchlistEntry[]>(qk.watchlist.byUser(user.id), (old) => {
      if (!old) return old;
      if (isWatched) return old.filter(e => e.playerId !== id);
      return [...old, { id: `opt-${id}`, playerId: id, alertThresholdPct: 0, alertDirection: 'both' as const, lastAlertPrice: 0, createdAt: new Date().toISOString() }];
    });
    const action = isWatched ? removeFromWatchlist(user.id, id) : addToWatchlist(user.id, id);
    action.catch((err) => {
      console.error('[Market] Watchlist toggle failed:', err);
      queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(user.id) });
      addToast(t('watchlistError'), 'error');
    });
  }, [user, watchlist, addToast]);

  // ── Handlers ──
  const handleBuy = useCallback((playerId: string, quantity: number = 1) => {
    if (!user) return;
    doBuy({ userId: user.id, playerId, quantity });
  }, [user, doBuy]);

  // Build a map of playerId → ipoId for quick lookup
  const ipoIdMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const ipo of ipoList) m.set(ipo.player_id, ipo.id);
    return m;
  }, [ipoList]);

  const handleIpoBuy = useCallback((playerId: string, quantity: number = 1) => {
    if (!user) return;
    const ipoId = ipoIdMap.get(playerId);
    if (!ipoId) return;
    doIpoBuy({ userId: user.id, ipoId, playerId, quantity });
  }, [user, doIpoBuy, ipoIdMap]);

  const handleSell = useCallback(async (playerId: string, quantity: number, priceCents: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: t('notLoggedIn') };
    try {
      const result = await placeSellOrder(user.id, playerId, quantity, priceCents);
      if (!result.success) return { success: false, error: result.error || t('listingFailed') };
      invalidateTradeQueries(playerId, user.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : tc('unknownError') };
    }
  }, [user]);

  const handleCancelOrder = useCallback(async (orderId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: t('notLoggedIn') };
    try {
      const result = await cancelOrder(user.id, orderId);
      if (!result.success) return { success: false, error: result.error || t('cancelFailed') };
      invalidateTradeQueries('', user.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : tc('unknownError') };
    }
  }, [user]);

  // ── localStorage watchlist migration (one-time) ──
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const legacy = localStorage.getItem('bescout-watchlist');
    if (!legacy) return;
    migrateLocalWatchlist(user.id)
      .then(count => {
        if (count > 0) queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(user.id) });
      })
      .catch(err => console.error('[Market] Watchlist migration failed:', err));
  }, [user]);

  // ── Derived data ──
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

  // Pre-compute floor prices once per player-change
  const floorMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of players) {
      m.set(p.id, p.listings.length > 0 ? Math.min(...p.listings.map(l => l.price)) : p.prices.floor ?? 0);
    }
    return m;
  }, [players]);
  const getFloor = useCallback((p: Player) => floorMap.get(p.id) ?? 0, [floorMap]);

  const hasActiveFilters = leagueFilter !== '' || query !== '' || posFilter.size > 0 || clubFilter.size > 0
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
    if (leagueFilter) result = result.filter(p => p.league === leagueFilter);
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
  }, [players, query, leagueFilter, posFilter, clubFilter, priceMin, priceMax, onlyAvailable, onlyOwned, onlyWatched, watchlist, sortBy, getFloor]);

  const filteredIPOs = useMemo(() => {
    let result = ipoItems;
    if (query) { const q = query.toLowerCase(); result = result.filter(({ player: p }) => `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q)); }
    if (leagueFilter) result = result.filter(({ player: p }) => p.league === leagueFilter);
    if (posFilter.size > 0) result = result.filter(({ player: p }) => posFilter.has(p.pos));
    if (clubFilter.size > 0) result = result.filter(({ player: p }) => clubFilter.has(p.club));
    return [...result].sort((a, b) => {
      const order: Record<LocalIPOStatus, number> = { live: 0, early_access: 1, announced: 2, ended: 3 };
      return (order[a.ipo.status] ?? 4) - (order[b.ipo.status] ?? 4);
    });
  }, [ipoItems, query, posFilter, clubFilter]);

  const followedClubNames = useMemo(
    () => new Set(followedClubs.map(c => c.name)),
    [followedClubs]
  );

  const ipoClubGroups = useMemo(() => {
    const map = new Map<string, { player: Player; ipo: ReturnType<typeof getIpoDisplayData> }[]>();
    for (const { player, ipo } of filteredIPOs) {
      const display = getIpoDisplayData(ipo, t);
      const arr = map.get(player.club) ?? [];
      arr.push({ player, ipo: display });
      map.set(player.club, arr);
    }
    return Array.from(map.entries())
      .map(([clubName, items]) => {
        const clubData = getClub(clubName);
        const l5Sum = items.reduce((s, i) => s + i.player.perf.l5, 0);
        const avgL5 = items.length > 0 ? Math.round(l5Sum / items.length) : 0;
        const maxProgress = Math.max(...items.map(i => i.ipo.progress));
        const posCounts: Record<Pos, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
        for (const i of items) posCounts[i.player.pos]++;
        items.sort((a, b) => {
          const posDiff = POS_ORDER[a.player.pos] - POS_ORDER[b.player.pos];
          return posDiff !== 0 ? posDiff : b.player.perf.l5 - a.player.perf.l5;
        });
        return { clubName, clubData, items, avgL5, maxProgress, posCounts };
      })
      .sort((a, b) => {
        const aScore = (followedClubNames.has(a.clubName) ? 1000 : 0) + a.avgL5 * 2 + a.maxProgress;
        const bScore = (followedClubNames.has(b.clubName) ? 1000 : 0) + b.avgL5 * 2 + b.maxProgress;
        return bScore - aScore;
      });
  }, [filteredIPOs, followedClubNames]);

  const ipoSuggestions = useMemo(() => {
    if (ipoItems.length === 0) return [];
    const sorted = [...ipoItems]
      .filter(({ ipo }) => ipo.status === 'live' || ipo.status === 'early_access')
      .map(({ player, ipo }) => ({
        player,
        ipo: getIpoDisplayData(ipo, t),
        score: player.perf.l5 * 2 + (ipo.sold / ipo.totalOffered) * 100,
      }))
      .sort((a, b) => b.score - a.score);
    return sorted.slice(0, 6).map(({ player, ipo }) => ({ player, ipo }));
  }, [ipoItems]);

  const mySquadPlayers = useMemo(() => {
    let result = players.filter(p => p.dpc.owned > 0 && !p.isLiquidated);
    if (query) { const q = query.toLowerCase(); result = result.filter(p => `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q)); }
    if (posFilter.size > 0) result = result.filter(p => posFilter.has(p.pos));
    if (clubFilter.size > 0) result = result.filter(p => clubFilter.has(p.club));
    return result;
  }, [players, query, posFilter, clubFilter]);

  // Spieler tab: club groups
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

  // Init first club expanded (one-time via Zustand)
  if (clubGroups.length > 0) initExpandedClubs(clubGroups[0].clubName);

  const totalSpielerCount = clubGroups.reduce((s, g) => s + g.players.length, 0);

  if (playersLoading) return <MarketSkeleton />;

  if (playersError && players.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto py-12">
        <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Buy Celebration */}
      <Confetti active={!!buySuccess} />
      {buySuccess && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-[#22C55E]/20 via-[#22C55E]/10 to-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] px-5 py-4 rounded-2xl font-bold text-sm anim-scale-pop anim-pulse-green flex items-center gap-4 shadow-lg shadow-[#22C55E]/10">
          <div className="w-8 h-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
          </div>
          <span className="text-base">{buySuccess}</span>
          {lastBoughtId && (
            <div className="flex items-center gap-2">
              <Link href="/fantasy"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD700]/15 rounded-lg text-[11px] font-bold text-[#FFD700] hover:bg-[#FFD700]/25 transition-all">
                <Trophy className="w-3 h-3" />
                Fantasy
              </Link>
              <Link href={`/player/${lastBoughtId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-[11px] font-bold text-white/80 hover:bg-white/15 transition-all">
                <MessageSquare className="w-3 h-3" />
                {t('discuss')}
              </Link>
            </div>
          )}
        </div>
      )}
      {buyError && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => resetBuy()}>
          {buyError}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="text-xs text-white/50">{t('title')}</div>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3">
          <Briefcase className="w-7 h-7 text-[#FFD700]" />
          {t('title')}
        </h1>
        <div className="mt-1 text-sm text-white/50">
          {tc('balance')}: <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(balanceCents))} BSD</span>
        </div>
      </div>

      {/* 4 Tabs */}
      <TabBar tabs={tabs} activeTab={tab} onChange={(id) => setTab(id as MarketTab)} />

      {/* ━━━ SPONSOR: MARKET TOP ━━━ */}
      <SponsorBanner placement="market_top" />

      {/* ━━━ TAB: MEIN KADER ━━━ */}
      <TabPanel id="portfolio" activeTab={tab}>
        {/* Toggle: Kader / Portfolio */}
        <div className="flex items-center gap-1 mb-4 p-1 bg-white/[0.02] border border-white/10 rounded-xl w-fit">
          <button
            onClick={() => setPortfolioView('portfolio')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
              portfolioView === 'portfolio' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-white/40 border border-transparent'
            )}
          >{t('team')}</button>
          <button
            onClick={() => setPortfolioView('kader')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
              portfolioView === 'kader' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-white/40 border border-transparent'
            )}
          >{t('lineups')}</button>
        </div>
        {portfolioView === 'kader' ? (
          <ManagerKaderTab players={players} ownedPlayers={mySquadPlayers} />
        ) : (
          <ManagerBestandTab players={players} holdings={holdings} ipoList={ipoList} userId={user?.id} incomingOffers={incomingOffers} onSell={handleSell} onCancelOrder={handleCancelOrder} />
        )}
      </TabPanel>

      {/* ━━━ TAB: KAUFEN (IPOs + P2P) ━━━ */}
      <TabPanel id="kaufen" activeTab={tab}>
        {/* Sub-Toggle: IPO / Markt */}
        <div className="flex items-center gap-1 mb-4 p-1 bg-white/[0.02] border border-white/10 rounded-xl w-fit">
          <button
            onClick={() => setKaufenView('ipo')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
              kaufenView === 'ipo' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-white/40 border border-transparent'
            )}
          >{t('ipoTab')}</button>
          <button
            onClick={() => setKaufenView('markt')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
              kaufenView === 'markt' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-white/40 border border-transparent'
            )}
          >{t('marketTab')}</button>
        </div>

        {/* Filters */}
        <Card className="p-4 space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t('searchPlaceholder')}
              className="flex-1 min-w-0"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0',
                showFilters || activeFilterCount > 0
                  ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('filter')}</span>
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
          <PosFilter multi selected={posFilter} onChange={togglePos} />
          {/* ── Desktop: Inline Advanced Filters ── */}
          {showFilters && (
            <div className="hidden md:flex items-start gap-2.5 flex-wrap pt-2 border-t border-white/5">
              {availableLeagues.length > 0 && (
                <select value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)}
                  className={cn('px-3 py-2 bg-white/5 border rounded-xl text-xs focus:outline-none focus:border-[#FFD700]/40 appearance-none cursor-pointer pr-8',
                    leagueFilter ? 'border-[#FFD700]/30 text-[#FFD700]' : 'border-white/10 text-white/70')}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  <option value="">{t('allLeagues')}</option>
                  {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              )}
              <div className="relative">
                <button onClick={() => setShowClubDropdown(!showClubDropdown)}
                  className={cn('flex items-center gap-2 px-3 py-2 border rounded-xl text-xs hover:bg-white/10 transition-all min-w-[160px]',
                    clubFilter.size > 0 ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]' : 'bg-white/5 border-white/10 text-white/70')}
                >
                  <Users className="w-3.5 h-3.5 opacity-50" />
                  {clubFilter.size > 0 ? (clubFilter.size > 1 ? t('clubCountPlural', { count: clubFilter.size }) : t('clubCount', { count: clubFilter.size })) : t('allClubs')}
                  <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showClubDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showClubDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl z-[60]">
                    <div className="p-2 border-b border-white/10">
                      <input type="text" placeholder={t('clubSearch')} value={clubSearch} onChange={(e) => setClubSearch(e.target.value)}
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
                  <option value="floor_asc">{t('sortFloorAsc')}</option>
                  <option value="floor_desc">{t('sortFloorDesc')}</option>
                  <option value="l5">{t('sortL5')}</option>
                  <option value="change">{t('sortChange24h')}</option>
                  <option value="name">{t('sortName')}</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/40">{t('priceLabel')}</span>
                <input type="number" placeholder={t('min')} value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                  className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25" />
                <span className="text-white/20">–</span>
                <input type="number" placeholder={t('max')} value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                  className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25" />
                <span className="text-[10px] text-white/30">BSD</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                    onlyAvailable ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70')}>
                  <Package className="w-3.5 h-3.5" />{t('available')}
                </button>
                <button onClick={() => setOnlyWatched(!onlyWatched)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                    onlyWatched ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70')}>
                  <Star className="w-3.5 h-3.5" />{t('watched')}
                </button>
              </div>
            </div>
          )}

          {/* ── Mobile: Full-Screen Filter Modal ── */}
          {showFilters && (
            <div className="md:hidden fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#FFD700]" />
                  <h2 className="text-lg font-black">{t('filterTitle')}</h2>
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#FFD700] text-black text-[10px] font-black rounded-full">{activeFilterCount}</span>
                  )}
                </div>
                <button onClick={() => setShowFilters(false)} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                {/* ─ Liga ─ */}
                {availableLeagues.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2.5">{t('leagueLabel')}</div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setLeagueFilter('')}
                        className={cn('px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                          !leagueFilter ? 'bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700]' : 'bg-white/[0.03] border-white/[0.06] text-white/50'
                        )}
                      >{t('allLeagues')}</button>
                      {availableLeagues.map(l => (
                        <button key={l} onClick={() => setLeagueFilter(leagueFilter === l ? '' : l)}
                          className={cn('px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5',
                            leagueFilter === l ? 'bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700]' : 'bg-white/[0.03] border-white/[0.06] text-white/50'
                          )}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─ Club Grid ─ */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2.5">{t('clubLabel')}</div>
                  <input type="text" placeholder={t('clubSearch')} value={clubSearch} onChange={(e) => setClubSearch(e.target.value)}
                    className="w-full mb-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30" />
                  <div className="grid grid-cols-4 gap-2">
                    {filteredClubs.map(club => {
                      const cd = getClub(club);
                      const active = clubFilter.has(club);
                      const color = cd?.colors.primary ?? '#666';
                      return (
                        <button key={club} onClick={() => toggleClub(club)}
                          className={cn('flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all active:scale-95',
                            active
                              ? 'border-[#FFD700]/40 bg-[#FFD700]/10'
                              : 'border-white/[0.06] bg-white/[0.02]'
                          )}
                          style={active ? { boxShadow: `0 0 16px ${color}25` } : undefined}
                        >
                          {cd?.logo ? (
                            <img src={cd.logo} alt={club} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                          )}
                          <span className={cn('text-[10px] font-bold truncate w-full text-center', active ? 'text-[#FFD700]' : 'text-white/50')}>
                            {cd?.short || club.slice(0, 3).toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ─ Position ─ */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2.5">{t('positionLabel')}</div>
                  <PosFilter multi selected={posFilter} onChange={togglePos} />
                </div>

                {/* ─ Sort ─ */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2.5">{t('sortLabel')}</div>
                  <div className="space-y-1.5">
                    {([
                      { value: 'floor_asc' as SortOption, label: t('sortFloorAsc') },
                      { value: 'floor_desc' as SortOption, label: t('sortFloorDesc') },
                      { value: 'l5' as SortOption, label: t('sortL5') },
                      { value: 'change' as SortOption, label: t('sortChange24h') },
                      { value: 'name' as SortOption, label: t('sortName') },
                    ]).map(opt => (
                      <button key={opt.value} onClick={() => setSortBy(opt.value)}
                        className={cn('w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all',
                          sortBy === opt.value
                            ? 'bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700]'
                            : 'bg-white/[0.02] border border-white/[0.06] text-white/50'
                        )}
                      >
                        <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                          sortBy === opt.value ? 'border-[#FFD700]' : 'border-white/20'
                        )}>
                          {sortBy === opt.value && <div className="w-2 h-2 rounded-full bg-[#FFD700]" />}
                        </div>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─ Price ─ */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2.5">{t('priceLabel')}</div>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder={t('min')} value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25" />
                    <span className="text-white/20 font-bold">–</span>
                    <input type="number" placeholder={t('max')} value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25" />
                    <span className="text-xs text-white/30 font-bold shrink-0">BSD</span>
                  </div>
                </div>

                {/* ─ Toggles ─ */}
                <div className="flex gap-2">
                  <button onClick={() => setOnlyAvailable(!onlyAvailable)}
                    className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all active:scale-95',
                      onlyAvailable ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]' : 'bg-white/[0.02] border-white/[0.06] text-white/40')}>
                    <Package className="w-4 h-4" />{t('available')}
                  </button>
                  <button onClick={() => setOnlyWatched(!onlyWatched)}
                    className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all active:scale-95',
                      onlyWatched ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]' : 'bg-white/[0.02] border-white/[0.06] text-white/40')}>
                    <Star className="w-4 h-4" />{t('watched')}
                  </button>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3 shrink-0 pb-6">
                <button onClick={resetFilters} className="text-sm text-white/40 hover:text-white transition-colors">
                  {t('resetAll')}
                </button>
                <button onClick={() => setShowFilters(false)}
                  className="flex-1 py-3.5 bg-[#FFD700] text-black font-black text-sm rounded-xl active:scale-[0.98] transition-transform"
                >
                  {t('showResults', { count: kaufenView === 'ipo' ? filteredIPOs.length : transferPlayers.length })}
                </button>
              </div>
            </div>
          )}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {leagueFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                  {leagueFilter}
                  <button onClick={() => setLeagueFilter('')} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
                </span>
              )}
              {posFilter.size > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                  Pos: {Array.from(posFilter).join(', ')}
                  <button onClick={clearPosFilter} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
                </span>
              )}
              {Array.from(clubFilter).map(club => (
                <span key={club} className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60">
                  {club}
                  <button onClick={() => toggleClub(club)} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={resetFilters} className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-1">{t('resetAll')}</button>
            </div>
          )}
        </Card>

        {/* Club Sales (IPO) — only when kaufenView === 'ipo' */}
        {kaufenView === 'ipo' && (
          <KaufenIPOSection
            clubGroups={ipoClubGroups}
            suggestions={ipoSuggestions}
            trending={trending}
            watchlist={watchlist}
            onWatch={toggleWatch}
            onIpoBuy={handleIpoBuy}
            buyingId={buyingId}
            followedClubNames={followedClubNames}
            enrichLoading={enrichLoading}
            view={view}
            filteredIPOs={filteredIPOs.map(({ player, ipo }) => ({ player, ipo: getIpoDisplayData(ipo, t) }))}
            maxVisibleClubs={5}
            showAllLabel={t('showAllClubs', { count: ipoClubGroups.length })}
            showLessLabel={t('showLessClubs')}
          />
        )}

        {/* P2P Listings — only when kaufenView === 'markt' */}
        {kaufenView === 'markt' && (
          <>
            <SponsorBanner placement="market_transferlist" className="mb-4" />
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white/50">{t('playerCount', { count: transferPlayers.length })}</div>
            </div>
            {transferPlayers.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState icon={<Search />} title={t('noPlayersFound')} description={t('noPlayersHint')} action={{ label: t('resetFilters'), onClick: resetFilters }} />
              ) : (
                <EmptyState icon={<Package />} title={t('emptyMarket')} description={t('emptyMarketHint')} />
              )
            ) : (
              <>
                {/* Mobile: always list, Desktop: view toggle */}
                <div className="md:hidden space-y-1.5">
                  {transferPlayers.map((player) => (
                    <PlayerDisplay key={player.id} variant="compact" player={player} isWatchlisted={watchlist[player.id]} onWatch={() => toggleWatch(player.id)} onBuy={(id) => handleBuy(id)} buying={buyingId === player.id} />
                  ))}
                </div>
                <div className="hidden md:block">
                  {view === 'grid' ? (
                    <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                </div>
              </>
            )}
          </>
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
              <SearchInput value={spielerQuery} onChange={setSpielerQuery} placeholder={t('allPlayersSearch')} className="flex-1" />
              <PosFilter multi selected={spielerPosFilter} onChange={toggleSpielerPos} />
              <button onClick={() => setShowCompare(!showCompare)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0',
                  showCompare ? 'bg-purple-500/15 border-purple-400/30 text-purple-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                )}>
                <GitCompareArrows className="w-3.5 h-3.5" />
                {t('compare')}
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
          <div className="text-sm text-white/50">{t('allPlayersCount', { count: totalSpielerCount, clubs: clubGroups.length })}</div>

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
                  <span className="text-xs text-white/40 ml-auto mr-2">{t('clubPlayerCount', { count: clubPlayers.length })}</span>
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
            <EmptyState icon={<Users />} title={t('noPlayersFound')} description={t('noPlayersHint')} />
          )}
        </div>
      </TabPanel>
    </div>
  );
}
