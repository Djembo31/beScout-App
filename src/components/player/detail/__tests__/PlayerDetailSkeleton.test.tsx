import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import PlayerDetailSkeleton from '../PlayerDetailSkeleton';

vi.mock('@/components/ui', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
  SkeletonCard: ({ className }: { className?: string }) => <div data-testid="skeleton-card" className={className} />,
}));

describe('PlayerDetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<PlayerDetailSkeleton />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders multiple skeleton elements', () => {
    const { container } = render(<PlayerDetailSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it('renders skeleton cards', () => {
    const { container } = render(<PlayerDetailSkeleton />);
    const cards = container.querySelectorAll('[data-testid="skeleton-card"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});
