import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SellModalCore } from '../SellModalCore';

// ============================================
// Mocks
// ============================================
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    Send: Stub, Loader2: Stub, CheckCircle2: Stub, XCircle: Stub, Lock: Stub,
  };
});

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));

vi.mock('@/lib/constants', () => ({ TRADE_FEE_PCT: 6 }));

vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title, subtitle, footer, preventClose }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    footer?: React.ReactNode;
    preventClose?: boolean;
  }) =>
    open ? (
      <div data-testid="modal" data-title={title} data-subtitle={subtitle} data-prevent-close={String(!!preventClose)}>
        <div data-testid="modal-body">{children}</div>
        {footer && <div data-testid="modal-footer">{footer}</div>}
      </div>
    ) : null,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={!!disabled} data-testid="submit-btn">
      {children}
    </button>
  ),
}));

vi.mock('@/components/legal/TradingDisclaimer', () => ({
  TradingDisclaimer: () => <div data-testid="trading-disclaimer" />,
}));

// ============================================
// Defaults
// ============================================
const defaultProps = {
  open: true,
  onClose: vi.fn(),
  title: 'sell',
  subtitle: 'Test Player',
  holdingQty: 10,
  availableToSell: 10,
  floorBsd: 100,
  selling: false,
  onSubmit: vi.fn(),
};

// ============================================
// Tests
// ============================================
describe('SellModalCore', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <SellModalCore {...defaultProps} open={false} />,
    );
    expect(container.querySelector('[data-testid="modal"]')).not.toBeInTheDocument();
  });

  it('renders modal with title and subtitle when open', () => {
    renderWithProviders(<SellModalCore {...defaultProps} />);
    const modal = screen.getByTestId('modal');
    expect(modal).toBeInTheDocument();
    expect(modal.getAttribute('data-title')).toBe('sell');
    expect(modal.getAttribute('data-subtitle')).toBe('Test Player');
  });

  it('includes trading disclaimer by default', () => {
    renderWithProviders(<SellModalCore {...defaultProps} />);
    expect(screen.getByTestId('trading-disclaimer')).toBeInTheDocument();
  });

  it('omits disclaimer when withDisclaimer=false', () => {
    renderWithProviders(<SellModalCore {...defaultProps} withDisclaimer={false} />);
    expect(screen.queryByTestId('trading-disclaimer')).not.toBeInTheDocument();
  });

  it('renders header/before/after slots', () => {
    renderWithProviders(
      <SellModalCore
        {...defaultProps}
        headerSlot={<div data-testid="header-slot">header</div>}
        beforeFormSlot={<div data-testid="before-slot">before</div>}
        afterFormSlot={<div data-testid="after-slot">after</div>}
      />,
    );
    expect(screen.getByTestId('header-slot')).toBeInTheDocument();
    expect(screen.getByTestId('before-slot')).toBeInTheDocument();
    expect(screen.getByTestId('after-slot')).toBeInTheDocument();
  });

  it('sets preventClose while selling', () => {
    renderWithProviders(<SellModalCore {...defaultProps} selling={true} />);
    expect(screen.getByTestId('modal').getAttribute('data-prevent-close')).toBe('true');
  });

  it('sets preventClose while cancellingId is active', () => {
    renderWithProviders(<SellModalCore {...defaultProps} cancellingId="order-1" />);
    expect(screen.getByTestId('modal').getAttribute('data-prevent-close')).toBe('true');
  });

  it('sets preventClose while additionalBusy is true', () => {
    renderWithProviders(<SellModalCore {...defaultProps} additionalBusy={true} />);
    expect(screen.getByTestId('modal').getAttribute('data-prevent-close')).toBe('true');
  });

  it('renders error message when provided', () => {
    renderWithProviders(<SellModalCore {...defaultProps} error="Mein Fehler" />);
    expect(screen.getByText('Mein Fehler')).toBeInTheDocument();
  });

  it('renders success message when provided', () => {
    renderWithProviders(<SellModalCore {...defaultProps} success="Erfolgreich gelistet" />);
    expect(screen.getByText('Erfolgreich gelistet')).toBeInTheDocument();
  });

  it('shows liquidated warning when isLiquidated=true', () => {
    renderWithProviders(<SellModalCore {...defaultProps} isLiquidated={true} />);
    expect(screen.getByText('tradingLockedLiquidated')).toBeInTheDocument();
  });

  it('hides submit footer when availableToSell=0', () => {
    renderWithProviders(<SellModalCore {...defaultProps} availableToSell={0} />);
    expect(screen.queryByTestId('submit-btn')).not.toBeInTheDocument();
  });

  it('hides submit footer when isLiquidated=true', () => {
    renderWithProviders(<SellModalCore {...defaultProps} isLiquidated={true} />);
    expect(screen.queryByTestId('submit-btn')).not.toBeInTheDocument();
  });

  it('shows "all listed" note when availableToSell=0 and holding exists', () => {
    renderWithProviders(
      <SellModalCore {...defaultProps} availableToSell={0} holdingQty={5} />,
    );
    expect(screen.getByText('sellAllListed')).toBeInTheDocument();
  });

  it('calls onSubmit with qty + priceCents when form submitted', () => {
    const onSubmit = vi.fn();
    const { container } = renderWithProviders(
      <SellModalCore {...defaultProps} onSubmit={onSubmit} />,
    );
    // set price = 150 BSD
    const priceInput = container.querySelector('input[inputmode="numeric"]:not([aria-label="sellQtyAria"])') as HTMLInputElement;
    fireEvent.change(priceInput, { target: { value: '150' } });
    // submit
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(onSubmit).toHaveBeenCalledWith(1, 15000);
  });

  it('uses custom renderSubmitLabel when provided', () => {
    renderWithProviders(
      <SellModalCore
        {...defaultProps}
        renderSubmitLabel={(qty, price) => `CUSTOM ${qty}x ${price}`}
      />,
    );
    // Price not set yet → priceLabel = '...'
    expect(screen.getByText('CUSTOM 1x ...')).toBeInTheDocument();
  });
});
