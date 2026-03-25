import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RangBadge } from '../RangBadge';

vi.mock('lucide-react', () => {
  const Stub = () => <span data-testid="rang-icon" />;
  return { Shield: Stub, Star: Stub, Gem: Stub, Crown: Stub, Flame: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/lib/gamification', () => ({
  getRang: (score: number) => ({ id: 'bronze', label: 'Bronze I', tier: 1 }),
  getGesamtRang: () => ({ id: 'bronze', label: 'Bronze I', tier: 1 }),
  getDimensionColor: () => '#cd7f32',
  getDimensionBgColor: () => 'rgba(205,127,50,0.15)',
  getDimensionBorderColor: () => 'rgba(205,127,50,0.25)',
}));

describe('RangBadge', () => {
  it('renders badge with score', () => {
    renderWithProviders(<RangBadge score={500} />);
    expect(screen.getByTestId('rang-icon')).toBeInTheDocument();
  });

  it('renders content for score', () => {
    const { container } = renderWithProviders(<RangBadge score={500} />);
    expect(container.innerHTML.length).toBeGreaterThan(20);
  });

  it('renders with dimension scores', () => {
    const { container } = renderWithProviders(<RangBadge scores={{ trader_score: 600, manager_score: 500, analyst_score: 400 }} />);
    expect(container.innerHTML.length).toBeGreaterThan(20);
  });

  it('shows score number when showScore', () => {
    renderWithProviders(<RangBadge score={750} showScore />);
    expect(screen.getByText('750')).toBeInTheDocument();
  });
});
