'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button, ErrorState, Modal, TabBar } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { getResearchPosts, unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import type { ResearchPostWithAuthor } from '@/types';
import type { Player, DbIpo } from '@/types';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getPlayerById, dbToPlayer, centsToBsd } from '@/lib/services/players';
import { getHoldingQty, getPlayerHolderCount, formatBsd } from '@/lib/services/wallet';
import { useWallet } from '@/components/providers/WalletProvider';
import { buyFromMarket, placeSellOrder, cancelOrder, getSellOrders, getPlayerTrades } from '@/lib/services/trading';
import { getIpoForPlayer, getUserIpoPurchases, buyFromIpo } from '@/lib/services/ipo';
import { getProfilesByIds } from '@/lib/services/profiles';
import { invalidateTradeData, withTimeout } from '@/lib/cache';
import { val } from '@/lib/settledHelpers';
import { getPlayerGameweekScores } from '@/lib/services/scoring';
import type { PlayerGameweekScore } from '@/lib/services/scoring';
import { getPbtForPlayer } from '@/lib/services/pbt';
import { getLiquidationEvent } from '@/lib/services/liquidation';
import { getOpenBids, createOffer as createOfferAction, acceptOffer } from '@/lib/services/offers';
import type { OfferWithDetails } from '@/types';
import type { DbOrder, DbTrade, DbPbtTreasury, DbLiquidationEvent } from '@/types';

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
  { id: 'profil', label: 'Profil' },
  { id: 'markt', label: 'Markt' },
  { id: 'statistik', label: 'Statistik' },
  { id: 'community', label: 'Community' },
];

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export default function PlayerContent({ playerId }: { playerId: string }) {
  const { user } = useUser();
  const { balanceCents, setBalanceCents } = useWallet();
  const { addToast } = useToast();

  // ─── State ──────────────────────────────
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [holdingQty, setHoldingQty] = useState(0);
  const [holderCount, setHolderCount] = useState(0);
  const [dpcAvailable, setDpcAvailable] = useState(0);
  const [buying, setBuying] = useState(false);
  const [activeIpo, setActiveIpo] = useState<DbIpo | null>(null);
  const [userIpoPurchased, setUserIpoPurchased] = useState(0);
  const [ipoBuying, setIpoBuying] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [userOrders, setUserOrders] = useState<DbOrder[]>([]);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [tab, setTab] = useState<Tab>('profil');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [trades, setTrades] = useState<DbTrade[]>([]);
  const [allSellOrders, setAllSellOrders] = useState<DbOrder[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { handle: string; display_name: string | null }>>({});
  const [gwScores, setGwScores] = useState<PlayerGameweekScore[]>([]);
  const [priceAlert, setPriceAlert] = useState<{ target: number; dir: 'above' | 'below' } | null>(null);
  const [pbtTreasury, setPbtTreasury] = useState<DbPbtTreasury | null>(null);
  const [liquidationEvent, setLiquidationEvent] = useState<DbLiquidationEvent | null>(null);
  const [playerResearch, setPlayerResearch] = useState<ResearchPostWithAuthor[]>([]);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [openBids, setOpenBids] = useState<OfferWithDetails[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [pendingBuyQty, setPendingBuyQty] = useState<number | null>(null);
  const [tradingModalOpen, setTradingModalOpen] = useState(false);

  // ─── Helpers ────────────────────────────

  const loadProfiles = async (tradeList: DbTrade[], orderList: DbOrder[]) => {
    const userIds: string[] = [];
    for (const t of tradeList) {
      if (t.buyer_id) userIds.push(t.buyer_id);
      if (t.seller_id) userIds.push(t.seller_id);
    }
    for (const o of orderList) {
      if (o.user_id) userIds.push(o.user_id);
    }
    if (userIds.length > 0) {
      const map = await getProfilesByIds(userIds);
      setProfileMap(map);
    }
  };

  const refreshOrdersAndTrades = async () => {
    const [allOrders, playerTrades] = await Promise.all([
      getSellOrders(playerId),
      getPlayerTrades(playerId, 50),
    ]);
    setAllSellOrders(allOrders);
    if (user) setUserOrders(allOrders.filter((o) => o.user_id === user.id));
    setTrades(playerTrades);
    await loadProfiles(playerTrades, allOrders);
  };

  // ─── Data Loading ───────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setDataError(false);
      resolveExpiredResearch().catch(() => {});
      try {
        const currentUserId = user?.id;
        const results = await withTimeout(Promise.allSettled([
          getPlayerById(playerId),
          getIpoForPlayer(playerId),
          getPlayerGameweekScores(playerId),
          getPbtForPlayer(playerId),
          getResearchPosts({ playerId, currentUserId }),
          getLiquidationEvent(playerId),
        ]), 10000);
        if (cancelled) return;
        const dbPlayer = val(results[0], null);
        if (!dbPlayer) {
          if (results[0].status === 'rejected') setDataError(true);
          setLoading(false);
          return;
        }
        setPlayer(dbToPlayer(dbPlayer));
        setDpcAvailable(dbPlayer.dpc_available);
        setActiveIpo(val(results[1], null));
        setGwScores(val(results[2], []));
        setPbtTreasury(val(results[3], null));
        setPlayerResearch(val(results[4], []));
        setLiquidationEvent(val(results[5], null));
      } catch {
        if (!cancelled) setDataError(true);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [playerId, addToast, retryCount]);

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

  // Load user-specific data
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function loadUserData() {
      setTradesLoading(true);
      try {
        const userResults = await withTimeout(Promise.allSettled([
          getHoldingQty(uid, playerId),
          getSellOrders(playerId),
          getPlayerTrades(playerId, 50),
          getPlayerHolderCount(playerId),
        ]), 10000);
        const qty = val(userResults[0], 0);
        const allOrders = val(userResults[1], []);
        const playerTrades = val(userResults[2], []);
        const holders = val(userResults[3], 0);
        if (!cancelled) {
          setHoldingQty(qty);
          setHolderCount(holders);
          setAllSellOrders(allOrders);
          setUserOrders(allOrders.filter((o) => o.user_id === uid));
          setTrades(playerTrades);
          const userIds: string[] = [];
          for (const t of playerTrades) { if (t.buyer_id) userIds.push(t.buyer_id); if (t.seller_id) userIds.push(t.seller_id); }
          for (const o of allOrders) { if (o.user_id) userIds.push(o.user_id); }
          if (userIds.length > 0) { const map = await getProfilesByIds(userIds); if (!cancelled) setProfileMap(map); }
        }
        if (activeIpo) {
          const purchased = await getUserIpoPurchases(uid, activeIpo.id);
          if (!cancelled) setUserIpoPurchased(purchased);
        }
      } catch { /* non-blocking */ }
      if (!cancelled) setTradesLoading(false);
    }
    loadUserData();
    return () => { cancelled = true; };
  }, [user, playerId, activeIpo]);

  // Open bids
  useEffect(() => {
    getOpenBids(playerId).then(setOpenBids).catch(() => {});
  }, [playerId]);

  // ─── Derived Data ───────────────────────

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

  const isIPO = activeIpo !== null && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  // ─── Handlers ───────────────────────────

  const handleBuy = (quantity: number) => {
    if (!user || !player || player.isLiquidated) return;
    if (userOrders.length > 0) { setPendingBuyQty(quantity); return; }
    executeBuy(quantity);
  };

  const executeBuy = async (quantity: number) => {
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
        setHoldingQty((prev) => prev + quantity);
        invalidateTradeData(playerId, user.id);
        await refreshOrdersAndTrades();
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setBuying(false); }
  };

  const handleIpoBuy = async (quantity: number) => {
    if (!user || !activeIpo) return;
    setIpoBuying(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await buyFromIpo(user.id, activeIpo.id, quantity);
      if (!result.success) { setBuyError(result.error || 'IPO-Kauf fehlgeschlagen'); }
      else {
        const priceBsd = result.price_per_dpc ? formatBsd(result.price_per_dpc) : '?';
        setBuySuccess(`${quantity} DPC per IPO für ${priceBsd} BSD gekauft`);
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        setHoldingQty((prev) => prev + quantity);
        setUserIpoPurchased(result.user_total_purchased ?? userIpoPurchased + quantity);
        invalidateTradeData(playerId, user.id);
        const playerTrades = await getPlayerTrades(playerId, 50);
        setTrades(playerTrades);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setIpoBuying(false); }
  };

  const handleSell = async (quantity: number, priceCents: number) => {
    if (!user || player?.isLiquidated) return;
    setSelling(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await placeSellOrder(user.id, playerId, quantity, priceCents);
      if (!result.success) { setBuyError(result.error || 'Listing fehlgeschlagen'); }
      else {
        setBuySuccess(`${quantity} DPC für ${formatBsd(priceCents)} BSD gelistet`);
        invalidateTradeData(playerId, user.id);
        const allOrders = await getSellOrders(playerId);
        setAllSellOrders(allOrders);
        setUserOrders(allOrders.filter((o) => o.user_id === user.id));
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setSelling(false); }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    setCancellingId(orderId); setBuyError(null);
    try {
      const result = await cancelOrder(user.id, orderId);
      if (!result.success) { setBuyError(result.error || 'Stornierung fehlgeschlagen'); }
      else {
        setBuySuccess('Order storniert!');
        const remaining = allSellOrders.filter((o) => o.id !== orderId);
        setAllSellOrders(remaining);
        setUserOrders(remaining.filter((o) => o.user_id === user.id));
        if (player && remaining.length > 0) {
          const newFloor = Math.min(...remaining.map((o) => o.price)) / 100;
          setPlayer({ ...player, prices: { ...player.prices, floor: newFloor } });
        }
        invalidateTradeData(playerId, user.id);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setCancellingId(null); }
  };

  const handleCreateOffer = async () => {
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
        getOpenBids(playerId).then(setOpenBids).catch(() => {});
      } else { addToast(result.error ?? 'Fehler', 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : 'Fehler', 'error'); }
    finally { setOfferLoading(false); }
  };

  const handleAcceptBid = async (offerId: string) => {
    if (!user) return;
    try {
      const result = await acceptOffer(user.id, offerId);
      if (result.success) {
        addToast('Angebot angenommen', 'success');
        getOpenBids(playerId).then(setOpenBids).catch(() => {});
        invalidateTradeData(playerId, user.id);
        refreshOrdersAndTrades();
      } else { addToast(result.error ?? 'Fehler', 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : 'Fehler', 'error'); }
  };

  const handleShareTrade = async () => {
    if (!user || !player || shared) return;
    try {
      const p = player;
      const { createPost } = await import('@/lib/services/posts');
      await createPost(user.id, playerId, p.club, `Ich habe gerade ${p.first} ${p.last} DPCs gekauft! ${p.pos === 'ATT' ? '\u26BD' : p.pos === 'GK' ? '\uD83E\uDDE4' : '\uD83C\uDFC3'} #Trading`, [p.last.toLowerCase(), p.club.toLowerCase()], 'Trading');
      setShared(true);
      addToast('In der Community geteilt!', 'success');
    } catch { addToast('Teilen fehlgeschlagen', 'error'); }
  };

  const handleShare = async () => {
    if (!player) return;
    const url = window.location.href;
    const text = `${player.first} ${player.last} auf BeScout — ${fmtBSD(centsToBsd(player.prices.floor ?? 0))} BSD`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      addToast('Link kopiert!', 'success');
    }
  };

  const handleSetPriceAlert = (target: number) => {
    if (!player) return;
    const currentBsd = centsToBsd(player.prices.floor ?? 0);
    const dir = target < currentBsd ? 'below' : 'above';
    const alerts = loadPriceAlerts();
    alerts[playerId] = { target, dir };
    savePriceAlerts(alerts);
    setPriceAlert({ target, dir });
    addToast(`Preis-Alert gesetzt: ${dir === 'below' ? '\u2264' : '\u2265'} ${fmtBSD(target)} BSD`, 'success');
  };

  const handleRemovePriceAlert = () => {
    const alerts = loadPriceAlerts();
    delete alerts[playerId];
    savePriceAlerts(alerts);
    setPriceAlert(null);
  };

  const handleResearchUnlock = async (id: string) => {
    if (!user || unlockingId) return;
    setUnlockingId(id);
    try {
      const result = await unlockResearch(user.id, id);
      if (result.success) {
        const updated = await getResearchPosts({ playerId, currentUserId: user.id });
        setPlayerResearch(updated);
      }
    } catch {} finally { setUnlockingId(null); }
  };

  const handleResearchRate = async (id: string, rating: number) => {
    if (!user || ratingId) return;
    setRatingId(id);
    try {
      const result = await rateResearch(user.id, id, rating);
      if (result.success) {
        setPlayerResearch(prev => prev.map(p =>
          p.id === id ? { ...p, avg_rating: result.avg_rating ?? p.avg_rating, ratings_count: result.ratings_count ?? p.ratings_count, user_rating: result.user_rating ?? p.user_rating } : p
        ));
      }
    } catch {} finally { setRatingId(null); }
  };

  const openTrading = () => setTradingModalOpen(true);

  // ─── Loading / Error / Not Found ────────

  if (loading) return <PlayerDetailSkeleton />;

  if (dataError) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <ErrorState onRetry={() => setRetryCount((c) => c + 1)} />
      </div>
    );
  }

  if (!player || !playerWithOwnership) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <XCircle className="w-12 h-12 text-white/20 mb-4" />
        <div className="text-white/50 mb-2">Spieler nicht gefunden</div>
        <Link href="/market">
          <Button variant="outline">Zurück zum Markt</Button>
        </Link>
      </div>
    );
  }

  // ─── Render ─────────────────────────────

  return (
    <div className="max-w-[900px] mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Liquidation Alert (above Hero) */}
      {player.isLiquidated && (
        <LiquidationAlert liquidationEvent={liquidationEvent} />
      )}

      {/* Hero (full-width, identity-focused) */}
      <PlayerHero
        player={player}
        isIPO={isIPO}
        activeIpo={activeIpo}
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

      {/* Single Column: Tabs + Content */}
      <div className="space-y-4 md:space-y-6">
        <TabBar tabs={TABS} activeTab={tab} onChange={(id) => setTab(id as Tab)} />

        {tab === 'profil' && (
          <ProfilTab
            player={playerWithOwnership}
            dpcAvailable={dpcAvailable}
            holdingQty={holdingQty}
            holderCount={holderCount}
            gwScores={gwScores}
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
            trades={trades}
            userId={user?.id}
            unlockingId={unlockingId}
            ratingId={ratingId}
            onUnlock={handleResearchUnlock}
            onRate={handleResearchRate}
          />
        )}
      </div>

      {/* Trading Modal (replaces sidebar + mobile sheet) */}
      <TradingModal
        open={tradingModalOpen}
        onClose={() => setTradingModalOpen(false)}
        player={playerWithOwnership}
        activeIpo={activeIpo}
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
