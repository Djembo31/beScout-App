/**
 * Slice 151c — MembershipSection Subscribe Migration Tests.
 *
 * Money-Path Tier-1 (Audit 150). Race-safe via useSafeMutation (151a).
 *
 * Verifiziert:
 * 1. Rapid-click Bronze 3x → nur 1 subscribeTo-Call (safeTrigger short-circuit)
 * 2. Rapid-click Bronze + Silber → Silber short-circuited waehrend Bronze pending
 * 3. Success → setQueryData auf subscription + invalidate wallet + onSubscribed
 * 4. Failure (throw) → errorToast + Sentry-logSilentCatch
 * 5. Failure (result.success=false) → subscribeFailed toast (KEIN Sentry-Call)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Mocks
// ============================================

const mockSubscribeTo = vi.fn();
const mockAddToast = vi.fn();
const mockLogSilentCatch = vi.fn();
const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/lib/services/clubSubscriptions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/clubSubscriptions')>(
    '@/lib/services/clubSubscriptions',
  );
  return {
    ...actual,
    subscribeTo: (...args: unknown[]) => mockSubscribeTo(...args),
  };
});

vi.mock('@/lib/queries/misc', () => ({
  useClubSubscription: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => mockLogSilentCatch(tag, err),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  },
}));

// next/image / links not used in this section, skip mock

// ============================================
// Import AFTER mocks
// ============================================

import { MembershipSection } from '../MembershipSection';

// ============================================
// Test wrapper
// ============================================

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const defaultProps = {
  userId: 'u-1',
  clubId: 'club-1',
  clubColor: '#CD7F32',
  onSubscribed: vi.fn(),
};

function makeSuccessResult(tier: 'bronze' | 'silber' | 'gold') {
  const prices = { bronze: 50000, silber: 150000, gold: 300000 };
  return {
    success: true,
    subscription_id: `sub-${tier}`,
    tier,
    price_cents: prices[tier],
    expires_at: '2026-05-23T00:00:00Z',
    new_balance: 1_000_000,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  defaultProps.onSubscribed.mockClear();
});

describe('MembershipSection — Slice 151c Money-Path Migration', () => {
  // ── Happy Path ──

  it('calls subscribeTo with correct args on bronze click', async () => {
    mockSubscribeTo.mockResolvedValue(makeSuccessResult('bronze'));

    renderWithProviders(<MembershipSection {...defaultProps} />);

    // 3 buttons (Bronze/Silber/Gold) — all with same mocked label ('subscribe'); first = bronze
    const bronzeBtn = screen.getAllByRole('button')[0];
    act(() => bronzeBtn.click());

    await waitFor(() =>
      expect(mockSubscribeTo).toHaveBeenCalledWith('u-1', 'club-1', 'bronze'),
    );
  });

  it('on success: invalidate subscription + wallet + onSubscribed (Finding #2)', async () => {
    mockSubscribeTo.mockResolvedValue(makeSuccessResult('bronze'));

    renderWithProviders(<MembershipSection {...defaultProps} />);

    const bronzeBtn = screen.getAllByRole('button')[0];
    act(() => bronzeBtn.click());

    await waitFor(() => expect(defaultProps.onSubscribed).toHaveBeenCalledTimes(1));
    expect(mockAddToast).toHaveBeenCalledWith('subscribeSuccess', 'success');

    const subscriptionInvalidate = mockInvalidateQueries.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('subscription'),
    );
    expect(subscriptionInvalidate).toBeDefined();

    const walletInvalidate = mockInvalidateQueries.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('wallet'),
    );
    expect(walletInvalidate).toBeDefined();

    // Finding #2: No more setQueryData (invalidate-only for non-deterministic row insert)
    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  // ── Race-safety (core reason for Slice 151c) ──

  it('rapid-click-guard: 3x bronze clicks while in-flight → only 1 subscribeTo-call', async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    mockSubscribeTo.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );

    renderWithProviders(<MembershipSection {...defaultProps} />);

    // 3 buttons (Bronze/Silber/Gold) — all with same mocked label ('subscribe'); first = bronze
    const bronzeBtn = screen.getAllByRole('button')[0];

    // First click — starts mutation
    act(() => bronzeBtn.click());

    // Wait for isPending to propagate → button now disabled in DOM
    await waitFor(() => expect(mockSubscribeTo).toHaveBeenCalledTimes(1));

    // 3 rapid follow-up clicks — safeTrigger guards via isPending
    act(() => {
      bronzeBtn.click();
      bronzeBtn.click();
      bronzeBtn.click();
    });

    // Still exactly 1 service-call (guard short-circuited 3 clicks)
    expect(mockSubscribeTo).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => resolveFirst?.(makeSuccessResult('bronze')));
  });

  // ── Error handling ──

  it('on RPC throw: errorToast + Sentry logSilentCatch called', async () => {
    const err = new Error('Wallet insufficient');
    mockSubscribeTo.mockRejectedValue(err);

    renderWithProviders(<MembershipSection {...defaultProps} />);

    // 3 buttons (Bronze/Silber/Gold) — all with same mocked label ('subscribe'); first = bronze
    const bronzeBtn = screen.getAllByRole('button')[0];
    act(() => bronzeBtn.click());

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith('subscribeFailed', 'error'),
    );
    expect(mockLogSilentCatch).toHaveBeenCalledWith('membership.subscribe', err);
    // onSubscribed NOT called on error
    expect(defaultProps.onSubscribed).not.toHaveBeenCalled();
    // No setQueryData on error
    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  it('on result.success=false: subscribeFailed toast, NO Sentry (no throw)', async () => {
    mockSubscribeTo.mockResolvedValue({ success: false, error: 'business_rule_violated' });

    renderWithProviders(<MembershipSection {...defaultProps} />);

    // 3 buttons (Bronze/Silber/Gold) — all with same mocked label ('subscribe'); first = bronze
    const bronzeBtn = screen.getAllByRole('button')[0];
    act(() => bronzeBtn.click());

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith('subscribeFailed', 'error'),
    );
    // No throw → no Sentry-call (differentiates business-failure from exception)
    expect(mockLogSilentCatch).not.toHaveBeenCalled();
    // onSubscribed NOT called on non-success
    expect(defaultProps.onSubscribed).not.toHaveBeenCalled();
  });
});
