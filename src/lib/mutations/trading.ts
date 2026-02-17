'use client';

import { useMutation } from '@tanstack/react-query';
import { buyFromMarket } from '@/lib/services/trading';
import { useWallet } from '@/components/providers/WalletProvider';
import { invalidateTradeQueries } from '@/lib/queries/invalidation';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';

export function useBuyFromMarket() {
  const { setBalanceCents } = useWallet();
  return useMutation({
    mutationFn: async ({ userId, playerId, quantity }: { userId: string; playerId: string; quantity: number }) => {
      const result = await buyFromMarket(userId, playerId, quantity);
      if (!result.success) throw new Error(result.error || 'Kauf fehlgeschlagen');
      return result;
    },
    onSuccess: (result, { playerId, userId }) => {
      if (result.new_balance != null) setBalanceCents(result.new_balance);
      invalidateTradeQueries(playerId, userId);
      queryClient.invalidateQueries({ queryKey: qk.offers.incoming(userId) });
    },
  });
}
