'use client';

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase, Zap, Search, Heart,
  CheckCircle2, X, Send,
} from 'lucide-react';
import { EmptyState, ErrorState, Skeleton, SkeletonCard, TabPanel } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';

import { centsToBsd } from '@/lib/services/players';
import { placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { addToWatchlist, removeFromWatchlist, migrateLocalWatchlist } from '@/lib/services/watchlist';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useEnrichedPlayers, useHoldings, useAllOpenOrders, useAllOpenBuyOrders, invalidateTradeQueries } from '@/lib/queries';
import { useActiveIpos, useAnnouncedIpos, useRecentlyEndedIpos } from '@/lib/queries/ipos';
import { useTrendingPlayers } from '@/lib/queries/trending';
import { useAllPriceHistories } from '@/lib/queries/priceHist';
import { useWatchlist } from '@/lib/queries/watchlist';
import { useIncomingOffers } from '@/lib/queries/offers';
import { useBuyFromMarket, useBuyFromIpo } from '@/lib/mutations/trading';
import { useMarketStore } from '@/lib/stores/marketStore';
import type { MarketTab, PortfolioSubTab, KaufenSubTab } from '@/lib/stores/marketStore';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import dynamic from 'next/dynamic';
import type { Player, DbIpo } from '@/types';

import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import { GeoGate } from '@/components/geo/GeoGate';
import NewUserTip from '@/components/onboarding/NewUserTip';
import DiscoveryCard from '@/components/market/DiscoveryCard';
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
const ClubVerkaufSection = dynamic(() => import('@/components/market/ClubVerkaufSection'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>,
});
const TransferListSection = dynamic(() => import('@/components/market/TransferListSection'), {
  ssr: false,
  loading: () => <div className="space-y-2">{[...Array(5)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>,
});
const MarketSearch = dynamic(() => import('@/components/market/MarketSearch'), { ssr: false });
const BuyConfirmModal = dynamic(() => import('@/components/market/BuyConfirmModal'), { ssr: false });
const BuyOrderModal = dynamic(() => import('@/components/market/BuyOrderModal'), { ssr: false });
const BuyOrdersSection = dynamic(() => import('@/components/market/BuyOrdersSection'), { ssr: false });
const WatchlistView = dynamic(() => import('@/components/market/WatchlistView'), {
  ssr: false,
  loading: () => <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>,
});

// ============================================
// TABS CONFIG
// ============================================

const TAB_IDS: MarketTab[] = ['portfolio', 'kaufen'];

const TAB_ALIAS: Record<string, MarketTab> = {
  kader: 'portfolio',
  bestand: 'portfolio',
  compare: 'kaufen',
  spieler: 'kaufen',
  transferlist: 'kaufen',
  scouting: 'kaufen',
  offers: 'portfolio',  // angebote now under portfolio
  watchlist: 'portfolio',  // watchlist under portfolio
};

const VALID_TABS = new Set<string>(TAB_IDS);

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
    portfolioSubTab, setPortfolioSubTab,
    kaufenSubTab, setKaufenSubTab,
  } = useMarketStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingBuy, setPendingBuy] = useState<{ playerId: string; source: 'market' | 'ipo' } | null>(null);
  const [buyOrderPlayer, setBuyOrderPlayer] = useState<Player | null>(null);

  const t = useTranslations('market');
  const tc = useTranslations('common');
  const tt = useTranslations('tips');

  const TAB_LABELS: Record<MarketTab, string> = {
    portfolio: t('myRoster'),
    kaufen: t('buy'),
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
  // Shared queries (needed by both tabs)
  const { data: enrichedPlayers = [], isLoading: playersLoading, isError: playersError } = useEnrichedPlayers(user?.id);
  const { data: ipoList = [] } = useActiveIpos();
  const { data: holdings = [] } = useHoldings(user?.id);
  const { data: watchlistEntries = [] } = useWatchlist(user?.id);
  const { data: recentOrders = [] } = useAllOpenOrders();
  const { data: priceHistMap } = useAllPriceHistories(10);

  // Kaufen-only queries (gated by tab)
  const { data: announcedIpos = [] } = useAnnouncedIpos({ enabled: tab === 'kaufen' });
  const { data: endedIpos = [] } = useRecentlyEndedIpos({ enabled: tab === 'kaufen' });
  const { data: trending = [] } = useTrendingPlayers(8, { enabled: tab === 'kaufen' });

  // Kaufen: buy orders (gated by tab)
  const { data: buyOrders = [] } = useAllOpenBuyOrders({ enabled: tab === 'kaufen' });

  // Portfolio-only queries (gated by tab)
  const { data: incomingOffers = [] } = useIncomingOffers(user?.id);

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
  const handleBuy = useCallback((playerId: string) => {
    if (!user) return;
    setPendingBuy({ playerId, source: 'market' });
  }, [user]);

  // Build a map of playerId → ipoId for quick lookup
  const ipoIdMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const ipo of ipoList) m.set(ipo.player_id, ipo.id);
    return m;
  }, [ipoList]);

  const handleIpoBuy = useCallback((playerId: string) => {
    if (!user) return;
    setPendingBuy({ playerId, source: 'ipo' });
  }, [user]);

  // Actual buy execution (called from BuyConfirmModal)
  const executeBuy = useCallback((qty: number) => {
    if (!user || !pendingBuy) return;
    if (pendingBuy.source === 'market') {
      doBuy({ userId: user.id, playerId: pendingBuy.playerId, quantity: qty });
    } else {
      const ipoId = ipoIdMap.get(pendingBuy.playerId);
      if (!ipoId) return;
      doIpoBuy({ userId: user.id, ipoId, playerId: pendingBuy.playerId, quantity: qty });
    }
    setPendingBuy(null);
  }, [user, pendingBuy, doBuy, doIpoBuy, ipoIdMap]);

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
    <GeoGate feature="dpc_trading">
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
          <span className="font-mono font-bold text-base tabular-nums text-gold">{fmtScout(centsToBsd(balanceCents))} bCredits</span>
        </div>
      </div>

      {/* Main Tabs — Segmented Control */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] border border-white/[0.08] p-1">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id as MarketTab)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors min-h-[44px]',
              tab === tb.id
                ? 'bg-white/[0.10] text-white'
                : 'text-white/50 hover:text-white/70'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ━━━ TAB: MEIN KADER ━━━ */}
      <TabPanel id="portfolio" activeTab={tab}>
        {/* Sub-Tabs — Pill Style */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {([
            { id: 'team' as const, label: t('team'), icon: null },
            { id: 'bestand' as const, label: t('inventory'), icon: null },
            { id: 'angebote' as const, label: t('offers'), icon: null },
            { id: 'watchlist' as const, label: t('watchlist'), icon: <Heart className="size-3" /> },
          ]).map(st => (
            <button
              key={st.id}
              onClick={() => setPortfolioSubTab(st.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px] inline-flex items-center gap-1.5',
                portfolioSubTab === st.id
                  ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              )}
            >
              {st.icon}
              {st.label}
            </button>
          ))}
        </div>
        {portfolioSubTab === 'team' && (
          <ManagerKaderTab players={players} ownedPlayers={mySquadPlayers} />
        )}
        {portfolioSubTab === 'bestand' && (
          <ManagerBestandTab players={players} holdings={holdings} ipoList={ipoList} userId={user?.id} incomingOffers={incomingOffers} onSell={handleSell} onCancelOrder={handleCancelOrder} />
        )}
        {portfolioSubTab === 'angebote' && (
          <ManagerOffersTab players={players} />
        )}
        {portfolioSubTab === 'watchlist' && (
          <WatchlistView players={players} watchlistEntries={watchlistEntries} />
        )}
        <SponsorBanner placement="market_top" />
        <TradingDisclaimer variant="card" />
      </TabPanel>

      {/* ━━━ TAB: KAUFEN ━━━ */}
      <TabPanel id="kaufen" activeTab={tab}>
        {/* Sub-Tabs + Search toggle */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
            {([
              { id: 'clubverkauf' as const, label: t('clubSale', { defaultMessage: 'Club Verkauf' }) },
              { id: 'transferliste' as const, label: t('transferList', { defaultMessage: 'Transferliste' }) },
              { id: 'trending' as const, label: t('trendingTab', { defaultMessage: 'Trending' }) },
            ]).map(st => (
              <button
                key={st.id}
                onClick={() => { setKaufenSubTab(st.id); setSearchOpen(false); }}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px]',
                  kaufenSubTab === st.id && !searchOpen
                    ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                    : 'text-white/40 hover:text-white/60 border border-transparent'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={cn(
              'p-2 rounded-lg transition-colors min-h-[36px] flex-shrink-0',
              searchOpen ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            )}
            aria-label={t('searchPlayers', { defaultMessage: 'Spieler suchen' })}
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Search overlay */}
        {searchOpen && (
          <MarketSearch
            players={players}
            activeIpos={ipoList}
            sellOrders={recentOrders}
            onClose={() => setSearchOpen(false)}
          />
        )}

        <NewUserTip
          tipKey="market-first-buy"
          icon={<Zap className="size-4" />}
          title={tt('marketTitle')}
          description={tt('marketDesc')}
          show={holdings.length === 0}
        />
        {/* P2P Offers hint — discoverable from Kaufen tab */}
        {incomingOffers.length > 0 && (
          <button
            onClick={() => { setTab('portfolio'); setPortfolioSubTab('angebote'); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-gold/[0.06] border border-gold/15 rounded-xl text-xs font-bold text-gold hover:bg-gold/10 transition-colors group"
          >
            <Send className="size-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{t('pendingOffers', { defaultMessage: '{count} offene Angebote', count: incomingOffers.length })}</span>
            <span className="ml-auto text-[10px] text-gold/60 group-hover:text-gold transition-colors">{t('viewOffers', { defaultMessage: 'Anzeigen \u2192' })}</span>
          </button>
        )}
        {kaufenSubTab === 'clubverkauf' && (
          <ClubVerkaufSection
            players={players}
            activeIpos={ipoList}
            announcedIpos={announcedIpos}
            endedIpos={endedIpos}
            playerMap={playerMap}
            onIpoBuy={handleIpoBuy}
            buyingId={buyingId}
            hasHoldings={holdings.length > 0}
          />
        )}
        {kaufenSubTab === 'trending' && (
          trending.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {trending.map(tp => {
                const player = playerMap.get(tp.playerId);
                if (!player) return null;
                return (
                  <DiscoveryCard
                    key={player.id}
                    player={player}
                    variant="trending"
                    tradeCount={tp.tradeCount}
                    change24h={tp.change24h}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Zap className="size-5" />}
              title={t('trendingEmpty', { defaultMessage: 'Noch keine Trends' })}
              description={t('trendingEmptyDesc', { defaultMessage: 'Sobald gehandelt wird, siehst du hier die meistgehandelten Spieler.' })}
            />
          )
        )}
        {kaufenSubTab === 'transferliste' && (
          <>
            <TransferListSection
              players={players}
              sellOrders={recentOrders}
              playerMap={playerMap}
              getFloor={getFloor}
              onBuy={handleBuy}
              buyingId={buyingId}
              balanceCents={balanceCents}
              onCreateBuyOrder={(playerId: string) => {
                const p = playerMap.get(playerId);
                if (p) setBuyOrderPlayer(p);
              }}
            />
            <BuyOrdersSection buyOrders={buyOrders} playerMap={playerMap} />
          </>
        )}
        <SponsorBanner placement="market_top" />
        <TradingDisclaimer variant="card" />
      </TabPanel>

      {/* Buy Confirmation Modal */}
      {pendingBuy && (() => {
        const player = playerMap.get(pendingBuy.playerId);
        if (!player) return null;
        const isIpo = pendingBuy.source === 'ipo';
        const ipo = isIpo ? ipoList.find(i => i.player_id === pendingBuy.playerId) : null;
        const floorCents = isIpo && ipo
          ? ipo.price
          : (player.listings.length > 0 ? Math.min(...player.listings.map(l => l.price)) : Math.round((player.prices.floor ?? 0) * 100));
        const ipoRemaining = ipo ? ipo.total_offered - ipo.sold : 0;
        const ipoProgress = ipo ? (ipo.sold / ipo.total_offered) * 100 : 0;
        const maxQty = isIpo && ipo ? Math.min(ipo.max_per_user, ipoRemaining) : 1;

        return (
          <BuyConfirmModal
            open
            onClose={() => setPendingBuy(null)}
            player={player}
            source={pendingBuy.source}
            priceCents={floorCents}
            maxQty={maxQty}
            balanceCents={balanceCents}
            isPending={buyPending || ipoBuyPending}
            onConfirm={executeBuy}
            ipoProgress={isIpo ? ipoProgress : undefined}
            ipoRemaining={isIpo ? ipoRemaining : undefined}
          />
        );
      })()}

      {/* Buy Order Modal */}
      <BuyOrderModal
        player={buyOrderPlayer}
        open={buyOrderPlayer !== null}
        onClose={() => setBuyOrderPlayer(null)}
      />

    </div>
    </GeoGate>
  );
}
