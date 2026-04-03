'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { X, TrendingUp, Briefcase } from 'lucide-react';
import { TabPanel, ErrorState, Skeleton, SkeletonCard } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useMarketStore } from '@/features/market/store/marketStore';
import type { MarketTab } from '@/features/market/store/marketStore';
import { useMarketData } from '@/features/market/hooks/useMarketData';
import { useTradeActions } from '@/features/market/hooks/useTradeActions';
import { useWatchlistActions } from '@/features/market/hooks/useWatchlistActions';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { GeoGate } from '@/components/geo/GeoGate';
import dynamic from 'next/dynamic';

import PortfolioTab from './portfolio/PortfolioTab';
import MarktplatzTab from './marktplatz/MarktplatzTab';

const TradeSuccessCard = dynamic(() => import('./shared/TradeSuccessCard'), { ssr: false });
const BuyConfirmModal = dynamic(() => import('./shared/BuyConfirmModal'), { ssr: false });
const BuyOrderModal = dynamic(() => import('./shared/BuyOrderModal'), { ssr: false });

// ── Tab config ──
const TAB_IDS: MarketTab[] = ['portfolio', 'marktplatz'];
const TAB_ALIAS: Record<string, MarketTab> = {
  kader: 'portfolio', bestand: 'portfolio', offers: 'portfolio', watchlist: 'portfolio',
  compare: 'marktplatz', spieler: 'marktplatz', transferlist: 'marktplatz',
  scouting: 'marktplatz', kaufen: 'marktplatz',
};
const VALID_TABS = new Set<string>(TAB_IDS);

function MarketSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}
        </div>
        <div className="hidden lg:block flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}
        </div>
      </div>
    </div>
  );
}

export default function MarketContentV2() {
  const { user } = useUser();
  const wallet = useWallet();
  const balanceCents = wallet.balanceCents ?? 0;
  const searchParams = useSearchParams();
  const t = useTranslations('market');
  const tc = useTranslations('common');

  // ── Store ──
  const { tab, setTab } = useMarketStore();

  // ── Hooks ──
  const data = useMarketData(user?.id);
  const trade = useTradeActions(user?.id, data.ipoList);
  useWatchlistActions(user?.id, data.watchlistMap);

  // ── URL sync (once on mount) ──
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

  // ── Tab labels ──
  const TAB_LABELS: Record<MarketTab, { label: string; icon: React.ReactNode }> = {
    portfolio: { label: t('myRoster'), icon: <Briefcase className="size-4" aria-hidden="true" /> },
    marktplatz: { label: t('marktplatzTab'), icon: <TrendingUp className="size-4" aria-hidden="true" /> },
  };

  // ── Buy order modal helper ──
  const handleCreateBuyOrder = useCallback((playerId: string) => {
    const p = data.playerMap.get(playerId);
    if (p) trade.setBuyOrderPlayer(p);
  }, [data.playerMap, trade]);

  // ── Loading / Error ──
  if (data.playersLoading) return <MarketSkeleton />;
  if (data.playersError && data.players.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto py-12">
        <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
      </div>
    );
  }

  return (
    <GeoGate feature="dpc_trading">
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Trade Success */}
      {(trade.buyIsSuccess || trade.ipoBuyIsSuccess) && trade.lastBoughtId && (() => {
        const player = data.playerMap.get(trade.lastBoughtId);
        if (!player) return null;
        const qty = trade.buyIsSuccess ? (trade.buyVars?.quantity ?? 1) : (trade.ipoBuyVars?.quantity ?? 1);
        const source = trade.ipoBuyIsSuccess ? 'ipo' as const : 'market' as const;
        const reset = trade.buyIsSuccess ? trade.resetBuy : trade.resetIpoBuy;
        return (
          <TradeSuccessCard
            player={player}
            quantity={qty}
            oldBalanceCents={trade.balanceBeforeBuyRef.current}
            newBalanceCents={balanceCents}
            source={source}
            onDismiss={reset}
          />
        );
      })()}

      {/* Buy Error */}
      {trade.buyError && (
        <div role="alert" aria-live="assertive" className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 anim-scale-pop">
          <span>{trade.buyError}</span>
          <button onClick={() => { trade.resetBuy(); trade.resetIpoBuy(); }} aria-label={tc('closeLabel')} className="p-1 rounded-lg hover:bg-red-500/20 transition-colors flex-shrink-0">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-balance">
          <TrendingUp className="size-7 text-gold" aria-hidden="true" />
          {t('title')}
        </h1>
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
          <span className="text-xs text-white/50">{tc('balance')}:</span>
          <span className="font-mono font-bold text-base tabular-nums text-gold">{fmtScout(centsToBsd(balanceCents))} CR</span>
        </div>
      </div>

      {/* ── DESKTOP: Side-by-side layout ── */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left: Portfolio */}
        <div>
          <h2 className="text-lg font-black mb-3 flex items-center gap-2">
            <Briefcase className="size-5 text-white/40" aria-hidden="true" />
            {t('myRoster')}
          </h2>
          <PortfolioTab
            players={data.players}

            holdings={data.holdings}
            ipoList={data.ipoList}
            userId={user?.id}
            incomingOffers={data.incomingOffers}
            watchlistEntries={data.watchlistEntries}
            onSell={trade.handleSell}
            onCancelOrder={trade.handleCancelOrder}
          />
        </div>

        {/* Right: Marktplatz */}
        <div>
          <h2 className="text-lg font-black mb-3 flex items-center gap-2">
            <TrendingUp className="size-5 text-white/40" aria-hidden="true" />
            {t('marktplatzTab')}
          </h2>
          <MarktplatzTab
            players={data.players}
            playerMap={data.playerMap}
            floorMap={data.floorMap}
            ipoList={data.ipoList}
            announcedIpos={data.announcedIpos}
            endedIpos={data.endedIpos}
            trending={data.trending}
            recentOrders={data.recentOrders}
            buyOrders={data.buyOrders}
            holdings={data.holdings}
            incomingOffers={data.incomingOffers}
            balanceCents={balanceCents}
            buyingId={trade.buyingId}
            onBuy={trade.handleBuy}
            onIpoBuy={trade.handleIpoBuy}
            onCreateBuyOrder={handleCreateBuyOrder}
          />
        </div>
      </div>

      {/* ── MOBILE: Tab-based layout ── */}
      <div className="lg:hidden">
        {/* Tab Switcher */}
        <div className="flex overflow-x-auto scrollbar-hide gap-1 rounded-xl bg-white/[0.04] border border-white/[0.08] p-1 mb-4">
          {TAB_IDS.map(id => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors min-h-[44px] flex items-center gap-2',
                tab === id
                  ? 'bg-white/[0.10] text-white'
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              {TAB_LABELS[id].icon}
              {TAB_LABELS[id].label}
            </button>
          ))}
        </div>

        {/* Portfolio Tab */}
        <TabPanel id="portfolio" activeTab={tab}>
          <PortfolioTab
            players={data.players}

            holdings={data.holdings}
            ipoList={data.ipoList}
            userId={user?.id}
            incomingOffers={data.incomingOffers}
            watchlistEntries={data.watchlistEntries}
            onSell={trade.handleSell}
            onCancelOrder={trade.handleCancelOrder}
          />
        </TabPanel>

        {/* Marktplatz Tab */}
        <TabPanel id="marktplatz" activeTab={tab}>
          <MarktplatzTab
            players={data.players}
            playerMap={data.playerMap}
            floorMap={data.floorMap}
            ipoList={data.ipoList}
            announcedIpos={data.announcedIpos}
            endedIpos={data.endedIpos}
            trending={data.trending}
            recentOrders={data.recentOrders}
            buyOrders={data.buyOrders}
            holdings={data.holdings}
            incomingOffers={data.incomingOffers}
            balanceCents={balanceCents}
            buyingId={trade.buyingId}
            onBuy={trade.handleBuy}
            onIpoBuy={trade.handleIpoBuy}
            onCreateBuyOrder={handleCreateBuyOrder}
          />
        </TabPanel>
      </div>

      {/* Buy Confirmation Modal */}
      {trade.pendingBuy && (() => {
        const player = data.playerMap.get(trade.pendingBuy.playerId);
        if (!player) return null;
        const isIpo = trade.pendingBuy.source === 'ipo';
        const ipo = isIpo ? data.ipoList.find(i => i.player_id === trade.pendingBuy!.playerId) : null;
        const floorCents = isIpo && ipo
          ? ipo.price
          : (player.listings.length > 0 ? Math.min(...player.listings.map(l => l.price)) : Math.round((player.prices.floor ?? 0) * 100));
        const ipoRemaining = ipo ? ipo.total_offered - ipo.sold : 0;
        const ipoProgress = ipo ? (ipo.sold / ipo.total_offered) * 100 : 0;
        const maxQty = isIpo && ipo ? Math.min(ipo.max_per_user, ipoRemaining) : 1;

        return (
          <BuyConfirmModal
            open
            onClose={() => trade.setPendingBuy(null)}
            player={player}
            source={trade.pendingBuy.source}
            priceCents={floorCents}
            maxQty={maxQty}
            balanceCents={balanceCents}
            isPending={trade.buyPending || trade.ipoBuyPending}
            onConfirm={trade.executeBuy}
            ipoProgress={isIpo ? ipoProgress : undefined}
            ipoRemaining={isIpo ? ipoRemaining : undefined}
          />
        );
      })()}

      {/* Buy Order Modal */}
      <BuyOrderModal
        player={trade.buyOrderPlayer}
        open={trade.buyOrderPlayer !== null}
        onClose={() => trade.setBuyOrderPlayer(null)}
      />
    </div>
    </GeoGate>
  );
}
