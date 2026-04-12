import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Heart: Stub, HeartOff: Stub, Loader2: Stub, ArrowUpDown: Stub, Bell: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/clubs', () => ({ getClubName: () => 'Test FC' }));
vi.mock('@/lib/services/watchlist', () => ({
  removeFromWatchlist: vi.fn(),
  updateAlertThreshold: vi.fn(),
}));
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'u1' };
  return { useUser: () => ({ user: stableUser }) };
});
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock('@/components/player', () => ({
  PlayerPhoto: () => null, getL5Color: () => '', getL5Bg: () => '', PositionBadge: () => null,
}));
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ message }: { message: string }) => <div data-testid="empty">{message}</div>,
}));
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: vi.fn() } }));
vi.mock('@/lib/queries/keys', () => ({ qk: {} }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import WatchlistView from '../WatchlistView';

describe('WatchlistView', () => {
  it('shows empty state when no players', () => {
    renderWithProviders(<WatchlistView players={[]} watchlistEntries={[]} />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });

  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(<WatchlistView players={[]} watchlistEntries={[]} />);
    expect(container.innerHTML).not.toBe('');
  });
});
