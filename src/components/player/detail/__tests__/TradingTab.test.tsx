import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import TradingTab from '../TradingTab';
import type { Player, DbTrade, PublicOrder, OfferWithDetails, ResearchPostWithAuthor } from '@/types';

// ============================================
// Mocks — child components as stubs
// ============================================

vi.mock('../PriceChart', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="price-chart" data-trades={JSON.stringify(props.trades)} />
  ),
}));

vi.mock('../TradingQuickStats', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="trading-quick-stats" data-floor={props.floorPrice} data-holders={props.holderCount} />
  ),
}));

vi.mock('../YourPosition', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="your-position" data-holding={props.holdingQty} data-user={props.userId} />
  ),
}));

vi.mock('../OrderbookSummary', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="orderbook-summary" data-sell-count={Array.isArray(props.sellOrders) ? (props.sellOrders as unknown[]).length : 0} />
  ),
}));

vi.mock('../ScoutConsensus', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="scout-consensus" data-count={Array.isArray(props.research) ? (props.research as unknown[]).length : 0} />
  ),
}));

vi.mock('../RewardsTab', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="rewards-tab" data-holding={props.holdingQty} />
  ),
}));

vi.mock('@/components/legal/TradingDisclaimer', () => ({
  TradingDisclaimer: (props: Record<string, unknown>) => (
    <div data-testid="trading-disclaimer" data-variant={props.variant} />
  ),
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ============================================
// Mocks — utility functions
// ============================================

const mockFmtScout = vi.fn((n: number | undefined | null) => String(n ?? 0));

vi.mock('@/lib/utils', () => ({
  fmtScout: (...args: unknown[]) => mockFmtScout(args[0] as number),
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (n: number) => n / 100,
}));

vi.mock('@/lib/services/wallet', () => ({
  formatScout: (n: number) => String(n),
}));

// ============================================
// Fixtures
// ============================================

const basePlayer = {
  prices: {
    floor: 1000,
    lastTrade: 500,
    ipoPrice: 100,
    referencePrice: 800,
    initialListingPrice: 400,
  },
  listings: [],
  topOwners: [],
} as unknown as Player;

function makeTrade(overrides: Partial<DbTrade> = {}, index = 0): DbTrade {
  return {
    id: `t${index}`,
    player_id: 'p1',
    buyer_id: 'u1',
    seller_id: 'u2',
    buy_order_id: null,
    sell_order_id: null,
    ipo_id: null,
    price: 1000,
    quantity: 1,
    platform_fee: 0,
    pbt_fee: 0,
    club_fee: 0,
    executed_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeOrder(overrides: Partial<PublicOrder> = {}, index = 0): PublicOrder {
  return {
    id: `o${index}`,
    player_id: 'p1',
    side: 'sell' as const,
    price: 2000,
    quantity: 3,
    filled_qty: 0,
    status: 'open' as const,
    created_at: new Date().toISOString(),
    expires_at: null,
    handle: `seller${index}`,
    is_own: false,
    ...overrides,
  };
}

function makeBid(overrides: Partial<OfferWithDetails> = {}, index = 0): OfferWithDetails {
  return {
    id: `b${index}`,
    player_id: 'p1',
    sender_id: `bidder${index}`,
    receiver_id: null,
    side: 'buy' as 'buy',
    price: 5000,
    quantity: 1,
    status: 'pending' as 'pending',
    counter_offer_id: null,
    message: null,
    expires_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    player_first_name: 'Max',
    player_last_name: 'Test',
    player_position: 'MID' as const,
    player_club: 'testclub',
    sender_handle: `seller${index}`,
    sender_display_name: null,
    sender_avatar_url: null,
    receiver_handle: null,
    receiver_display_name: null,
    ...overrides,
  } as OfferWithDetails;
}

function makeResearch(index = 0): ResearchPostWithAuthor {
  return {
    id: `r${index}`,
    player_id: 'p1',
    author_id: `a${index}`,
    call: 'Bullish',
    content: 'Great player',
    author_handle: `analyst${index}`,
    author_display_name: null,
    author_avatar_url: null,
    author_level: 5,
    author_verified: false,
    author_top_role: null,
    is_unlocked: true,
    is_own: false,
  } as unknown as ResearchPostWithAuthor;
}

// Minimal sell order so the "normal trading" section renders (component hides it when both are empty)
const minimalSellOrder: PublicOrder = {
  id: 'o1',
  player_id: 'p1',
  side: 'sell' as const,
  price: 2000,
  quantity: 1,
  filled_qty: 0,
  status: 'open' as const,
  created_at: new Date().toISOString(),
  expires_at: null,
  handle: 'u-seller',
  is_own: false,
};

const defaultProps = {
  player: basePlayer,
  trades: [] as DbTrade[],
  allSellOrders: [minimalSellOrder] as PublicOrder[],
  tradesLoading: false,
  profileMap: {} as Record<string, { handle: string; display_name: string | null }>,
  userId: undefined as string | undefined,
  dpcAvailable: 100,
  openBids: [] as OfferWithDetails[],
  holdingQty: 0,
  holderCount: 10,
  mastery: null,
  onAcceptBid: undefined as ((offerId: string) => void) | undefined,
  acceptingBidId: null as string | null,
  onOpenOfferModal: undefined as (() => void) | undefined,
  isRestrictedAdmin: false,
  playerResearch: [] as ResearchPostWithAuthor[],
};

// ============================================
// Tests
// ============================================

describe('TradingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PriceChart', () => {
    renderWithProviders(<TradingTab {...defaultProps} />);
    expect(screen.getByTestId('price-chart')).toBeInTheDocument();
  });

  it('renders TradingQuickStats', () => {
    renderWithProviders(<TradingTab {...defaultProps} />);
    expect(screen.getByTestId('trading-quick-stats')).toBeInTheDocument();
  });

  it('renders YourPosition when userId is set', () => {
    renderWithProviders(<TradingTab {...defaultProps} userId="u1" />);
    expect(screen.getByTestId('your-position')).toBeInTheDocument();
  });

  it('hides YourPosition when no userId', () => {
    renderWithProviders(<TradingTab {...defaultProps} userId={undefined} />);
    expect(screen.queryByTestId('your-position')).not.toBeInTheDocument();
  });

  it('renders OrderbookSummary', () => {
    renderWithProviders(<TradingTab {...defaultProps} />);
    expect(screen.getByTestId('orderbook-summary')).toBeInTheDocument();
  });

  it('shows admin restriction warning when isRestrictedAdmin=true', () => {
    renderWithProviders(<TradingTab {...defaultProps} isRestrictedAdmin={true} />);
    expect(screen.getByText('adminTradeRestriction')).toBeInTheDocument();
  });

  it('hides admin restriction when not restricted', () => {
    renderWithProviders(<TradingTab {...defaultProps} isRestrictedAdmin={false} />);
    expect(screen.queryByText('adminTradeRestriction')).not.toBeInTheDocument();
  });

  it('shows letzterPreis with formatted value when lastTrade > 0', () => {
    renderWithProviders(<TradingTab {...defaultProps} />);
    // t('letzterPreis') returns key, fmtScout(500) returns "500"
    expect(screen.getByText(/letzterPreis/)).toBeInTheDocument();
    expect(mockFmtScout).toHaveBeenCalledWith(500);
  });

  it('shows initial listing price with percentage change', () => {
    // floor=1000, initialListingPrice=400 → pct = (1000-400)/400*100 = 150%
    renderWithProviders(<TradingTab {...defaultProps} />);
    // Text is split across nodes: "markteintritt: 400" + span with "+150%"
    expect(screen.getByText(/markteintritt/)).toBeInTheDocument();
    expect(screen.getByText(/150%/)).toBeInTheDocument();
  });

  it('shows offers section when userId provided', () => {
    renderWithProviders(<TradingTab {...defaultProps} userId="u1" />);
    expect(screen.getByText('offers')).toBeInTheDocument();
  });

  it('shows noOpenBids when bids empty and userId provided', () => {
    renderWithProviders(<TradingTab {...defaultProps} userId="u1" openBids={[]} />);
    expect(screen.getByText('noOpenBids')).toBeInTheDocument();
  });

  it('shows bid with accept button when holdingQty > 0 and bid is not from self', () => {
    const onAcceptBid = vi.fn();
    const bids = [makeBid({ id: 'b1', sender_id: 'other-user', sender_handle: 'otheruser' })];
    renderWithProviders(
      <TradingTab
        {...defaultProps}
        userId="u1"
        holdingQty={5}
        openBids={bids}
        onAcceptBid={onAcceptBid}
      />,
    );
    expect(screen.getByText('@otheruser')).toBeInTheDocument();
    const acceptBtn = screen.getByText('accept');
    expect(acceptBtn).toBeInTheDocument();
  });

  it('hides accept button when holdingQty = 0', () => {
    const onAcceptBid = vi.fn();
    const bids = [makeBid({ id: 'b1', sender_id: 'other-user', sender_handle: 'otheruser' })];
    renderWithProviders(
      <TradingTab
        {...defaultProps}
        userId="u1"
        holdingQty={0}
        openBids={bids}
        onAcceptBid={onAcceptBid}
      />,
    );
    expect(screen.getByText('@otheruser')).toBeInTheDocument();
    expect(screen.queryByText('accept')).not.toBeInTheDocument();
  });

  it('shows trades loading state', () => {
    renderWithProviders(<TradingTab {...defaultProps} tradesLoading={true} />);
    expect(screen.getByText('tradesLoading')).toBeInTheDocument();
  });

  it('shows no trades empty state', () => {
    renderWithProviders(<TradingTab {...defaultProps} trades={[]} tradesLoading={false} />);
    expect(screen.getByText('noTrades')).toBeInTheDocument();
  });

  it('shows trade rows', () => {
    const trades = [makeTrade({}, 0), makeTrade({}, 1)];
    const profileMap = {
      u1: { handle: 'buyer1', display_name: null },
      u2: { handle: 'seller1', display_name: null },
    };
    renderWithProviders(
      <TradingTab {...defaultProps} trades={trades} profileMap={profileMap} />,
    );
    // Each trade shows buyer and seller handle
    const buyerLinks = screen.getAllByText('@buyer1');
    expect(buyerLinks.length).toBe(2);
    const sellerLinks = screen.getAllByText('@seller1');
    expect(sellerLinks.length).toBe(2);
  });

  it('shows only 5 trades initially and expand button shows all', async () => {
    const user = userEvent.setup();
    const trades = Array.from({ length: 7 }, (_, i) =>
      makeTrade({ id: `t${i}`, buyer_id: `buyer${i}`, seller_id: `seller${i}` }, i),
    );
    const profileMap: Record<string, { handle: string; display_name: string | null }> = {};
    trades.forEach((t) => {
      profileMap[t.buyer_id] = { handle: `bh${t.buyer_id}`, display_name: null };
      if (t.seller_id) profileMap[t.seller_id] = { handle: `sh${t.seller_id}`, display_name: null };
    });

    renderWithProviders(
      <TradingTab {...defaultProps} trades={trades} profileMap={profileMap} />,
    );

    // Initially shows 5 trades — buyer handles for trade 5 and 6 should not be visible
    expect(screen.queryByText(`@bh${trades[5].buyer_id}`)).not.toBeInTheDocument();
    expect(screen.queryByText(`@bh${trades[6].buyer_id}`)).not.toBeInTheDocument();

    // Click expand button (showAllTrades key is returned by mocked t())
    const expandBtn = screen.getByRole('button', { name: /showAllTrades/i });
    await user.click(expandBtn);

    // Now all 7 trades visible
    expect(screen.getByText(`@bh${trades[5].buyer_id}`)).toBeInTheDocument();
    expect(screen.getByText(`@bh${trades[6].buyer_id}`)).toBeInTheDocument();
  });

  it('rewards accordion toggles on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TradingTab {...defaultProps} />);

    // Rewards tab not visible initially
    expect(screen.queryByTestId('rewards-tab')).not.toBeInTheDocument();

    // Click the rewards accordion button
    const rewardsBtn = screen.getByRole('button', { name: /rewardTiers/i });
    expect(rewardsBtn).toHaveAttribute('aria-expanded', 'false');
    await user.click(rewardsBtn);

    // Now rewards tab is visible
    expect(screen.getByTestId('rewards-tab')).toBeInTheDocument();
    expect(rewardsBtn).toHaveAttribute('aria-expanded', 'true');

    // Click again to collapse
    await user.click(rewardsBtn);
    expect(screen.queryByTestId('rewards-tab')).not.toBeInTheDocument();
    expect(rewardsBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders TradingDisclaimer at the bottom', () => {
    renderWithProviders(<TradingTab {...defaultProps} />);
    const disclaimer = screen.getByTestId('trading-disclaimer');
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveAttribute('data-variant', 'card');
  });

  it('renders ScoutConsensus when playerResearch has items', () => {
    const research = [makeResearch(0), makeResearch(1)];
    renderWithProviders(<TradingTab {...defaultProps} playerResearch={research} />);
    expect(screen.getByTestId('scout-consensus')).toBeInTheDocument();
  });

  it('hides ScoutConsensus when playerResearch is empty', () => {
    renderWithProviders(<TradingTab {...defaultProps} playerResearch={[]} />);
    expect(screen.queryByTestId('scout-consensus')).not.toBeInTheDocument();
  });

  it('renders order book table when allSellOrders > 0 with own orders highlighted', () => {
    const orders = [
      makeOrder({ id: 'o1', is_own: true, handle: 'myhandle', price: 2000, quantity: 3, filled_qty: 1 }, 0),
      makeOrder({ id: 'o2', is_own: false, handle: 'otherhandle', price: 3000, quantity: 2, filled_qty: 0 }, 1),
    ];
    const profileMap = {
      u1: { handle: 'myhandle', display_name: null },
      other: { handle: 'otherhandle', display_name: null },
    };
    renderWithProviders(
      <TradingTab {...defaultProps} userId="u1" allSellOrders={orders} profileMap={profileMap} />,
    );

    // Order book header visible
    expect(screen.getByText('transferMarketOrders')).toBeInTheDocument();

    // Own order shows "you"
    expect(screen.getByText('you')).toBeInTheDocument();

    // Other seller shows handle link
    expect(screen.getByText('@otherhandle')).toBeInTheDocument();
  });

  it('hides order book when allSellOrders is empty', () => {
    renderWithProviders(<TradingTab {...defaultProps} allSellOrders={[]} />);
    expect(screen.queryByText('transferMarketOrders')).not.toBeInTheDocument();
  });

  it('renders sell listings section when player has listings', () => {
    const playerWithListings = {
      ...basePlayer,
      listings: [
        { id: 'l1', price: 1500, sellerName: 'Seller A', sellerLevel: 3, verified: false, qty: 2, expiresAt: 0 },
        { id: 'l2', price: 2500, sellerName: 'Seller B', sellerLevel: 5, verified: true, qty: 1, expiresAt: 0 },
      ],
    } as unknown as Player;

    renderWithProviders(<TradingTab {...defaultProps} player={playerWithListings} />);
    expect(screen.getByText('activeOffers')).toBeInTheDocument();
    expect(screen.getByText('Seller A')).toBeInTheDocument();
    expect(screen.getByText('Seller B')).toBeInTheDocument();
  });
});
