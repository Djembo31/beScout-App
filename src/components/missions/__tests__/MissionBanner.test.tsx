import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => { const S = () => null; return { Target: S, Calendar: S, Check: S, ChevronDown: S, Gift: S, Clock: S, Shield: S }; });
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(' '), fmtScout: (n: number) => String(n) }));
vi.mock('@/components/providers/AuthProvider', () => { const u = { id: 'u1' }; return { useUser: () => ({ user: u }) }; });
// Slice 152d: WalletProvider entfernt — useWallet-Hook + Helpers via Query-Cache.
vi.mock('@/lib/hooks/useWallet', () => ({
  useWallet: () => ({
    balanceCents: null,
    lockedBalanceCents: null,
    isLoading: false,
    isFetching: false,
    dataUpdatedAt: 0,
    error: null,
  }),
  useIsBalanceFresh: () => false,
  setWalletBalance: vi.fn(),
  setWalletLockedBalance: vi.fn(),
  invalidateWallet: vi.fn(),
  removeWalletFromCache: vi.fn(),
}));
// Slice 151b-RESET: MissionBanner now reads followedClubs via useFollowedClubs hook.
// Keep ClubProvider mock as no-op for any stray imports; mock useFollowedClubs directly.
vi.mock('@/components/providers/ClubProvider', () => ({ useClub: () => ({ activeClub: null, setActiveClub: () => {}, loading: false }) }));
vi.mock('@/lib/hooks/useFollowedClubs', () => ({ useFollowedClubs: () => ({ data: [], isLoading: false, isFetching: false, error: null }) }));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));

const mockGetMissions = vi.fn();
vi.mock('@/lib/services/missions', () => ({
  getUserMissions: (...a: unknown[]) => mockGetMissions(...a),
  claimMissionReward: vi.fn(),
  // AR-54 J7: locale-aware title resolver (DE fallback)
  resolveMissionTitle: (def: { title: string; title_tr: string | null }, locale: string) =>
    locale === 'tr' && def.title_tr ? def.title_tr : def.title,
}));

import MissionBanner from '../MissionBanner';

describe('MissionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMissions.mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<MissionBanner />);
    expect(container).toBeDefined();
  });

  it('loads missions on mount', async () => {
    renderWithProviders(<MissionBanner />);
    await waitFor(() => { expect(mockGetMissions).toHaveBeenCalledWith('u1'); });
  });
});
