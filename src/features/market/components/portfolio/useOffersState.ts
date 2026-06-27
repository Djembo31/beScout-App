import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useErrorToast } from '@/lib/hooks/useErrorToast';
import { invalidateWallet } from '@/lib/hooks/useWallet';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import {
  getIncomingOffers, getOutgoingOffers, getOpenBids, getOfferHistory,
  acceptOffer, rejectOffer, counterOffer, cancelOffer,
} from '@/lib/services/offers';
import { centsToBsd } from '@/lib/services/players';
import { invalidateTradeQueries } from '@/lib/queries';
import type { OfferWithDetails } from '@/types';

/**
 * Slice 157 — Ferrari-Refactor (analog trading.ts 153a + useEventActions 156).
 *
 * 4 Handler als useSafeMutation:
 * - `acceptMut`  → acceptOffer   (Money-Path: atomic trade + wallet-deduct)
 * - `rejectMut`  → rejectOffer   (no-money, data-only)
 * - `counterMut` → counterOffer  (Money-Path: re-escrow bei counter-bid)
 * - `cancelMut`  → cancelOffer   (Money-Path: unlock escrow bei outgoing)
 *
 * Blueprint: `src/features/market/mutations/trading.ts` (153a).
 * - `useSafeMutation` synchroner Pending-Guard (Slice 151a Primitive).
 * - `useQueryClient()` statt Singleton (P2.2-Konvention, Slice 160 codifiziert).
 * - Kein Optimistic-Update (cross-user-transfer zu komplex fuer deterministische
 *   local-cache-update; server-truth via `loadOffers()` reicht).
 * - `onSettled: invalidateWallet(qc)` bei allen 4 Mutations (pgBouncer-safe).
 * - `errorTag`: Sentry-Observability `market.offerAccept/Reject/Counter/Cancel`.
 *
 * Consumer-API unveraendert: `{ actionId, countering, handleAccept,
 * handleReject, handleCounter, handleCancel, ... }`. `actionId` + `countering`
 * derived aus mutation.isPending + mutation.variables.
 *
 * Wrapper-Methoden bleiben async + void-return (kein throw nach aussen) —
 * `onError` handhabt Toast/Show-Error, Wrapper schluckt throw aus mutateAsync.
 */

export type SubTab = 'incoming' | 'outgoing' | 'open' | 'history';

export function useOffersState() {
  const { user } = useUser();
  const { addToast } = useToast();
  const { showError } = useErrorToast();
  const t = useTranslations('offers');
  const qc = useQueryClient();

  const [subTab, setSubTab] = useState<SubTab>('incoming');
  const [offers, setOffers] = useState<OfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [counterModal, setCounterModal] = useState<OfferWithDetails | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  const uid = user?.id;

  const loadOffers = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      let data: OfferWithDetails[] = [];
      if (subTab === 'incoming') data = await getIncomingOffers(uid);
      else if (subTab === 'outgoing') data = await getOutgoingOffers(uid);
      else if (subTab === 'open') data = await getOpenBids({ ownedByUserId: uid });
      else data = await getOfferHistory(uid);
      setOffers(data);
    } catch (e) {
      console.error('[loadOffers]', e);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [uid, subTab]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  // ── Accept Offer ──────────────────────────────────────────
  const acceptMut = useSafeMutation<
    Awaited<ReturnType<typeof acceptOffer>>,
    Error,
    { offerId: string }
  >({
    mutationFn: async ({ offerId }) => {
      if (!uid) throw new Error('notAuthenticated');
      const result = await acceptOffer(uid, offerId);
      if (!result.success) throw new Error(result.error ?? 'generic');
      return result;
    },
    onSuccess: (_result, { offerId }) => {
      if (!uid) return;
      addToast(t('offerAccepted'), 'success');
      const offer = offers.find((o) => o.id === offerId);
      if (offer) invalidateTradeQueries(offer.player_id, uid);
      loadOffers();
    },
    onError: (err) => {
      showError(err.message || err);
    },
    onSettled: () => {
      // pgBouncer-safe Wallet-Invalidate — acceptOffer deducted Buyer's wallet.
      invalidateWallet(qc);
    },
    errorTag: 'market.offerAccept',
  });

  // ── Reject Offer ──────────────────────────────────────────
  const rejectMut = useSafeMutation<
    Awaited<ReturnType<typeof rejectOffer>>,
    Error,
    { offerId: string }
  >({
    mutationFn: async ({ offerId }) => {
      if (!uid) throw new Error('notAuthenticated');
      const result = await rejectOffer(uid, offerId);
      if (!result.success) throw new Error(result.error ?? 'generic');
      return result;
    },
    onSuccess: () => {
      addToast(t('offerRejected'), 'success');
      loadOffers();
    },
    onError: (err) => {
      showError(err.message || err);
    },
    onSettled: () => {
      // rejectOffer selbst moves kein Geld, aber Sender-side-escrow release
      // kann impliziert sein (je nach Offer-Typ). Defensive invalidate.
      invalidateWallet(qc);
    },
    errorTag: 'market.offerReject',
  });

  // ── Counter Offer ─────────────────────────────────────────
  const counterMut = useSafeMutation<
    Awaited<ReturnType<typeof counterOffer>>,
    Error,
    { offerId: string; priceCents: number }
  >({
    mutationFn: async ({ offerId, priceCents }) => {
      if (!uid) throw new Error('notAuthenticated');
      const result = await counterOffer(uid, offerId, priceCents);
      if (!result.success) throw new Error(result.error ?? 'generic');
      return result;
    },
    onSuccess: () => {
      addToast(t('counterCreated'), 'success');
      setCounterModal(null);
      setCounterPrice('');
      loadOffers();
    },
    onError: (err) => {
      showError(err.message || err);
    },
    onSettled: () => {
      // counter creates new offer + may lock escrow on buy-side → refresh wallet.
      invalidateWallet(qc);
    },
    errorTag: 'market.offerCounter',
  });

  // ── Cancel Offer ──────────────────────────────────────────
  const cancelMut = useSafeMutation<
    Awaited<ReturnType<typeof cancelOffer>>,
    Error,
    { offerId: string }
  >({
    mutationFn: async ({ offerId }) => {
      if (!uid) throw new Error('notAuthenticated');
      const result = await cancelOffer(uid, offerId);
      if (!result.success) throw new Error(result.error ?? 'generic');
      return result;
    },
    onSuccess: () => {
      addToast(t('offerCancelled'), 'success');
      loadOffers();
    },
    onError: (err) => {
      showError(err.message || err);
    },
    onSettled: () => {
      // cancel unlocks outgoing-offer escrow → wallet available-balance changes.
      invalidateWallet(qc);
    },
    errorTag: 'market.offerCancel',
  });

  // ────────────────────────────────────────────────────────────
  // Wrapper-Methoden — Consumer-API Kompat (async + void return).
  // ────────────────────────────────────────────────────────────

  const handleAccept = useCallback(
    async (offerId: string) => {
      if (!uid) return;
      if (acceptMut.isPending) return;
      try {
        await acceptMut.mutateAsync({ offerId });
      } catch {
        // onError handled.
      }
    },
    [acceptMut, uid],
  );

  const handleReject = useCallback(
    async (offerId: string) => {
      if (!uid) return;
      if (rejectMut.isPending) return;
      try {
        await rejectMut.mutateAsync({ offerId });
      } catch {
        // onError handled.
      }
    },
    [rejectMut, uid],
  );

  const handleCounter = useCallback(async () => {
    if (!uid || !counterModal || !counterPrice) return;
    if (counterMut.isPending) return;
    const priceCents = Math.round(parseFloat(counterPrice) * 100);
    if (priceCents <= 0) {
      addToast(t('invalidPrice'), 'error');
      return;
    }
    try {
      await counterMut.mutateAsync({ offerId: counterModal.id, priceCents });
    } catch {
      // onError handled.
    }
  }, [counterMut, uid, counterModal, counterPrice, addToast, t]);

  const handleCancel = useCallback(
    async (offerId: string) => {
      if (!uid) return;
      if (cancelMut.isPending) return;
      try {
        await cancelMut.mutateAsync({ offerId });
      } catch {
        // onError handled.
      }
    },
    [cancelMut, uid],
  );

  const openCounterModal = useCallback((offer: OfferWithDetails) => {
    setCounterModal(offer);
    setCounterPrice(String(centsToBsd(offer.price)));
  }, []);

  const closeCounterModal = useCallback(() => {
    setCounterModal(null);
    setCounterPrice('');
  }, []);

  // Derived: actionId = offerId der gerade pendenden accept/reject/cancel
  // Mutation. countering = counterMut.isPending.
  const actionId =
    (acceptMut.isPending && acceptMut.variables?.offerId) ||
    (rejectMut.isPending && rejectMut.variables?.offerId) ||
    (cancelMut.isPending && cancelMut.variables?.offerId) ||
    null;
  const countering = counterMut.isPending;

  return {
    uid, subTab, setSubTab,
    offers, loading,
    showCreate, setShowCreate,
    counterModal, counterPrice, setCounterPrice,
    actionId, countering,
    handleAccept, handleReject, handleCounter, handleCancel,
    openCounterModal, closeCounterModal,
  };
}
