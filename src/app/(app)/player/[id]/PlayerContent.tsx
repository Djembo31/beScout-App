'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { Button, ErrorState, Modal, TabBar } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import { createPost, votePost, getUserPostVotes, deletePost } from '@/lib/services/posts';
import type { PostWithAuthor } from '@/types';
import type { Player } from '@/types';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { dbToPlayer, centsToBsd } from '@/lib/services/players';
import { formatBsd } from '@/lib/services/wallet';
import { useWallet } from '@/components/providers/WalletProvider';
import { buyFromMarket, placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { buyFromIpo } from '@/lib/services/ipo';
import { getProfilesByIds } from '@/lib/services/profiles';
import { invalidateTradeQueries, invalidatePlayerDetailQueries } from '@/lib/queries/invalidation';
import { createOffer as createOfferAction, acceptOffer } from '@/lib/services/offers';
import type { DbOrder, DbTrade } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

// React Query hooks
import { useDbPlayerById } from '@/lib/queries/players';
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
import { MASTERY_LEVEL_LABELS, MASTERY_XP_THRESHOLDS } from '@/lib/services/mastery';
import { qk } from '@/lib/queries/keys';

import {
  PlayerDetailSkeleton,
  PlayerHero,
  ProfilTab,
  MarktTab,
  StatistikTab,
  CommunityTab,
  MobileTradingBar,
  TradingModal,
  LiquidationAlert,
  SponsorBanner,
} from '@/components/player/detail';

// ============================================
// TYPES
// ============================================

type Tab = 'profil' | 'markt' | 'statistik' | 'community';

// ============================================
// PRICE ALERTS (localStorage)
// ============================================

const PRICE_ALERTS_KEY = 'bescout-price-alerts';

function loadPriceAlerts(): Record<string, { target: number; dir: 'above' | 'below' }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PRICE_ALERTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePriceAlerts(alerts: Record<string, { target: number; dir: 'above' | 'below' }>): void {
  localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
}

// ============================================
// TABS CONFIG
// ============================================

const TABS: { id: string; label: string }[] = [
  { id: 'profil', label: 'profile' },
  { id: 'markt', label: 'market' },
  { id: 'statistik', label: 'stats' },
  { id: 'community', label: 'community' },
];

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export default function PlayerContent({ playerId }: { playerId: string }) {
  const { user } = useUser();
  const { balanceCents, setBalanceCents } = useWallet();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const t = useTranslations('player');
  const tc = useTranslations('common');

  // ─── React Query Hooks (ALL before early returns) ────
  const { data: dbPlayer, isLoading: playerLoading, isError: playerError, refetch } = useDbPlayerById(playerId);
  const { data: gwScoresData } = usePlayerGwScores(playerId);
  const { data: pbtTreasury } = usePbtForPlayer(playerId);
  const { data: liquidationEvent } = useLiquidationEvent(playerId);
  const { data: activeIpo } = useIpoForPlayer(playerId);
  const { data: holdingQtyData } = useHoldingQty(user?.id, playerId);
  const { data: holderCountData } = usePlayerHolderCount(playerId);
  const { data: allSellOrdersData } = useSellOrders(playerId);
  const { data: openBidsData } = useOpenBids(playerId);
  const { data: tradesData, isLoading: tradesLoading } = usePlayerTrades(playerId);
  const { data: playerResearchData } = usePlayerResearch(playerId, user?.id);
  const { data: playerPostsData } = usePosts({ playerId, limit: 30 });
  const { data: userIpoPurchasedData } = useUserIpoPurchases(user?.id, activeIpo?.id);
  const { data: masteryData } = useDpcMastery(user?.id, playerId);

  // ─── Derived from queries ─────────────────
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

  const userOrders = useMemo(
    () => allSellOrders.filter(o => o.user_id === user?.id),
    [allSellOrders, user?.id]
  );

  // ─── UI State (stays as useState) ─────────
  const [buying, setBuying] = useState(false);
  const [ipoBuying, setIpoBuying] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [tab, setTab] = useState<Tab>('profil');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [priceAlert, setPriceAlert] = useState<{ target: number; dir: 'above' | 'below' } | null>(null);
  const [myPostVotes, setMyPostVotes] = useState<Map<string, number>>(new Map());
  const [postLoading, setPostLoading] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [pendingBuyQty, setPendingBuyQty] = useState<number | null>(null);
  const [tradingModalOpen, setTradingModalOpen] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, { handle: string; display_name: string | null }>>({});

  // ─── Side Effects ─────────────────────────

  // Fire-and-forget: resolve expired research on mount
  useEffect(() => {
    resolveExpiredResearch().catch(err => console.error('[Player] Resolve expired research failed:', err));
  }, []);

  // Load profile map when trades or orders change
  useEffect(() => {
    const userIds = new Set<string>();
    trades.forEach(t => { if (t.buyer_id) userIds.add(t.buyer_id); if (t.seller_id) userIds.add(t.seller_id); });
    allSellOrders.forEach(o => { if (o.user_id) userIds.add(o.user_id); });
    const ids = Array.from(userIds);
    if (ids.length > 0) {
      getProfilesByIds(ids).then(setProfileMap).catch(err => console.error('[Player] Profile map failed:', err));
    }
  }, [trades, allSellOrders]);

  // Load user post votes when posts change
  useEffect(() => {
    if (!user || playerPosts.length === 0) return;
    getUserPostVotes(user.id, playerPosts.map(p => p.id))
      .then(setMyPostVotes)
      .catch(err => console.error('[Player] Post votes failed:', err));
  }, [user, playerPosts]);

  // Price alert: load + check trigger
  useEffect(() => {
    if (!player) return;
    const alerts = loadPriceAlerts();
    const existing = alerts[playerId];
    if (existing) {
      const floorBsd = centsToBsd(player.prices.floor ?? 0);
      const triggered = existing.dir === 'below' ? floorBsd <= existing.target : floorBsd >= existing.target;
      if (triggered && floorBsd > 0) {
        addToast(`Preis-Alert: ${player.first} ${player.last} ist ${existing.dir === 'below' ? 'unter' : 'über'} ${fmtBSD(existing.target)} BSD`, 'success');
        delete alerts[playerId];
        savePriceAlerts(alerts);
        setPriceAlert(null);
      } else {
        setPriceAlert(existing);
      }
    }
  }, [player, playerId, addToast]);

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

  const isIPO = activeIpo !== null && activeIpo !== undefined && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  // ─── Invalidation Helper ──────────────────

  const invalidateAfterTrade = useCallback((pid: string, uid?: string) => {
    invalidateTradeQueries(pid, uid);
    invalidatePlayerDetailQueries(pid, uid);
    queryClient.invalidateQueries({ queryKey: ['offers', 'bids', pid] });
  }, [queryClient]);

  // ─── Handlers ─────────────────────────────

  const handleBuy = useCallback((quantity: number) => {
    if (!user || !player || player.isLiquidated) return;
    if (userOrders.length > 0) { setPendingBuyQty(quantity); return; }
    executeBuy(quantity);
  }, [user, player, userOrders]);

  const executeBuy = useCallback(async (quantity: number) => {
    if (!user || !player) return;
    setPendingBuyQty(null);
    setBuying(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await buyFromMarket(user.id, playerId, quantity);
      if (!result.success) { setBuyError(result.error || 'Kauf fehlgeschlagen'); }
      else {
        const priceBsd = result.price_per_dpc ? formatBsd(result.price_per_dpc) : '?';
        setBuySuccess(`${quantity} DPC vom Transfermarkt für ${priceBsd} BSD gekauft`);
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        // Optimistic holdingQty update
        queryClient.setQueryData(['holdings', 'qty', user.id, playerId], (old: number | undefined) => (old ?? 0) + quantity);
        invalidateAfterTrade(playerId, user.id);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setBuying(false); }
  }, [user, player, playerId, balanceCents, setBalanceCents, invalidateAfterTrade, queryClient]);

  const handleIpoBuy = useCallback(async (quantity: number) => {
    if (!user || !activeIpo) return;
    setIpoBuying(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await buyFromIpo(user.id, activeIpo.id, quantity);
      if (!result.success) { setBuyError(result.error || 'IPO-Kauf fehlgeschlagen'); }
      else {
        const priceBsd = result.price_per_dpc ? formatBsd(result.price_per_dpc) : '?';
        setBuySuccess(`${quantity} DPC per IPO für ${priceBsd} BSD gekauft`);
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        // Optimistic updates
        queryClient.setQueryData(['holdings', 'qty', user.id, playerId], (old: number | undefined) => (old ?? 0) + quantity);
        if (result.user_total_purchased != null) {
          queryClient.setQueryData(['ipos', 'purchases', user.id, activeIpo.id], result.user_total_purchased);
        }
        invalidateAfterTrade(playerId, user.id);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setIpoBuying(false); }
  }, [user, activeIpo, playerId, balanceCents, setBalanceCents, invalidateAfterTrade, queryClient]);

  const handleSell = useCallback(async (quantity: number, priceCents: number) => {
    if (!user || player?.isLiquidated) return;
    setSelling(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await placeSellOrder(user.id, playerId, quantity, priceCents);
      if (!result.success) { setBuyError(result.error || 'Listing fehlgeschlagen'); }
      else {
        setBuySuccess(`${quantity} DPC für ${formatBsd(priceCents)} BSD gelistet`);
        invalidateAfterTrade(playerId, user.id);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setSelling(false); }
  }, [user, player, playerId, invalidateAfterTrade]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (!user) return;
    setCancellingId(orderId); setBuyError(null);
    try {
      const result = await cancelOrder(user.id, orderId);
      if (!result.success) { setBuyError(result.error || 'Stornierung fehlgeschlagen'); }
      else {
        setBuySuccess('Order storniert!');
        // Optimistic: remove the cancelled order from cache
        queryClient.setQueryData(qk.orders.byPlayer(playerId), (old: DbOrder[] | undefined) =>
          (old ?? []).filter(o => o.id !== orderId)
        );
        invalidateAfterTrade(playerId, user.id);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setCancellingId(null); }
  }, [user, playerId, invalidateAfterTrade, queryClient]);

  const handleCreateOffer = useCallback(async () => {
    if (!user || !offerPrice) return;
    const priceCents = Math.round(parseFloat(offerPrice) * 100);
    if (priceCents <= 0) { addToast('Ungültiger Preis', 'error'); return; }
    setOfferLoading(true);
    try {
      const result = await createOfferAction({
        senderId: user.id, playerId, side: 'buy', priceCents, quantity: 1,
        message: offerMessage.trim() || undefined,
      });
      if (result.success) {
        addToast('Kaufangebot erstellt', 'success');
        setShowOfferModal(false); setOfferPrice(''); setOfferMessage('');
        queryClient.invalidateQueries({ queryKey: ['offers', 'bids', playerId] });
      } else { addToast(result.error ?? 'Fehler', 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : 'Fehler', 'error'); }
    finally { setOfferLoading(false); }
  }, [user, offerPrice, offerMessage, playerId, addToast, queryClient]);

  const handleAcceptBid = useCallback(async (offerId: string) => {
    if (!user || acceptingBidId) return;
    setAcceptingBidId(offerId);
    try {
      const result = await acceptOffer(user.id, offerId);
      if (result.success) {
        addToast('Angebot angenommen', 'success');
        invalidateAfterTrade(playerId, user.id);
      } else { addToast(result.error ?? 'Fehler', 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : 'Fehler', 'error'); }
    finally { setAcceptingBidId(null); }
  }, [user, acceptingBidId, playerId, addToast, invalidateAfterTrade]);

  const handleShareTrade = useCallback(async () => {
    if (!user || !player || shared) return;
    try {
      const p = player;
      const { createPost } = await import('@/lib/services/posts');
      await createPost(user.id, playerId, p.club, `Ich habe gerade ${p.first} ${p.last} DPCs gekauft! ${p.pos === 'ATT' ? '\u26BD' : p.pos === 'GK' ? '\uD83E\uDDE4' : '\uD83C\uDFC3'} #Trading`, [p.last.toLowerCase(), p.club.toLowerCase()], 'Trading');
      setShared(true);
      addToast('In der Community geteilt!', 'success');
    } catch { addToast('Teilen fehlgeschlagen', 'error'); }
  }, [user, player, shared, playerId, addToast]);

  const handleShare = useCallback(async () => {
    if (!player) return;
    const url = window.location.href;
    const text = `${player.first} ${player.last} auf BeScout — ${fmtBSD(centsToBsd(player.prices.floor ?? 0))} BSD`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch (err) { console.error('[Player] Share failed:', err); }
    } else {
      await navigator.clipboard.writeText(url);
      addToast('Link kopiert!', 'success');
    }
  }, [player, addToast]);

  const handleSetPriceAlert = useCallback((target: number) => {
    if (!player) return;
    const currentBsd = centsToBsd(player.prices.floor ?? 0);
    const dir = target < currentBsd ? 'below' : 'above';
    const alerts = loadPriceAlerts();
    alerts[playerId] = { target, dir };
    savePriceAlerts(alerts);
    setPriceAlert({ target, dir });
    addToast(`Preis-Alert gesetzt: ${dir === 'below' ? '\u2264' : '\u2265'} ${fmtBSD(target)} BSD`, 'success');
  }, [player, playerId, addToast]);

  const handleRemovePriceAlert = useCallback(() => {
    const alerts = loadPriceAlerts();
    delete alerts[playerId];
    savePriceAlerts(alerts);
    setPriceAlert(null);
  }, [playerId]);

  const handleCreatePlayerPost = useCallback(async (content: string, tags: string[], category: string, postType: 'player_take' | 'transfer_rumor' = 'player_take', rumorSource?: string, rumorClubTarget?: string) => {
    if (!user || !player) return;
    setPostLoading(true);
    try {
      await createPost(user.id, playerId, player.club, content, tags, category, null, postType, rumorSource ?? null, rumorClubTarget ?? null);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      addToast('Beitrag gepostet!', 'success');
    } catch { addToast('Beitrag konnte nicht erstellt werden', 'error'); }
    finally { setPostLoading(false); }
  }, [user, player, playerId, addToast, queryClient]);

  const handleVotePlayerPost = useCallback(async (postId: string, voteType: number) => {
    if (!user) return;
    try {
      const result = await votePost(user.id, postId, voteType);
      // Optimistic update on post votes
      queryClient.setQueryData(qk.posts.list({ playerId, limit: 30 } as Record<string, unknown>), (old: PostWithAuthor[] | undefined) =>
        (old ?? []).map(p => p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p)
      );
      setMyPostVotes(prev => {
        const next = new Map(prev);
        if (voteType === 0) next.delete(postId);
        else next.set(postId, voteType);
        return next;
      });
    } catch (err) { console.error('[Player] Vote post failed:', err); }
  }, [user, playerId, queryClient]);

  const handleDeletePlayerPost = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      await deletePost(user.id, postId);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err) { console.error('[Player] Delete post failed:', err); }
  }, [user, queryClient]);

  const handleResearchUnlock = useCallback(async (id: string) => {
    if (!user || unlockingId) return;
    setUnlockingId(id);
    try {
      const result = await unlockResearch(user.id, id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['research'] });
      }
    } catch (err) { console.error('[Player] Research unlock failed:', err); } finally { setUnlockingId(null); }
  }, [user, unlockingId, queryClient]);

  const handleResearchRate = useCallback(async (id: string, rating: number) => {
    if (!user || ratingId) return;
    setRatingId(id);
    try {
      const result = await rateResearch(user.id, id, rating);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['research'] });
      }
    } catch (err) { console.error('[Player] Research rate failed:', err); } finally { setRatingId(null); }
  }, [user, ratingId, queryClient]);

  const openTrading = useCallback(() => setTradingModalOpen(true), []);

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
        <XCircle className="w-12 h-12 text-white/20 mb-4" />
        <div className="text-white/50 mb-2">{t('notFound')}</div>
        <Link href="/market">
          <Button variant="outline">{t('backToMarket')}</Button>
        </Link>
      </div>
    );
  }

  // ─── Render ───────────────────────────────

  return (
    <div className="max-w-[900px] mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Liquidation Alert (above Hero) */}
      {player.isLiquidated && (
        <LiquidationAlert liquidationEvent={liquidationEvent ?? null} />
      )}

      {/* Hero (full-width, identity-focused) */}
      <PlayerHero
        player={player}
        isIPO={isIPO}
        activeIpo={activeIpo ?? null}
        holderCount={holderCount}
        holdingQty={holdingQty}
        isWatchlisted={isWatchlisted}
        priceAlert={priceAlert}
        onToggleWatchlist={() => setIsWatchlisted(!isWatchlisted)}
        onShare={handleShare}
        onBuyClick={openTrading}
        onSellClick={openTrading}
        onSetPriceAlert={handleSetPriceAlert}
        onRemovePriceAlert={handleRemovePriceAlert}
      />

      {/* DPC Mastery (only if user holds this player) */}
      {masteryData && holdingQty > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">DPC Mastery</span>
              <span className="px-2 py-0.5 rounded-lg bg-[#FFD700]/15 text-[#FFD700] text-[10px] font-black border border-[#FFD700]/25">
                Lv {masteryData.level} — {MASTERY_LEVEL_LABELS[masteryData.level]}
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/30">
              {masteryData.xp} / {masteryData.level < 5 ? MASTERY_XP_THRESHOLDS[masteryData.level] : 'MAX'} XP
            </span>
          </div>
          {masteryData.level < 5 && (
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFD700]/40 to-[#FFD700]/20 transition-all"
                style={{ width: `${Math.min((masteryData.xp / MASTERY_XP_THRESHOLDS[masteryData.level]) * 100, 100)}%` }}
              />
            </div>
          )}
          <div className="flex gap-4 mt-2 text-[10px] text-white/40">
            <span>{masteryData.hold_days}d gehalten</span>
            <span>{masteryData.fantasy_uses}x Fantasy</span>
            <span>{masteryData.content_count}x Content</span>
          </div>
        </div>
      )}

      {/* Sponsor: Player Mid */}
      <SponsorBanner placement="player_mid" />

      {/* Single Column: Tabs + Content */}
      <div className="space-y-4 md:space-y-6">
        <TabBar tabs={TABS.map(tab => ({ ...tab, label: t(tab.label) }))} activeTab={tab} onChange={(id) => setTab(id as Tab)} />

        {tab === 'profil' && (
          <ProfilTab
            player={playerWithOwnership}
            dpcAvailable={dpcAvailable}
            holdingQty={holdingQty}
            holderCount={holderCount}
            gwScores={gwScores}
            userId={user?.id}
            currentGameweek={gwScores[0]?.gameweek ?? 0}
          />
        )}

        {tab === 'markt' && (
          <MarktTab
            player={player}
            trades={trades}
            allSellOrders={allSellOrders}
            tradesLoading={tradesLoading}
            profileMap={profileMap}
            userId={user?.id}
            dpcAvailable={dpcAvailable}
          />
        )}

        {tab === 'statistik' && (
          <StatistikTab player={player} gwScores={gwScores} />
        )}

        {tab === 'community' && (
          <CommunityTab
            playerResearch={playerResearch}
            playerPosts={playerPosts}
            myPostVotes={myPostVotes}
            trades={trades}
            userId={user?.id}
            playerId={playerId}
            playerName={player ? `${player.first} ${player.last}` : ''}
            unlockingId={unlockingId}
            ratingId={ratingId}
            postLoading={postLoading}
            onUnlock={handleResearchUnlock}
            onRate={handleResearchRate}
            onCreatePost={handleCreatePlayerPost}
            onVotePost={handleVotePlayerPost}
            onDeletePost={handleDeletePlayerPost}
          />
        )}
      </div>

      {/* Trading Modal (replaces sidebar + mobile sheet) */}
      <TradingModal
        open={tradingModalOpen}
        onClose={() => setTradingModalOpen(false)}
        player={playerWithOwnership}
        activeIpo={activeIpo ?? null}
        userIpoPurchased={userIpoPurchased}
        balanceCents={balanceCents}
        holdingQty={holdingQty}
        userOrders={userOrders}
        allSellOrders={allSellOrders}
        openBids={openBids}
        userId={user?.id}
        buying={buying}
        ipoBuying={ipoBuying}
        selling={selling}
        cancellingId={cancellingId}
        buyError={buyError}
        buySuccess={buySuccess}
        shared={shared}
        pendingBuyQty={pendingBuyQty}
        onBuy={handleBuy}
        onIpoBuy={handleIpoBuy}
        onSell={handleSell}
        onCancelOrder={handleCancelOrder}
        onConfirmBuy={executeBuy}
        onCancelPendingBuy={() => setPendingBuyQty(null)}
        onShareTrade={handleShareTrade}
        onAcceptBid={handleAcceptBid}
        onOpenOfferModal={() => { setTradingModalOpen(false); setShowOfferModal(true); }}
      />

      {/* Offer Modal */}
      <Modal open={showOfferModal} onClose={() => setShowOfferModal(false)} title="Kaufangebot erstellen" subtitle="Erstelle ein offenes Gebot, das jeder Besitzer annehmen kann.">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Preis pro DPC (BSD)</label>
            <input
              type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)}
              placeholder="z.B. 150" min="1"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-[#FFD700]/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Nachricht (optional)</label>
            <input
              type="text" value={offerMessage} onChange={e => setOfferMessage(e.target.value)}
              placeholder="Nachricht..." maxLength={200}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/30"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowOfferModal(false)} className="flex-1 py-2 text-sm text-white/40 hover:text-white/60">Abbrechen</button>
            <Button onClick={handleCreateOffer} disabled={!offerPrice || offerLoading} className="flex-1">
              {offerLoading ? 'Wird erstellt...' : 'Angebot senden'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sponsor: Player Footer */}
      <SponsorBanner placement="player_footer" />

      {/* Mobile Trading Bar */}
      <MobileTradingBar
        floor={player.prices.floor ?? 0}
        holdingQty={holdingQty}
        isLiquidated={player.isLiquidated}
        onBuyClick={openTrading}
        onSellClick={openTrading}
      />
    </div>
  );
}
