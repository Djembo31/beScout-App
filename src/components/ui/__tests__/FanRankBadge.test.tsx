import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => <span data-testid="tier-icon" />;
  return { Users: Stub, Star: Stub, Flame: Stub, Crown: Stub, Award: Stub, Shield: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

import FanRankBadge from '../FanRankBadge';

describe('FanRankBadge', () => {
  it('shows Zuschauer for zuschauer tier', () => {
    renderWithProviders(<FanRankBadge tier="zuschauer" />);
    expect(screen.getByText('Zuschauer')).toBeInTheDocument();
  });

  it('shows Stammgast for stammgast tier', () => {
    renderWithProviders(<FanRankBadge tier="stammgast" />);
    expect(screen.getByText('Stammgast')).toBeInTheDocument();
  });

  it('shows Ultra for ultra tier', () => {
    renderWithProviders(<FanRankBadge tier="ultra" />);
    expect(screen.getByText('Ultra')).toBeInTheDocument();
  });

  it('renders tier icon', () => {
    renderWithProviders(<FanRankBadge tier="zuschauer" />);
    expect(screen.getByTestId('tier-icon')).toBeInTheDocument();
  });
});
