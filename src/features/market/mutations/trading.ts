'use client';

import { useQueryClient } from '@tanstack/react-query';
import { buyFromMarket, placeBuyOrder, cancelBuyOrder } from '@/lib/services/trading';
import { buyFromIpo } from '@/lib/services/ipo';
import { setWalletBalance, invalidateWallet } from '@/lib/hooks/useWallet';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { useSafeIdempotentMutation } from '@/lib/hooks/useSafeIdempotentMutation';
import { invalidateTradeQueries } from '@/lib/queries/invalidation';
import { qk } from '@/lib/queries/keys';

/**
 * Slice 153a — Ferrari-Refactor der 4 Market-Mutation-Hooks.
 *
 * Ausgangslage (bis Slice 152d): raw `useMutation` + Singleton `queryClient`
 * Import, kein `onMutate`/`onError`, kein Rollback, kein Sentry-Tag.
 *
 * Ferrari-Blueprint: `src/lib/hooks/useToggleFollowClub.ts`
 * - `useSafeMutation` (Slice 151a Primitive) — synchroner Pending-Guard
 * - `useQueryClient()` statt Singleton (P2.2-Konvention, Slice 160 codifiziert)
 * - `onMutate` Snapshot + Optimistic (nur deterministische Felder)
 * - `onError` Rollback aus Snapshot
 * - `onSuccess` Server-Truth-Update (Balance, Invalidates)
 * - `onSettled` pgBouncer-safe `invalidateWallet` (Slice 152c HIGH-1)
 * - `errorTag` fuer Sentry-Observability
 *
 * **errorToast bewusst nicht gesetzt:** Consumer (`useTradeActions.ts`,
 * `BuyOrderModal.tsx`) zeigen bereits inline Error-UI via `mutation.error` /
 * per-call `onError`-Callback. Toast von useSafeMutation + inline-Error
 * waere doppelt angezeigt. Konsolidierung optional in Slice 153b.
 *
 * **Optimistic-Scope bewusst eng:**
 * - Buy/IPO-Buy: nur `['holdings', 'qty', uid, pid]` (quantity deterministisch
 *   aus Call-Args). Wallet-Balance bleibt serverbasiert in `onSuccess`, weil
 *   der price_per_dpc client-side nicht bekannt ist.
 * - Place/Cancel-Buy-Order: kein Optimistic — Order-Escrow ist server-side
 *   transaktional und lokaler Optimistic-Pfad waere irrefuehrend.
 */

// ────────────────────────────────────────────────────────────
// Shared types
// ────────────────────────────────────────────────────────────

type BuyContext = { prevHoldingQty: number | undefined };
type IpoBuyContext = {
  prevHoldingQty: number | undefined;
  prevUserPurchased: number | undefined;
};

// ────────────────────────────────────────────────────────────
// useBuyFromMarket
// ────────────────────────────────────────────────────────────

export function useBuyFromMarket() {
  const qc = useQueryClient();

  return useSafeIdempotentMutation<
    Awaited<ReturnType<typeof buyFromMarket>>,
    Error,
    { userId: string; playerId: string; quantity: number },
    BuyContext
  >({
    idempotencyNamespace: 'market.buy',
    mutationFn: async ({ userId, playerId, quantity }, idempotencyKey) => {
      const result = await buyFromMarket(userId, playerId, quantity, idempotencyKey);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onMutate: async ({ userId, playerId, quantity }) => {
      // Snapshot scalar holding-qty for rollback; cancel only the single key
      // we touch. `qk.holdings.byUser(uid)` (full list) is NOT optimistic'd
      // here — see file-header "Optimistic-Scope".
      const key = ['holdings', 'qty', userId, playerId] as const;
      await qc.cancelQueries({ queryKey: key });
      const prevHoldingQty = qc.getQueryData<number>(key);
      qc.setQueryData<number | undefined>(key, (old) => (old ?? 0) + quantity);
      return { prevHoldingQty };
    },
    onError: (_err, { userId, playerId }, ctx) => {
      // Rollback only the qty scalar. `setWalletBalance` was never called
      // optimistically, so wallet is already consistent.
      // Phantom-Rollback Fix (153a Review Finding #1): wenn snapshot undefined
      // (kein Holding-Row existierte), entfernt `removeQueries` den optimistic-
      // Write — sonst bleibt „3" im Cache bis nächstes invalidate.
      const key = ['holdings', 'qty', userId, playerId] as const;
      if (ctx && ctx.prevHoldingQty !== undefined) {
        qc.setQueryData(key, ctx.prevHoldingQty);
      } else {
        qc.removeQueries({ queryKey: key });
      }
    },
    onSuccess: (result, { playerId, userId }) => {
      // Deterministic server write — pgBouncer Read-After-Write (useWallet.ts:200).
      if (result.new_balance != null) setWalletBalance(qc, userId, result.new_balance);
      invalidateTradeQueries(playerId, userId);
      // Force full-list refetch even when no observer is mounted on /market.
      // Otherwise navigating to /manager?tab=kader shows N-1 players until
      // staleTime triggers a background refetch.
      qc.refetchQueries({ queryKey: qk.holdings.byUser(userId), type: 'all' });
      qc.invalidateQueries({ queryKey: qk.offers.incoming(userId) });
    },
    onSettled: () => {
      // Wallet-invalidate after commit window (pgBouncer-safe) — Slice 152c HIGH-1.
      invalidateWallet(qc);
    },
    errorTag: 'market.buy',
  });
}

// ────────────────────────────────────────────────────────────
// useBuyFromIpo
// ────────────────────────────────────────────────────────────

export function useBuyFromIpo() {
  const qc = useQueryClient();

  return useSafeMutation<
    Awaited<ReturnType<typeof buyFromIpo>>,
    Error,
    { userId: string; ipoId: string; playerId: string; quantity: number },
    IpoBuyContext
  >({
    mutationFn: async ({ userId, ipoId, playerId, quantity }) => {
      const result = await buyFromIpo(userId, ipoId, quantity, playerId);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onMutate: async ({ userId, playerId, ipoId, quantity }) => {
      const qtyKey = ['holdings', 'qty', userId, playerId] as const;
      const purchasedKey = ['ipos', 'purchases', userId, ipoId] as const;
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
    onError: (_err, { userId, playerId, ipoId }, ctx) => {
      // Phantom-Rollback Fix (153a Review Finding #1): removeQueries bei
      // undefined-snapshot, sonst bleibt optimistic-Wert im Cache.
      const qtyKey = ['holdings', 'qty', userId, playerId] as const;
      const purchasedKey = ['ipos', 'purchases', userId, ipoId] as const;
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
    onSuccess: (result, { playerId, userId, ipoId }) => {
      if (result.new_balance != null) setWalletBalance(qc, userId, result.new_balance);
      // Overwrite optimistic purchased-count with server truth if available.
      if (result.user_total_purchased != null) {
        qc.setQueryData(['ipos', 'purchases', userId, ipoId], result.user_total_purchased);
      }
      invalidateTradeQueries(playerId, userId);
      qc.refetchQueries({ queryKey: qk.holdings.byUser(userId), type: 'all' });
      qc.invalidateQueries({ queryKey: qk.ipos.active });
      qc.invalidateQueries({ queryKey: qk.ipos.announced });
      qc.invalidateQueries({ queryKey: qk.ipos.recentlyEnded });
    },
    onSettled: () => {
      invalidateWallet(qc);
    },
    errorTag: 'market.ipoBuy',
  });
}

// ────────────────────────────────────────────────────────────
// usePlaceBuyOrder
// ────────────────────────────────────────────────────────────

export function usePlaceBuyOrder() {
  const qc = useQueryClient();

  return useSafeIdempotentMutation<
    Awaited<ReturnType<typeof placeBuyOrder>>,
    Error,
    { userId: string; playerId: string; quantity: number; maxPriceCents: number }
  >({
    idempotencyNamespace: 'market.placeBuyOrder',
    mutationFn: async ({ userId, playerId, quantity, maxPriceCents }, idempotencyKey) => {
      // Service throws i18n keys directly (see placeBuyOrder JSDoc).
      // Safety-net: if result.success === false slips through, re-throw the
      // (already-key'd) error rather than a raw DE-string.
      const result = await placeBuyOrder(userId, playerId, quantity, maxPriceCents, idempotencyKey);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (_result, { playerId, userId }) => {
      invalidateTradeQueries(playerId, userId);
      qc.invalidateQueries({ queryKey: qk.orders.all });
    },
    onSettled: () => {
      // Escrow locks balance server-side — refresh wallet-cache post-commit.
      invalidateWallet(qc);
    },
    errorTag: 'market.placeBuyOrder',
  });
}

// ────────────────────────────────────────────────────────────
// useCancelBuyOrder
// ────────────────────────────────────────────────────────────

export function useCancelBuyOrder() {
  const qc = useQueryClient();

  return useSafeMutation<
    Awaited<ReturnType<typeof cancelBuyOrder>>,
    Error,
    { userId: string; orderId: string }
  >({
    mutationFn: async ({ userId, orderId }) => {
      const result = await cancelBuyOrder(userId, orderId);
      if (!result.success) throw new Error(result.error || 'generic');
      return result;
    },
    onSuccess: (_result, { userId }) => {
      invalidateTradeQueries('', userId);
      qc.invalidateQueries({ queryKey: qk.orders.all });
    },
    onSettled: () => {
      // Escrow unlocks server-side — refresh wallet-cache post-commit.
      invalidateWallet(qc);
    },
    errorTag: 'market.cancelBuyOrder',
  });
}
