'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useWallet } from '@/components/providers/WalletProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { buyFromMarket, placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { buyFromIpo } from '@/lib/services/ipo';
import { createOffer as createOfferAction, acceptOffer } from '@/lib/services/offers';
import { createPost } from '@/lib/services/posts';
import { formatScout } from '@/lib/services/wallet';
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
  const { setBalanceCents, refreshBalance } = useWallet();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const t = useTranslations('player');
  const tc = useTranslations('common');

  // ─── Refs for synchronous double-submit guard ─
  const buyingRef = useRef(false);
  const ipoBuyingRef = useRef(false);
  const sellingRef = useRef(false);

  // ─── State ──────────────────────────────────
  const [buying, setBuying] = useState(false);
  const [ipoBuying, setIpoBuying] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
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
    if (!userId || !player || buyingRef.current) return;
    buyingRef.current = true;
    setPendingBuyQty(null);
    setBuying(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await buyFromMarket(userId, playerId, quantity);
      if (!result.success) { setBuyError(result.error || t('buyFailed')); }
      else {
        const priceBsd = result.price_per_dpc ? formatScout(result.price_per_dpc) : '?';
        setBuySuccess(t('buySuccess', { quantity, price: priceBsd }));
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        queryClient.setQueryData(['holdings', 'qty', userId, playerId], (old: number | undefined) => (old ?? 0) + quantity);
        invalidateAfterTrade(playerId, userId);
        refreshBalance();
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : tc('unknownError')); }
    finally { buyingRef.current = false; setBuying(false); }
  }, [userId, player, playerId, balanceCents, setBalanceCents, invalidateAfterTrade, queryClient, refreshBalance, t, tc]);

  const handleBuy = useCallback((quantity: number) => {
    if (!userId || !player || player.isLiquidated) return;
    if (userOrders.length > 0) { setPendingBuyQty(quantity); return; }
    executeBuy(quantity);
  }, [userId, player, userOrders, executeBuy]);

  const handleIpoBuy = useCallback(async (quantity: number) => {
    if (!userId || !activeIpo || ipoBuyingRef.current) return;
    ipoBuyingRef.current = true;
    setIpoBuying(true); setBuyError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await buyFromIpo(userId, activeIpo.id, quantity);
      if (!result.success) { setBuyError(result.error || t('ipoBuyFailed')); }
      else {
        const priceBsd = result.price_per_dpc ? formatScout(result.price_per_dpc) : '?';
        setBuySuccess(t('ipoBuySuccess', { quantity, price: priceBsd }));
        setBalanceCents(result.new_balance ?? balanceCents ?? 0);
        queryClient.setQueryData(['holdings', 'qty', userId, playerId], (old: number | undefined) => (old ?? 0) + quantity);
        if (result.user_total_purchased != null) {
          queryClient.setQueryData(['ipos', 'purchases', userId, activeIpo.id], result.user_total_purchased);
        }
        invalidateAfterTrade(playerId, userId);
        refreshBalance();
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : tc('unknownError')); }
    finally { ipoBuyingRef.current = false; setIpoBuying(false); }
  }, [userId, activeIpo, playerId, balanceCents, setBalanceCents, invalidateAfterTrade, queryClient, refreshBalance, t, tc]);

  const handleSell = useCallback(async (quantity: number, priceCents: number) => {
    if (!userId || player?.isLiquidated || sellingRef.current) return;
    sellingRef.current = true;
    setSelling(true); setSellError(null); setBuySuccess(null); setShared(false);
    try {
      const result = await placeSellOrder(userId, playerId, quantity, priceCents);
      if (!result.success) { setSellError(result.error || t('listFailed')); }
      else {
        setBuySuccess(t('listSuccess', { quantity, price: formatScout(priceCents) }));
        invalidateAfterTrade(playerId, userId);
        setSellModalOpen(false);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setSellError(err instanceof Error ? err.message : tc('unknownError')); }
    finally { sellingRef.current = false; setSelling(false); }
  }, [userId, player, playerId, invalidateAfterTrade, t, tc]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (!userId) return;
    setCancellingId(orderId); setBuyError(null);
    try {
      const result = await cancelOrder(userId, orderId);
      if (!result.success) { setBuyError(result.error || t('cancelFailed')); }
      else {
        setBuySuccess(t('orderCancelled'));
        queryClient.setQueryData(qk.orders.byPlayer(playerId), (old: DbOrder[] | undefined) =>
          (old ?? []).filter(o => o.id !== orderId)
        );
        invalidateAfterTrade(playerId, userId);
        setTimeout(() => setBuySuccess(null), 5000);
      }
    } catch (err) { setBuyError(err instanceof Error ? err.message : tc('unknownError')); }
    finally { setCancellingId(null); }
  }, [userId, playerId, invalidateAfterTrade, queryClient, t, tc]);

  const handleCreateOffer = useCallback(async () => {
    if (!userId || !offerPrice) return;
    const priceCents = Math.round(parseFloat(offerPrice) * 100);
    if (priceCents <= 0) { addToast(t('invalidPrice'), 'error'); return; }
    setOfferLoading(true);
    try {
      const result = await createOfferAction({
        senderId: userId, playerId, side: 'buy', priceCents, quantity: 1,
        message: offerMessage.trim() || undefined,
      });
      if (result.success) {
        addToast(t('buyOfferCreated'), 'success');
        setShowOfferModal(false); setOfferPrice(''); setOfferMessage('');
        queryClient.invalidateQueries({ queryKey: ['offers', 'bids', playerId] });
      } else { addToast(result.error ?? tc('unknownError'), 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : tc('unknownError'), 'error'); }
    finally { setOfferLoading(false); }
  }, [userId, offerPrice, offerMessage, playerId, addToast, queryClient, t, tc]);

  const handleAcceptBid = useCallback(async (offerId: string) => {
    if (!userId || acceptingBidId) return;
    setAcceptingBidId(offerId);
    try {
      const result = await acceptOffer(userId, offerId);
      if (result.success) {
        addToast(t('offerAccepted'), 'success');
        invalidateAfterTrade(playerId, userId);
      } else { addToast(result.error ?? tc('unknownError'), 'error'); }
    } catch (e) { addToast(e instanceof Error ? e.message : tc('unknownError'), 'error'); }
    finally { setAcceptingBidId(null); }
  }, [userId, acceptingBidId, playerId, addToast, invalidateAfterTrade, t, tc]);

  const handleShareTrade = useCallback(async () => {
    if (!userId || !player || shared) return;
    try {
      await createPost(userId, playerId, player.club, `Ich habe gerade ${player.first} ${player.last} DPCs gekauft! ${player.pos === 'ATT' ? '\u26BD' : player.pos === 'GK' ? '\uD83E\uDDE4' : '\uD83C\uDFC3'} #Trading`, [player.last.toLowerCase(), player.club.toLowerCase()], 'Trading');
      setShared(true);
      addToast(t('sharedToCommunity'), 'success');
    } catch { addToast(t('shareFailed'), 'error'); }
  }, [userId, player, shared, playerId, addToast, t]);

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
    buyError, sellError, buySuccess, shared,
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
