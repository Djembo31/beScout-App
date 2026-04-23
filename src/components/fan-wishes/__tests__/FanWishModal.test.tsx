/**
 * Slice 159 — Tests fuer FanWishModal Ferrari-Refactor.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSubmitFanWish = vi.fn();
const mockAddToast = vi.fn();
const mockLogSilentCatch = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@/lib/services/fanWishes', () => ({
  submitFanWish: (...a: unknown[]) => mockSubmitFanWish(...a),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => mockLogSilentCatch(tag, err),
  logSilentRejects: () => {},
}));

vi.mock('@/lib/errorMessages', () => ({
  mapErrorToKey: (_err: unknown) => 'errorGeneric',
  normalizeError: (err: unknown) => err,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/ui', () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode; title?: string; onClose?: () => void }) =>
    open ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) =>
    React.createElement('button', { onClick, disabled, 'data-testid': 'submit-btn' }, children),
}));

import { FanWishModal } from '../FanWishModal';

function makeClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 }, mutations: { retry: false } },
  });
  qc.invalidateQueries = mockInvalidateQueries as never;
  return qc;
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('FanWishModal (Ferrari-Refactor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitFanWish.mockResolvedValue({ success: true });
  });

  it('calls submitFanWish with club-wish vars on submit', async () => {
    const qc = makeClient();
    render(
      React.createElement(FanWishModal, {
        open: true, onClose: vi.fn(), defaultTab: 'club', defaultClubName: 'Werder',
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    expect(mockSubmitFanWish).toHaveBeenCalledWith(expect.objectContaining({
      wishType: 'club',
      clubName: 'Werder',
    }));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('success', 'success'));
  });

  it('onError shows errors-namespace toast (not raw key)', async () => {
    mockSubmitFanWish.mockResolvedValue({ success: false, error: 'wish_duplicate' });
    const qc = makeClient();
    render(
      React.createElement(FanWishModal, {
        open: true, onClose: vi.fn(), defaultTab: 'club', defaultClubName: 'Werder',
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith('errorGeneric', 'error'),
    );
  });

  it('errorTag fanWish.submit routed to logSilentCatch on failure', async () => {
    mockSubmitFanWish.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    render(
      React.createElement(FanWishModal, {
        open: true, onClose: vi.fn(), defaultTab: 'club', defaultClubName: 'Werder',
      }),
      { wrapper: wrapperFor(qc) },
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    await waitFor(() =>
      expect(mockLogSilentCatch).toHaveBeenCalledWith('fanWish.submit', expect.any(Error)),
    );
  });

  it('submit button disabled during in-flight (isPending guard)', async () => {
    mockSubmitFanWish.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)),
    );
    const qc = makeClient();
    render(
      React.createElement(FanWishModal, {
        open: true, onClose: vi.fn(), defaultTab: 'club', defaultClubName: 'Werder',
      }),
      { wrapper: wrapperFor(qc) },
    );

    act(() => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    await waitFor(() =>
      expect((screen.getByTestId('submit-btn') as HTMLButtonElement).disabled).toBe(true),
    );
    // Second click while disabled is no-op at HTML-level.
    fireEvent.click(screen.getByTestId('submit-btn'));

    // onSuccess clears form fields → canSubmit stays false (name < 2 chars),
    // so button remains disabled post-resolve — check service call-count instead.
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('success', 'success'));
    expect(mockSubmitFanWish).toHaveBeenCalledTimes(1);
  });
});
