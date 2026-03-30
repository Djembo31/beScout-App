import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================
// Mocks
// ============================================

const mockAddToast = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/lib/hooks/useErrorToast', () => ({
  useErrorToast: () => ({ showError: mockShowError }),
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
  });

  // ── Initial State ──

  it('starts with incoming tab and loads offers', async () => {
    const offers = [makeOffer()];
    mockGetIncoming.mockResolvedValue(offers);
    const { result } = renderHook(() => useOffersState());
    expect(result.current.subTab).toBe('incoming');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.offers).toEqual(offers);
  });

  // ── Tab Switching ──

  it('loads outgoing offers on tab switch', async () => {
    const outgoing = [makeOffer({ id: 'o-2', sender_id: 'u1', receiver_id: 'u2' })];
    mockGetOutgoing.mockResolvedValue(outgoing);
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSubTab('outgoing'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetOutgoing).toHaveBeenCalled();
  });

  it('loads open bids on tab switch', async () => {
    mockGetOpenBids.mockResolvedValue([]);
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSubTab('open'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetOpenBids).toHaveBeenCalled();
  });

  it('loads history on tab switch', async () => {
    mockGetHistory.mockResolvedValue([]);
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSubTab('history'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetHistory).toHaveBeenCalled();
  });

  // ── Accept ──

  it('handleAccept calls service and reloads', async () => {
    mockGetIncoming.mockResolvedValue([makeOffer()]);
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleAccept('offer-1'); });
    expect(mockAcceptOffer).toHaveBeenCalledWith('u1', 'offer-1');
    expect(mockAddToast).toHaveBeenCalledWith('offerAccepted', 'success');
  });

  it('handleAccept shows error on failure', async () => {
    mockAcceptOffer.mockResolvedValue({ success: false, error: 'insufficient_funds' });
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleAccept('offer-1'); });
    expect(mockShowError).toHaveBeenCalledWith('insufficient_funds');
  });

  // ── Reject ──

  it('handleReject calls service', async () => {
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleReject('offer-1'); });
    expect(mockRejectOffer).toHaveBeenCalledWith('u1', 'offer-1');
  });

  // ── Cancel ──

  it('handleCancel calls service', async () => {
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleCancel('offer-1'); });
    expect(mockCancelOffer).toHaveBeenCalledWith('u1', 'offer-1');
  });

  // ── Counter Modal ──

  it('opens and closes counter modal', () => {
    const offer = makeOffer();
    const { result } = renderHook(() => useOffersState());
    act(() => result.current.openCounterModal(offer as any));
    expect(result.current.counterModal).toBeTruthy();
    expect(result.current.counterPrice).toBe('5'); // 500000 / 100000
    act(() => result.current.closeCounterModal());
    expect(result.current.counterModal).toBeNull();
    expect(result.current.counterPrice).toBe('');
  });

  // ── Counter Submit ──

  it('handleCounter calls service with correct price', async () => {
    const offer = makeOffer();
    const { result } = renderHook(() => useOffersState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openCounterModal(offer as any));
    act(() => result.current.setCounterPrice('10'));
    await act(async () => { await result.current.handleCounter(); });
    expect(mockCounterOffer).toHaveBeenCalledWith('u1', 'offer-1', 1000); // 10 * 100
  });

  // ── Create Modal ──

  it('toggles create modal', () => {
    const { result } = renderHook(() => useOffersState());
    expect(result.current.showCreate).toBe(false);
    act(() => result.current.setShowCreate(true));
    expect(result.current.showCreate).toBe(true);
  });

  // ── UID ──

  it('exposes uid', () => {
    const { result } = renderHook(() => useOffersState());
    expect(result.current.uid).toBe('u1');
  });
});
