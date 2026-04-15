'use client';

import { useMutation } from '@tanstack/react-query';
import { buyFromMarket, placeBuyOrder, cancelBuyOrder } from '@/lib/services/trading';
import { buyFromIpo } from '@/lib/services/ipo';
import { useWallet } from '@/components/providers/WalletProvider';
import { invalidateTradeQueries } from '@/lib/queries/invalidation';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';

export function useBuyFromMarket() {
  const { setBalanceCents, refreshBalance } = useWallet();
  return useMutation({
    mutationFn: async ({ userId, playerId, quantity }: { userId: string; playerId: string; quantity: number }) => {
      const result = await buyFromMarket(userId, playerId, quantity);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (result, { playerId, userId }) => {
      if (result.new_balance != null) setBalanceCents(result.new_balance);
      refreshBalance();
      invalidateTradeQueries(playerId, userId);
      // Force-refetch the full holdings list even if no observer is mounted
      // on Market. Otherwise navigating to /manager?tab=kader briefly shows
      // N-1 players until staleTime triggers a background refetch.
      queryClient.refetchQueries({ queryKey: qk.holdings.byUser(userId), type: 'all' });
      queryClient.invalidateQueries({ queryKey: qk.offers.incoming(userId) });
    },
  });
}

export function useBuyFromIpo() {
  const { setBalanceCents, refreshBalance } = useWallet();
  return useMutation({
    mutationFn: async ({ userId, ipoId, playerId, quantity }: { userId: string; ipoId: string; playerId: string; quantity: number }) => {
      const result = await buyFromIpo(userId, ipoId, quantity, playerId);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (result, { playerId, userId }) => {
      if (result.new_balance != null) setBalanceCents(result.new_balance);
      refreshBalance();
      invalidateTradeQueries(playerId, userId);
      // FIX (XC-04): force-refetch holdings even if no observer is mounted so
      // Manager Kader (navigated-to after IPO-buy) sees the new player
      // immediately instead of N-1 until staleTime expires.
      queryClient.refetchQueries({ queryKey: qk.holdings.byUser(userId), type: 'all' });
      queryClient.invalidateQueries({ queryKey: qk.ipos.active });
      queryClient.invalidateQueries({ queryKey: qk.ipos.announced });
      queryClient.invalidateQueries({ queryKey: qk.ipos.recentlyEnded });
    },
  });
}

export function usePlaceBuyOrder() {
  const { refreshBalance } = useWallet();
  return useMutation({
    mutationFn: async ({ userId, playerId, quantity, maxPriceCents }: {
      userId: string; playerId: string; quantity: number; maxPriceCents: number;
    }) => {
      // Service throws i18n keys directly (see placeBuyOrder JSDoc).
      // Safety-net: if result.success === false slips through, re-throw the
      // (already-key'd) error rather than a raw DE-string.
      const result = await placeBuyOrder(userId, playerId, quantity, maxPriceCents);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (_result, { playerId, userId }) => {
      refreshBalance();
      invalidateTradeQueries(playerId, userId);
      queryClient.invalidateQueries({ queryKey: qk.orders.all });
    },
  });
}

export function useCancelBuyOrder() {
  const { refreshBalance } = useWallet();
  return useMutation({
    mutationFn: async ({ userId, orderId }: { userId: string; orderId: string }) => {
      const result = await cancelBuyOrder(userId, orderId);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (_result, { userId }) => {
      refreshBalance();
      invalidateTradeQueries('', userId);
      queryClient.invalidateQueries({ queryKey: qk.orders.all });
    },
  });
}
