import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => { const S = () => null; return { Target: S, Calendar: S, Check: S, ChevronDown: S, Gift: S, Clock: S, Shield: S }; });
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(' '), fmtScout: (n: number) => String(n) }));
vi.mock('@/components/providers/AuthProvider', () => { const u = { id: 'u1' }; return { useUser: () => ({ user: u }) }; });
vi.mock('@/components/providers/WalletProvider', () => ({ useWallet: () => ({ setBalanceCents: vi.fn() }) }));
vi.mock('@/components/providers/ClubProvider', () => ({ useClub: () => ({ followedClubs: [] }) }));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));

const mockGetMissions = vi.fn();
vi.mock('@/lib/services/missions', () => ({
  getUserMissions: (...a: unknown[]) => mockGetMissions(...a),
  claimMissionReward: vi.fn(),
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
