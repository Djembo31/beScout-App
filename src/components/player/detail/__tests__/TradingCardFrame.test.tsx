import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import TradingCardFrame from '../TradingCardFrame';
import type { Pos } from '@/types';
import type { CardBackData } from '../TradingCardFrame';

// ============================================
// Mocks
// ============================================

vi.mock('@/lib/clubs', () => ({
  getClub: () => ({ name: 'Test Club', logo: '/logo.png' }),
}));

vi.mock('@/components/player/PlayerRow', () => ({
  posTintColors: {
    GK: '#10b981',
    DEF: '#f59e0b',
    MID: '#0ea5e9',
    ATT: '#f43f5e',
  } as Record<string, string>,
}));

vi.mock('@/lib/hooks/useTilt', () => ({
  useTilt: () => ({
    ref: { current: null },
    tiltProps: { style: {} },
  }),
}));

const mockFmtScout = vi.fn((n: number | undefined | null) => String(n ?? 0));

vi.mock('@/lib/utils', async () => {
  return {
    fmtScout: (...args: unknown[]) => mockFmtScout(args[0] as number),
    cn: (...classes: (string | boolean | undefined | null)[]) =>
      classes.filter(Boolean).join(' '),
  };
});

vi.mock('@/components/ui/CountryFlag', () => ({
  default: ({ code, size }: { code: string; size?: number }) => (
    <span data-testid="country-flag" data-code={code} data-size={size}>
      {code}
    </span>
  ),
}));

// ============================================
// Default props
// ============================================

const PROPS = {
  first: 'Max',
  last: 'Mustermann',
  pos: 'MID' as Pos,
  club: 'sakaryaspor',
  shirtNumber: 10,
  l5: 75,
};

const BACK_DATA: CardBackData = {
  marketValueEur: 2_500_000,
  floorPrice: 150,
  priceChange24h: 5.3,
  successFeeCap: 1000,
  holdingQty: 3,
  supplyTotal: 300,
  contractMonths: 24,
  l15: 68,
  stats: { goals: 12, assists: 7, matches: 28 },
};

// ============================================
// Tests
// ============================================

describe('TradingCardFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. renders player name
  it('renders player first and last name', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} />);
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
  });

  // 2. renders position badge
  it('renders position badge with pos text', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} />);
    // Position pill shows "MID" followed by shirt number
    expect(screen.getByText(/MID/)).toBeInTheDocument();
  });

  // 3. renders shirt number
  it('renders shirt number', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} />);
    expect(screen.getByText('#10')).toBeInTheDocument();
  });

  // 4. shows player image when imageUrl provided
  it('shows player image when imageUrl provided', () => {
    renderWithProviders(
      <TradingCardFrame {...PROPS} imageUrl="https://example.com/photo.jpg" />,
    );
    const img = screen.getByAltText('Max Mustermann');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  // 5. shows initials fallback when no imageUrl
  it('shows initials fallback when no imageUrl', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} />);
    expect(screen.getByText('MM')).toBeInTheDocument();
  });

  // 6. shows L5 score
  it('shows L5 score', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  // 7. shows age when provided
  it('shows age when provided', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} age={24} />);
    expect(screen.getByText('24Y')).toBeInTheDocument();
  });

  // 8. shows edition text when provided
  it('shows edition text when provided', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} edition="Tranche 1" />);
    expect(screen.getByText('Tranche 1')).toBeInTheDocument();
  });

  // 9. not clickable when no backData (canFlip=false)
  it('is not clickable when no backData', () => {
    const { container } = renderWithProviders(<TradingCardFrame {...PROPS} />);
    // The tilt container should not have cursor-pointer class
    const tiltContainer = container.querySelector('[style*="transform-style"]');
    expect(tiltContainer).not.toHaveClass('cursor-pointer');
  });

  // 10. clickable when backData provided
  it('is clickable when backData provided', () => {
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} backData={BACK_DATA} />,
    );
    const tiltContainer = container.querySelector('[style*="transform-style"]');
    expect(tiltContainer).toHaveClass('cursor-pointer');
  });

  // 11. clicking flips card
  it('clicking flips card — back face becomes visible', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} backData={BACK_DATA} />,
    );
    const tiltContainer = container.querySelector('[style*="transform-style"]');

    // Before click: front visible, back hidden
    const faces = container.querySelectorAll('[style*="backface-visibility"]');
    expect(faces.length).toBe(2);
    const frontFace = faces[0] as HTMLElement;
    const backFace = faces[1] as HTMLElement;

    expect(frontFace.style.visibility).toBe('visible');
    expect(backFace.style.visibility).toBe('hidden');

    // Click to flip
    await user.click(tiltContainer!);

    // After click: front hidden, back visible
    expect(frontFace.style.visibility).toBe('hidden');
    expect(backFace.style.visibility).toBe('visible');
  });

  // 12. back face shows market value formatted
  it('back face shows market value formatted', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} backData={BACK_DATA} />,
    );
    const tiltContainer = container.querySelector('[style*="transform-style"]');
    await user.click(tiltContainer!);

    // formatMV(2_500_000) => "2.5M€"
    expect(screen.getByText('2.5M\u20AC')).toBeInTheDocument();
  });

  // 13. back face shows floor price
  it('back face shows floor price', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} backData={BACK_DATA} />,
    );
    const tiltContainer = container.querySelector('[style*="transform-style"]');
    await user.click(tiltContainer!);

    // fmtScout(150) => "150", displayed as "150 CR"
    expect(screen.getByText('150 CR')).toBeInTheDocument();
  });

  // 14. back face shows 24h price change
  it('back face shows 24h price change', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} backData={BACK_DATA} />,
    );
    const tiltContainer = container.querySelector('[style*="transform-style"]');
    await user.click(tiltContainer!);

    // change = 5.3, positive => "↑5.3%"
    expect(screen.getByText('\u21915.3%')).toBeInTheDocument();
  });

  // 15. back face shows contract months
  it('back face shows contract months', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} backData={BACK_DATA} />,
    );
    const tiltContainer = container.querySelector('[style*="transform-style"]');
    await user.click(tiltContainer!);

    expect(screen.getByText('24M')).toBeInTheDocument();
  });

  // 16. mastery level adds tier class
  it('mastery level adds tier class to container', () => {
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} masteryLevel={3} />,
    );
    const outer = container.firstElementChild;
    expect(outer).toHaveClass('card-tier-3');
  });

  // 17. L5 appearance bar percentage
  it('calculates L5 appearance bar percentage correctly', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} l5Apps={3} />);
    // (3/5)*100 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  // 18. stats zone shows goals, assists, matches from backData
  it('stats zone shows goals, assists, matches from backData', () => {
    renderWithProviders(
      <TradingCardFrame {...PROPS} backData={BACK_DATA} />,
    );
    // Goals = 12, Assists = 7, Matches = 28
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
  });

  // Additional: shows country flag when country provided
  it('shows country flag when country provided', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} country="TR" />);
    expect(screen.getByTestId('country-flag')).toHaveAttribute('data-code', 'TR');
  });

  // Additional: stats show em-dash when no backData
  it('shows em-dash for stats when no backData', () => {
    renderWithProviders(<TradingCardFrame {...PROPS} />);
    // Without backData, goals/assists/matches show "—" (em-dash \u2014)
    const dashes = screen.getAllByText('\u2014');
    // L15 shows dash + 3 stats (goals, assists, matches) = 4 dashes
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  // Additional: mastery level capped at 5
  it('caps mastery level class at tier 5', () => {
    const { container } = renderWithProviders(
      <TradingCardFrame {...PROPS} masteryLevel={10} />,
    );
    const outer = container.firstElementChild;
    expect(outer).toHaveClass('card-tier-5');
    expect(outer).not.toHaveClass('card-tier-10');
  });
});
