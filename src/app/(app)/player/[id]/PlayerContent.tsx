'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { Button, ErrorState, TabBar, ErrorBoundary } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useToast } from '@/components/providers/ToastProvider';

import {
  usePlayerDetailData,
  usePlayerTrading,
  usePlayerCommunity,
  usePriceAlerts,
} from '@/components/player/detail/hooks';

import {
  PlayerDetailSkeleton,
  PlayerHero,
  CommunityTab,
  MobileTradingBar,
  LiquidationAlert,
} from '@/components/player/detail';
import TradingTab from '@/components/player/detail/TradingTab';
import PerformanceTab from '@/components/player/detail/PerformanceTab';
import StickyDashboardStrip from '@/components/player/detail/StickyDashboardStrip';
import { FEATURE_LIMIT_ORDERS } from '@/lib/featureFlags';
import dynamic from 'next/dynamic';

// Modals: lazy-loaded since they only render on user interaction
const BuyModal = dynamic(() => import('@/components/player/detail/BuyModal'), { ssr: false });
const SellModal = dynamic(() => import('@/components/player/detail/SellModal'), { ssr: false });
const OfferModal = dynamic(() => import('@/components/player/detail/OfferModal'), { ssr: false });
// LimitOrderModal aus Beta entfernt (AR-23, FEATURE_LIMIT_ORDERS=false).
// Import + Render-Block bleiben nur aktiv wenn Flag true.

// ============================================
// TYPES
// ============================================

type Tab = 'trading' | 'performance' | 'community';

const TABS: { id: string; label: string }[] = [
  { id: 'trading', label: 'tabTrading' },
  { id: 'performance', label: 'tabPerformance' },
  { id: 'community', label: 'community' },
];

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export default function PlayerContent({ playerId }: { playerId: string }) {
  const { user, clubAdmin } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const t = useTranslations('player');
  const uid = user?.id;

  // ─── UI State ───────────────────────────
  const [tab, setTab] = useState<Tab>('trading');
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStrip, setShowStrip] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  // showLimitOrder State nur aktiv wenn FEATURE_LIMIT_ORDERS=true.
  // In Beta gehen alle LimitOrder-Trigger auf no-op.

  // ─── Data Hook ──────────────────────────
  const data = usePlayerDetailData(playerId, uid, tab);

  // ─── Action Hooks ───────────────────────
  const trading = usePlayerTrading({
    playerId, player: data.player, userId: uid,
    activeIpo: data.activeIpo ?? null, allSellOrders: data.allSellOrders,
    holdingQty: data.holdingQty, balanceCents, userIpoPurchased: data.userIpoPurchased,
  });

  const community = usePlayerCommunity({
    playerId, playerClub: data.player?.club, userId: uid, playerPosts: data.playerPosts,
  });

  const alerts = usePriceAlerts({ playerId, player: data.player });

  // ─── Sticky Dashboard Strip ─────────────
  useEffect(() => {
    if (!heroRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStrip(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  // ─── Club Admin Guard ───────────────────
  const isRestrictedAdmin = !!(clubAdmin && data.dbPlayer?.club_id === clubAdmin.clubId);
  const te = useTranslations('errors');
  const guardedBuy = isRestrictedAdmin
    ? () => addToast(te('clubAdminRestricted'), 'error')
    : trading.openBuyModal;
  const guardedSell = isRestrictedAdmin
    ? () => addToast(te('clubAdminRestricted'), 'error')
    : trading.openSellModal;

  // ─── Share Handler ──────────────────────
  const handleShare = async () => {
    if (!data.player) return;
    const url = window.location.href;
    const text = `${data.player.first} ${data.player.last} auf BeScout — ${fmtScout(centsToBsd(data.player.prices.floor ?? 0))} CR`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch (err) { console.error('[Player] Share failed:', err); }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // ─── Loading / Error / Not Found ────────

  if (data.isLoading) return <PlayerDetailSkeleton />;

  if (data.isError) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <ErrorState onRetry={() => data.refetch()} />
      </div>
    );
  }

  if (!data.player || !data.playerWithOwnership) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <XCircle className="size-12 text-white/20 mb-4" />
        <div className="text-white/50 mb-2">{t('notFound')}</div>
        <Link href="/market">
          <Button variant="outline">{t('backToMarket')}</Button>
        </Link>
      </div>
    );
  }

  // After guards — narrow types for render
  const { player, playerWithOwnership } = data;

  // ─── Render ─────────────────────────────

  return (
    <>
    {/* Sticky Dashboard Strip — outside main container to avoid space-y-6 gap */}
    <StickyDashboardStrip
      playerName={player.last}
      position={player.pos}
      floorPrice={player.prices.floor ?? 0}
      l5Score={player.perf.l5}
      trend={player.perf.trend}
      change24h={player.prices.change24h ?? 0}
      holdingQty={data.holdingQty}
      holderCount={data.holderCount}
      visible={showStrip}
    />

    <div className="max-w-[900px] mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Liquidation Alert (above Hero) */}
      {player.isLiquidated && (
        <LiquidationAlert liquidationEvent={data.liquidationEvent ?? null} />
      )}

      {/* Hero */}
      <div ref={heroRef}>
        <PlayerHero
          player={player}
          isIPO={trading.isIPO}
          activeIpo={data.activeIpo ?? null}
          holderCount={data.holderCount}
          watcherCount={data.watcherCount}
          holdingQty={data.holdingQty}
          isWatchlisted={isWatchlisted}
          priceAlert={alerts.priceAlert}
          onToggleWatchlist={() => setIsWatchlisted(!isWatchlisted)}
          onShare={handleShare}
          onBuyClick={guardedBuy}
          onSellClick={guardedSell}
          // onLimitClick nur aktiv wenn FEATURE_LIMIT_ORDERS=true (AR-23).
          onLimitClick={undefined}
          onSetPriceAlert={alerts.handleSetPriceAlert}
          onRemovePriceAlert={alerts.handleRemovePriceAlert}
          masteryLevel={data.masteryData?.level ?? 0}
          matchTimeline={data.matchTimelineData}
        />
      </div>

      {/* Tabs + Content */}
      <div className="space-y-4 md:space-y-6">
        <TabBar tabs={TABS.map(tb => ({ ...tb, label: t(tb.label) }))} activeTab={tab} onChange={(id) => setTab(id as Tab)} />

        {tab === 'trading' && (
          <TradingTab
            player={player}
            trades={data.trades}
            allSellOrders={data.allSellOrders}
            tradesLoading={data.tradesLoading}
            profileMap={data.profileMap}
            userId={uid}
            dpcAvailable={data.dpcAvailable}
            openBids={data.openBids}
            holdingQty={data.holdingQty}
            holderCount={data.holderCount}
            mastery={data.masteryData && data.holdingQty > 0 ? { level: data.masteryData.level, xp: data.masteryData.xp } : null}
            onAcceptBid={trading.handleAcceptBid}
            acceptingBidId={trading.acceptingBidId}
            onOpenOfferModal={trading.openOfferModal}
            isRestrictedAdmin={isRestrictedAdmin}
            playerResearch={data.playerResearch}
            onBuyClick={guardedBuy}
          />
        )}

        {tab === 'performance' && (
          <PerformanceTab
            player={playerWithOwnership}
            dpcAvailable={data.dpcAvailable}
            holdingQty={data.holdingQty}
            holderCount={data.holderCount}
            matchTimeline={data.matchTimelineData}
            matchTimelineLoading={data.matchTimelineLoading}
            percentiles={data.percentiles}
          />
        )}

        {tab === 'community' && (
          <CommunityTab
            playerResearch={data.playerResearch}
            playerPosts={data.playerPosts}
            myPostVotes={community.myPostVotes}
            trades={data.trades}
            userId={uid}
            playerId={playerId}
            playerName={`${player.first} ${player.last}`}
            unlockingId={community.unlockingId}
            ratingId={community.ratingId}
            postLoading={community.postLoading}
            onUnlock={community.handleResearchUnlock}
            onRate={community.handleResearchRate}
            onCreatePost={community.handleCreatePlayerPost}
            onVotePost={community.handleVotePlayerPost}
            onDeletePost={community.handleDeletePlayerPost}
          />
        )}
      </div>

      {/* Trading Modals — wrapped in ErrorBoundary */}
      <ErrorBoundary>
        <BuyModal
          open={trading.buyModalOpen}
          onClose={trading.closeBuyModal}
          player={playerWithOwnership}
          activeIpo={data.activeIpo ?? null}
          userIpoPurchased={data.userIpoPurchased}
          balanceCents={balanceCents}
          allSellOrders={data.allSellOrders}
          userOrders={trading.userOrders}
          userId={uid}
          buying={trading.buying}
          ipoBuying={trading.ipoBuying}
          buyError={trading.buyError}
          buySuccess={trading.buySuccess}
          shared={trading.shared}
          pendingBuyQty={trading.pendingBuyQty}
          pendingBuyOrderId={trading.pendingBuyOrderId}
          onBuy={trading.handleBuy}
          onIpoBuy={trading.handleIpoBuy}
          onConfirmBuy={trading.executeBuy}
          onCancelPendingBuy={trading.cancelPendingBuy}
          onShareTrade={trading.handleShareTrade}
          onOpenOfferModal={trading.openOfferModal}
          profileMap={data.profileMap}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <SellModal
          open={trading.sellModalOpen}
          onClose={trading.closeSellModal}
          player={playerWithOwnership}
          holdingQty={data.holdingQty}
          lockedQty={data.lockedScMap?.get(playerId) ?? 0}
          userOrders={trading.userOrders}
          openBids={data.openBids}
          onSell={trading.handleSell}
          onCancelOrder={trading.handleCancelOrder}
          onAcceptBid={trading.handleAcceptBid}
          acceptingBidId={trading.acceptingBidId}
          selling={trading.selling}
          cancellingId={trading.cancellingId}
          sellError={trading.sellError}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <OfferModal
          open={trading.showOfferModal}
          onClose={trading.closeOfferModal}
          offerPrice={trading.offerPrice}
          offerMessage={trading.offerMessage}
          offerLoading={trading.offerLoading}
          onPriceChange={trading.setOfferPrice}
          onMessageChange={trading.setOfferMessage}
          onSubmit={trading.handleCreateOffer}
        />
      </ErrorBoundary>

      {/* LimitOrderModal aus Beta entfernt (AR-23, FEATURE_LIMIT_ORDERS=false). */}
      {/* Wenn Feature reaktiviert: Modal + import + showLimitOrder State + onLimitClick handlers wieder aktivieren. */}

      {/* Mobile Trading Bar */}
      <MobileTradingBar
        floor={player.prices.floor ?? 0}
        holdingQty={data.holdingQty}
        change24h={player.prices.change24h ?? 0}
        isLiquidated={player.isLiquidated || isRestrictedAdmin}
        onBuyClick={guardedBuy}
        onSellClick={guardedSell}
        // onLimitClick nur aktiv wenn FEATURE_LIMIT_ORDERS=true (AR-23).
        onLimitClick={undefined}
      />
    </div>
    </>
  );
}
