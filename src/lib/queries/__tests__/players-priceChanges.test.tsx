import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Mocks — service
// ============================================

const mockGetPlayerPriceChanges7d = vi.fn();
vi.mock('@/lib/services/players', () => ({
  getPlayerPriceChanges7d: (...args: unknown[]) => mockGetPlayerPriceChanges7d(...args),
}));

import { usePlayerPriceChanges7d } from '../players';
import { qk } from '../keys';

// ============================================
// Wrapper helper — shared QueryClient per test
// ============================================

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // deterministic test output on rejected promises
        gcTime: Infinity,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

// ============================================
// Tests
// ============================================

describe('usePlayerPriceChanges7d (Slice 268b)', () => {
  beforeEach(() => {
    mockGetPlayerPriceChanges7d.mockReset();
  });

  it('AC-01 [HAPPY]: returns RPC rows on success', async () => {
    const rows = [
      { player_id: 'p-1', price_7d_ago: 100, price_now: 120, change_abs: 20, change_pct: 20 },
      { player_id: 'p-2', price_7d_ago: 200, price_now: 180, change_abs: -20, change_pct: -10 },
    ];
    mockGetPlayerPriceChanges7d.mockResolvedValue(rows);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePlayerPriceChanges7d(['p-1', 'p-2'], 5), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(rows));
    expect(mockGetPlayerPriceChanges7d).toHaveBeenCalledWith(['p-1', 'p-2'], 5);
  });

  it('AC-02 [EMPTY]: stays disabled when playerIds is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePlayerPriceChanges7d(undefined, 3), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetPlayerPriceChanges7d).not.toHaveBeenCalled();
  });

  it('AC-02 [EMPTY]: stays disabled when playerIds is empty array', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePlayerPriceChanges7d([], 3), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetPlayerPriceChanges7d).not.toHaveBeenCalled();
  });

  it('AC-02 [EMPTY]: stays disabled when playerIds.length === 1 (mirrors useHomeData < 2 logic)', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePlayerPriceChanges7d(['p-1'], 3), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetPlayerPriceChanges7d).not.toHaveBeenCalled();
  });

  it('AC-03 [ERROR]: propagates service throw to isError', async () => {
    mockGetPlayerPriceChanges7d.mockRejectedValue(new Error('rpc_failed'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePlayerPriceChanges7d(['a', 'b'], 3), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error)?.message).toBe('rpc_failed');
  });

  it('AC-05 [REGRESSION]: dedup — two hooks with same playerIds (any order) share one RPC call', async () => {
    mockGetPlayerPriceChanges7d.mockResolvedValue([]);

    const { Wrapper } = createWrapper(); // ONE shared QueryClient

    const { result: r1 } = renderHook(() => usePlayerPriceChanges7d(['a', 'b', 'c'], 3), {
      wrapper: Wrapper,
    });
    const { result: r2 } = renderHook(() => usePlayerPriceChanges7d(['c', 'b', 'a'], 3), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(r1.current.isSuccess).toBe(true);
      expect(r2.current.isSuccess).toBe(true);
    });

    // Cache-key uses sorted-joined playerIds → both hooks resolve to same key
    // → only 1 actual RPC roundtrip.
    expect(mockGetPlayerPriceChanges7d).toHaveBeenCalledTimes(1);
  });

  it('cache-key shape matches qk.priceChanges.byPlayers contract', () => {
    // Sanity-check on the qk-key shape — failure here means the hook key
    // drifted from the qk-Factory contract.
    const expected = qk.priceChanges.byPlayers('a,b,c', 3);
    expect(expected).toEqual(['priceChanges', '7d', 'a,b,c', 3]);
  });
});
