import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import AdminRevenueTab from '../AdminRevenueTab';
import type { ClubWithAdmin } from '@/types';

// ============================================
// Mocks
// ============================================
const mockGetClubDashboardStats = vi.fn();
const mockGetClubTradingFees = vi.fn();
const mockGetPlayersByClubId = vi.fn();
const mockCentsToBsd = vi.fn((n: number) => n / 100);
const mockGetAllVotes = vi.fn();
const mockFormatScout = vi.fn((n: number) => String(n));
const mockFmtScout = vi.fn((n: number) => String(n));

vi.mock('@/lib/services/club', () => ({
  getClubDashboardStats: (...args: unknown[]) => mockGetClubDashboardStats(...args),
  getClubTradingFees: (...args: unknown[]) => mockGetClubTradingFees(...args),
}));

vi.mock('@/lib/services/players', () => ({
  getPlayersByClubId: (...args: unknown[]) => mockGetPlayersByClubId(...(args as [string])),
  centsToBsd: (...args: unknown[]) => mockCentsToBsd(...(args as [number])),
}));

vi.mock('@/lib/services/votes', () => ({
  getAllVotes: (...args: unknown[]) => mockGetAllVotes(...args),
}));

vi.mock('@/lib/services/wallet', () => ({
  formatScout: (...args: unknown[]) => mockFormatScout(...(args as [number])),
}));

vi.mock('@/lib/utils', () => ({
  fmtScout: (...args: unknown[]) => mockFmtScout(...(args as [number])),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Fixtures
// ============================================
const club = { id: 'club-1', name: 'Test Club' } as ClubWithAdmin;

const statsFixture = {
  ipo_revenue_cents: 50000,
  total_players: 25,
  total_holdings: 100,
};

const playersFixture = [
  { id: 'p1', volume_24h: 10000 },
  { id: 'p2', volume_24h: 5000 },
];

const votesFixture = [
  { id: 'v1', total_votes: 10, cost_bsd: 100 },
  { id: 'v2', total_votes: 5, cost_bsd: 200 },
];

const tradingFeesFixture = {
  totalClubFee: 3000,
  totalPlatformFee: 5000,
  totalPbtFee: 2000,
  tradeCount: 42,
};

function setupMocksResolved() {
  mockGetClubDashboardStats.mockResolvedValue(statsFixture);
  mockGetPlayersByClubId.mockResolvedValue(playersFixture);
  mockGetAllVotes.mockResolvedValue(votesFixture);
  mockGetClubTradingFees.mockResolvedValue(tradingFeesFixture);
}

function setupMocksNeverResolve() {
  mockGetClubDashboardStats.mockReturnValue(new Promise(() => {}));
  mockGetPlayersByClubId.mockReturnValue(new Promise(() => {}));
  mockGetAllVotes.mockReturnValue(new Promise(() => {}));
  mockGetClubTradingFees.mockReturnValue(new Promise(() => {}));
}

// ============================================
// Tests
// ============================================
describe('AdminRevenueTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 1. Loading state ---
  it('shows Skeleton elements while data is loading', () => {
    setupMocksNeverResolve();
    const { container } = renderWithProviders(<AdminRevenueTab club={club} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  // --- 2. Renders title ---
  it('renders the revenue title', () => {
    setupMocksNeverResolve();
    renderWithProviders(<AdminRevenueTab club={club} />);
    expect(screen.getByText('revenueTitle')).toBeInTheDocument();
  });

  // --- 3. Total revenue card ---
  it('shows computed total revenue (ipo + votes + clubFee)', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminRevenueTab club={club} />);

    // totalRevenue = ipo_revenue_cents(50000) + voteRevenue(10*100 + 5*200 = 2000) + clubFee(3000) = 55000
    await waitFor(() => {
      expect(mockFormatScout).toHaveBeenCalledWith(55000);
    });

    // The total card has text-gold class and shows the total
    const totalCards = screen.getAllByText(/55000/);
    expect(totalCards.length).toBeGreaterThanOrEqual(1);
  });

  // --- 4. IPO revenue card ---
  it('shows IPO revenue from stats via formatScout', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminRevenueTab club={club} />);

    await waitFor(() => {
      expect(mockFormatScout).toHaveBeenCalledWith(50000);
    });

    expect(screen.getByText('dpcIpoRevenue')).toBeInTheDocument();
  });

  // --- 5. Trading fees card ---
  it('shows trading fee revenue (clubFeeRevenue)', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminRevenueTab club={club} />);

    await waitFor(() => {
      expect(mockFormatScout).toHaveBeenCalledWith(3000);
    });

    expect(screen.getByText('tradingFees')).toBeInTheDocument();
  });

  // --- 6. Vote revenue card ---
  it('shows computed vote revenue', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminRevenueTab club={club} />);

    // voteRevenue = 10*100 + 5*200 = 2000
    await waitFor(() => {
      expect(mockFormatScout).toHaveBeenCalledWith(2000);
    });

    expect(screen.getByText('voteRevenue')).toBeInTheDocument();
  });

  // --- 7. Fee breakdown shows all 4 sub-items ---
  it('shows fee breakdown with clubFee, pbtFee, platformFee, and volume', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminRevenueTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('feeBreakdown')).toBeInTheDocument();
    });

    expect(screen.getByText('clubFee')).toBeInTheDocument();
    expect(screen.getByText('pbtFee')).toBeInTheDocument();
    expect(screen.getByText('platformFee')).toBeInTheDocument();
    expect(screen.getByText('tradingVol24h')).toBeInTheDocument();
  });

  // --- 8. Trade count explanation ---
  it('shows fee explanation text with trade count', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminRevenueTab club={club} />);

    await waitFor(() => {
      // useTranslations mock returns the key; t('feeExplanation', { count: 42 }) returns 'feeExplanation'
      expect(screen.getByText('feeExplanation')).toBeInTheDocument();
    });
  });

  // --- 9. Skeletons disappear after data loads ---
  it('removes all skeletons after data loads', async () => {
    setupMocksResolved();
    const { container } = renderWithProviders(<AdminRevenueTab club={club} />);

    // Initially has skeletons
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(1);

    // After loading completes, skeletons should be gone
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
    });
  });

  // --- 10. Error handling ---
  it('logs error to console but does not crash on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetClubDashboardStats.mockRejectedValue(new Error('Network error'));
    mockGetPlayersByClubId.mockRejectedValue(new Error('Network error'));
    mockGetAllVotes.mockRejectedValue(new Error('Network error'));
    mockGetClubTradingFees.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<AdminRevenueTab club={club} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AdminRevenue] loadData:',
        expect.any(Error),
      );
    });

    // Component should still render the title without crashing
    expect(screen.getByText('revenueTitle')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  // --- 11. centsToBsd called correctly ---
  it('calls centsToBsd with the sum of player volumes', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminRevenueTab club={club} />);

    // sum of volume_24h = 10000 + 5000 = 15000
    await waitFor(() => {
      expect(mockCentsToBsd).toHaveBeenCalledWith(15000);
    });
  });

  // --- 12. Club prop change triggers reload ---
  it('reloads data when club.id changes', async () => {
    setupMocksResolved();
    const { rerender } = renderWithProviders(<AdminRevenueTab club={club} />);

    await waitFor(() => {
      expect(mockGetClubDashboardStats).toHaveBeenCalledWith('club-1');
    });

    const club2 = { id: 'club-2', name: 'Other Club' } as ClubWithAdmin;
    rerender(<AdminRevenueTab club={club2} />);

    await waitFor(() => {
      expect(mockGetClubDashboardStats).toHaveBeenCalledWith('club-2');
    });

    expect(mockGetClubTradingFees).toHaveBeenCalledWith('club-2');
    expect(mockGetPlayersByClubId).toHaveBeenCalledWith('club-2');
    expect(mockGetAllVotes).toHaveBeenCalledWith('club-2');
  });
});
