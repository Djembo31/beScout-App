'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase, Zap,
  CheckCircle2, X,
} from 'lucide-react';
import { ErrorState, Skeleton, SkeletonCard, TabBar, TabPanel } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';

import { centsToBsd } from '@/lib/services/players';
import { placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { addToWatchlist, removeFromWatchlist, migrateLocalWatchlist } from '@/lib/services/watchlist';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useEnrichedPlayers, useHoldings, useAllOpenOrders, invalidateTradeQueries } from '@/lib/queries';
import { useActiveIpos } from '@/lib/queries/ipos';
import { useTrendingPlayers } from '@/lib/queries/trending';
import { useAllPriceHistories } from '@/lib/queries/priceHist';
import { useWatchlist } from '@/lib/queries/watchlist';
import { useIncomingOffers } from '@/lib/queries/offers';
import { useBuyFromMarket, useBuyFromIpo } from '@/lib/mutations/trading';
import { useMarketStore } from '@/lib/stores/marketStore';
import type { MarketTab } from '@/lib/stores/marketStore';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import dynamic from 'next/dynamic';
import type { Player, DbIpo } from '@/types';

import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import NewUserTip from '@/components/onboarding/NewUserTip';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const ManagerKaderTab = dynamic(() => import('@/components/manager/ManagerKaderTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}</div>,
});
const ManagerBestandTab = dynamic(() => import('@/components/manager/ManagerBestandTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}</div>,
});
const ManagerOffersTab = dynamic(() => import('@/components/manager/ManagerOffersTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-24" />)}</div>,
});
const KaufenDiscovery = dynamic(() => import('@/components/market/KaufenDiscovery'), {
  ssr: false,
  loading: () => <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">{[...Array(8)].map((_, i) => <SkeletonCard key={i} className="h-64" />)}</div>,
});

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

const TAB_IDS: MarketTab[] = ['portfolio', 'kaufen', 'angebote'];

const TAB_ALIAS: Record<string, MarketTab> = {
  kader: 'portfolio',
  bestand: 'portfolio',
  compare: 'kaufen',
  spieler: 'kaufen',
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

// ============================================
// SKELETON
// ============================================

function MarketSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header row — matches real header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>
      {/* TabBar */}
      <Skeleton className="h-[52px] rounded-2xl" />
      {/* Card grid */}
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
  } = useMarketStore();

  const t = useTranslations('market');
  const tc = useTranslations('common');
  const tt = useTranslations('tips');

  const TAB_LABELS: Record<MarketTab, string> = {
    portfolio: t('myRoster'),
    kaufen: t('buy'),
    angebote: t('offers'),
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
  const { data: trending = [] } = useTrendingPlayers(8);
  const { data: watchlistEntries = [] } = useWatchlist(user?.id);
  const { data: incomingOffers = [] } = useIncomingOffers(user?.id);
  const { data: priceHistMap } = useAllPriceHistories(10);
  const { data: holdings = [] } = useHoldings(user?.id);
  const { data: recentOrders = [] } = useAllOpenOrders();

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

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (!buyIsError && !ipoBuyIsError) return;
    const reset = buyIsError ? resetBuy : resetIpoBuy;
    const timer = setTimeout(reset, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyIsError, ipoBuyIsError]);

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
  // Pre-compute floor prices once per player-change
  const floorMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of players) {
      m.set(p.id, p.listings.length > 0 ? Math.min(...p.listings.map(l => l.price)) : p.prices.floor ?? 0);
    }
    return m;
  }, [players]);
  const getFloor = useCallback((p: Player) => floorMap.get(p.id) ?? 0, [floorMap]);

  // Player lookup map for O(1) access
  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  // "Kaufen" tab: IPOs + P2P listings merged
  const ipoItems = useMemo(() => {
    return ipoList.map(ipo => {
      const player = playerMap.get(ipo.player_id);
      if (!player) return null;
      return { player, ipo: dbIpoToLocal(ipo) };
    }).filter((x): x is { player: Player; ipo: IPOData } => x !== null);
  }, [ipoList, playerMap]);

  const mySquadPlayers = useMemo(() => {
    return players.filter(p => p.dpc.owned > 0 && !p.isLiquidated);
  }, [players]);

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
      {/* Buy Success Toast — subtle gold glow instead of confetti */}
      {buySuccess && (
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 bg-green-500/15 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl font-bold text-sm anim-scale-pop flex items-center gap-3 shadow-lg shadow-green-500/10 anim-pulse-green motion-reduce:animate-none">
          <CheckCircle2 className="size-5 flex-shrink-0" />
          <span>{buySuccess}</span>
          {lastBoughtId && (
            <Link href={`/player/${lastBoughtId}`}
              className="px-3 py-1.5 bg-white/10 rounded-lg text-[11px] font-bold text-white/70 hover:bg-white/15 transition-colors whitespace-nowrap">
              {t('goToPlayer')}
            </Link>
          )}
        </div>
      )}
      {buyError && (
        <div role="alert" aria-live="assertive" className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 anim-scale-pop">
          <span>{buyError}</span>
          <button onClick={() => { resetBuy(); resetIpoBuy(); }} aria-label={tc('closeLabel')} className="p-1 rounded-lg hover:bg-red-500/20 transition-colors flex-shrink-0">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-balance">
          <Briefcase className="size-7 text-gold" />
          {t('title')}
        </h1>
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
          <span className="text-xs text-white/50">{tc('balance')}:</span>
          <span className="font-mono font-bold text-base tabular-nums text-gold">{fmtScout(centsToBsd(balanceCents))} $SCOUT</span>
        </div>
      </div>

      {/* 4 Tabs */}
      <TabBar tabs={tabs} activeTab={tab} onChange={(id) => setTab(id as MarketTab)} />

      {/* ━━━ TAB: MEIN KADER ━━━ */}
      <TabPanel id="portfolio" activeTab={tab}>
        {/* Toggle: Kader / Portfolio */}
        <div className="flex items-center gap-1 mb-4 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl w-fit">
          <button
            onClick={() => setPortfolioView('portfolio')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
              portfolioView === 'portfolio' ? 'bg-gold/10 text-gold border border-gold/20' : 'text-white/60 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
            )}
          >{t('team')}</button>
          <button
            onClick={() => setPortfolioView('kader')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
              portfolioView === 'kader' ? 'bg-gold/10 text-gold border border-gold/20' : 'text-white/60 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
            )}
          >{t('lineups')}</button>
        </div>
        {portfolioView === 'kader' ? (
          <ManagerKaderTab players={players} ownedPlayers={mySquadPlayers} />
        ) : (
          <ManagerBestandTab players={players} holdings={holdings} ipoList={ipoList} userId={user?.id} incomingOffers={incomingOffers} onSell={handleSell} onCancelOrder={handleCancelOrder} />
        )}
        <SponsorBanner placement="market_top" />
        <TradingDisclaimer variant="card" />
      </TabPanel>

      {/* ━━━ TAB: KAUFEN (Discovery + Search) ━━━ */}
      <TabPanel id="kaufen" activeTab={tab}>
        <NewUserTip
          tipKey="market-first-buy"
          icon={<Zap className="size-4" />}
          title={tt('marketTitle')}
          description={tt('marketDesc')}
          show={holdings.length === 0}
        />
        <KaufenDiscovery
          players={players}
          ipoItems={ipoItems}
          trending={trending}
          recentOrders={recentOrders}
          watchlist={watchlist}
          followedClubs={followedClubs}
          getFloor={getFloor}
          onBuy={handleBuy}
          onIpoBuy={handleIpoBuy}
          onWatch={toggleWatch}
          buyingId={buyingId}
        />
        <SponsorBanner placement="market_top" />
        <TradingDisclaimer variant="card" />
      </TabPanel>

      {/* ━━━ TAB: ANGEBOTE ━━━ */}
      <TabPanel id="angebote" activeTab={tab}>
        <ManagerOffersTab players={players} />
        <TradingDisclaimer variant="card" />
      </TabPanel>

    </div>
  );
}
