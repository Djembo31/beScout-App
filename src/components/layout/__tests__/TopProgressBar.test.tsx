/**
 * TopProgressBar tests — Slice 266 Cold-Start UX.
 *
 * Fokus auf Pre-Mortem #4 (Fade-Timer-Race) + AC-01/02/03/06.
 * Wir mocken die drei Hook-Quellen direkt damit kein Auth/Query-Setup nötig ist.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Hoist mock-state so vi.mock factories can reference it (vi.hoisted Pattern, testing.md).
const { mockState } = vi.hoisted(() => ({
  mockState: {
    user: null as { id: string } | null,
    authLoading: false,
    profileLoading: false,
    walletLoading: false,
    ticketsLoading: false,
  },
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({
    user: mockState.user,
    loading: mockState.authLoading,
    profileLoading: mockState.profileLoading,
    profile: null,
    refreshProfile: vi.fn(),
    platformRole: null,
    clubAdmin: null,
  }),
}));

vi.mock('@/lib/hooks/useWallet', () => ({
  useWallet: () => ({
    balanceCents: null,
    lockedBalanceCents: null,
    isLoading: mockState.walletLoading,
    isFetching: false,
    dataUpdatedAt: 0,
    error: null,
  }),
}));

vi.mock('@/lib/queries/tickets', () => ({
  useUserTickets: () => ({ data: undefined, isLoading: mockState.ticketsLoading }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { TopProgressBar } from '../TopProgressBar';

beforeEach(() => {
  mockState.user = null;
  mockState.authLoading = false;
  mockState.profileLoading = false;
  mockState.walletLoading = false;
  mockState.ticketsLoading = false;
  vi.useRealTimers();
});

describe('TopProgressBar', () => {
  it('renders nothing when logged-out and not loading (AC-03)', () => {
    mockState.user = null;
    mockState.authLoading = false;
    const { container } = render(<TopProgressBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders bar while authLoading=true', () => {
    mockState.authLoading = true;
    render(<TopProgressBar />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-label', 'appLoading');
  });

  it('renders bar while user is set and walletLoading=true (AC-01)', () => {
    mockState.user = { id: 'u1' };
    mockState.walletLoading = true;
    render(<TopProgressBar />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders bar while user is set and ticketsLoading=true', () => {
    mockState.user = { id: 'u1' };
    mockState.ticketsLoading = true;
    render(<TopProgressBar />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders bar while user is set and profileLoading=true', () => {
    mockState.user = { id: 'u1' };
    mockState.profileLoading = true;
    render(<TopProgressBar />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hides bar after fade-out delay when loading resolves (AC-02 anti-flicker)', async () => {
    vi.useFakeTimers();
    mockState.user = { id: 'u1' };
    mockState.walletLoading = true;
    const { rerender } = render(<TopProgressBar />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Resolve all loading
    mockState.walletLoading = false;
    rerender(<TopProgressBar />);

    // Bar still visible during fade (200ms)
    expect(screen.queryByRole('status')).toBeInTheDocument();

    // After fade-out delay, bar removed
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not render when user is set but no critical query is loading', () => {
    mockState.user = { id: 'u1' };
    mockState.authLoading = false;
    mockState.profileLoading = false;
    mockState.walletLoading = false;
    mockState.ticketsLoading = false;
    const { container } = render(<TopProgressBar />);
    expect(container.firstChild).toBeNull();
  });

  it('cancels fade-out if loading becomes true mid-fade (Pre-Mortem #4)', () => {
    vi.useFakeTimers();
    mockState.user = { id: 'u1' };
    mockState.walletLoading = true;
    const { rerender } = render(<TopProgressBar />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Resolve → fade starts
    mockState.walletLoading = false;
    rerender(<TopProgressBar />);

    // Mid-fade (100ms in), loading flips back true
    act(() => {
      vi.advanceTimersByTime(100);
    });
    mockState.walletLoading = true;
    rerender(<TopProgressBar />);

    // Fade-out timer should be cleared, bar stays visible
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
