'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { setWalletBalance, invalidateWallet } from '@/lib/hooks/useWallet';
import { useToast } from '@/components/providers/ToastProvider';
import {
  buyFromMarket, buyFromOrder, placeSellOrder, cancelOrder,
} from '@/lib/services/trading';
import { buyFromIpo } from '@/lib/services/ipo';
import { createOffer as createOfferAction, acceptOffer } from '@/lib/services/offers';
import { createPost } from '@/lib/services/posts';
import { formatScout } from '@/lib/services/wallet';
import {
  invalidateTradeQueries, invalidatePlayerDetailQueries,
} from '@/lib/queries/invalidation';
import { qk } from '@/lib/queries/keys';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { useSafeIdempotentMutation } from '@/lib/hooks/useSafeIdempotentMutation';
import { logSilentCatch } from '@/lib/observability/silentRejects';
import type { Player, DbIpo, PublicOrder } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';

/**
 * Slice 153b — Ferrari-Refactor usePlayerTrading (Player-Detail-Page).
 *
 * Ausgangslage (bis Slice 152d): 350-Zeilen Hook mit 7 async Handlern,
 * useRef-Mutexen (buyingRef/ipoBuyingRef/sellingRef), manuellen
 * setBuying/setIpoBuying/setSelling-States, manueller setBuyError/sellError,
 * manueller Optimistic ohne Rollback.
 *
 * Ferrari-Blueprint: `src/lib/hooks/useToggleFollowClub.ts` + 153a
 * `src/features/market/mutations/trading.ts`.
 *
 * Aenderungen:
 * - 6 interne `useSafeMutation`-Instanzen (buyMut, ipoBuyMut, sellMut,
 *   cancelMut, createOfferMut, acceptBidMut). `handleShareTrade` bleibt
 *   regular async (nicht Data-Mutation, Fire-and-forget Post-Creation).
 * - `useRef`-Mutexe geloescht — `safeTrigger` short-circuitet synchron.
 * - Manuelles `setBuying/setIpoBuying/setSelling` entfernt — abgeleitet von
 *   `mutation.isPending`. `offerLoading` ebenso.
 * - Manuelles `setBuyError/setSellError` entfernt — abgeleitet von
 *   `mutation.error` via `resolveErrorMessage`.
 * - Optimistic in `onMutate` mit Phantom-Rollback-Pattern (Slice 153a
 *   Review Finding #1): `removeQueries` bei undefined-Snapshot.
 * - `onSettled` pgBouncer-safe `invalidateWallet` (Slice 152c HIGH-1).
 * - `errorTag` je Money-Mutation (player.buy / player.ipoBuy / player.sell /
 *   player.cancelOrder / player.createOffer / player.acceptBid).
 *
 * Public-API 1:1 kompatibel zu Vorgaenger — `PlayerContent.tsx` unveraendert.
 *
 * **Bewusst behalten:**
 * - `cancellingId` / `acceptingBidId` als useState (trackt WELCHE id pending
 *   ist, nicht das boolean-isPending — Consumer filtert pro-Row).
 * - `buySuccess` / `shared` / Modal-States als useState (UI-Flow, nicht
 *   Mutation-Status).
 * - `optimisticallyAddHolding` Helper (splice in Liste, mehr als qty-Scalar).
 * - `resolveErrorMessage` Helper (i18n-Key-to-String).
 */

interface UsePlayerTradingParams {
  playerId: string;
  player: Player | null;
  userId?: string;
  activeIpo: DbIpo | null;
  allSellOrders: PublicOrder[];
  holdingQty: number;
  balanceCents: number | null;
  userIpoPurchased: number;
}

type BuyContext = { prevHoldingQty: number | undefined };
type IpoBuyContext = {
  prevHoldingQty: number | undefined;
  prevUserPurchased: number | undefined;
};

export function usePlayerTrading({
  playerId, player, userId, activeIpo, allSellOrders,
}: UsePlayerTradingParams) {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const t = useTranslations('player');
  const tc = useTranslations('common');
  const te = useTranslations('errors');

  // ─── UI / Flow State ──────────────────────────
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [pendingBuyQty, setPendingBuyQty] = useState<number | null>(null);
  const [pendingBuyOrderId, setPendingBuyOrderId] = useState<string | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  // ─── Derived ───────────────────────────────────
  const userOrders = useMemo(
    () => allSellOrders.filter(o => o.is_own),
    [allSellOrders]
  );

  const isIPO = activeIpo != null && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  // ─── i18n-Key Resolver ─────────────────────────
  // Services throw i18n keys like 'insufficientBalance' — raw keys must never
  // leak into UI (see common-errors.md: i18n-Key-Leak via Service-Errors).
  const resolveErrorMessage = useCallback((raw: unknown): string => {
    const key = mapErrorToKey(normalizeError(raw));
    try {
      return te(key);
    } catch (err) {
      // Missing-i18n-key — never let silent swallow hide the drift.
      // Review 153b Finding #12 / common-errors.md §1.
      logSilentCatch('player.resolveErrorMessage', err);
      return tc('unknownError');
    }
  }, [te, tc]);

  // ─── Invalidation Helper ────────────────────────
  const invalidateAfterTrade = useCallback((pid: string, uid?: string) => {
    invalidateTradeQueries(pid, uid);
    invalidatePlayerDetailQueries(pid, uid);
    qc.invalidateQueries({ queryKey: qk.offers.bids(pid) });
    // Force-refetch full holdings list even when no observer on this page.
    // Otherwise /market / /manager?tab=kader stays stale until staleTime.
    if (uid) {
      qc.refetchQueries({ queryKey: qk.holdings.byUser(uid), type: 'all' });
    }
  }, [qc]);

  // ─── Optimistic holdings-list patch ─────────
  // After a successful buy, immediately splice the new/updated holding into
  // the full qk.holdings.byUser(uid) cache so the Bestand tab shows the
  // player instantly. Prevents the "did I actually buy it?" confidence gap.
  const optimisticallyAddHolding = useCallback((
    uid: string,
    quantity: number,
    priceCents: number,
  ) => {
    if (!player) return;
    const now = new Date().toISOString();
    const playerFields: HoldingWithPlayer['player'] = {
      first_name: player.first,
      last_name: player.last,
      position: player.pos,
      club: player.club,
      club_id: player.clubId ?? null,
      floor_price: player.prices.floor ?? player.prices.lastTrade,
      price_change_24h: player.prices.change24h,
      perf_l5: player.perf.l5,
      perf_l15: player.perf.l15,
      matches: player.stats.matches,
      goals: player.stats.goals,
      assists: player.stats.assists,
      status: player.status,
      shirt_number: player.ticket,
      age: player.age,
      image_url: player.imageUrl ?? null,
    };
    qc.setQueryData<HoldingWithPlayer[] | undefined>(
      qk.holdings.byUser(uid),
      (old) => {
        if (!old) return old;
        const existing = old.find(h => h.player_id === playerId);
        if (existing) {
          const newQty = existing.quantity + quantity;
          const newAvg = Math.round(
            ((existing.avg_buy_price * existing.quantity) + (priceCents * quantity)) / newQty
          );
          return old.map(h => h.player_id === playerId
            ? { ...h, quantity: newQty, avg_buy_price: newAvg, updated_at: now }
            : h);
        }
        const synth: HoldingWithPlayer = {
          id: `optimistic-${playerId}-${Date.now()}`,
          user_id: uid,
          player_id: playerId,
          quantity,
          avg_buy_price: priceCents,
          created_at: now,
          updated_at: now,
          player: playerFields,
        };
        return [synth, ...old];
      }
    );
  }, [player, playerId, qc]);

  // ─── Optimistic holdings-qty Helper (scalar, with phantom-rollback) ──
  const optimisticHoldingsQtyBegin = useCallback(
    async (uid: string, quantity: number): Promise<BuyContext> => {
      const key = ['holdings', 'qty', uid, playerId] as const;
      await qc.cancelQueries({ queryKey: key });
      const prevHoldingQty = qc.getQueryData<number>(key);
      qc.setQueryData<number | undefined>(key, (old) => (old ?? 0) + quantity);
      return { prevHoldingQty };
    },
    [qc, playerId],
  );

  const optimisticHoldingsQtyRollback = useCallback(
    (uid: string, ctx: BuyContext | undefined) => {
      const key = ['holdings', 'qty', uid, playerId] as const;
      if (ctx && ctx.prevHoldingQty !== undefined) {
        qc.setQueryData(key, ctx.prevHoldingQty);
      } else {
        qc.removeQueries({ queryKey: key });
      }
    },
    [qc, playerId],
  );

  // ═══════════════════════════════════════════════
  // MUTATION 1: Buy (Market + Order-Path)
  // ═══════════════════════════════════════════════
  const buyMut = useSafeIdempotentMutation<
    Awaited<ReturnType<typeof buyFromMarket>>,
    Error,
    { quantity: number; orderId?: string | null },
    BuyContext
  >({
    idempotencyNamespace: 'player.buy',
    mutationFn: async ({ quantity, orderId }, idempotencyKey) => {
      if (!userId) throw new Error('no_user');
      const result = orderId
        ? await buyFromOrder(userId, orderId, quantity, playerId, idempotencyKey)
        : await buyFromMarket(userId, playerId, quantity, idempotencyKey);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onMutate: async ({ quantity }) => {
      if (!userId) return { prevHoldingQty: undefined };
      // Reset residual success state from prior attempt. `shared` belongs to
      // buySuccess-lifecycle and is reset in `openBuyModal` (Review 153b #3).
      setBuySuccess(null);
      return await optimisticHoldingsQtyBegin(userId, quantity);
    },
    onError: (_err, _vars, ctx) => {
      if (!userId) return;
      optimisticHoldingsQtyRollback(userId, ctx);
    },
    onSuccess: (result, { quantity }) => {
      if (!userId) return;
      // Slice 405: Buy-Hook routet `orderId ? buy_from_order : buy_player_sc` — die RPCs
      // liefern divergente Return-Shapes (buy_player_sc: new_balance/price_per_dpc;
      // buy_from_order: buyer_new_balance/price, Migration 358:131/269). onSuccess MUSS
      // beide normalisieren, sonst zeigt der Order-Kauf Preis "?" + kein optimistisches
      // Wallet-Update + Holding-Preis 0 (errors-frontend.md S404; Markt-Pfad in 404 gelöst).
      const priceCents = result.price_per_dpc ?? result.price;
      const newBalance = result.new_balance ?? result.buyer_new_balance;
      const priceBsd = priceCents ? formatScout(priceCents) : '?';
      setBuySuccess(t('buySuccess', { quantity, price: priceBsd }));
      if (newBalance != null) setWalletBalance(qc, userId, newBalance);
      optimisticallyAddHolding(userId, quantity, priceCents ?? 0);
      invalidateAfterTrade(playerId, userId);
      setTimeout(() => setBuySuccess(null), 5000);
    },
    onSettled: () => {
      // pgBouncer-safe wallet invalidate (152c HIGH-1).
      invalidateWallet(qc);
    },
    errorTag: 'player.buy',
  });

  // ═══════════════════════════════════════════════
  // MUTATION 2: IPO-Buy
  // ═══════════════════════════════════════════════
  const ipoBuyMut = useSafeIdempotentMutation<
    Awaited<ReturnType<typeof buyFromIpo>>,
    Error,
    { quantity: number },
    IpoBuyContext
  >({
    // Slice 403: Erstverkauf jetzt idempotenz-geschuetzt wie order-buy/sell daneben
    idempotencyNamespace: 'player.ipoBuy',
    mutationFn: async ({ quantity }, idempotencyKey) => {
      if (!userId) throw new Error('no_user');
      if (!activeIpo) throw new Error('generic');
      const result = await buyFromIpo(userId, activeIpo.id, quantity, playerId, idempotencyKey);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onMutate: async ({ quantity }) => {
      if (!userId || !activeIpo) return { prevHoldingQty: undefined, prevUserPurchased: undefined };
      setBuySuccess(null);
      const qtyKey = ['holdings', 'qty', userId, playerId] as const;
      const purchasedKey = ['ipos', 'purchases', userId, activeIpo.id] as const;
      await Promise.all([
        qc.cancelQueries({ queryKey: qtyKey }),
        qc.cancelQueries({ queryKey: purchasedKey }),
      ]);
      const prevHoldingQty = qc.getQueryData<number>(qtyKey);
      const prevUserPurchased = qc.getQueryData<number>(purchasedKey);
      qc.setQueryData<number | undefined>(qtyKey, (old) => (old ?? 0) + quantity);
      qc.setQueryData<number | undefined>(purchasedKey, (old) => (old ?? 0) + quantity);
      return { prevHoldingQty, prevUserPurchased };
    },
    onError: (_err, _vars, ctx) => {
      if (!userId || !activeIpo) return;
      const qtyKey = ['holdings', 'qty', userId, playerId] as const;
      const purchasedKey = ['ipos', 'purchases', userId, activeIpo.id] as const;
      if (ctx && ctx.prevHoldingQty !== undefined) {
        qc.setQueryData(qtyKey, ctx.prevHoldingQty);
      } else {
        qc.removeQueries({ queryKey: qtyKey });
      }
      if (ctx && ctx.prevUserPurchased !== undefined) {
        qc.setQueryData(purchasedKey, ctx.prevUserPurchased);
      } else {
        qc.removeQueries({ queryKey: purchasedKey });
      }
    },
    onSuccess: (result, { quantity }) => {
      if (!userId || !activeIpo) return;
      const priceBsd = result.price_per_dpc ? formatScout(result.price_per_dpc) : '?';
      if (result.new_balance != null) setWalletBalance(qc, userId, result.new_balance);
      optimisticallyAddHolding(userId, quantity, result.price_per_dpc ?? 0);
      if (result.user_total_purchased != null) {
        qc.setQueryData(['ipos', 'purchases', userId, activeIpo.id], result.user_total_purchased);
      }
      invalidateAfterTrade(playerId, userId);
      setBuySuccess(t('ipoBuySuccess', { quantity, price: priceBsd }));
      addToast(t('ipoBuySuccess', { quantity, price: priceBsd }), 'success');
    },
    onSettled: () => {
      invalidateWallet(qc);
    },
    errorTag: 'player.ipoBuy',
  });

  // ═══════════════════════════════════════════════
  // MUTATION 3: Sell
  // ═══════════════════════════════════════════════
  const sellMut = useSafeIdempotentMutation<
    Awaited<ReturnType<typeof placeSellOrder>>,
    Error,
    { quantity: number; priceCents: number }
  >({
    idempotencyNamespace: 'player.sell',
    mutationFn: async ({ quantity, priceCents }, idempotencyKey) => {
      if (!userId) throw new Error('no_user');
      const result = await placeSellOrder(userId, playerId, quantity, priceCents, idempotencyKey);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (_result, { quantity, priceCents }) => {
      if (!userId) return;
      setBuySuccess(t('listSuccess', { quantity, price: formatScout(priceCents) }));
      invalidateAfterTrade(playerId, userId);
      setSellModalOpen(false);
      setTimeout(() => setBuySuccess(null), 5000);
    },
    onSettled: () => {
      invalidateWallet(qc);
    },
    errorTag: 'player.sell',
  });

  // ═══════════════════════════════════════════════
  // MUTATION 4: Cancel-Order
  // ═══════════════════════════════════════════════
  const cancelMut = useSafeMutation<
    Awaited<ReturnType<typeof cancelOrder>>,
    Error,
    { orderId: string }
  >({
    mutationFn: async ({ orderId }) => {
      if (!userId) throw new Error('no_user');
      const result = await cancelOrder(userId, orderId);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (_result, { orderId }) => {
      if (!userId) return;
      setBuySuccess(t('orderCancelled'));
      qc.setQueryData(qk.orders.byPlayer(playerId), (old: PublicOrder[] | undefined) =>
        (old ?? []).filter(o => o.id !== orderId),
      );
      invalidateAfterTrade(playerId, userId);
      setTimeout(() => setBuySuccess(null), 5000);
    },
    onError: (err) => {
      // Cancel fails (e.g. already-filled race). Consumer (SellModal/
      // HoldingsSection) hat keinen inline-error-Slot fuer Cancel —
      // Toast ist die einzige UI-Feedback-Oberflaeche. Review 153b #2.
      addToast(resolveErrorMessage(err), 'error');
    },
    onSettled: () => {
      setCancellingId(null);
      invalidateWallet(qc);
    },
    errorTag: 'player.cancelOrder',
  });

  // ═══════════════════════════════════════════════
  // MUTATION 5: Create-Offer
  // ═══════════════════════════════════════════════
  const createOfferMut = useSafeMutation<
    Awaited<ReturnType<typeof createOfferAction>>,
    Error,
    { priceCents: number; message?: string }
  >({
    mutationFn: async ({ priceCents, message }) => {
      if (!userId) throw new Error('no_user');
      const result = await createOfferAction({
        senderId: userId, playerId, side: 'buy',
        priceCents, quantity: 1, message,
      });
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: () => {
      addToast(t('buyOfferCreated'), 'success');
      setShowOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
      qc.invalidateQueries({ queryKey: qk.offers.bids(playerId) });
    },
    onError: (err) => {
      addToast(resolveErrorMessage(err), 'error');
    },
    errorTag: 'player.createOffer',
  });

  // ═══════════════════════════════════════════════
  // MUTATION 6: Accept-Bid
  // ═══════════════════════════════════════════════
  const acceptBidMut = useSafeMutation<
    Awaited<ReturnType<typeof acceptOffer>>,
    Error,
    { offerId: string }
  >({
    mutationFn: async ({ offerId }) => {
      if (!userId) throw new Error('no_user');
      const result = await acceptOffer(userId, offerId);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: () => {
      if (!userId) return;
      addToast(t('offerAccepted'), 'success');
      invalidateAfterTrade(playerId, userId);
    },
    onError: (err) => {
      addToast(resolveErrorMessage(err), 'error');
    },
    onSettled: () => {
      setAcceptingBidId(null);
    },
    errorTag: 'player.acceptBid',
  });

  // ─── Derived Error-States (i18n-resolved) ──────
  // buyError deckt NUR Buy + IPO-Buy ab (beide landen in BuyModal's inline-
  // error). Cancel-Error hat eigenen Toast-Pfad (Review 153b #2).
  const buyError = (() => {
    if (buyMut.isError && buyMut.error) return resolveErrorMessage(buyMut.error);
    if (ipoBuyMut.isError && ipoBuyMut.error) return resolveErrorMessage(ipoBuyMut.error);
    return null;
  })();
  const sellError = sellMut.isError && sellMut.error ? resolveErrorMessage(sellMut.error) : null;

  // ─── Handler Wrappers (preserve public API) ────

  const executeBuy = useCallback((quantity: number, orderId?: string | null) => {
    if (!userId || !player) return;
    buyMut.safeTrigger({ quantity, orderId });
    setPendingBuyQty(null);
    setPendingBuyOrderId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, player, buyMut.safeTrigger]);

  const handleBuy = useCallback((quantity: number, orderId?: string) => {
    if (!userId || !player || player.isLiquidated) return;
    // Two-phase: if user has own sell-orders → ask for confirmation before
    // buying (might be buying against own order).
    if (userOrders.length > 0) {
      setPendingBuyQty(quantity);
      setPendingBuyOrderId(orderId ?? null);
      return;
    }
    executeBuy(quantity, orderId);
  }, [userId, player, userOrders, executeBuy]);

  const handleIpoBuy = useCallback((quantity: number) => {
    if (!userId || !activeIpo) return;
    ipoBuyMut.safeTrigger({ quantity });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeIpo, ipoBuyMut.safeTrigger]);

  const handleSell = useCallback((quantity: number, priceCents: number) => {
    if (!userId || player?.isLiquidated) return;
    sellMut.safeTrigger({ quantity, priceCents });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, player, sellMut.safeTrigger]);

  const handleCancelOrder = useCallback((orderId: string) => {
    // mut.isPending is the authoritative guard (Review 153b #5). Without it,
    // 2× rapid-cancel on different orders would: trigger #1, setCancellingId
    // to #2 (stale), then on settled clear to null — UI shows neither.
    if (!userId || cancelMut.isPending) return;
    setCancellingId(orderId);
    cancelMut.safeTrigger({ orderId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cancelMut.isPending, cancelMut.safeTrigger]);

  const handleCreateOffer = useCallback(() => {
    if (!userId || !offerPrice) return;
    const priceCents = Math.round(parseFloat(offerPrice) * 100);
    if (priceCents <= 0) { addToast(t('invalidPrice'), 'error'); return; }
    createOfferMut.safeTrigger({ priceCents, message: offerMessage.trim() || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, offerPrice, offerMessage, addToast, t, createOfferMut.safeTrigger]);

  const handleAcceptBid = useCallback((offerId: string) => {
    // mut.isPending authoritative guard (Review 153b #4). Local `acceptingBidId`
    // is async setState — not reliable as guard against rapid-fire calls.
    if (!userId || acceptBidMut.isPending) return;
    setAcceptingBidId(offerId);
    acceptBidMut.safeTrigger({ offerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, acceptBidMut.isPending, acceptBidMut.safeTrigger]);

  const handleShareTrade = useCallback(async () => {
    if (!userId || !player || shared) return;
    try {
      await createPost(
        userId, playerId, player.club,
        `Ich habe gerade ${player.first} ${player.last} Scout Cards gekauft! ${player.pos === 'ATT' ? '⚽' : player.pos === 'GK' ? '🧤' : '🏃'} #Trading`,
        [player.last.toLowerCase(), player.club.toLowerCase()],
        'Trading',
      );
      setShared(true);
      addToast(t('sharedToCommunity'), 'success');
    } catch (err) {
      // Fire-and-forget: post-creation is graceful-degrade, but silent-swallow
      // hides infra drift (RLS, schema). Review 153b #1 — trading.md § "NIEMALS
      // leere .catch(() => {})" + common-errors.md §1 / §5.
      logSilentCatch('player.shareTrade', err);
      addToast(t('shareFailed'), 'error');
    }
  }, [userId, player, shared, playerId, addToast, t]);

  // ─── Modal Handlers ────────────────────────────
  const openBuyModal = useCallback(() => {
    // Fresh open: clear residual success/shared/error state so BuyModal's
    // success-state effect only fires for a NEW buy. Without this, re-opening
    // within the 5s buySuccess setTimeout window auto-closes with the previous
    // confirmation. `shared` also reset here (Review 153b #3).
    setBuySuccess(null);
    setShared(false);
    buyMut.reset();
    ipoBuyMut.reset();
    setBuyModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyMut.reset, ipoBuyMut.reset]);
  const closeBuyModal = useCallback(() => setBuyModalOpen(false), []);
  const openSellModal = useCallback(() => {
    // Reset stale sellError from prior failed-attempt (Review 153b #7).
    sellMut.reset();
    setSellModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellMut.reset]);
  const closeSellModal = useCallback(() => setSellModalOpen(false), []);
  const openOfferModal = useCallback(() => { setBuyModalOpen(false); setShowOfferModal(true); }, []);
  const closeOfferModal = useCallback(() => setShowOfferModal(false), []);
  const cancelPendingBuy = useCallback(() => { setPendingBuyQty(null); setPendingBuyOrderId(null); }, []);

  return {
    // State (derived or local)
    buying: buyMut.isPending,
    ipoBuying: ipoBuyMut.isPending,
    selling: sellMut.isPending,
    cancellingId,
    buyError, sellError, buySuccess, shared,
    pendingBuyQty, pendingBuyOrderId,
    buyModalOpen, sellModalOpen, showOfferModal,
    offerPrice, offerMessage,
    offerLoading: createOfferMut.isPending,
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
