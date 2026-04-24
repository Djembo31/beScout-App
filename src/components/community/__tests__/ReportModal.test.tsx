/**
 * Slice 159 — Tests fuer ReportModal Ferrari-Refactor.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockReportContent = vi.fn();
const mockAddToast = vi.fn();
const mockLogSilentCatch = vi.fn();

vi.mock('@/lib/services/contentReports', () => ({
  reportContent: (...a: unknown[]) => mockReportContent(...a),
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

// Slice 181: ReportModal nutzt jetzt Dialog (Radix-Wrapper) statt Modal.
// Stub Dialog statt Modal — gleiche Render-Semantik (footer+children when open).
vi.mock('@/components/ui', () => ({
  Dialog: ({ open, footer, children }: { open: boolean; footer: React.ReactNode; children: React.ReactNode; title?: string; onClose?: () => void; size?: string; preventClose?: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'modal' },
      children,
      React.createElement('div', { 'data-testid': 'footer' }, footer),
    ) : null,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; size?: string; className?: string }) =>
    React.createElement('button', { onClick, disabled, 'data-testid': 'submit-btn' }, children),
}));

import ReportModal from '../ReportModal';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('ReportModal (Ferrari-Refactor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReportContent.mockResolvedValue({ success: true });
  });

  it('calls reportContent on submit (after reason selected)', async () => {
    const qc = makeClient();
    const onClose = vi.fn();
    render(
      React.createElement(ReportModal, {
        open: true, onClose, targetType: 'post' as never, targetId: 't1',
      }),
      { wrapper: wrapperFor(qc) },
    );

    // Click first reason (spam_content) — reason >= 5 chars → canSubmit true.
    fireEvent.click(screen.getByText('reportReasonSpam'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    expect(mockReportContent).toHaveBeenCalledWith('post', 't1', 'spam_content');
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('reportSubmitted', 'success'));
    expect(onClose).toHaveBeenCalled();
  });

  it('error path shows toast with errors-namespace resolved key', async () => {
    mockReportContent.mockResolvedValue({ success: false, error: 'report_failed' });
    const qc = makeClient();
    render(
      React.createElement(ReportModal, {
        open: true, onClose: vi.fn(), targetType: 'post' as never, targetId: 't1',
      }),
      { wrapper: wrapperFor(qc) },
    );

    fireEvent.click(screen.getByText('reportReasonSpam'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith('errorGeneric', 'error'),
    );
  });

  it('errorTag community.report routed to logSilentCatch on failure', async () => {
    mockReportContent.mockResolvedValue({ success: false, error: 'boom' });
    const qc = makeClient();
    render(
      React.createElement(ReportModal, {
        open: true, onClose: vi.fn(), targetType: 'post' as never, targetId: 't1',
      }),
      { wrapper: wrapperFor(qc) },
    );

    fireEvent.click(screen.getByText('reportReasonSpam'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    await waitFor(() =>
      expect(mockLogSilentCatch).toHaveBeenCalledWith('community.report', expect.any(Error)),
    );
  });

  it('submit button disabled during in-flight (isPending guard)', async () => {
    mockReportContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50)),
    );
    const qc = makeClient();
    render(
      React.createElement(ReportModal, {
        open: true, onClose: vi.fn(), targetType: 'post' as never, targetId: 't1',
      }),
      { wrapper: wrapperFor(qc) },
    );

    fireEvent.click(screen.getByText('reportReasonSpam'));
    act(() => {
      fireEvent.click(screen.getByTestId('submit-btn'));
    });

    // During in-flight, button is disabled.
    await waitFor(() =>
      expect((screen.getByTestId('submit-btn') as HTMLButtonElement).disabled).toBe(true),
    );
    // Second click while disabled is no-op at HTML-level.
    fireEvent.click(screen.getByTestId('submit-btn'));

    // Wait for mock to resolve (onSuccess clears selectedReason → canSubmit false,
    // so button stays disabled post-resolve — don't assert disabled=false here).
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('reportSubmitted', 'success'));
    expect(mockReportContent).toHaveBeenCalledTimes(1);
  });
});
