'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Player, DbIpo } from '@/types';
import { placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { useBuyFromMarket, useBuyFromIpo } from '@/features/market/mutations/trading';
import { invalidateTradeQueries } from '@/lib/queries';
import { useWallet } from '@/components/providers/WalletProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';

type BuySource = 'market' | 'ipo';
type PendingBuy = { playerId: string; source: BuySource } | null;
type ActionResult = { success: boolean; error?: string };

export function useTradeActions(userId: string | undefined, ipoList: DbIpo[]) {
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const t = useTranslations('market');
  const tc = useTranslations('common');
  const te = useTranslations('errors');

  // ── Buy state ──
  const [pendingBuy, setPendingBuy] = useState<PendingBuy>(null);
  const balanceBeforeBuyRef = useRef(0);
  const [buyOrderPlayer, setBuyOrderPlayer] = useState<Player | null>(null);

  // ── Buy mutations ──
  const buyMut = useBuyFromMarket();
  const { mutate: doBuy, isPending: buyPending, isSuccess: buyIsSuccess, isError: buyIsError, error: buyMutError, variables: buyVars, reset: resetBuy } = buyMut;

  const ipoBuyMut = useBuyFromIpo();
  const { mutate: doIpoBuy, isPending: ipoBuyPending, isSuccess: ipoBuyIsSuccess, isError: ipoBuyIsError, error: ipoBuyMutError, variables: ipoBuyVars, reset: resetIpoBuy } = ipoBuyMut;

  // ── Derived buy state ──
  const buyingId = (buyPending ? (buyVars?.playerId ?? null) : null) || (ipoBuyPending ? (ipoBuyVars?.playerId ?? null) : null);
  const buySuccess = buyIsSuccess ? t('dpcBought', { count: buyVars?.quantity ?? 1 }) : ipoBuyIsSuccess ? t('dpcBought', { count: ipoBuyVars?.quantity ?? 1 }) : null;
  const lastBoughtId = buyIsSuccess ? (buyVars?.playerId ?? null) : ipoBuyIsSuccess ? (ipoBuyVars?.playerId ?? null) : null;
  // Resolve i18n-key from mutation error. Services throw keys like 'insufficientBalance';
  // mapErrorToKey passes them through, or maps raw messages to known keys, or 'generic'.
  const buyError = (() => {
    const raw = buyIsError ? buyMutError : ipoBuyIsError ? ipoBuyMutError : null;
    if (!raw) return null;
    const key = mapErrorToKey(normalizeError(raw));
    // te(key) always resolves because KNOWN_KEYS + 'generic' guarantee a match; fallback is defensive only.
    try {
      return te(key);
    } catch {
      return tc('unknownError');
    }
  })();

  // ── Success toast ──
  useEffect(() => {
    if (!buyIsSuccess && !ipoBuyIsSuccess) return;
    const qty = buyIsSuccess ? (buyVars?.quantity ?? 1) : (ipoBuyVars?.quantity ?? 1);
    addToast(t('dpcBought', { count: qty }), 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyIsSuccess, ipoBuyIsSuccess]);

  // ── Error auto-dismiss ──
  useEffect(() => {
    if (!buyIsError && !ipoBuyIsError) return;
    const reset = buyIsError ? resetBuy : resetIpoBuy;
    const timer = setTimeout(reset, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyIsError, ipoBuyIsError]);

  // ── IPO ID lookup ──
  const ipoIdMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const ipo of ipoList) m.set(ipo.player_id, ipo.id);
    return m;
  }, [ipoList]);

  // ── Handlers ──
  const handleBuy = useCallback((playerId: string) => {
    if (!userId) return;
    setPendingBuy({ playerId, source: 'market' });
  }, [userId]);

  const handleIpoBuy = useCallback((playerId: string) => {
    if (!userId) return;
    setPendingBuy({ playerId, source: 'ipo' });
  }, [userId]);

  const executeBuy = useCallback((qty: number) => {
    if (!userId || !pendingBuy) return;
    // Parallel-Mutation-Guard: prevent double-submit if a buy is already in flight
    if (buyPending || ipoBuyPending) return;
    balanceBeforeBuyRef.current = balanceCents ?? 0;
    setPendingBuy(null);
    if (pendingBuy.source === 'market') {
      doBuy({ userId, playerId: pendingBuy.playerId, quantity: qty });
    } else {
      const ipoId = ipoIdMap.get(pendingBuy.playerId);
      if (!ipoId) return;
      doIpoBuy({ userId, ipoId, playerId: pendingBuy.playerId, quantity: qty });
    }
  }, [userId, pendingBuy, buyPending, ipoBuyPending, doBuy, doIpoBuy, ipoIdMap, balanceCents]);

  const handleSell = useCallback(async (playerId: string, quantity: number, priceCents: number): Promise<ActionResult> => {
    if (!userId) return { success: false, error: t('notLoggedIn') };
    try {
      const result = await placeSellOrder(userId, playerId, quantity, priceCents);
      if (!result.success) return { success: false, error: result.error || t('listingFailed') };
      invalidateTradeQueries(playerId, userId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : tc('unknownError') };
    }
  }, [userId, t, tc]);

  const handleCancelOrder = useCallback(async (orderId: string): Promise<ActionResult> => {
    if (!userId) return { success: false, error: t('notLoggedIn') };
    try {
      const result = await cancelOrder(userId, orderId);
      if (!result.success) return { success: false, error: result.error || t('cancelFailed') };
      invalidateTradeQueries('', userId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : tc('unknownError') };
    }
  }, [userId, t, tc]);

  return {
    pendingBuy, setPendingBuy, executeBuy,
    buyingId, buySuccess, lastBoughtId, buyError,
    buyPending, ipoBuyPending,
    buyIsSuccess, ipoBuyIsSuccess, buyVars, ipoBuyVars,
    resetBuy, resetIpoBuy,
    balanceBeforeBuyRef,
    handleBuy, handleIpoBuy, handleSell, handleCancelOrder,
    buyOrderPlayer, setBuyOrderPlayer,
  };
}
