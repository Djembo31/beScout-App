import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import LiquidationAlert from '../LiquidationAlert';

vi.mock('lucide-react', () => ({ Flame: () => null }));
vi.mock('@/lib/utils', () => ({ fmtScout: (n: number) => String(n) }));

describe('LiquidationAlert', () => {
  it('shows liquidation message', () => {
    renderWithProviders(<LiquidationAlert liquidationEvent={null} />);
    expect(screen.getByText('playerLiquidated')).toBeInTheDocument();
  });

  it('shows distribution details when event exists', () => {
    const event = {
      distributed_cents: 100000,
      success_fee_cents: 20000,
      fee_per_dpc_cents: 500,
      holder_count: 15,
      created_at: '2026-01-15T00:00:00Z',
    } as any;
    const { container } = renderWithProviders(<LiquidationAlert liquidationEvent={event} />);
    // Should render distribution details (more content than without event)
    expect(container.innerHTML).toContain('15');
  });

  it('shows info text', () => {
    renderWithProviders(<LiquidationAlert liquidationEvent={null} />);
    expect(screen.getByText('liquidationInfo')).toBeInTheDocument();
  });
});
