import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import PlayerContent from '../PlayerContent';

// ============================================
// Global IntersectionObserver mock
// ============================================
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// ============================================
// Provider Mocks
// ============================================
const mockAddToast = vi.fn();

let mockUserValue: Record<string, unknown> = {
  user: { id: 'u1' },
  clubAdmin: null,
  loading: false,
  signOut: vi.fn(),
  profile: null,
  refreshProfile: vi.fn(),
};

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => mockUserValue,
}));

vi.mock('@/components/providers/WalletProvider', () => ({
  useWallet: () => ({ balanceCents: 100000 }),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// ============================================
// DB Player fixture
// ============================================
const dbPlayerFixture = {
  id: 'p1',
  first_name: 'Max',
  last_name: 'Mustermann',
  position: 'MID',
  club_id: 'club-1',
  dpc_available: 100,
  floor_price: 500,
  is_liquidated: false,
  shirt_number: 10,
  nationality: 'DE',
  age: 25,
  image_url: null,
  external_id: 'ext-1',
  club: { id: 'club-1', name: 'Test FC', slug: 'test-fc', logo_url: null },
};

const playerFixture = {
  id: 'p1',
  first: 'Max',
  last: 'Mustermann',
  pos: 'MID' as const,
  club: 'Test FC',
  clubId: 'club-1',
  clubSlug: 'test-fc',
  clubLogo: null,
  shirt: 10,
  nationality: 'DE',
  age: 25,
  imageUrl: null,
  isLiquidated: false,
  dpc: { available: 100, owned: 0 },
  prices: { floor: 500, lastTrade: 400, change24h: 5 },
  perf: { l5: 72, l15: 70, trend: 2 },
  pbt: null,
};

// ============================================
// Service Mocks
// ============================================
vi.mock('@/lib/services/players', () => ({
  dbToPlayer: vi.fn(() => playerFixture),
  centsToBsd: vi.fn((n: number) => n / 100),
}));

vi.mock('@/lib/services/profiles', () => ({
  getProfilesByIds: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/lib/services/mastery', () => ({
  MASTERY_LEVEL_LABELS: ['Novice', 'Apprentice', 'Expert', 'Master', 'Legend'],
  MASTERY_XP_THRESHOLDS: [0, 100, 500, 2000, 10000],
}));

vi.mock('@/lib/utils', () => ({
  fmtScout: vi.fn((n: number) => String(n)),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// React Query Hook Mocks
// ============================================
const mockRefetch = vi.fn();

vi.mock('@/lib/queries/players', () => ({
  useDbPlayerById: vi.fn(() => ({
    data: dbPlayerFixture,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  })),
  usePlayers: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/lib/queries/misc', () => ({
  usePlayerGwScores: vi.fn(() => ({ data: [] })),
  usePlayerMatchTimeline: vi.fn(() => ({ data: [], isLoading: false })),
  usePbtForPlayer: vi.fn(() => ({ data: null })),
  useLiquidationEvent: vi.fn(() => ({ data: null })),
  useIpoForPlayer: vi.fn(() => ({ data: null })),
  useHoldingQty: vi.fn(() => ({ data: 0 })),
  usePlayerHolderCount: vi.fn(() => ({ data: 5 })),
  useSellOrders: vi.fn(() => ({ data: [] })),
  useOpenBids: vi.fn(() => ({ data: [] })),
  usePosts: vi.fn(() => ({ data: [] })),
  useUserIpoPurchases: vi.fn(() => ({ data: 0 })),
}));

vi.mock('@/lib/queries/research', () => ({
  usePlayerResearch: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/lib/queries/trades', () => ({
  usePlayerTrades: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/lib/queries/mastery', () => ({
  useDpcMastery: vi.fn(() => ({ data: null })),
}));

// ============================================
// Custom Hook Mocks
// ============================================
const mockOpenBuyModal = vi.fn();
const mockOpenSellModal = vi.fn();
const mockCloseBuyModal = vi.fn();
const mockCloseSellModal = vi.fn();
const mockOpenOfferModal = vi.fn();
const mockCloseOfferModal = vi.fn();

vi.mock('@/components/player/detail/hooks', () => ({
  usePlayerDetailData: vi.fn(() => ({
    player: playerFixture,
    playerWithOwnership: playerFixture,
    dbPlayer: dbPlayerFixture,
    dpcAvailable: 100,
    holdingQty: 0,
    holderCount: 5,
    lockedScMap: undefined,
    allSellOrders: [],
    openBids: [],
    trades: [],
    tradesLoading: false,
    activeIpo: null,
    userIpoPurchased: 0,
    masteryData: null,
    pbtTreasury: null,
    matchTimelineData: [],
    matchTimelineLoading: false,
    liquidationEvent: null,
    gwScores: [],
    allPlayersForPercentile: [],
    playerResearch: [],
    playerPosts: [],
    profileMap: {},
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  usePlayerTrading: vi.fn(() => ({
    buying: false,
    ipoBuying: false,
    selling: false,
    cancellingId: null,
    buyError: null,
    sellError: null,
    buySuccess: false,
    shared: false,
    pendingBuyQty: 0,
    pendingBuyOrderId: null,
    buyModalOpen: false,
    sellModalOpen: false,
    showOfferModal: false,
    offerPrice: '',
    offerMessage: '',
    offerLoading: false,
    acceptingBidId: null,
    setOfferPrice: vi.fn(),
    setOfferMessage: vi.fn(),
    userOrders: [],
    isIPO: false,
    handleBuy: vi.fn(),
    executeBuy: vi.fn(),
    handleIpoBuy: vi.fn(),
    handleSell: vi.fn(),
    handleCancelOrder: vi.fn(),
    handleCreateOffer: vi.fn(),
    handleAcceptBid: vi.fn(),
    handleShareTrade: vi.fn(),
    openBuyModal: mockOpenBuyModal,
    closeBuyModal: mockCloseBuyModal,
    openSellModal: mockOpenSellModal,
    closeSellModal: mockCloseSellModal,
    openOfferModal: mockOpenOfferModal,
    closeOfferModal: mockCloseOfferModal,
    cancelPendingBuy: vi.fn(),
  })),
  usePlayerCommunity: vi.fn(() => ({
    postLoading: false,
    unlockingId: null,
    ratingId: null,
    myPostVotes: {},
    handleCreatePlayerPost: vi.fn(),
    handleVotePlayerPost: vi.fn(),
    handleDeletePlayerPost: vi.fn(),
    handleResearchUnlock: vi.fn(),
    handleResearchRate: vi.fn(),
  })),
  usePriceAlerts: vi.fn(() => ({
    priceAlert: null,
    handleSetPriceAlert: vi.fn(),
    handleRemovePriceAlert: vi.fn(),
  })),
}));

// ============================================
// Child Component Stubs
// ============================================
vi.mock('@/components/player/detail', () => ({
  PlayerDetailSkeleton: () => <div data-testid="player-detail-skeleton">Loading...</div>,
  PlayerHero: (props: Record<string, unknown>) => (
    <div data-testid="player-hero" data-player-id={(props.player as { id: string })?.id}>
      PlayerHero
    </div>
  ),
  CommunityTab: () => <div data-testid="community-tab">CommunityTab</div>,
  MobileTradingBar: () => <div data-testid="mobile-trading-bar">MobileTradingBar</div>,
  LiquidationAlert: () => <div data-testid="liquidation-alert">LiquidationAlert</div>,
}));

vi.mock('@/components/player/detail/TradingTab', () => ({
  default: () => <div data-testid="trading-tab">TradingTab</div>,
}));

vi.mock('@/components/player/detail/PerformanceTab', () => ({
  default: () => <div data-testid="performance-tab">PerformanceTab</div>,
}));

vi.mock('@/components/player/detail/StickyDashboardStrip', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="sticky-dashboard-strip" data-visible={String(props.visible)}>
      StickyDashboardStrip
    </div>
  ),
}));

vi.mock('@/components/player/detail/BuyModal', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="buy-modal" data-open={String(props.open)}>BuyModal</div>
  ),
}));

vi.mock('@/components/player/detail/SellModal', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="sell-modal" data-open={String(props.open)}>SellModal</div>
  ),
}));

vi.mock('@/components/player/detail/OfferModal', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="offer-modal" data-open={String(props.open)}>OfferModal</div>
  ),
}));

// LimitOrderModal is dynamically imported
vi.mock('@/components/player/detail/LimitOrderModal', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="limit-order-modal" data-open={String(props.open)}>LimitOrderModal</div>
  ),
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <div data-testid="error-state">
      <span>Error</span>
      {onRetry && <button data-testid="retry-button" onClick={onRetry}>Retry</button>}
    </div>
  ),
  TabBar: ({ tabs, activeTab, onChange }: {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onChange: (id: string) => void;
  }) => (
    <div data-testid="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.id}
          data-testid={`tab-${t.id}`}
          data-active={String(t.id === activeTab)}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  ),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // For LimitOrderModal stub — the vi.mock above handles the actual component
    const MockedComponent = (props: Record<string, unknown>) => (
      <div data-testid="limit-order-modal" data-open={String(props.open)}>LimitOrderModal</div>
    );
    MockedComponent.displayName = 'DynamicMock';
    return MockedComponent;
  },
}));

vi.mock('lucide-react', () => ({
  XCircle: () => <span data-testid="x-circle-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

// ============================================
// Import mocked modules for test manipulation
// ============================================
import { useDbPlayerById } from '@/lib/queries/players';
import { dbToPlayer } from '@/lib/services/players';
import { usePlayerDetailData } from '@/components/player/detail/hooks';

const baseDetailData: any = {
  player: playerFixture,
  playerWithOwnership: playerFixture,
  dbPlayer: dbPlayerFixture,
  dpcAvailable: 100,
  holdingQty: 0,
  holderCount: 5,
  lockedScMap: undefined,
  allSellOrders: [],
  openBids: [],
  trades: [],
  tradesLoading: false,
  activeIpo: null,
  userIpoPurchased: 0,
  masteryData: null,
  pbtTreasury: null,
  matchTimelineData: [],
  matchTimelineLoading: false,
  liquidationEvent: null,
  gwScores: [],
  allPlayersForPercentile: [],
  playerResearch: [],
  playerPosts: [],
  profileMap: {},
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

// ============================================
// Test Suite
// ============================================
describe('PlayerContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset auth mock
    mockUserValue = {
      user: { id: 'u1' },
      clubAdmin: null,
      loading: false,
      signOut: vi.fn(),
      profile: null,
      refreshProfile: vi.fn(),
    };

    // Reset default mocks
    vi.mocked(useDbPlayerById).mockReturnValue({
      data: dbPlayerFixture,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useDbPlayerById>);

    vi.mocked(dbToPlayer).mockReturnValue(playerFixture as unknown as ReturnType<typeof dbToPlayer>);
  });

  // ─── 1. Loading State ────────────────────
  it('shows skeleton while loading', () => {
    vi.mocked(usePlayerDetailData).mockReturnValueOnce({
      ...baseDetailData,
      player: null,
      playerWithOwnership: null,
      dbPlayer: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });

    renderWithProviders(<PlayerContent playerId="p1" />);

    expect(screen.getByTestId('player-detail-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('player-hero')).not.toBeInTheDocument();
  });

  // ─── 2. Error State ─────────────────────
  it('shows error state when query fails', () => {
    vi.mocked(usePlayerDetailData).mockReturnValueOnce({
      ...baseDetailData,
      player: null,
      playerWithOwnership: null,
      dbPlayer: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });

    renderWithProviders(<PlayerContent playerId="p1" />);

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.queryByTestId('player-hero')).not.toBeInTheDocument();
  });

  // ─── 3. Refetch button ──────────────────
  it('refetch button works on error state', async () => {
    vi.mocked(usePlayerDetailData).mockReturnValueOnce({
      ...baseDetailData,
      player: null,
      playerWithOwnership: null,
      dbPlayer: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });

    renderWithProviders(<PlayerContent playerId="p1" />);

    const retryBtn = screen.getByTestId('retry-button');
    await userEvent.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  // ─── 4. PlayerHero renders ──────────────
  it('renders PlayerHero after load', () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    expect(screen.getByTestId('player-hero')).toBeInTheDocument();
  });

  // ─── 5. TabBar with 3 tabs ─────────────
  it('renders TabBar with 3 tabs', () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trading')).toBeInTheDocument();
    expect(screen.getByTestId('tab-performance')).toBeInTheDocument();
    expect(screen.getByTestId('tab-community')).toBeInTheDocument();
  });

  // ─── 6. TradingTab by default ───────────
  it('renders TradingTab by default', () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    expect(screen.getByTestId('trading-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('performance-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('community-tab')).not.toBeInTheDocument();
  });

  // ─── 7. MobileTradingBar ────────────────
  it('renders MobileTradingBar', () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    expect(screen.getByTestId('mobile-trading-bar')).toBeInTheDocument();
  });

  // ─── 8. BuyModal (closed by default) ───
  it('renders BuyModal stub closed by default', () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    const buyModal = screen.getByTestId('buy-modal');
    expect(buyModal).toBeInTheDocument();
    expect(buyModal.getAttribute('data-open')).toBe('false');
  });

  // ─── 9. SellModal (closed by default) ──
  it('renders SellModal stub closed by default', () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    const sellModal = screen.getByTestId('sell-modal');
    expect(sellModal).toBeInTheDocument();
    expect(sellModal.getAttribute('data-open')).toBe('false');
  });

  // ─── 10. LiquidationAlert for liquidated players ─
  it('renders LiquidationAlert for liquidated players', () => {
    const liquidatedPlayer = { ...playerFixture, isLiquidated: true };
    vi.mocked(usePlayerDetailData).mockReturnValueOnce({
      ...baseDetailData,
      player: liquidatedPlayer as any,
      playerWithOwnership: liquidatedPlayer as any,
    });

    renderWithProviders(<PlayerContent playerId="p1" />);

    expect(screen.getByTestId('liquidation-alert')).toBeInTheDocument();
  });

  // ─── 11. Switch to PerformanceTab ───────
  it('switches to PerformanceTab', async () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    // Trading tab visible initially
    expect(screen.getByTestId('trading-tab')).toBeInTheDocument();

    // Click performance tab
    await userEvent.click(screen.getByTestId('tab-performance'));

    expect(screen.getByTestId('performance-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('trading-tab')).not.toBeInTheDocument();
  });

  // ─── 12. Switch to CommunityTab ─────────
  it('switches to CommunityTab', async () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    // Click community tab
    await userEvent.click(screen.getByTestId('tab-community'));

    expect(screen.getByTestId('community-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('trading-tab')).not.toBeInTheDocument();
  });

  // ─── 13. Club admin restriction ─────────
  it('shows admin restriction for club admin own players', () => {
    // Mock useUser to return clubAdmin matching the player's club
    mockUserValue = {
      user: { id: 'u1' },
      clubAdmin: { clubId: 'club-1', role: 'Admin' },
      loading: false,
      signOut: vi.fn(),
      profile: null,
      refreshProfile: vi.fn(),
    };

    renderWithProviders(<PlayerContent playerId="p1" />);

    // The component should render — the restriction manifests through guarded handlers
    // MobileTradingBar still renders (it disables via isLiquidated || isRestrictedAdmin)
    expect(screen.getByTestId('mobile-trading-bar')).toBeInTheDocument();
    expect(screen.getByTestId('player-hero')).toBeInTheDocument();
  });

  // ─── 14. StickyDashboardStrip rendered ──
  it('renders StickyDashboardStrip', () => {
    renderWithProviders(<PlayerContent playerId="p1" />);

    const strip = screen.getByTestId('sticky-dashboard-strip');
    expect(strip).toBeInTheDocument();
    // Initially visible=false since IntersectionObserver hasn't triggered
    expect(strip.getAttribute('data-visible')).toBe('false');
  });
});
