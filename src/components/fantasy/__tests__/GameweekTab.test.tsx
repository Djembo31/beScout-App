import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { ChevronLeft: Stub, ChevronRight: Stub, Trophy: Stub, Clock: Stub, Eye: Stub, Loader2: Stub, Star: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div data-testid="modal">{children}</div> : null,
}));
vi.mock('@/lib/clubs', () => ({ getClub: () => null }));

const mockGetFixtures = vi.fn();
vi.mock('@/lib/services/fixtures', () => ({
  getFixturesByGameweek: (...args: unknown[]) => mockGetFixtures(...args),
  getFixturePlayerStats: vi.fn().mockResolvedValue([]),
}));

import { GameweekTab } from '../GameweekTab';

describe('GameweekTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFixtures.mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<GameweekTab />);
    expect(container.innerHTML).not.toBe('');
  });

  it('loads fixtures on mount', async () => {
    renderWithProviders(<GameweekTab />);
    await waitFor(() => {
      expect(mockGetFixtures).toHaveBeenCalledWith(1); // default gameweek
    });
  });

  it('renders content', () => {
    const { container } = renderWithProviders(<GameweekTab />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
  });
});
