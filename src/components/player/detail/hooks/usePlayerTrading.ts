'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/components/providers/WalletProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { buyFromMarket, placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { buyFromIpo } from '@/lib/services/ipo';
import { createOffer as createOfferAction, acceptOffer } from '@/lib/services/offers';
import { createPost } from '@/lib/services/posts';
import { formatBsd } from '@/lib/services/wallet';
import { invalidateTradeQueries, invalidatePlayerDetailQueries } from '@/lib/queries/invalidation';
import { qk } from '@/lib/queries/keys';
import type { Player, DbIpo, DbOrder } from '@/types';

interface UsePlayerTradingParams {
  playerId: string;
  player: Player | null;
  userId?: string;
  activeIpo: DbIpo | null;
  allSellOrders: DbOrder[];
  holdingQty: number;
  balanceCents: number | null;
  userIpoPurchased: number;
}

export function usePlayerTrading({
  playerId, player, userId,
  activeIpo, allSellOrders, holdingQty, balanceCents,
  userIpoPurchased,
}: UsePlayerTradingParams) {
  const { setBalanceCents } = useWallet();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // ─── State ──────────────────────────────────
  const [buying, setBuying] = useState(false);
  const [ipoBuying, setIpoBuying] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [pendingBuyQty, setPendingBuyQty] = useState<number | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  // ─── Derived ────────────────────────────────
  const userOrders = useMemo(
    () => allSellOrders.filter(o => o.user_id === userId),
    [allSellOrders, userId]
  );

  const isIPO = activeIpo !== null && activeIpo !== undefined && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  // ─── Invalidation ──────────────────────────
  const invalidateAfterTrade = useCallback((pid: string, uid?: string) => {
    invalidateTradeQueries(pid, uid);
    invalidatePlayerDetailQueries(pid, uid);
    queryClient.invalidateQueries({ queryKey: ['offers', 'bids', pid] });
  }, [queryClient]);

  // ─── Handlers ──────────────────────────────

  const executeBuy = useCallback(async (quantity: number) => {
    if (!userId || !player) return;
    setPendingBuyQty(null);
    setBuying(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await buyFromMarket(userId, playerId, quantity);
      if (!result.success) { setBuyError(result.error || 'Kauf fehlgeschlagen'); }
      else {
        const priceBsd = result.price_per_dpc ? formatBsd(result.price_per_dpc) : '?';
        setBuySuccess(`${quantity} DPC vom Transfermarkt für ${priceBsd} BSD gekauft`);
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        queryClient.setQueryData(['holdings', 'qty', userId, playerId], (old: number | undefined) => (old ?? 0) + quantity);
        invalidateAfterTrade(playerId, userId);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setBuying(false); }
  }, [userId, player, playerId, balanceCents, setBalanceCents, invalidateAfterTrade, queryClient]);

  const handleBuy = useCallback((quantity: number) => {
    if (!userId || !player || player.isLiquidated) return;
    if (userOrders.length > 0) { setPendingBuyQty(quantity); return; }
    executeBuy(quantity);
  }, [userId, player, userOrders, executeBuy]);

  const handleIpoBuy = useCallback(async (quantity: number) => {
    if (!userId || !activeIpo) return;
    setIpoBuying(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await buyFromIpo(userId, activeIpo.id, quantity);
      if (!result.success) { setBuyError(result.error || 'IPO-Kauf fehlgeschlagen'); }
      else {
        const priceBsd = result.price_per_dpc ? formatBsd(result.price_per_dpc) : '?';
        setBuySuccess(`${quantity} DPC per IPO für ${priceBsd} BSD gekauft`);
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        queryClient.setQueryData(['holdings', 'qty', userId, playerId], (old: number | undefined) => (old ?? 0) + quantity);
        if (result.user_total_purchased != null) {
          queryClient.setQueryData(['ipos', 'purchases', userId, activeIpo.id], result.user_total_purchased);
        }
        invalidateAfterTrade(playerId, userId);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setIpoBuying(false); }
  }, [userId, activeIpo, playerId, balanceCents, setBalanceCents, invalidateAfterTrade, queryClient]);

  const handleSell = useCallback(async (quantity: number, priceCents: number) => {
    if (!userId || player?.isLiquidated) return;
    setSelling(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await placeSellOrder(userId, playerId, quantity, priceCents);
      if (!result.success) { setBuyError(result.error || 'Listing fehlgeschlagen'); }
      else {
        setBuySuccess(`${quantity} DPC für ${formatBsd(priceCents)} BSD gelistet`);
        invalidateAfterTrade(playerId, userId);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setSelling(false); }
  }, [userId, player, playerId, invalidateAfterTrade]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (!userId) return;
    setCancellingId(orderId); setBuyError(null);
    try {
      const result = await cancelOrder(userId, orderId);
      if (!result.success) { setBuyError(result.error || 'Stornierung fehlgeschlagen'); }
      else {
        setBuySuccess('Order storniert!');
        queryClient.setQueryData(qk.orders.byPlayer(playerId), (old: DbOrder[] | undefined) =>
          (old ?? []).filter(o => o.id !== orderId)
        );
        invalidateAfterTrade(playerId, userId);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
    finally { setCancellingId(null); }
  }, [userId, playerId, invalidateAfterTrade, queryClient]);

  const handleCreateOffer = useCallback(async () => {
    if (!userId || !offerPrice) return;
    const priceCents = Math.round(parseFloat(offerPrice) * 100);
    if (priceCents <= 0) { addToast('Ungültiger Preis', 'error'); return; }
    setOfferLoading(true);
    try {
      const result = await createOfferAction({
        senderId: userId, playerId, side: 'buy', priceCents, quantity: 1,
        message: offerMessage.trim() || undefined,
      });
      if (result.success) {
        addToast('Kaufangebot erstellt', 'success');
        setShowOfferModal(false); setOfferPrice(''); setOfferMessage('');
        queryClient.invalidateQueries({ queryKey: ['offers', 'bids', playerId] });
      } else { addToast(result.error ?? 'Fehler', 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : 'Fehler', 'error'); }
    finally { setOfferLoading(false); }
  }, [userId, offerPrice, offerMessage, playerId, addToast, queryClient]);

  const handleAcceptBid = useCallback(async (offerId: string) => {
    if (!userId || acceptingBidId) return;
    setAcceptingBidId(offerId);
    try {
      const result = await acceptOffer(userId, offerId);
      if (result.success) {
        addToast('Angebot angenommen', 'success');
        invalidateAfterTrade(playerId, userId);
      } else { addToast(result.error ?? 'Fehler', 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : 'Fehler', 'error'); }
    finally { setAcceptingBidId(null); }
  }, [userId, acceptingBidId, playerId, addToast, invalidateAfterTrade]);

  const handleShareTrade = useCallback(async () => {
    if (!userId || !player || shared) return;
    try {
      await createPost(userId, playerId, player.club, `Ich habe gerade ${player.first} ${player.last} DPCs gekauft! ${player.pos === 'ATT' ? '\u26BD' : player.pos === 'GK' ? '\uD83E\uDDE4' : '\uD83C\uDFC3'} #Trading`, [player.last.toLowerCase(), player.club.toLowerCase()], 'Trading');
      setShared(true);
      addToast('In der Community geteilt!', 'success');
    } catch { addToast('Teilen fehlgeschlagen', 'error'); }
  }, [userId, player, shared, playerId, addToast]);

  const openBuyModal = useCallback(() => setBuyModalOpen(true), []);
  const closeBuyModal = useCallback(() => setBuyModalOpen(false), []);
  const openSellModal = useCallback(() => setSellModalOpen(true), []);
  const closeSellModal = useCallback(() => setSellModalOpen(false), []);
  const openOfferModal = useCallback(() => { setBuyModalOpen(false); setShowOfferModal(true); }, []);
  const closeOfferModal = useCallback(() => setShowOfferModal(false), []);
  const cancelPendingBuy = useCallback(() => setPendingBuyQty(null), []);

  return {
    // State
    buying, ipoBuying, selling, cancellingId,
    buyError, buySuccess, shared,
    pendingBuyQty, buyModalOpen, sellModalOpen,
    showOfferModal, offerPrice, offerMessage, offerLoading,
    acceptingBidId,
    // Setters
    setOfferPrice, setOfferMessage,
    // Derived
    userOrders, isIPO,
    // Handlers
    handleBuy, executeBuy, handleIpoBuy, handleSell,
    handleCancelOrder, handleCreateOffer, handleAcceptBid,
    handleShareTrade, openBuyModal, closeBuyModal,
    openSellModal, closeSellModal,
    openOfferModal, closeOfferModal, cancelPendingBuy,
  };
}
