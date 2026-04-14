import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import BuyConfirmation from '../BuyConfirmation';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { AlertTriangle: Stub, CheckCircle2: Stub, Loader2: Stub, Info: Stub };
});
vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));
vi.mock('@/lib/services/wallet', () => ({ formatScout: (n: number) => `${n} CR` }));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={!!disabled}>{children}</button>
  ),
}));

const defaultProps = {
  pendingBuyQty: 3,
  userOrders: [{ quantity: 5, filled_qty: 2 }] as any[],
  floorBsd: 100,
  balanceCents: 50000,
  buying: false,
  onConfirmBuy: vi.fn(),
  onCancel: vi.fn(),
};

describe('BuyConfirmation', () => {
  it('shows notice header', () => {
    renderWithProviders(<BuyConfirmation {...defaultProps} />);
    expect(screen.getByText('notice')).toBeInTheDocument();
  });

  it('shows estimated cost', () => {
    renderWithProviders(<BuyConfirmation {...defaultProps} />);
    // floorBsd * qty = 100 * 3 = 300
    expect(screen.getByText('300 CR')).toBeInTheDocument();
  });

  it('shows balance after label', () => {
    renderWithProviders(<BuyConfirmation {...defaultProps} balanceCents={50000} />);
    expect(screen.getByText('balanceAfter')).toBeInTheDocument();
  });

  it('calls onConfirmBuy when confirm clicked', () => {
    const onConfirmBuy = vi.fn();
    renderWithProviders(<BuyConfirmation {...defaultProps} onConfirmBuy={onConfirmBuy} />);
    const confirmBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('confirmBuy'));
    if (confirmBtn) fireEvent.click(confirmBtn);
    expect(onConfirmBuy).toHaveBeenCalledWith(3, undefined);
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    renderWithProviders(<BuyConfirmation {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('cancelAction'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables confirm when buying', () => {
    renderWithProviders(<BuyConfirmation {...defaultProps} buying={true} />);
    const confirmBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('confirmBuy'));
    expect(confirmBtn).toBeDisabled();
  });
});
