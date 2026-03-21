import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Search: Stub, Loader2: Stub, X: Stub, Clock: Stub, Trash2: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/search', () => ({
  spotlightSearch: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/components/player/index', () => ({
  PlayerPhoto: () => null,
  PositionBadge: () => null,
  getL5Color: () => 'text-green-500',
}));
vi.mock('@/components/ui/RangBadge', () => ({
  RangBadge: () => null,
}));
vi.mock('@/lib/clubs', () => ({
  getClub: () => null,
}));
vi.mock('@/lib/services/players', () => ({
  centsToBsd: (n: number) => n / 100,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import SearchOverlay from '../SearchOverlay';

describe('SearchOverlay', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom */ }
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <SearchOverlay open={false} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders search input when open', () => {
    renderWithProviders(
      <SearchOverlay open={true} onClose={vi.fn()} />,
    );
    const input = screen.getByPlaceholderText('placeholder');
    expect(input).toBeInTheDocument();
  });

  it('shows no recent searches when localStorage is empty', () => {
    renderWithProviders(
      <SearchOverlay open={true} onClose={vi.fn()} />,
    );
    // No recent items should be rendered
    expect(screen.queryByText('recentSearches')).not.toBeInTheDocument();
  });
});
