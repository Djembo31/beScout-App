import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useErrorToast } from '@/lib/hooks/useErrorToast';
import { useWallet } from '@/components/providers/WalletProvider';
import {
  getIncomingOffers, getOutgoingOffers, getOpenBids, getOfferHistory,
  acceptOffer, rejectOffer, counterOffer, cancelOffer,
} from '@/lib/services/offers';
import { centsToBsd } from '@/lib/services/players';
import { invalidateTradeQueries } from '@/lib/queries';
import type { OfferWithDetails } from '@/types';

export type SubTab = 'incoming' | 'outgoing' | 'open' | 'history';

export function useOffersState() {
  const { user } = useUser();
  const { addToast } = useToast();
  const { showError } = useErrorToast();
  const { refreshBalance } = useWallet();
  const [subTab, setSubTab] = useState<SubTab>('incoming');
  const [offers, setOffers] = useState<OfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [counterModal, setCounterModal] = useState<OfferWithDetails | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);

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

  const handleAccept = useCallback(async (offerId: string) => {
    if (!uid || actionId) return;
    setActionId(offerId);
    try {
      const result = await acceptOffer(uid, offerId);
      if (result.success) {
        addToast('offerAccepted', 'success');
        const offer = offers.find(o => o.id === offerId);
        if (offer) {
          refreshBalance();
          invalidateTradeQueries(offer.player_id, uid);
        }
        loadOffers();
      } else {
        showError(result.error ?? 'generic');
      }
    } catch (e) {
      showError(e);
    } finally {
      setActionId(null);
    }
  }, [uid, actionId, offers, addToast, showError, refreshBalance, loadOffers]);

  const handleReject = useCallback(async (offerId: string) => {
    if (!uid || actionId) return;
    setActionId(offerId);
    try {
      const result = await rejectOffer(uid, offerId);
      if (result.success) {
        addToast('offerRejected', 'success');
        loadOffers();
      } else {
        showError(result.error ?? 'generic');
      }
    } catch (e) {
      showError(e);
    } finally {
      setActionId(null);
    }
  }, [uid, actionId, addToast, showError, loadOffers]);

  const handleCounter = useCallback(async () => {
    if (!uid || !counterModal || !counterPrice || countering) return;
    const priceCents = Math.round(parseFloat(counterPrice) * 100);
    if (priceCents <= 0) { addToast('invalidPrice', 'error'); return; }
    setCountering(true);
    try {
      const result = await counterOffer(uid, counterModal.id, priceCents);
      if (result.success) {
        addToast('counterCreated', 'success');
        setCounterModal(null);
        setCounterPrice('');
        loadOffers();
      } else {
        showError(result.error ?? 'generic');
      }
    } catch (e) {
      showError(e);
    } finally {
      setCountering(false);
    }
  }, [uid, counterModal, counterPrice, countering, addToast, showError, loadOffers]);

  const handleCancel = useCallback(async (offerId: string) => {
    if (!uid || actionId) return;
    setActionId(offerId);
    try {
      const result = await cancelOffer(uid, offerId);
      if (result.success) {
        addToast('offerCancelled', 'success');
        loadOffers();
      } else {
        showError(result.error ?? 'generic');
      }
    } catch (e) {
      showError(e);
    } finally {
      setActionId(null);
    }
  }, [uid, actionId, addToast, showError, loadOffers]);

  const openCounterModal = useCallback((offer: OfferWithDetails) => {
    setCounterModal(offer);
    setCounterPrice(String(centsToBsd(offer.price)));
  }, []);

  const closeCounterModal = useCallback(() => {
    setCounterModal(null);
    setCounterPrice('');
  }, []);

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
