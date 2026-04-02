import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import OrderDepthView from '../OrderDepthView';

// ============================================
// Mocks
// ============================================

vi.mock('@/lib/services/trading', () => ({
  getSellOrders: vi.fn(),
  getAllOpenBuyOrders: vi.fn(),
}));

vi.mock('@/lib/services/players', () => ({
  centsToBsd: vi.fn((n: number) => n / 100),
}));

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    fmtScout: vi.fn((n: number) => String(n)),
  };
});

import { getSellOrders, getAllOpenBuyOrders } from '@/lib/services/trading';

const mockGetSellOrders = getSellOrders as ReturnType<typeof vi.fn>;
const mockGetAllOpenBuyOrders = getAllOpenBuyOrders as ReturnType<typeof vi.fn>;

// ============================================
// Helpers
// ============================================

function makeSellOrder(overrides: Partial<{
  id: string;
  price: number;
  quantity: number;
  filled_qty: number;
  player_id: string;
}> = {}) {
  return {
    id: overrides.id ?? 's1',
    price: overrides.price ?? 1000,
    quantity: overrides.quantity ?? 5,
    filled_qty: overrides.filled_qty ?? 0,
    player_id: overrides.player_id ?? 'p1',
    user_id: 'u1',
    side: 'sell',
    status: 'open',
    created_at: '2025-01-01T00:00:00Z',
    expires_at: null,
  };
}

function makeBuyOrder(overrides: Partial<{
  id: string;
  price: number;
  quantity: number;
  filled_qty: number;
  player_id: string;
}> = {}) {
  return {
    id: overrides.id ?? 'b1',
    price: overrides.price ?? 800,
    quantity: overrides.quantity ?? 3,
    filled_qty: overrides.filled_qty ?? 0,
    player_id: overrides.player_id ?? 'p1',
    user_id: 'u2',
    side: 'buy',
    status: 'open',
    created_at: '2025-01-01T00:00:00Z',
    expires_at: null,
  };
}

/** Get all price-level row elements (the div.rounded-lg inside the orderbook) */
function getPriceLevelRows() {
  return Array.from(
    document.querySelectorAll('div.relative.flex.items-center.justify-between.rounded-lg')
  );
}

// ============================================
// Tests
// ============================================

describe('OrderDepthView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    // Never resolve — keeps isLoading true
    mockGetSellOrders.mockReturnValue(new Promise(() => {}));
    mockGetAllOpenBuyOrders.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<OrderDepthView playerId="p1" />);

    // Loader2 renders an SVG with class animate-spin
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('shows empty state when no orders', async () => {
    mockGetSellOrders.mockResolvedValue([]);
    mockGetAllOpenBuyOrders.mockResolvedValue([]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      expect(screen.getByText('noOrdersForPlayer')).toBeInTheDocument();
    });
  });

  it('renders depth chart SVG when orders exist', async () => {
    mockGetSellOrders.mockResolvedValue([makeSellOrder()]);
    mockGetAllOpenBuyOrders.mockResolvedValue([makeBuyOrder()]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const svg = screen.getByRole('img', { name: 'depthChartLabel' });
      expect(svg).toBeInTheDocument();
      expect(svg.tagName.toLowerCase()).toBe('svg');
    });
  });

  it('renders ask price level rows with correct prices', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5 }),
      makeSellOrder({ id: 's2', price: 1500, quantity: 3 }),
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(2);
    });

    // centsToBsd(1000) = 10, fmtScout(10) = '10'
    // centsToBsd(1500) = 15, fmtScout(15) = '15'
    const rows = getPriceLevelRows();
    // First row: price 10 (lowest ask)
    expect(rows[0].textContent).toContain('10');
    // Second row: price 15
    expect(rows[1].textContent).toContain('15');
  });

  it('renders bid price level rows with correct prices', async () => {
    mockGetSellOrders.mockResolvedValue([]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3 }),
      makeBuyOrder({ id: 'b2', price: 600, quantity: 2 }),
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(2);
    });

    // centsToBsd(800) = 8, fmtScout(8) = '8'
    // centsToBsd(600) = 6, fmtScout(6) = '6'
    const rows = getPriceLevelRows();
    // Bids sorted descending: 800 first, 600 second
    expect(rows[0].textContent).toContain('8');
    expect(rows[1].textContent).toContain('6');
  });

  it('first ask level has gold text styling (best ask / floor price)', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5 }),
      makeSellOrder({ id: 's2', price: 1500, quantity: 3 }),
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(2);
    });

    const rows = getPriceLevelRows();

    // First ask level (lowest price = 1000 → priceBsd 10) gets text-gold
    const firstPriceSpan = rows[0].querySelector('span.relative.font-mono.font-bold');
    expect(firstPriceSpan?.className).toContain('text-gold');

    // Second ask level should NOT have text-gold
    const secondPriceSpan = rows[1].querySelector('span.relative.font-mono.font-bold');
    expect(secondPriceSpan?.className).not.toContain('text-gold');
    expect(secondPriceSpan?.className).toContain('text-white/60');
  });

  it('first bid level has emerald text styling (best bid)', async () => {
    mockGetSellOrders.mockResolvedValue([]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3 }),
      makeBuyOrder({ id: 'b2', price: 600, quantity: 2 }),
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(2);
    });

    const rows = getPriceLevelRows();

    // Bids sorted desc: 800 is first (best bid) → text-emerald-400
    const firstPriceSpan = rows[0].querySelector('span.relative.font-mono.font-bold');
    expect(firstPriceSpan?.className).toContain('text-emerald-400');

    // Second bid should NOT have emerald-400
    const secondPriceSpan = rows[1].querySelector('span.relative.font-mono.font-bold');
    expect(secondPriceSpan?.className).not.toContain('text-emerald-400');
  });

  it('aggregates multiple sell orders at same price level', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5 }),
      makeSellOrder({ id: 's2', price: 1000, quantity: 3 }),
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      // Should produce a single price level row (aggregated)
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(1);
    });

    const rows = getPriceLevelRows();
    const rowText = rows[0].textContent ?? '';
    // Aggregated qty = 5 + 3 = 8, orderCount = 2
    expect(rowText).toContain('8');
    expect(rowText).toContain('(2)');
  });

  it('aggregates multiple buy orders at same price level', async () => {
    mockGetSellOrders.mockResolvedValue([]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3 }),
      makeBuyOrder({ id: 'b2', price: 800, quantity: 4 }),
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(1);
    });

    const rows = getPriceLevelRows();
    const rowText = rows[0].textContent ?? '';
    // Aggregated qty = 3 + 4 = 7, orderCount = 2
    expect(rowText).toContain('7');
    expect(rowText).toContain('(2)');
  });

  it('cumulative quantity calculated correctly for asks (ascending)', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5 }),
      makeSellOrder({ id: 's2', price: 1500, quantity: 3 }),
      makeSellOrder({ id: 's3', price: 2000, quantity: 2 }),
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(3);
    });

    const rows = getPriceLevelRows();
    // Asks sorted ascending: 1000(5), 1500(3), 2000(2)
    // Cumulative: 5, 8, 10
    // Each row: price, "qty (count)", cumulative
    // Row 0: price=10, qty=5, cum=5
    // Row 1: price=15, qty=3, cum=8
    // Row 2: price=20, qty=2, cum=10

    // Get the third span in each row (cumulative column)
    const getCumulative = (row: Element) => {
      const spans = row.querySelectorAll(':scope > span.relative');
      return spans[spans.length - 1]?.textContent?.trim();
    };

    expect(getCumulative(rows[0])).toBe('5');
    expect(getCumulative(rows[1])).toBe('8');
    expect(getCumulative(rows[2])).toBe('10');
  });

  it('cumulative quantity calculated correctly for bids (descending)', async () => {
    mockGetSellOrders.mockResolvedValue([]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3 }),
      makeBuyOrder({ id: 'b2', price: 600, quantity: 4 }),
      makeBuyOrder({ id: 'b3', price: 400, quantity: 2 }),
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(3);
    });

    const rows = getPriceLevelRows();
    // Bids sorted descending: 800(3), 600(4), 400(2)
    // Cumulative: 3, 7, 9

    const getCumulative = (row: Element) => {
      const spans = row.querySelectorAll(':scope > span.relative');
      return spans[spans.length - 1]?.textContent?.trim();
    };

    expect(getCumulative(rows[0])).toBe('3');
    expect(getCumulative(rows[1])).toBe('7');
    expect(getCumulative(rows[2])).toBe('9');
  });

  it('shows depth levels count', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5 }),
      makeSellOrder({ id: 's2', price: 1500, quantity: 3 }),
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3 }),
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      // 2 ask levels + 1 bid level = 3 total
      // t('depthLevels', { defaultMessage: '...', count: 3 }) → 'depthLevels'
      expect(screen.getByText('depthLevels')).toBeInTheDocument();
    });
  });

  it('shows spread badge when both bid and ask exist', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5 }),
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3 }),
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      // Spread = bestAsk(1000) - bestBid(800) = 200 cents
      // centsToBsd(200) = 2, fmtScout(2) = '2'
      // Text rendered: "depthSpread: 2"
      const spreadEl = screen.getByText(/depthSpread/);
      expect(spreadEl).toBeInTheDocument();
      expect(spreadEl.textContent).toContain('2');
    });
  });

  it('excludes fully filled orders (filled_qty >= quantity)', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5, filled_qty: 5 }), // fully filled
      makeSellOrder({ id: 's2', price: 1500, quantity: 3, filled_qty: 0 }), // available
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3, filled_qty: 3 }), // fully filled
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      // Only the 1500-cent sell order should produce a row
      const rows = getPriceLevelRows();
      expect(rows.length).toBe(1);
    });

    const rows = getPriceLevelRows();
    // The single remaining row should be for price 1500 (priceBsd = 15)
    const priceSpan = rows[0].querySelector('span.relative.font-mono.font-bold');
    expect(priceSpan?.textContent?.trim()).toBe('15');

    // All buy orders fully filled → no bid section → no depthBid labels
    const bidHeaders = screen.queryAllByText('depthBid');
    expect(bidHeaders.length).toBe(0);
  });

  it('shows chart legend labels (Kaufgesuche/Angebote)', async () => {
    mockGetSellOrders.mockResolvedValue([
      makeSellOrder({ id: 's1', price: 1000, quantity: 5 }),
    ]);
    mockGetAllOpenBuyOrders.mockResolvedValue([
      makeBuyOrder({ id: 'b1', price: 800, quantity: 3 }),
    ]);

    renderWithProviders(<OrderDepthView playerId="p1" />);

    await waitFor(() => {
      // Chart legend shows both bid and ask labels
      // t('depthBid', ...) → 'depthBid', t('depthAsk', ...) → 'depthAsk'
      expect(screen.getAllByText('depthBid').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('depthAsk').length).toBeGreaterThanOrEqual(1);
    });
  });
});
