import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('lucide-react');
  const stubs: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) stubs[key] = typeof actual[key] === 'function' ? () => null : actual[key];
  return stubs;
});
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(' '), fmtScout: (n: number) => String(n) }));
vi.mock('@/lib/services/wallet', () => ({ formatScout: (n: number) => `${n} CR` }));
vi.mock('@/lib/adminRoles', () => ({ canPerformAction: () => true }));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Skeleton: () => <div data-testid="skeleton" />,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div data-testid="modal">{children}</div> : null,
}));
vi.mock('@/components/player', () => ({ PositionBadge: () => null }));
vi.mock('@/components/providers/AuthProvider', () => { const u = { id: 'u1' }; return { useUser: () => ({ user: u }) }; });
vi.mock('@/components/providers/ToastProvider', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
const mockGetStats = vi.fn(); const mockGetPlayers = vi.fn(); const mockGetFollowers = vi.fn(); const mockGetSubs = vi.fn();
vi.mock('@/lib/services/club', () => ({ getClubDashboardStats: (...a: unknown[]) => mockGetStats(...a), getClubFollowerCount: (...a: unknown[]) => mockGetFollowers(...a) }));
vi.mock('@/lib/services/clubSubscriptions', () => ({ getClubSubscribers: (...a: unknown[]) => mockGetSubs(...a) }));
vi.mock('@/lib/services/posts', () => ({ createClubNews: vi.fn() }));
vi.mock('@/lib/services/players', () => ({ getPlayersByClubId: (...a: unknown[]) => mockGetPlayers(...a), centsToBsd: (n: number) => n / 100 }));

import AdminOverviewTab from '../AdminOverviewTab';

const club = { id: 'c1', name: 'Test FC', slug: 'test-fc', admin_role: 'owner' } as any;

describe('AdminOverviewTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStats.mockResolvedValue({ totalVolumeCents: 0, totalTrades: 0, activePlayers: 0 });
    mockGetPlayers.mockResolvedValue([]);
    mockGetFollowers.mockResolvedValue(0);
    mockGetSubs.mockResolvedValue({ total: 0, revenueCents: 0 });
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<AdminOverviewTab club={club} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('loads stats on mount', async () => {
    renderWithProviders(<AdminOverviewTab club={club} />);
    await waitFor(() => { expect(mockGetStats).toHaveBeenCalledWith('c1'); });
  });
});
