'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { Button, ErrorState, TabBar, ErrorBoundary } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { dbToPlayer } from '@/lib/services/players';
import { getProfilesByIds } from '@/lib/services/profiles';
import { MASTERY_LEVEL_LABELS, MASTERY_XP_THRESHOLDS } from '@/lib/services/mastery';
import type { Player } from '@/types';

// React Query hooks
import { useDbPlayerById, usePlayers } from '@/lib/queries/players';
import {
  usePlayerGwScores,
  usePbtForPlayer,
  useLiquidationEvent,
  useIpoForPlayer,
  useHoldingQty,
  usePlayerHolderCount,
  useSellOrders,
  useOpenBids,
  usePosts,
  useUserIpoPurchases,
} from '@/lib/queries/misc';
import { usePlayerResearch } from '@/lib/queries/research';
import { usePlayerTrades } from '@/lib/queries/trades';
import { useDpcMastery } from '@/lib/queries/mastery';

// Custom hooks
import { usePlayerTrading, usePlayerCommunity, usePriceAlerts } from '@/components/player/detail/hooks';

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
import BuyModal from '@/components/player/detail/BuyModal';
import SellModal from '@/components/player/detail/SellModal';
import OfferModal from '@/components/player/detail/OfferModal';
import dynamic from 'next/dynamic';
const LimitOrderModal = dynamic(() => import('@/components/player/detail/LimitOrderModal'), { ssr: false });

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

  // ─── UI State (before queries so tab can gate enabled) ─
  const [tab, setTab] = useState<Tab>('trading');
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStrip, setShowStrip] = useState(false);

  // ─── React Query Hooks (ALL before early returns) ────
  const { data: dbPlayer, isLoading: playerLoading, isError: playerError, refetch } = useDbPlayerById(playerId);
  const { data: gwScoresData } = usePlayerGwScores(playerId);
  const { data: pbtTreasury } = usePbtForPlayer(playerId);
  const { data: liquidationEvent } = useLiquidationEvent(playerId);
  const { data: activeIpo } = useIpoForPlayer(playerId);
  const { data: holdingQtyData } = useHoldingQty(uid, playerId);
  const { data: holderCountData } = usePlayerHolderCount(playerId);
  const { data: allSellOrdersData } = useSellOrders(playerId);
  const { data: openBidsData } = useOpenBids(playerId, tab === 'trading');
  const { data: tradesData, isLoading: tradesLoading } = usePlayerTrades(playerId);
  const { data: playerResearchData } = usePlayerResearch(playerId, uid, tab === 'community' || tab === 'trading');
  const { data: playerPostsData } = usePosts({ playerId, limit: 30 });
  const { data: userIpoPurchasedData } = useUserIpoPurchases(uid, activeIpo?.id);
  const { data: masteryData } = useDpcMastery(uid, playerId);

  // ─── Derived from queries ─────────────────
  const { data: allPlayersData } = usePlayers(tab === 'performance');
  const allPlayersForPercentile = allPlayersData ?? [];
  const player = useMemo(() => dbPlayer ? dbToPlayer(dbPlayer) : null, [dbPlayer]);
  const dpcAvailable = dbPlayer?.dpc_available ?? 0;
  const gwScores = gwScoresData ?? [];
  const holdingQty = holdingQtyData ?? 0;
  const holderCount = holderCountData ?? 0;
  const allSellOrders = allSellOrdersData ?? [];
  const openBids = openBidsData ?? [];
  const trades = tradesData ?? [];
  const playerResearch = playerResearchData ?? [];
  const playerPosts = playerPostsData ?? [];
  const userIpoPurchased = userIpoPurchasedData ?? 0;

  // ─── Custom Hooks ─────────────────────────
  const trading = usePlayerTrading({
    playerId, player, userId: uid,
    activeIpo: activeIpo ?? null, allSellOrders,
    holdingQty, balanceCents, userIpoPurchased,
  });

  const community = usePlayerCommunity({
    playerId, playerClub: player?.club, userId: uid, playerPosts,
  });

  const alerts = usePriceAlerts({ playerId, player });

  // ─── UI State (continued) ────────────────
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [showLimitOrder, setShowLimitOrder] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, { handle: string; display_name: string | null }>>({});

  // ─── Sticky Dashboard Strip (IntersectionObserver) ─
  useEffect(() => {
    if (!heroRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStrip(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  // ─── Side Effects ─────────────────────────

  // Load profile map when trades or orders change
  useEffect(() => {
    const userIds = new Set<string>();
    trades.forEach(t => { if (t.buyer_id) userIds.add(t.buyer_id); if (t.seller_id) userIds.add(t.seller_id); });
    allSellOrders.forEach(o => { if (o.user_id) userIds.add(o.user_id); });
    const ids = Array.from(userIds);
    if (ids.length > 0) {
      getProfilesByIds(ids).then(setProfileMap).catch(err => {
        console.error('[Player] Profile map failed:', err);
        addToast(t('couldNotLoadProfiles'), 'error');
      });
    }
  }, [trades, allSellOrders]);

  // ─── Derived Data ─────────────────────────

  const playerWithOwnership = useMemo(() => {
    if (!player) return null;
    const c2b = (c: number) => c / 100;
    return {
      ...player,
      dpc: { ...player.dpc, owned: holdingQty },
      pbt: pbtTreasury ? {
        balance: c2b(pbtTreasury.balance),
        lastInflow: pbtTreasury.last_inflow_at ? c2b(pbtTreasury.trading_inflow + pbtTreasury.ipo_inflow) : undefined,
        sources: {
          trading: c2b(pbtTreasury.trading_inflow),
          ipo: c2b(pbtTreasury.ipo_inflow),
          votes: c2b(pbtTreasury.votes_inflow),
          content: c2b(pbtTreasury.content_inflow),
        },
      } : player.pbt,
    };
  }, [player, holdingQty, pbtTreasury]);

  // ─── Club Admin Trading Restriction ──────
  const isRestrictedAdmin = !!(clubAdmin && dbPlayer?.club_id === clubAdmin.clubId);
  const te = useTranslations('errors');
  const guardedBuy = isRestrictedAdmin
    ? () => addToast(te('clubAdminRestricted'), 'error')
    : trading.openBuyModal;
  const guardedSell = isRestrictedAdmin
    ? () => addToast(te('clubAdminRestricted'), 'error')
    : trading.openSellModal;

  // ─── Share handler ────────────────────────

  const handleShare = async () => {
    if (!player) return;
    const url = window.location.href;
    const text = `${player.first} ${player.last} auf BeScout — ${fmtScout(centsToBsd(player.prices.floor ?? 0))} $SCOUT`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch (err) { console.error('[Player] Share failed:', err); }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // ─── Loading / Error / Not Found ──────────

  if (playerLoading) return <PlayerDetailSkeleton />;

  if (playerError) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  if (!player || !playerWithOwnership) {
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

  // ─── Render ───────────────────────────────

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
      holdingQty={holdingQty}
      holderCount={holderCount}
      visible={showStrip}
    />

    <div className="max-w-[900px] mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Liquidation Alert (above Hero) */}
      {player.isLiquidated && (
        <LiquidationAlert liquidationEvent={liquidationEvent ?? null} />
      )}

      {/* Hero */}
      <div ref={heroRef}>
        <PlayerHero
          player={player}
          isIPO={trading.isIPO}
          activeIpo={activeIpo ?? null}
          holderCount={holderCount}
          holdingQty={holdingQty}
          isWatchlisted={isWatchlisted}
          priceAlert={alerts.priceAlert}
          onToggleWatchlist={() => setIsWatchlisted(!isWatchlisted)}
          onShare={handleShare}
          onBuyClick={guardedBuy}
          onSellClick={guardedSell}
          onSetPriceAlert={alerts.handleSetPriceAlert}
          onRemovePriceAlert={alerts.handleRemovePriceAlert}
          masteryLevel={masteryData?.level ?? 0}
        />
      </div>

      {/* Tabs + Content */}
      <div className="space-y-4 md:space-y-6">
        <TabBar tabs={TABS.map(tab => ({ ...tab, label: t(tab.label) }))} activeTab={tab} onChange={(id) => setTab(id as Tab)} />

        {tab === 'trading' && (
          <TradingTab
            player={player}
            trades={trades}
            allSellOrders={allSellOrders}
            tradesLoading={tradesLoading}
            profileMap={profileMap}
            userId={uid}
            dpcAvailable={dpcAvailable}
            openBids={openBids}
            holdingQty={holdingQty}
            holderCount={holderCount}
            mastery={masteryData && holdingQty > 0 ? { level: masteryData.level, xp: masteryData.xp } : null}
            onAcceptBid={trading.handleAcceptBid}
            acceptingBidId={trading.acceptingBidId}
            onOpenOfferModal={trading.openOfferModal}
            isRestrictedAdmin={isRestrictedAdmin}
            playerResearch={playerResearch}
          />
        )}

        {tab === 'performance' && (
          <PerformanceTab
            player={playerWithOwnership}
            dpcAvailable={dpcAvailable}
            holdingQty={holdingQty}
            holderCount={holderCount}
            gwScores={gwScores}
            allPlayers={allPlayersForPercentile}
          />
        )}

        {tab === 'community' && (
          <CommunityTab
            playerResearch={playerResearch}
            playerPosts={playerPosts}
            myPostVotes={community.myPostVotes}
            trades={trades}
            userId={uid}
            playerId={playerId}
            playerName={player ? `${player.first} ${player.last}` : ''}
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
          activeIpo={activeIpo ?? null}
          userIpoPurchased={userIpoPurchased}
          balanceCents={balanceCents}
          allSellOrders={allSellOrders}
          userOrders={trading.userOrders}
          userId={uid}
          buying={trading.buying}
          ipoBuying={trading.ipoBuying}
          buyError={trading.buyError}
          buySuccess={trading.buySuccess}
          shared={trading.shared}
          pendingBuyQty={trading.pendingBuyQty}
          onBuy={trading.handleBuy}
          onIpoBuy={trading.handleIpoBuy}
          onConfirmBuy={trading.executeBuy}
          onCancelPendingBuy={trading.cancelPendingBuy}
          onShareTrade={trading.handleShareTrade}
          onOpenOfferModal={trading.openOfferModal}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <SellModal
          open={trading.sellModalOpen}
          onClose={trading.closeSellModal}
          player={playerWithOwnership}
          holdingQty={holdingQty}
          userOrders={trading.userOrders}
          onSell={trading.handleSell}
          onCancelOrder={trading.handleCancelOrder}
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

      {player && (
        <LimitOrderModal
          open={showLimitOrder}
          onClose={() => setShowLimitOrder(false)}
          playerName={`${player.first} ${player.last}`}
          floorPrice={player.prices.floor ?? player.prices.lastTrade}
        />
      )}

      {/* Mobile Trading Bar */}
      <MobileTradingBar
        floor={player.prices.floor ?? 0}
        holdingQty={holdingQty}
        change24h={player.prices.change24h ?? 0}
        isLiquidated={player.isLiquidated || isRestrictedAdmin}
        onBuyClick={guardedBuy}
        onSellClick={guardedSell}
        onLimitClick={() => setShowLimitOrder(true)}
      />
    </div>
    </>
  );
}
