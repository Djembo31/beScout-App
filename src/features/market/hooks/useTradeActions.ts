'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Player, DbIpo } from '@/types';
import { placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { useBuyFromMarket, useBuyFromIpo } from '@/features/market/mutations/trading';
import { invalidateTradeQueries } from '@/lib/queries';
import { useWallet } from '@/components/providers/WalletProvider';

type BuySource = 'market' | 'ipo';
type PendingBuy = { playerId: string; source: BuySource } | null;
type ActionResult = { success: boolean; error?: string };

export function useTradeActions(userId: string | undefined, ipoList: DbIpo[]) {
  const { balanceCents } = useWallet();
  const t = useTranslations('market');
  const tc = useTranslations('common');

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
  const buyError = buyIsError ? (buyMutError?.message ?? tc('unknownError')) : ipoBuyIsError ? (ipoBuyMutError?.message ?? tc('unknownError')) : null;

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
    balanceBeforeBuyRef.current = balanceCents ?? 0;
    if (pendingBuy.source === 'market') {
      doBuy({ userId, playerId: pendingBuy.playerId, quantity: qty });
    } else {
      const ipoId = ipoIdMap.get(pendingBuy.playerId);
      if (!ipoId) return;
      doIpoBuy({ userId, ipoId, playerId: pendingBuy.playerId, quantity: qty });
    }
    setPendingBuy(null);
  }, [userId, pendingBuy, doBuy, doIpoBuy, ipoIdMap, balanceCents]);

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
