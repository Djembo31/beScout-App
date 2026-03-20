import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import OrderbookDepth from '../OrderbookDepth';

vi.mock('lucide-react', () => ({ Layers: () => null }));
vi.mock('@/lib/utils', () => ({ fmtScout: (n: number) => String(n) }));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  InfoTooltip: () => null,
}));

describe('OrderbookDepth', () => {
  it('renders nothing when no orders', () => {
    const { container } = renderWithProviders(<OrderbookDepth orders={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders price levels', () => {
    const orders = [
      { price: 10000, quantity: 3, filled_qty: 0 },
      { price: 20000, quantity: 2, filled_qty: 0 },
    ] as any[];
    renderWithProviders(<OrderbookDepth orders={orders} />);
    // centsToBsd: 10000/100=100, 20000/100=200
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('shows quantity with SC suffix', () => {
    const orders = [{ price: 10000, quantity: 5, filled_qty: 2 }] as any[];
    renderWithProviders(<OrderbookDepth orders={orders} />);
    expect(screen.getByText('3 SC')).toBeInTheDocument(); // 5-2=3
  });

  it('aggregates same-price orders', () => {
    const orders = [
      { price: 10000, quantity: 3, filled_qty: 0 },
      { price: 10000, quantity: 2, filled_qty: 0 },
    ] as any[];
    renderWithProviders(<OrderbookDepth orders={orders} />);
    expect(screen.getByText('5 SC')).toBeInTheDocument(); // 3+2
  });

  it('shows orderbook title', () => {
    const orders = [{ price: 10000, quantity: 1, filled_qty: 0 }] as any[];
    renderWithProviders(<OrderbookDepth orders={orders} />);
    expect(screen.getByText('orderbookTitle')).toBeInTheDocument();
  });
});
