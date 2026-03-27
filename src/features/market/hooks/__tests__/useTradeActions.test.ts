import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DbIpo } from '@/types';

// ── Mutation mocks ──
const mockDoBuy = vi.fn();
const mockDoIpoBuy = vi.fn();
const mockResetBuy = vi.fn();
const mockResetIpoBuy = vi.fn();

vi.mock('@/features/market/mutations/trading', () => ({
  useBuyFromMarket: () => ({
    mutate: mockDoBuy,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    variables: undefined,
    reset: mockResetBuy,
  }),
  useBuyFromIpo: () => ({
    mutate: mockDoIpoBuy,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    variables: undefined,
    reset: mockResetIpoBuy,
  }),
}));

// ── Service mocks ──
const mockPlaceSellOrder = vi.fn();
const mockCancelOrder = vi.fn();

vi.mock('@/lib/services/trading', () => ({
  placeSellOrder: (...args: unknown[]) => mockPlaceSellOrder(...args),
  cancelOrder: (...args: unknown[]) => mockCancelOrder(...args),
}));

// ── Query invalidation mock ──
vi.mock('@/lib/queries', () => ({
  invalidateTradeQueries: vi.fn(),
}));

// ── WalletProvider mock ──
vi.mock('@/components/providers/WalletProvider', () => ({
  useWallet: () => ({ balanceCents: 500000 }),
}));

// ── next-intl mock (key passthrough) ──
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { useTradeActions } from '@/features/market/hooks/useTradeActions';

// ── Test helpers ──
const TEST_USER_ID = 'user-123';
const TEST_PLAYER_ID = 'player-456';
const TEST_IPO_ID = 'ipo-789';
const TEST_ORDER_ID = 'order-abc';

function makeIpoList(overrides?: Partial<DbIpo>[]): DbIpo[] {
  const base: DbIpo = {
    id: TEST_IPO_ID,
    player_id: TEST_PLAYER_ID,
    status: 'open',
    format: 'fixed',
    price: 100000,
    total_offered: 300,
    sold: 50,
    max_per_user: 10,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-02-01T00:00:00Z',
    early_access_ends_at: null,
    season: 2025,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  };
  if (overrides) return overrides.map((o) => ({ ...base, ...o }));
  return [base];
}

// ============================================
// handleBuy
// ============================================

describe('useTradeActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleBuy', () => {
    it('sets pendingBuy with source "market"', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      act(() => {
        result.current.handleBuy(TEST_PLAYER_ID);
      });

      expect(result.current.pendingBuy).toEqual({
        playerId: TEST_PLAYER_ID,
        source: 'market',
      });
    });

    it('does nothing when userId is undefined', () => {
      const { result } = renderHook(() =>
        useTradeActions(undefined, makeIpoList()),
      );

      act(() => {
        result.current.handleBuy(TEST_PLAYER_ID);
      });

      expect(result.current.pendingBuy).toBeNull();
    });
  });

  // ============================================
  // handleIpoBuy
  // ============================================

  describe('handleIpoBuy', () => {
    it('sets pendingBuy with source "ipo"', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      act(() => {
        result.current.handleIpoBuy(TEST_PLAYER_ID);
      });

      expect(result.current.pendingBuy).toEqual({
        playerId: TEST_PLAYER_ID,
        source: 'ipo',
      });
    });

    it('does nothing when userId is undefined', () => {
      const { result } = renderHook(() =>
        useTradeActions(undefined, makeIpoList()),
      );

      act(() => {
        result.current.handleIpoBuy(TEST_PLAYER_ID);
      });

      expect(result.current.pendingBuy).toBeNull();
    });
  });

  // ============================================
  // executeBuy
  // ============================================

  describe('executeBuy', () => {
    it('calls doBuy for market source and clears pendingBuy', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      // First set pendingBuy via handleBuy
      act(() => {
        result.current.handleBuy(TEST_PLAYER_ID);
      });
      expect(result.current.pendingBuy).not.toBeNull();

      // Then execute the buy
      act(() => {
        result.current.executeBuy(3);
      });

      expect(mockDoBuy).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        playerId: TEST_PLAYER_ID,
        quantity: 3,
      });
      expect(result.current.pendingBuy).toBeNull();
    });

    it('calls doIpoBuy for ipo source and clears pendingBuy', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      act(() => {
        result.current.handleIpoBuy(TEST_PLAYER_ID);
      });

      act(() => {
        result.current.executeBuy(2);
      });

      expect(mockDoIpoBuy).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        ipoId: TEST_IPO_ID,
        playerId: TEST_PLAYER_ID,
        quantity: 2,
      });
      expect(result.current.pendingBuy).toBeNull();
    });

    it('does nothing when userId is undefined', () => {
      const { result } = renderHook(() =>
        useTradeActions(undefined, makeIpoList()),
      );

      // Manually set pendingBuy via the exposed setter
      act(() => {
        result.current.setPendingBuy({ playerId: TEST_PLAYER_ID, source: 'market' });
      });

      act(() => {
        result.current.executeBuy(1);
      });

      expect(mockDoBuy).not.toHaveBeenCalled();
      expect(mockDoIpoBuy).not.toHaveBeenCalled();
    });

    it('does nothing when pendingBuy is null', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      act(() => {
        result.current.executeBuy(1);
      });

      expect(mockDoBuy).not.toHaveBeenCalled();
      expect(mockDoIpoBuy).not.toHaveBeenCalled();
    });

    it('does nothing for IPO buy when ipoId is not found in ipoList', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      // Set pendingBuy with a player that has NO matching IPO
      act(() => {
        result.current.setPendingBuy({ playerId: 'unknown-player', source: 'ipo' });
      });

      act(() => {
        result.current.executeBuy(1);
      });

      expect(mockDoIpoBuy).not.toHaveBeenCalled();
      // pendingBuy is cleared before the IPO lookup (prevents stuck state)
      expect(result.current.pendingBuy).toBeNull();
    });
  });

  // ============================================
  // handleSell
  // ============================================

  describe('handleSell', () => {
    it('returns success result on successful sell', async () => {
      mockPlaceSellOrder.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleSell(TEST_PLAYER_ID, 5, 200000),
      );

      expect(mockPlaceSellOrder).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_PLAYER_ID,
        5,
        200000,
      );
      expect(res).toEqual({ success: true });
    });

    it('returns error when service returns success: false', async () => {
      mockPlaceSellOrder.mockResolvedValue({
        success: false,
        error: 'Insufficient holdings',
      });

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleSell(TEST_PLAYER_ID, 5, 200000),
      );

      expect(res).toEqual({
        success: false,
        error: 'Insufficient holdings',
      });
    });

    it('returns fallback error message when service fails without error text', async () => {
      mockPlaceSellOrder.mockResolvedValue({ success: false });

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleSell(TEST_PLAYER_ID, 5, 200000),
      );

      // t('listingFailed') returns 'listingFailed' with our mock
      expect(res).toEqual({ success: false, error: 'listingFailed' });
    });

    it('returns error on exception', async () => {
      mockPlaceSellOrder.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleSell(TEST_PLAYER_ID, 5, 200000),
      );

      expect(res).toEqual({ success: false, error: 'Network failure' });
    });

    it('returns unknownError when exception is not an Error instance', async () => {
      mockPlaceSellOrder.mockRejectedValue('string-error');

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleSell(TEST_PLAYER_ID, 5, 200000),
      );

      // tc('unknownError') returns 'unknownError' with our mock
      expect(res).toEqual({ success: false, error: 'unknownError' });
    });

    it('returns notLoggedIn error when userId is undefined', async () => {
      const { result } = renderHook(() =>
        useTradeActions(undefined, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleSell(TEST_PLAYER_ID, 5, 200000),
      );

      expect(mockPlaceSellOrder).not.toHaveBeenCalled();
      expect(res).toEqual({ success: false, error: 'notLoggedIn' });
    });
  });

  // ============================================
  // handleCancelOrder
  // ============================================

  describe('handleCancelOrder', () => {
    it('returns success result on successful cancel', async () => {
      mockCancelOrder.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleCancelOrder(TEST_ORDER_ID),
      );

      expect(mockCancelOrder).toHaveBeenCalledWith(TEST_USER_ID, TEST_ORDER_ID);
      expect(res).toEqual({ success: true });
    });

    it('returns error when service returns success: false', async () => {
      mockCancelOrder.mockResolvedValue({
        success: false,
        error: 'Order not found',
      });

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleCancelOrder(TEST_ORDER_ID),
      );

      expect(res).toEqual({ success: false, error: 'Order not found' });
    });

    it('returns fallback error when service fails without error text', async () => {
      mockCancelOrder.mockResolvedValue({ success: false });

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleCancelOrder(TEST_ORDER_ID),
      );

      expect(res).toEqual({ success: false, error: 'cancelFailed' });
    });

    it('returns error on exception', async () => {
      mockCancelOrder.mockRejectedValue(new Error('DB timeout'));

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleCancelOrder(TEST_ORDER_ID),
      );

      expect(res).toEqual({ success: false, error: 'DB timeout' });
    });

    it('returns unknownError when exception is not an Error instance', async () => {
      mockCancelOrder.mockRejectedValue(42);

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleCancelOrder(TEST_ORDER_ID),
      );

      expect(res).toEqual({ success: false, error: 'unknownError' });
    });

    it('returns notLoggedIn error when userId is undefined', async () => {
      const { result } = renderHook(() =>
        useTradeActions(undefined, makeIpoList()),
      );

      const res = await act(async () =>
        result.current.handleCancelOrder(TEST_ORDER_ID),
      );

      expect(mockCancelOrder).not.toHaveBeenCalled();
      expect(res).toEqual({ success: false, error: 'notLoggedIn' });
    });
  });

  // ============================================
  // Derived state / initial values
  // ============================================

  describe('initial state', () => {
    it('starts with pendingBuy as null', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );
      expect(result.current.pendingBuy).toBeNull();
    });

    it('starts with buyOrderPlayer as null', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );
      expect(result.current.buyOrderPlayer).toBeNull();
    });

    it('buyingId is null when no mutation is pending', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );
      expect(result.current.buyingId).toBeNull();
    });

    it('buySuccess is null when no mutation succeeded', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );
      expect(result.current.buySuccess).toBeNull();
    });

    it('buyError is null when no mutation errored', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );
      expect(result.current.buyError).toBeNull();
    });
  });

  // ============================================
  // ipoIdMap lookup
  // ============================================

  describe('ipoIdMap', () => {
    it('correctly maps multiple IPOs to their player IDs', () => {
      const ipos = makeIpoList([
        { id: 'ipo-1', player_id: 'player-A' },
        { id: 'ipo-2', player_id: 'player-B' },
      ]);

      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, ipos),
      );

      // Verify by executing an IPO buy for player-B
      act(() => {
        result.current.handleIpoBuy('player-B');
      });
      act(() => {
        result.current.executeBuy(1);
      });

      expect(mockDoIpoBuy).toHaveBeenCalledWith(
        expect.objectContaining({
          ipoId: 'ipo-2',
          playerId: 'player-B',
        }),
      );
    });
  });

  // ============================================
  // buyOrderPlayer state
  // ============================================

  describe('buyOrderPlayer', () => {
    it('can be set and cleared via setBuyOrderPlayer', () => {
      const { result } = renderHook(() =>
        useTradeActions(TEST_USER_ID, makeIpoList()),
      );

      const mockPlayer = { id: 'p1', first: 'Max', last: 'Mustermann' } as never;

      act(() => {
        result.current.setBuyOrderPlayer(mockPlayer);
      });
      expect(result.current.buyOrderPlayer).toBe(mockPlayer);

      act(() => {
        result.current.setBuyOrderPlayer(null);
      });
      expect(result.current.buyOrderPlayer).toBeNull();
    });
  });
});
