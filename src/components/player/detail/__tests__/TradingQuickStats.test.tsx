import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import TradingQuickStats from '../TradingQuickStats';

vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/players', () => ({
  centsToBsd: (n: number) => n / 100,
}));

describe('TradingQuickStats', () => {
  const defaultProps = {
    floorPrice: 100,
    bestBid: null,
    trades: [] as any[],
    holderCount: 15,
  };

  it('shows floor price', () => {
    renderWithProviders(<TradingQuickStats {...defaultProps} floorPrice={250} />);
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('shows holder count', () => {
    renderWithProviders(<TradingQuickStats {...defaultProps} holderCount={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows dash when no best bid', () => {
    renderWithProviders(<TradingQuickStats {...defaultProps} bestBid={null} />);
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('shows spread percentage when bid exists', () => {
    renderWithProviders(<TradingQuickStats {...defaultProps} floorPrice={100} bestBid={9000} />);
    // bestBidBsd = 9000/100 = 90, spread = (100-90)/100*100 = 10.0%
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('shows 7d volume count', () => {
    const recentTrade = { executed_at: new Date().toISOString() };
    const oldTrade = { executed_at: new Date(Date.now() - 30 * 86400000).toISOString() };
    renderWithProviders(
      <TradingQuickStats {...defaultProps} trades={[recentTrade, oldTrade] as any[]} />,
    );
    expect(screen.getByText('1')).toBeInTheDocument(); // only 1 recent
  });

  it('renders all 4 metric labels', () => {
    renderWithProviders(<TradingQuickStats {...defaultProps} />);
    expect(screen.getByText('quickStatsFloor')).toBeInTheDocument();
    expect(screen.getByText('quickStatsSpread')).toBeInTheDocument();
    expect(screen.getByText('quickStats7dVol')).toBeInTheDocument();
    expect(screen.getByText('quickStatsHolders')).toBeInTheDocument();
  });
});
