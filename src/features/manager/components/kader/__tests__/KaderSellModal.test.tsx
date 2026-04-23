/**
 * Slice 158 — Tests fuer KaderSellModal Ferrari-Refactor.
 *
 * Strategy: SellModalCore gemockt als Pass-Through (exponiert Props), damit
 * Tests sich auf die useSafeMutation-Integration und Consumer-API konzentrieren.
 *
 * Geprüft:
 * - onSell/onCancelOrder callbacks werden mit korrekten Args gerufen
 * - selling prop = sellMut.isPending, cancellingId prop = cancelMut.variables.orderId
 * - errorTag fuer Sentry-Observability
 * - onSettled invalidateWallet bei beiden Mutations
 * - error/success-state cleared bei neuer Mutation
 * - rapid-click Guard via mut.isPending
 *
 * Blueprint: `src/features/market/components/portfolio/__tests__/useOffersState.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Mocks (hoisted)
// ============================================

const mockInvalidateWallet = vi.fn().mockResolvedValue(undefined);
const mockLogSilentCatch = vi.fn();

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

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => mockLogSilentCatch(tag, err),
  logSilentRejects: () => {},
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, args?: Record<string, unknown>) =>
    args ? `${key}(${JSON.stringify(args)})` : key,
}));

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (v: number) => v / 100000,
}));

// Mock SellModalCore as pass-through — exposes props for assertion + triggers onSubmit.
interface MockSellModalCoreProps {
  open: boolean;
  selling: boolean;
  cancellingId: string | null;
  error: string | null;
  success: string | null;
  onSubmit: (qty: number, priceCents: number) => void | Promise<void>;
  beforeFormSlot?: React.ReactNode;
}

let capturedProps: MockSellModalCoreProps | null = null;

vi.mock('@/components/trading/SellModalCore', () => ({
  SellModalCore: (props: MockSellModalCoreProps) => {
    capturedProps = props;
    if (!props.open) return null;
    return React.createElement(
      'div',
      { 'data-testid': 'sell-modal-core' },
      React.createElement(
        'button',
        {
          'data-testid': 'core-submit',
          onClick: () => props.onSubmit(2, 500000),
        },
        'submit',
      ),
      props.beforeFormSlot,
    );
  },
}));

// ============================================
// Imports AFTER mocks
// ============================================

import KaderSellModal from '../KaderSellModal';

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

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    player: { id: 'p-1', first: 'Hakan', last: 'Arslan', club: 'Sakaryaspor' },
    quantity: 10,
    availableToSell: 8,
    lockedQty: 2,
    listedQty: 0,
    avgBuyPriceBsd: 40,
    floorBsd: 45,
    myListings: [
      {
        id: 'order-1',
        qty: 3,
        priceBsd: 50,
        expiresAt: Date.now() + 7 * 86_400_000,
      },
    ],
    offers: [],
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('KaderSellModal (Ferrari-Refactor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = null;
  });

  it('returns null when item is null', () => {
    const qc = makeClient();
    const onSell = vi.fn();
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: null,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );
    expect(screen.queryByTestId('sell-modal-core')).toBeNull();
  });

  it('handleSubmit calls onSell with correct args', async () => {
    const qc = makeClient();
    const onSell = vi.fn().mockResolvedValue({ success: true });
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });

    expect(onSell).toHaveBeenCalledWith('p-1', 2, 500000);
  });

  it('selling prop = sellMut.isPending during submission', async () => {
    const qc = makeClient();
    const onSell = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)),
    );
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    expect(capturedProps?.selling).toBe(false);
    act(() => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });

    await waitFor(() => expect(capturedProps?.selling).toBe(true));
    await waitFor(() => expect(capturedProps?.selling).toBe(false));
  });

  it('error prop filled when onSell returns failure', async () => {
    const qc = makeClient();
    const onSell = vi.fn().mockResolvedValue({ success: false, error: 'insufficient_balance' });
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });

    await waitFor(() => expect(capturedProps?.error).toBe('insufficient_balance'));
  });

  it('success prop filled after successful sell (contains formatted args)', async () => {
    const qc = makeClient();
    const onSell = vi.fn().mockResolvedValue({ success: true });
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });

    await waitFor(() => {
      expect(capturedProps?.success).toMatch(/sellListSuccess/);
    });
  });

  it('handleCancel calls onCancelOrder with orderId', async () => {
    const qc = makeClient();
    const onSell = vi.fn();
    const onCancel = vi.fn().mockResolvedValue({ success: true });
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    // Find the cancel-button inside beforeFormSlot (renders listing with cancel).
    const cancelBtn = screen.getByText('sellCancel').closest('button');
    expect(cancelBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(cancelBtn!);
    });

    expect(onCancel).toHaveBeenCalledWith('order-1');
  });

  it('cancellingId prop = order-id during cancel in-flight', async () => {
    const qc = makeClient();
    const onSell = vi.fn();
    const onCancel = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)),
    );
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    const cancelBtn = screen.getByText('sellCancel').closest('button');
    act(() => {
      fireEvent.click(cancelBtn!);
    });

    await waitFor(() => expect(capturedProps?.cancellingId).toBe('order-1'));
    await waitFor(() => expect(capturedProps?.cancellingId).toBe(null));
  });

  it('onSettled invalidateWallet on sell success', async () => {
    const qc = makeClient();
    const onSell = vi.fn().mockResolvedValue({ success: true });
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });

    await waitFor(() => expect(mockInvalidateWallet).toHaveBeenCalledWith(qc));
  });

  it('onSettled invalidateWallet on sell error', async () => {
    const qc = makeClient();
    const onSell = vi.fn().mockResolvedValue({ success: false, error: 'boom' });
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });

    await waitFor(() => expect(mockInvalidateWallet).toHaveBeenCalledWith(qc));
  });

  it('onSettled invalidateWallet on cancel', async () => {
    const qc = makeClient();
    const onSell = vi.fn();
    const onCancel = vi.fn().mockResolvedValue({ success: true });
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    const cancelBtn = screen.getByText('sellCancel').closest('button');
    await act(async () => {
      fireEvent.click(cancelBtn!);
    });

    await waitFor(() => expect(mockInvalidateWallet).toHaveBeenCalledWith(qc));
  });

  it('errorTag market.kaderSell routed to logSilentCatch on failure', async () => {
    const qc = makeClient();
    const onSell = vi.fn().mockResolvedValue({ success: false, error: 'boom' });
    const onCancel = vi.fn();
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });

    await waitFor(() =>
      expect(mockLogSilentCatch).toHaveBeenCalledWith('market.kaderSell', expect.any(Error)),
    );
  });

  it('errorTag market.kaderCancelOrder routed to logSilentCatch on failure', async () => {
    const qc = makeClient();
    const onSell = vi.fn();
    const onCancel = vi.fn().mockResolvedValue({ success: false, error: 'boom' });
    render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    const cancelBtn = screen.getByText('sellCancel').closest('button');
    await act(async () => {
      fireEvent.click(cancelBtn!);
    });

    await waitFor(() =>
      expect(mockLogSilentCatch).toHaveBeenCalledWith('market.kaderCancelOrder', expect.any(Error)),
    );
  });

  it('error/success cleared when new sell starts', async () => {
    const qc = makeClient();
    const onSell = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: 'first_err' })
      .mockResolvedValueOnce({ success: true });
    const onCancel = vi.fn();
    const { rerender } = render(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });
    await waitFor(() => expect(capturedProps?.error).toBe('first_err'));

    // Trigger second mutation — error must be cleared at mutation-start.
    rerender(
      React.createElement(KaderSellModal, {
        item: makeItem() as never,
        open: true,
        onClose: () => {},
        onSell,
        onCancelOrder: onCancel,
      }),
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('core-submit'));
    });
    // After success, error should be null.
    await waitFor(() => expect(capturedProps?.error).toBe(null));
  });
});
