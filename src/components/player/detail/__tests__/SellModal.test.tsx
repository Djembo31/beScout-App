import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import SellModal from '../SellModal';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Send: Stub, Briefcase: Stub, Loader2: Stub, CheckCircle2: Stub, XCircle: Stub, Lock: Stub, Zap: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));
vi.mock('@/lib/services/wallet', () => ({ formatScout: (n: number) => `${n} CR` }));
vi.mock('@/lib/constants', () => ({ TRADE_FEE_PCT: 6 }));
vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div data-testid="modal" data-title={title}>{children}</div> : null,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button onClick={onClick} disabled={!!disabled}>{children}</button>,
}));
vi.mock('@/components/legal/TradingDisclaimer', () => ({
  TradingDisclaimer: () => null,
}));

const mockPlayer = {
  id: 'p1', firstName: 'Test', lastName: 'Player', pos: 'MID',
  dpc: { circulation: 300 },
  prices: { floor: 100, referencePrice: 100 },
  listings: [],
} as any;

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  player: mockPlayer,
  holdingQty: 5,
  userOrders: [] as any[],
  onSell: vi.fn(),
  onCancelOrder: vi.fn(),
  selling: false,
  cancellingId: null,
};

describe('SellModal', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(<SellModal {...defaultProps} open={false} />);
    expect(container.querySelector('[data-testid="modal"]')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    renderWithProviders(<SellModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows holding quantity info', () => {
    renderWithProviders(<SellModal {...defaultProps} holdingQty={5} />);
    expect(screen.getAllByText(/5/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders without crashing with empty orders', () => {
    const { container } = renderWithProviders(<SellModal {...defaultProps} userOrders={[]} />);
    expect(container.innerHTML).not.toBe('');
  });
});
