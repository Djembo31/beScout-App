/**
 * Slice 153b — Tests für usePlayerTrading Ferrari-Refactor.
 *
 * Pro Mutation geprueft:
 * - Service-Call mit korrekten Args
 * - Optimistic in onMutate + Rollback in onError (Buy + IPO-Buy)
 * - Server-Truth + Invalidation in onSuccess
 * - pgBouncer-safe invalidateWallet in onSettled
 * - errorTag fuer Sentry
 * - resolveErrorMessage i18n-resolution
 *
 * Plus: Handler-API-Kompatibilitaet, Modal-State, rapid-click guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Service + Helper Mocks (hoisted)
// ============================================
const buyFromMarketMock = vi.fn();
const buyFromOrderMock = vi.fn();
const buyFromIpoMock = vi.fn();
const placeSellOrderMock = vi.fn();
const cancelOrderMock = vi.fn();
const createOfferMock = vi.fn();
const acceptOfferMock = vi.fn();
const createPostMock = vi.fn();
const setWalletBalanceMock = vi.fn();
const invalidateWalletMock = vi.fn();
const invalidateTradeQueriesMock = vi.fn();
const invalidatePlayerDetailQueriesMock = vi.fn();
const addToastMock = vi.fn();
const logSilentCatchMock = vi.fn();

vi.mock('@/lib/services/trading', () => ({
  buyFromMarket: (...a: unknown[]) => buyFromMarketMock(...a),
  buyFromOrder: (...a: unknown[]) => buyFromOrderMock(...a),
  placeSellOrder: (...a: unknown[]) => placeSellOrderMock(...a),
  cancelOrder: (...a: unknown[]) => cancelOrderMock(...a),
}));

vi.mock('@/lib/services/ipo', () => ({
  buyFromIpo: (...a: unknown[]) => buyFromIpoMock(...a),
}));

vi.mock('@/lib/services/offers', () => ({
  createOffer: (...a: unknown[]) => createOfferMock(...a),
  acceptOffer: (...a: unknown[]) => acceptOfferMock(...a),
}));

vi.mock('@/lib/services/posts', () => ({
  createPost: (...a: unknown[]) => createPostMock(...a),
}));

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (v: number) => v / 100000,
}));

vi.mock('@/lib/services/wallet', () => ({
  formatScout: (v: number) => `${v / 100000}`,
}));

vi.mock('@/lib/hooks/useWallet', () => ({
  setWalletBalance: (...a: unknown[]) => setWalletBalanceMock(...a),
  invalidateWallet: (...a: unknown[]) => invalidateWalletMock(...a),
}));

vi.mock('@/lib/queries/invalidation', () => ({
  invalidateTradeQueries: (...a: unknown[]) => invalidateTradeQueriesMock(...a),
  invalidatePlayerDetailQueries: (...a: unknown[]) => invalidatePlayerDetailQueriesMock(...a),
}));

vi.mock('@/lib/errorMessages', () => ({
  mapErrorToKey: (e: { message?: string }) => e?.message ?? 'generic',
  normalizeError: (e: unknown) => (e instanceof Error ? e : { message: String(e) }),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => logSilentCatchMock(tag, err),
}));

vi.mock('next-intl', () => ({
  useTranslations: (_ns?: string) => (key: string, vars?: Record<string, unknown>) => {
    if (vars) return `${key}(${JSON.stringify(vars)})`;
    return key;
  },
}));

// ============================================
// Import AFTER mocks
// ============================================
import { usePlayerTrading } from '../usePlayerTrading';
import type { Player, DbIpo, PublicOrder } from '@/types';

// ============================================
// Helpers
// ============================================
function makeClient() {
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

const MOCK_PLAYER: Player = {
  id: 'p1',
  first: 'Hakan',
  last: 'Arslan',
  pos: 'MID',
  club: 'Sakaryaspor',
  clubId: 'club-1',
  ticket: 10,
  age: 28,
  status: null,
  imageUrl: null,
  prices: { floor: 5, lastTrade: 5, change24h: 0 },
  perf: { l5: 7, l15: 7, trend: 'flat' },
  stats: { matches: 10, goals: 2, assists: 1 },
  isLiquidated: false,
} as unknown as Player;

const MOCK_IPO: DbIpo = {
  id: 'ipo-1', player_id: 'p1', status: 'open', ipo_price: 150000,
} as unknown as DbIpo;

const DEFAULT_PROPS = {
  playerId: 'p1',
  player: MOCK_PLAYER,
  userId: 'u1',
  activeIpo: null as DbIpo | null,
  allSellOrders: [] as PublicOrder[],
  holdingQty: 5,
  balanceCents: 500_000,
  userIpoPurchased: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════
// Buy-Mutation (Market + Order)
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Buy', () => {
  it('executeBuy calls buyFromMarket when no orderId', async () => {
    buyFromMarketMock.mockResolvedValue({ success: true, new_balance: 400_000, price_per_dpc: 100_000 });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(2); });
    await waitFor(() => expect(result.current.buying).toBe(false));

    expect(buyFromMarketMock).toHaveBeenCalledWith('u1', 'p1', 2, expect.stringMatching(/^player\.buy:/));
    expect(setWalletBalanceMock).toHaveBeenCalledWith(qc, 'u1', 400_000);
  });

  it('executeBuy calls buyFromOrder when orderId given', async () => {
    buyFromOrderMock.mockResolvedValue({ success: true, new_balance: 1, price_per_dpc: 100 });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(1, 'order-123'); });
    await waitFor(() => expect(result.current.buying).toBe(false));

    expect(buyFromOrderMock).toHaveBeenCalledWith('u1', 'order-123', 1, 'p1', expect.stringMatching(/^player\.buy:/));
    expect(buyFromMarketMock).not.toHaveBeenCalled();
  });

  it('S405: normalizes buy_from_order shape (buyer_new_balance/price) in onSuccess', async () => {
    // buy_from_order liefert buyer_new_balance/price — NICHT new_balance/price_per_dpc
    // (Markt-RPC-Shape). onSuccess MUSS via ?? normalisieren, sonst bleibt der Order-Kauf
    // ohne optimistisches Wallet-Update und der Toast zeigt Preis "?".
    buyFromOrderMock.mockResolvedValue({ success: true, buyer_new_balance: 333, price: 77 });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(1, 'order-xyz'); });
    await waitFor(() => expect(result.current.buying).toBe(false));

    // Balance aus buyer_new_balance (new_balance ?? buyer_new_balance):
    expect(setWalletBalanceMock).toHaveBeenCalledWith(qc, 'u1', 333);
    // Toast-Preis aus `price` (formatScout(77) = 0.00077), kein "?":
    expect(result.current.buySuccess).toContain('0.00077');
    expect(result.current.buySuccess).not.toContain('?');
  });

  it('handleBuy short-circuits into pendingBuy when userOrders exist', async () => {
    const ownOrder = { id: 'o1', is_own: true, player_id: 'p1' } as unknown as PublicOrder;
    const qc = makeClient();
    const { result } = renderHook(
      () => usePlayerTrading({ ...DEFAULT_PROPS, allSellOrders: [ownOrder] }),
      { wrapper: wrapperFor(qc) },
    );

    act(() => { result.current.handleBuy(3); });

    expect(result.current.pendingBuyQty).toBe(3);
    expect(buyFromMarketMock).not.toHaveBeenCalled();
  });

  it('handleBuy directly calls executeBuy when no userOrders', async () => {
    buyFromMarketMock.mockResolvedValue({ success: true, new_balance: 1 });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleBuy(2); });
    await waitFor(() => expect(buyFromMarketMock).toHaveBeenCalled());
    expect(result.current.pendingBuyQty).toBeNull();
  });

  it('optimistically increments holdings-qty in onMutate', async () => {
    buyFromMarketMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 5);
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(3); });

    await waitFor(() => expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(8));
  });

  it('rolls back optimistic qty on server error', async () => {
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'insufficientBalance' });
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 5);
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(3); });
    await waitFor(() => expect(result.current.buying).toBe(false));

    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(5);
  });

  it('removes phantom-optimistic when no prev snapshot (Slice 153a pattern)', async () => {
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    // No pre-set for key.
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(3); });
    await waitFor(() => expect(result.current.buying).toBe(false));

    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBeUndefined();
  });

  it('derives buyError via resolveErrorMessage', async () => {
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'insufficientBalance' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(2); });
    await waitFor(() => expect(result.current.buyError).toBe('insufficientBalance'));
  });

  it('calls invalidateWallet in onSettled', async () => {
    buyFromMarketMock.mockResolvedValue({ success: true, new_balance: 1 });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(2); });
    await waitFor(() => expect(result.current.buying).toBe(false));
    expect(invalidateWalletMock).toHaveBeenCalledWith(qc);
  });

  it('tags buy-error with "player.buy"', async () => {
    buyFromMarketMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.executeBuy(1); });
    await waitFor(() => expect(result.current.buying).toBe(false));
    expect(logSilentCatchMock).toHaveBeenCalledWith('player.buy', expect.any(Error));
  });

  it('executeBuy is no-op when isLiquidated via handleBuy guard', async () => {
    const liquidated = { ...MOCK_PLAYER, isLiquidated: true };
    const qc = makeClient();
    const { result } = renderHook(
      () => usePlayerTrading({ ...DEFAULT_PROPS, player: liquidated }),
      { wrapper: wrapperFor(qc) },
    );

    act(() => { result.current.handleBuy(1); });
    expect(buyFromMarketMock).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// IPO-Buy
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — IPO-Buy', () => {
  const withIpo = { ...DEFAULT_PROPS, activeIpo: MOCK_IPO };

  it('calls buyFromIpo with reordered args (userId, ipoId, quantity, playerId)', async () => {
    buyFromIpoMock.mockResolvedValue({ success: true, new_balance: 1, price_per_dpc: 150000 });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(withIpo), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleIpoBuy(2); });
    await waitFor(() => expect(result.current.ipoBuying).toBe(false));

    // Slice 403: idempotente Mutation reicht generierten Key als 5. Arg durch
    expect(buyFromIpoMock).toHaveBeenCalledWith('u1', 'ipo-1', 2, 'p1', expect.any(String));
  });

  it('optimistically increments BOTH holdings-qty AND ipo purchased', async () => {
    buyFromIpoMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 1);
    qc.setQueryData(['ipos', 'purchases', 'u1', 'ipo-1'], 3);
    const { result } = renderHook(() => usePlayerTrading(withIpo), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleIpoBuy(2); });

    await waitFor(() => {
      expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(3);
      expect(qc.getQueryData(['ipos', 'purchases', 'u1', 'ipo-1'])).toBe(5);
    });
  });

  it('overwrites optimistic with server truth on success', async () => {
    buyFromIpoMock.mockResolvedValue({ success: true, new_balance: 1, user_total_purchased: 99 });
    const qc = makeClient();
    qc.setQueryData(['ipos', 'purchases', 'u1', 'ipo-1'], 3);
    const { result } = renderHook(() => usePlayerTrading(withIpo), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleIpoBuy(1); });
    await waitFor(() => expect(result.current.ipoBuying).toBe(false));

    expect(qc.getQueryData(['ipos', 'purchases', 'u1', 'ipo-1'])).toBe(99);
  });

  it('rolls back BOTH keys on error', async () => {
    buyFromIpoMock.mockResolvedValue({ success: false, error: 'soldOut' });
    const qc = makeClient();
    qc.setQueryData(['holdings', 'qty', 'u1', 'p1'], 1);
    qc.setQueryData(['ipos', 'purchases', 'u1', 'ipo-1'], 3);
    const { result } = renderHook(() => usePlayerTrading(withIpo), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleIpoBuy(2); });
    await waitFor(() => expect(result.current.ipoBuying).toBe(false));

    expect(qc.getQueryData(['holdings', 'qty', 'u1', 'p1'])).toBe(1);
    expect(qc.getQueryData(['ipos', 'purchases', 'u1', 'ipo-1'])).toBe(3);
  });

  it('tags ipo-error with "player.ipoBuy"', async () => {
    buyFromIpoMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(withIpo), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleIpoBuy(1); });
    await waitFor(() => expect(result.current.ipoBuying).toBe(false));
    expect(logSilentCatchMock).toHaveBeenCalledWith('player.ipoBuy', expect.any(Error));
  });
});

// ════════════════════════════════════════════════════════════════
// Sell
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Sell', () => {
  it('calls placeSellOrder + closes SellModal on success', async () => {
    placeSellOrderMock.mockResolvedValue({ success: true });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.openSellModal(); });
    expect(result.current.sellModalOpen).toBe(true);

    act(() => { result.current.handleSell(1, 50_000); });
    await waitFor(() => expect(result.current.selling).toBe(false));

    expect(placeSellOrderMock).toHaveBeenCalledWith('u1', 'p1', 1, 50_000, expect.stringMatching(/^player\.sell:/));
    expect(result.current.sellModalOpen).toBe(false);
  });

  it('derives sellError via resolveErrorMessage', async () => {
    placeSellOrderMock.mockResolvedValue({ success: false, error: 'notEnoughHoldings' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleSell(1, 50_000); });
    await waitFor(() => expect(result.current.sellError).toBe('notEnoughHoldings'));
  });

  it('tags sell-error with "player.sell"', async () => {
    placeSellOrderMock.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleSell(1, 1); });
    await waitFor(() => expect(result.current.selling).toBe(false));
    expect(logSilentCatchMock).toHaveBeenCalledWith('player.sell', expect.any(Error));
  });
});

// ════════════════════════════════════════════════════════════════
// Cancel-Order
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Cancel-Order', () => {
  it('tracks cancellingId during mutation, clears on settled', async () => {
    cancelOrderMock.mockImplementation(() => new Promise((r) => setTimeout(() => r({ success: true }), 30)));
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleCancelOrder('ord-1'); });
    expect(result.current.cancellingId).toBe('ord-1');

    await waitFor(() => expect(result.current.cancellingId).toBeNull());
    expect(cancelOrderMock).toHaveBeenCalledWith('u1', 'ord-1');
  });

  it('optimistically removes order from cache on success', async () => {
    cancelOrderMock.mockResolvedValue({ success: true });
    const qc = makeClient();
    const orders = [
      { id: 'ord-1', player_id: 'p1' } as PublicOrder,
      { id: 'ord-2', player_id: 'p1' } as PublicOrder,
    ];
    // qk.orders.byPlayer is used — let's set raw key
    // Use the structure from our hook's setQueryData call
    const { qk } = await import('@/lib/queries/keys');
    qc.setQueryData(qk.orders.byPlayer('p1'), orders);

    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });
    act(() => { result.current.handleCancelOrder('ord-1'); });
    await waitFor(() => expect(result.current.cancellingId).toBeNull());

    const after = qc.getQueryData<PublicOrder[]>(qk.orders.byPlayer('p1'));
    expect(after?.map(o => o.id)).toEqual(['ord-2']);
  });

  it('tags cancel-error with "player.cancelOrder"', async () => {
    cancelOrderMock.mockResolvedValue({ success: false, error: 'alreadyFilled' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleCancelOrder('ord-1'); });
    await waitFor(() => expect(result.current.cancellingId).toBeNull());
    expect(logSilentCatchMock).toHaveBeenCalledWith('player.cancelOrder', expect.any(Error));
  });

  it('shows error toast on cancel failure (Review 153b #2)', async () => {
    cancelOrderMock.mockResolvedValue({ success: false, error: 'alreadyFilled' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleCancelOrder('ord-1'); });
    await waitFor(() => expect(addToastMock).toHaveBeenCalledWith('alreadyFilled', 'error'));
  });

  it('does not re-trigger cancel while one is pending (Review 153b #5)', async () => {
    // Never-resolving promise keeps mutation pending — onSettled (which would
    // clear cancellingId) does NOT fire, so we can safely assert state.
    cancelOrderMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleCancelOrder('ord-1'); });
    await waitFor(() => expect(cancelOrderMock).toHaveBeenCalledTimes(1));
    act(() => { result.current.handleCancelOrder('ord-2'); });
    expect(cancelOrderMock).toHaveBeenCalledTimes(1);
    expect(result.current.cancellingId).toBe('ord-1'); // not overwritten to 'ord-2'
  });

  it('buyError does NOT include cancelMut.error (Review 153b #2)', async () => {
    cancelOrderMock.mockResolvedValue({ success: false, error: 'someCancelError' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleCancelOrder('ord-1'); });
    await waitFor(() => expect(result.current.cancellingId).toBeNull());

    // buyError should stay null — cancel-error goes through addToast only.
    expect(result.current.buyError).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// Create-Offer
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Create-Offer', () => {
  it('rejects invalid price with toast (no service call)', () => {
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.setOfferPrice('0'); });
    act(() => { result.current.handleCreateOffer(); });

    expect(addToastMock).toHaveBeenCalledWith('invalidPrice', 'error');
    expect(createOfferMock).not.toHaveBeenCalled();
  });

  it('calls createOffer with parsed priceCents + clears modal on success', async () => {
    createOfferMock.mockResolvedValue({ success: true });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.setOfferPrice('1.23'); });
    act(() => { result.current.setOfferMessage('hi'); });
    act(() => { result.current.handleCreateOffer(); });
    await waitFor(() => expect(result.current.offerLoading).toBe(false));

    expect(createOfferMock).toHaveBeenCalledWith({
      senderId: 'u1', playerId: 'p1', side: 'buy',
      priceCents: 123, quantity: 1, message: 'hi',
    });
    expect(result.current.showOfferModal).toBe(false);
    expect(result.current.offerPrice).toBe('');
  });

  it('shows error toast on failure', async () => {
    createOfferMock.mockResolvedValue({ success: false, error: 'duplicateOffer' });
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.setOfferPrice('5'); });
    act(() => { result.current.handleCreateOffer(); });
    await waitFor(() => expect(result.current.offerLoading).toBe(false));

    expect(addToastMock).toHaveBeenCalledWith('duplicateOffer', 'error');
  });
});

// ════════════════════════════════════════════════════════════════
// Accept-Bid
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Accept-Bid', () => {
  it('tracks acceptingBidId during mutation, clears on settled', async () => {
    acceptOfferMock.mockImplementation(() => new Promise((r) => setTimeout(() => r({ success: true }), 30)));
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleAcceptBid('offer-1'); });
    expect(result.current.acceptingBidId).toBe('offer-1');

    await waitFor(() => expect(result.current.acceptingBidId).toBeNull());
    expect(acceptOfferMock).toHaveBeenCalledWith('u1', 'offer-1');
  });

  it('does not accept another bid while one is pending', async () => {
    acceptOfferMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.handleAcceptBid('offer-1'); });
    // Wait for first mutation to start + state to commit — the second trigger
    // must see `acceptingBidId='offer-1'` to hit the guard.
    await waitFor(() => expect(acceptOfferMock).toHaveBeenCalledTimes(1));
    act(() => { result.current.handleAcceptBid('offer-2'); });

    expect(acceptOfferMock).toHaveBeenCalledTimes(1);
    expect(acceptOfferMock).toHaveBeenCalledWith('u1', 'offer-1');
  });
});

// ════════════════════════════════════════════════════════════════
// Share-Trade (fire-and-forget, not a useSafeMutation)
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Share-Trade', () => {
  it('calls createPost on success + success toast', async () => {
    createPostMock.mockResolvedValue(undefined);
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    await act(async () => { await result.current.handleShareTrade(); });

    expect(createPostMock).toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('sharedToCommunity', 'success');
    expect(result.current.shared).toBe(true);
  });

  it('logs silent-catch + shows error toast on createPost failure (Review 153b #1)', async () => {
    createPostMock.mockRejectedValue(new Error('db_error'));
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    await act(async () => { await result.current.handleShareTrade(); });

    expect(logSilentCatchMock).toHaveBeenCalledWith('player.shareTrade', expect.any(Error));
    expect(addToastMock).toHaveBeenCalledWith('shareFailed', 'error');
    expect(result.current.shared).toBe(false);
  });

  it('no-op when already shared', async () => {
    createPostMock.mockResolvedValue(undefined);
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    await act(async () => { await result.current.handleShareTrade(); });
    expect(createPostMock).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.handleShareTrade(); });
    expect(createPostMock).toHaveBeenCalledTimes(1); // still 1
  });
});

// ════════════════════════════════════════════════════════════════
// Modal State
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Modal-State', () => {
  it('openBuyModal resets buySuccess + shared (Review 153b #3)', async () => {
    createPostMock.mockResolvedValue(undefined);
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    // Simulate prior share: set shared=true via handleShareTrade
    await act(async () => { await result.current.handleShareTrade(); });
    expect(result.current.shared).toBe(true);

    act(() => { result.current.openBuyModal(); });
    expect(result.current.buyModalOpen).toBe(true);
    expect(result.current.buySuccess).toBeNull();
    expect(result.current.shared).toBe(false); // reset here, not in onMutate
  });

  it('openOfferModal closes BuyModal', () => {
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });

    act(() => { result.current.openBuyModal(); });
    act(() => { result.current.openOfferModal(); });

    expect(result.current.buyModalOpen).toBe(false);
    expect(result.current.showOfferModal).toBe(true);
  });

  it('cancelPendingBuy clears pending state', () => {
    const qc = makeClient();
    const ownOrder = { id: 'o1', is_own: true, player_id: 'p1' } as unknown as PublicOrder;
    const { result } = renderHook(
      () => usePlayerTrading({ ...DEFAULT_PROPS, allSellOrders: [ownOrder] }),
      { wrapper: wrapperFor(qc) },
    );

    act(() => { result.current.handleBuy(3, 'order-x'); });
    expect(result.current.pendingBuyQty).toBe(3);
    expect(result.current.pendingBuyOrderId).toBe('order-x');

    act(() => { result.current.cancelPendingBuy(); });
    expect(result.current.pendingBuyQty).toBeNull();
    expect(result.current.pendingBuyOrderId).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// Derived: isIPO
// ════════════════════════════════════════════════════════════════
describe('usePlayerTrading — Derived', () => {
  it('isIPO true when activeIpo.status === open', () => {
    const qc = makeClient();
    const { result } = renderHook(
      () => usePlayerTrading({ ...DEFAULT_PROPS, activeIpo: MOCK_IPO }),
      { wrapper: wrapperFor(qc) },
    );
    expect(result.current.isIPO).toBe(true);
  });

  it('isIPO false when activeIpo=null', () => {
    const qc = makeClient();
    const { result } = renderHook(() => usePlayerTrading(DEFAULT_PROPS), { wrapper: wrapperFor(qc) });
    expect(result.current.isIPO).toBe(false);
  });

  it('userOrders filters allSellOrders by is_own', () => {
    const orders = [
      { id: 'o1', is_own: true } as PublicOrder,
      { id: 'o2', is_own: false } as PublicOrder,
      { id: 'o3', is_own: true } as PublicOrder,
    ];
    const qc = makeClient();
    const { result } = renderHook(
      () => usePlayerTrading({ ...DEFAULT_PROPS, allSellOrders: orders }),
      { wrapper: wrapperFor(qc) },
    );
    expect(result.current.userOrders.map(o => o.id)).toEqual(['o1', 'o3']);
  });
});
