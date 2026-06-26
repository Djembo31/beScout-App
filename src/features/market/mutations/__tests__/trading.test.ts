/**
 * Slice 153a — Tests fuer die 4 trading.ts Ferrari-Hooks.
 *
 * Pro Hook geprueft:
 * - mutationFn ruft den korrekten Service mit den richtigen Args
 * - onMutate schreibt Optimistic-State (wo applicable) + snapshot
 * - onError rollbackt Optimistic aus snapshot
 * - onSuccess schreibt Server-Truth (setWalletBalance) + invalidates
 * - onSettled ruft invalidateWallet (pgBouncer-safe timing)
 * - errorTag wird an logSilentCatch weitergereicht
 *
 * Ferrari-Blueprint Referenz: `src/lib/hooks/useToggleFollowClub.ts`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Service Mocks (hoisted)
// ============================================
const buyFromMarketMock = vi.fn();
const buyFromOrderMock = vi.fn();
const buyFromIpoMock = vi.fn();
const placeBuyOrderMock = vi.fn();
const cancelBuyOrderMock = vi.fn();
const setWalletBalanceMock = vi.fn();
const invalidateWalletMock = vi.fn();
const invalidateTradeQueriesMock = vi.fn();
const addToastMock = vi.fn();
const logSilentCatchMock = vi.fn();

vi.mock('@/lib/services/trading', () => ({
  buyFromMarket: (...a: unknown[]) => buyFromMarketMock(...a),
  buyFromOrder: (...a: unknown[]) => buyFromOrderMock(...a),
  placeBuyOrder: (...a: unknown[]) => placeBuyOrderMock(...a),
  cancelBuyOrder: (...a: unknown[]) => cancelBuyOrderMock(...a),
}));

vi.mock('@/lib/services/ipo', () => ({
  buyFromIpo: (...a: unknown[]) => buyFromIpoMock(...a),
}));

vi.mock('@/lib/hooks/useWallet', () => ({
  setWalletBalance: (...a: unknown[]) => setWalletBalanceMock(...a),
  invalidateWallet: (...a: unknown[]) => invalidateWalletMock(...a),
}));

vi.mock('@/lib/queries/invalidation', () => ({
  invalidateTradeQueries: (...a: unknown[]) => invalidateTradeQueriesMock(...a),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => logSilentCatchMock(tag, err),
}));

// ============================================
// Imports AFTER mocks
// ============================================
import {
  useBuyFromMarket,
  useBuyFromIpo,
  usePlaceBuyOrder,
  useCancelBuyOrder,
} from '../trading';

// ============================================
// Helpers
// ============================================
function makeClient() {
  // gcTime must be > 0 — otherwise setQueryData without observer is GC'd
  // immediately and our optimistic-update assertions see undefined.
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 60_000 },
      mutations: { retry: false },
    },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// ============================================
// Tests
// ============================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────────
// useBuyFromMarket
// ───────────────────────────────────────────────────
describe('useBuyFromMarket (Ferrari-Refactor)', () => {
  const vars = { userId: 'u1', playerId: 'p1', quantity: 3 };

  it('calls buyFromMarket service and runs success-path on happy outcome', async () => {
    buyFromMarketMock.mockResolvedValue({ success: true, new_balance: 420000, price_per_dpc: 15000 });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(buyFromMarketMock).toHaveBeenCalledWith('u1', 'p1', 3, expect.stringMatching(/^market\.buy:/));
    expect(setWalletBalanceMock).toHaveBeenCalledWith(qc, 'u1', 420000);
    expect(invalidateTradeQueriesMock).toHaveBeenCalledWith('p1', 'u1');
  });

  // Slice 404: order-gebundene Pipeline.
  it('routes to buyFromOrder when an orderId is given (order-bound buy)', async () => {
    buyFromOrderMock.mockResolvedValue({ success: true, buyer_new_balance: 99000, price: 11000 });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate({ ...vars, orderId: 'o-1' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // buy_from_order(buyerId, orderId, qty, playerId, key) — order-bound, deterministic price
    expect(buyFromOrderMock).toHaveBeenCalledWith('u1', 'o-1', 3, 'p1', expect.stringMatching(/^market\.buy:/));
    expect(buyFromMarketMock).not.toHaveBeenCalled();
    // Shape-Norm: buyer_new_balance wird wie new_balance behandelt
    expect(setWalletBalanceMock).toHaveBeenCalledWith(qc, 'u1', 99000);
  });

  it('falls back to buyFromMarket when orderId is null', async () => {
    buyFromMarketMock.mockResolvedValue({ success: true, new_balance: 1, price_per_dpc: 1 });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate({ ...vars, orderId: null }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(buyFromMarketMock).toHaveBeenCalledWith('u1', 'p1', 3, expect.stringMatching(/^market\.buy:/));
    expect(buyFromOrderMock).not.toHaveBeenCalled();
  });

  it('optimistically increments holdings-qty in onMutate', async () => {
    buyFromMarketMock.mockImplementation(
      () => new Promise(() => { /* never resolve — inspect mid-flight state */ }),
    );
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 2);
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    act(() => { result.current.mutate(vars); });

    await waitFor(() =>
      expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(5),
    );
  });

  it('rolls back optimistic holdings-qty on server error', async () => {
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'insufficientBalance' });
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 4);
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(4);
    expect(setWalletBalanceMock).not.toHaveBeenCalled();
  });

  it('removes phantom-optimistic when no prev snapshot exists (Finding #1 fix)', async () => {
    // Scenario: no Holding-Row yet for this player. onMutate writes optimistic
    // "3", onError rollback must NOT leave "3" in cache.
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    // Deliberately DO NOT pre-set ['holdings', 'qty', 'u1', 'p1'].
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Must be undefined again (key removed), NOT 3.
    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBeUndefined();
  });

  it('calls invalidateWallet in onSettled (both success and error)', async () => {
    buyFromMarketMock.mockResolvedValue({ success: true, new_balance: 1 });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateWalletMock).toHaveBeenCalledWith(qc);

    invalidateWalletMock.mockClear();
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'boom' });
    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateWalletMock).toHaveBeenCalledWith(qc);
  });

  it('tags error with "market.buy" for Sentry observability', async () => {
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(logSilentCatchMock).toHaveBeenCalledWith('market.buy', expect.any(Error));
  });

  it('does NOT auto-toast (errorToast intentionally omitted — consumer renders inline)', async () => {
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(addToastMock).not.toHaveBeenCalled();
  });

  it('safeTrigger short-circuits while a buy is in flight', async () => {
    buyFromMarketMock.mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ success: true, new_balance: 1 }), 50),
      ),
    );
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromMarket(), { wrapper: wrapperFor(qc) });

    act(() => { result.current.safeTrigger(vars); });
    // Wait for the observer to reflect isPending before attempting the
    // second trigger — otherwise the closure still sees isPending=false.
    await waitFor(() => expect(result.current.isPending).toBe(true));
    act(() => { result.current.safeTrigger(vars); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buyFromMarketMock).toHaveBeenCalledTimes(1);
  });
});

// ───────────────────────────────────────────────────
// useBuyFromIpo
// ───────────────────────────────────────────────────
describe('useBuyFromIpo (Ferrari-Refactor)', () => {
  const vars = { userId: 'u1', ipoId: 'ipo-1', playerId: 'p1', quantity: 2 };

  it('calls buyFromIpo with reordered args (userId, ipoId, quantity, playerId)', async () => {
    buyFromIpoMock.mockResolvedValue({ success: true, new_balance: 100, user_total_purchased: 5 });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromIpo(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Slice 403: idempotente Mutation reicht generierten Key als 5. Arg durch
    expect(buyFromIpoMock).toHaveBeenCalledWith('u1', 'ipo-1', 2, 'p1', expect.any(String));
  });

  it('optimistically increments holding-qty AND ipo purchased-count', async () => {
    buyFromIpoMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 1);
    qc.setQueryData(['ipos', 'purchases', 'u1', 'ipo-1'], 3);
    const { result } = renderHook(() => useBuyFromIpo(), { wrapper: wrapperFor(qc) });

    act(() => { result.current.mutate(vars); });

    await waitFor(() => {
      expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(3);
      expect(qc.getQueryData(['ipos', 'purchases', 'u1', 'ipo-1'])).toBe(5);
    });
  });

  it('rolls back BOTH optimistic keys on error', async () => {
    buyFromIpoMock.mockResolvedValue({ success: false, error: 'ipoSoldOut' });
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 1);
    qc.setQueryData(['ipos', 'purchases', 'u1', 'ipo-1'], 3);
    const { result } = renderHook(() => useBuyFromIpo(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(1);
    expect(qc.getQueryData(['ipos', 'purchases', 'u1', 'ipo-1'])).toBe(3);
  });

  it('removes phantom-optimistic for BOTH keys when no prev snapshots (Finding #1 fix)', async () => {
    buyFromIpoMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    // No pre-set for either key.
    const { result } = renderHook(() => useBuyFromIpo(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBeUndefined();
    expect(qc.getQueryData(['ipos', 'purchases', 'u1', 'ipo-1'])).toBeUndefined();
  });

  it('overwrites optimistic purchased-count with server truth on success', async () => {
    buyFromIpoMock.mockResolvedValue({ success: true, new_balance: 100, user_total_purchased: 99 });
    const qc = makeClient();
    qc.setQueryData(['ipos', 'purchases', 'u1', 'ipo-1'], 3);
    const { result } = renderHook(() => useBuyFromIpo(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(qc.getQueryData(['ipos', 'purchases', 'u1', 'ipo-1'])).toBe(99);
  });

  it('tags error with "market.ipoBuy"', async () => {
    buyFromIpoMock.mockResolvedValue({ success: false, error: 'soldOut' });
    const qc = makeClient();
    const { result } = renderHook(() => useBuyFromIpo(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(logSilentCatchMock).toHaveBeenCalledWith('market.ipoBuy', expect.any(Error));
  });
});

// ───────────────────────────────────────────────────
// usePlaceBuyOrder
// ───────────────────────────────────────────────────
describe('usePlaceBuyOrder (Ferrari-Refactor)', () => {
  const vars = { userId: 'u1', playerId: 'p1', quantity: 1, maxPriceCents: 50000 };

  it('calls placeBuyOrder with all 4 args', async () => {
    placeBuyOrderMock.mockResolvedValue({ success: true, order_id: 'ord-1' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlaceBuyOrder(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(placeBuyOrderMock).toHaveBeenCalledWith('u1', 'p1', 1, 50000, expect.stringMatching(/^market\.placeBuyOrder:/));
    expect(invalidateTradeQueriesMock).toHaveBeenCalledWith('p1', 'u1');
  });

  it('has NO optimistic-update (order is server-side escrow)', async () => {
    placeBuyOrderMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 7);
    const { result } = renderHook(() => usePlaceBuyOrder(), { wrapper: wrapperFor(qc) });

    act(() => { result.current.mutate(vars); });
    // Wait a tick — optimistic would have run synchronously-ish via onMutate
    await new Promise((r) => setTimeout(r, 10));
    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(7);
  });

  it('re-throws service-error through mutationFn', async () => {
    placeBuyOrderMock.mockResolvedValue({ success: false, error: 'insufficientBalance' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlaceBuyOrder(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('insufficientBalance');
  });

  it('invalidates wallet in onSettled', async () => {
    placeBuyOrderMock.mockResolvedValue({ success: true });
    const qc = makeClient();
    const { result } = renderHook(() => usePlaceBuyOrder(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateWalletMock).toHaveBeenCalledWith(qc);
  });

  it('tags error with "market.placeBuyOrder"', async () => {
    placeBuyOrderMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlaceBuyOrder(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(logSilentCatchMock).toHaveBeenCalledWith('market.placeBuyOrder', expect.any(Error));
  });
});

// ───────────────────────────────────────────────────
// useCancelBuyOrder
// ───────────────────────────────────────────────────
describe('useCancelBuyOrder (Ferrari-Refactor)', () => {
  const vars = { userId: 'u1', orderId: 'ord-1' };

  it('calls cancelBuyOrder and invalidates orders', async () => {
    cancelBuyOrderMock.mockResolvedValue({ success: true });
    const qc = makeClient();
    const { result } = renderHook(() => useCancelBuyOrder(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(cancelBuyOrderMock).toHaveBeenCalledWith('u1', 'ord-1');
    expect(invalidateTradeQueriesMock).toHaveBeenCalledWith('', 'u1');
  });

  it('invalidates wallet in onSettled (escrow unlock)', async () => {
    cancelBuyOrderMock.mockResolvedValue({ success: true });
    const qc = makeClient();
    const { result } = renderHook(() => useCancelBuyOrder(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateWalletMock).toHaveBeenCalledWith(qc);
  });

  it('tags error with "market.cancelBuyOrder"', async () => {
    cancelBuyOrderMock.mockResolvedValue({ success: false, error: 'alreadyFilled' });
    const qc = makeClient();
    const { result } = renderHook(() => useCancelBuyOrder(), { wrapper: wrapperFor(qc) });

    await act(async () => { result.current.mutate(vars); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(logSilentCatchMock).toHaveBeenCalledWith('market.cancelBuyOrder', expect.any(Error));
  });
});
