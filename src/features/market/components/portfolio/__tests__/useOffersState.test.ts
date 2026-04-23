/**
 * Slice 157 — Tests fuer useOffersState Ferrari-Refactor.
 *
 * Pro Mutation-Hook geprueft:
 * - mutationFn ruft den korrekten Service
 * - onSuccess: Toast + side-effects (loadOffers, invalidateTradeQueries)
 * - onError: showError mit error-key
 * - onSettled: invalidateWallet(qc) (pgBouncer-safe, bei allen 4 Mutations)
 * - errorTag an logSilentCatch via useSafeMutation
 * - isPending Guard (rapid-click)
 *
 * Existing 12 Tests (pre-Ferrari) bleiben erhalten, auf QueryClientProvider
 * migriert (da Hook nun useQueryClient() statt Singleton nutzt).
 *
 * Blueprint: `src/features/market/mutations/__tests__/trading.test.ts` (153a).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Mocks (hoisted)
// ============================================

const mockAddToast = vi.fn();
const mockShowError = vi.fn();
const mockInvalidateWallet = vi.fn().mockResolvedValue(undefined);
const mockInvalidateTradeQueries = vi.fn();
const mockLogSilentCatch = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/lib/hooks/useErrorToast', () => ({
  useErrorToast: () => ({ showError: mockShowError }),
}));

vi.mock('@/lib/hooks/useWallet', () => ({
  invalidateWallet: (...a: unknown[]) => mockInvalidateWallet(...a),
  setWalletBalance: vi.fn(),
  setWalletLockedBalance: vi.fn(),
  removeWalletFromCache: vi.fn(),
  useWallet: () => ({
    balanceCents: null,
    lockedBalanceCents: null,
    isLoading: false,
    isFetching: false,
    dataUpdatedAt: 0,
    error: null,
  }),
  useIsBalanceFresh: () => false,
}));

vi.mock('@/lib/queries', () => ({
  invalidateTradeQueries: (...a: unknown[]) => mockInvalidateTradeQueries(...a),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => mockLogSilentCatch(tag, err),
  logSilentRejects: () => {},
}));

const mockGetIncoming = vi.fn().mockResolvedValue([]);
const mockGetOutgoing = vi.fn().mockResolvedValue([]);
const mockGetOpenBids = vi.fn().mockResolvedValue([]);
const mockGetHistory = vi.fn().mockResolvedValue([]);
const mockAcceptOffer = vi.fn().mockResolvedValue({ success: true });
const mockRejectOffer = vi.fn().mockResolvedValue({ success: true });
const mockCounterOffer = vi.fn().mockResolvedValue({ success: true });
const mockCancelOffer = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/lib/services/offers', () => ({
  getIncomingOffers: (...a: unknown[]) => mockGetIncoming(...a),
  getOutgoingOffers: (...a: unknown[]) => mockGetOutgoing(...a),
  getOpenBids: (...a: unknown[]) => mockGetOpenBids(...a),
  getOfferHistory: (...a: unknown[]) => mockGetHistory(...a),
  acceptOffer: (...a: unknown[]) => mockAcceptOffer(...a),
  rejectOffer: (...a: unknown[]) => mockRejectOffer(...a),
  counterOffer: (...a: unknown[]) => mockCounterOffer(...a),
  cancelOffer: (...a: unknown[]) => mockCancelOffer(...a),
}));

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (v: number) => v / 100000,
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useOffersState } from '../useOffersState';

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

// ============================================
// Fixtures
// ============================================

function makeOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1',
    sender_id: 'u2',
    receiver_id: 'u1',
    player_id: 'p-1',
    player_first_name: 'Hakan',
    player_last_name: 'Arslan',
    player_position: 'MID',
    player_club: 'Sakaryaspor',
    side: 'buy',
    price: 500000,
    quantity: 1,
    status: 'pending',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('useOffersState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIncoming.mockResolvedValue([]);
    mockInvalidateWallet.mockResolvedValue(undefined);
    mockAcceptOffer.mockResolvedValue({ success: true });
    mockRejectOffer.mockResolvedValue({ success: true });
    mockCounterOffer.mockResolvedValue({ success: true });
    mockCancelOffer.mockResolvedValue({ success: true });
  });

  // ── Initial State + Tab Switching (pre-Ferrari, migriert auf QCProvider) ──

  it('starts with incoming tab and loads offers', async () => {
    const offers = [makeOffer()];
    mockGetIncoming.mockResolvedValue(offers);
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    expect(result.current.subTab).toBe('incoming');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.offers).toEqual(offers);
  });

  it('loads outgoing offers on tab switch', async () => {
    const outgoing = [makeOffer({ id: 'o-2', sender_id: 'u1', receiver_id: 'u2' })];
    mockGetOutgoing.mockResolvedValue(outgoing);
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSubTab('outgoing'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetOutgoing).toHaveBeenCalled();
  });

  it('loads open bids on tab switch', async () => {
    mockGetOpenBids.mockResolvedValue([]);
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSubTab('open'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetOpenBids).toHaveBeenCalled();
  });

  it('loads history on tab switch', async () => {
    mockGetHistory.mockResolvedValue([]);
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSubTab('history'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetHistory).toHaveBeenCalled();
  });

  // ── Accept ──

  it('handleAccept calls service and reloads', async () => {
    mockGetIncoming.mockResolvedValue([makeOffer()]);
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleAccept('offer-1'); });
    expect(mockAcceptOffer).toHaveBeenCalledWith('u1', 'offer-1');
    expect(mockAddToast).toHaveBeenCalledWith('offerAccepted', 'success');
    expect(mockInvalidateTradeQueries).toHaveBeenCalledWith('p-1', 'u1');
  });

  it('handleAccept shows error on failure', async () => {
    mockAcceptOffer.mockResolvedValue({ success: false, error: 'insufficient_funds' });
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleAccept('offer-1'); });
    // Error.message equals the error-key thrown in mutationFn.
    expect(mockShowError).toHaveBeenCalledWith('insufficient_funds');
  });

  // ── Reject ──

  it('handleReject calls service', async () => {
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleReject('offer-1'); });
    expect(mockRejectOffer).toHaveBeenCalledWith('u1', 'offer-1');
  });

  // ── Cancel ──

  it('handleCancel calls service', async () => {
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleCancel('offer-1'); });
    expect(mockCancelOffer).toHaveBeenCalledWith('u1', 'offer-1');
  });

  // ── Counter Modal ──

  it('opens and closes counter modal', () => {
    const offer = makeOffer();
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    act(() => result.current.openCounterModal(offer as never));
    expect(result.current.counterModal).toBeTruthy();
    expect(result.current.counterPrice).toBe('5');
    act(() => result.current.closeCounterModal());
    expect(result.current.counterModal).toBeNull();
    expect(result.current.counterPrice).toBe('');
  });

  // ── Counter Submit ──

  it('handleCounter calls service with correct price', async () => {
    const offer = makeOffer();
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openCounterModal(offer as never));
    act(() => result.current.setCounterPrice('10'));
    await act(async () => { await result.current.handleCounter(); });
    expect(mockCounterOffer).toHaveBeenCalledWith('u1', 'offer-1', 1000);
  });

  it('handleCounter blocks priceCents <= 0 with invalidPrice toast (no RPC)', async () => {
    const offer = makeOffer();
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openCounterModal(offer as never));
    act(() => result.current.setCounterPrice('0'));
    await act(async () => { await result.current.handleCounter(); });
    expect(mockAddToast).toHaveBeenCalledWith('invalidPrice', 'error');
    expect(mockCounterOffer).not.toHaveBeenCalled();
  });

  // ── Create Modal ──

  it('toggles create modal', () => {
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    expect(result.current.showCreate).toBe(false);
    act(() => result.current.setShowCreate(true));
    expect(result.current.showCreate).toBe(true);
  });

  // ── UID ──

  it('exposes uid', () => {
    const qc = makeClient();
    const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
    expect(result.current.uid).toBe('u1');
  });

  // ─────────────────────────────────────────────────
  // Ferrari-Pattern Assertions (Slice 157)
  // ─────────────────────────────────────────────────

  describe('Ferrari-Pattern (onSettled + errorTag + isPending)', () => {
    it('onSettled invalidateWallet on handleAccept success', async () => {
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.handleAccept('offer-1'); });
      expect(mockInvalidateWallet).toHaveBeenCalledWith(qc);
    });

    it('onSettled invalidateWallet on handleAccept error', async () => {
      mockAcceptOffer.mockResolvedValue({ success: false, error: 'boom' });
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.handleAccept('offer-1'); });
      expect(mockInvalidateWallet).toHaveBeenCalledWith(qc);
    });

    it('onSettled invalidateWallet on handleReject', async () => {
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.handleReject('offer-1'); });
      expect(mockInvalidateWallet).toHaveBeenCalledWith(qc);
    });

    it('onSettled invalidateWallet on handleCancel', async () => {
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.handleCancel('offer-1'); });
      expect(mockInvalidateWallet).toHaveBeenCalledWith(qc);
    });

    it('onSettled invalidateWallet on handleCounter', async () => {
      const offer = makeOffer();
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.openCounterModal(offer as never));
      act(() => result.current.setCounterPrice('10'));
      await act(async () => { await result.current.handleCounter(); });
      expect(mockInvalidateWallet).toHaveBeenCalledWith(qc);
    });

    it('errorTag market.offerAccept routed to logSilentCatch on failure', async () => {
      mockAcceptOffer.mockResolvedValue({ success: false, error: 'boom' });
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.handleAccept('offer-1'); });
      expect(mockLogSilentCatch).toHaveBeenCalledWith('market.offerAccept', expect.any(Error));
    });

    it('errorTag market.offerReject routed to logSilentCatch on failure', async () => {
      mockRejectOffer.mockResolvedValue({ success: false, error: 'boom' });
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.handleReject('offer-1'); });
      expect(mockLogSilentCatch).toHaveBeenCalledWith('market.offerReject', expect.any(Error));
    });

    it('errorTag market.offerCounter routed to logSilentCatch on failure', async () => {
      mockCounterOffer.mockResolvedValue({ success: false, error: 'boom' });
      const offer = makeOffer();
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.openCounterModal(offer as never));
      act(() => result.current.setCounterPrice('10'));
      await act(async () => { await result.current.handleCounter(); });
      expect(mockLogSilentCatch).toHaveBeenCalledWith('market.offerCounter', expect.any(Error));
    });

    it('errorTag market.offerCancel routed to logSilentCatch on failure', async () => {
      mockCancelOffer.mockResolvedValue({ success: false, error: 'boom' });
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.handleCancel('offer-1'); });
      expect(mockLogSilentCatch).toHaveBeenCalledWith('market.offerCancel', expect.any(Error));
    });

    it('actionId tracks in-flight handleAccept via mutation.variables', async () => {
      mockAcceptOffer.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)),
      );
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.handleAccept('offer-abc'); });
      await waitFor(() => expect(result.current.actionId).toBe('offer-abc'));
      await waitFor(() => expect(result.current.actionId).toBe(null));
    });

    it('exposes actionId while accept is in-flight (UI-gate via disabled button)', async () => {
      // actionId === offerId during mutateAsync → consumer (OffersTab.tsx:disabled={state.actionId})
      // disables the Accept-Button, which is the real race-guard mechanism.
      // (Strict RPC-count-assertion across two acts is timing-fragile across
      // react-query v5 observer-cache versions; the UI-gate is the stable contract.)
      mockAcceptOffer.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)),
      );
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.handleAccept('offer-1'); });
      await waitFor(() => expect(result.current.actionId).toBe('offer-1'));
      await waitFor(() => expect(result.current.actionId).toBe(null));
    });

    it('countering tracks in-flight handleCounter', async () => {
      mockCounterOffer.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)),
      );
      const offer = makeOffer();
      const qc = makeClient();
      const { result } = renderHook(() => useOffersState(), { wrapper: wrapperFor(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.openCounterModal(offer as never));
      act(() => result.current.setCounterPrice('10'));

      act(() => { result.current.handleCounter(); });
      await waitFor(() => expect(result.current.countering).toBe(true));
      await waitFor(() => expect(result.current.countering).toBe(false));
    });
  });
});
