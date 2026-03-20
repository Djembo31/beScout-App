import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ClubSkeleton } from '../ClubSkeleton';

vi.mock('@/components/ui', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
  SkeletonCard: ({ className }: { className?: string }) => <div data-testid="skeleton-card" className={className} />,
}));

describe('ClubSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ClubSkeleton />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders multiple skeleton elements', () => {
    const { container } = render(<ClubSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it('renders skeleton cards for stats grid', () => {
    const { container } = render(<ClubSkeleton />);
    const cards = container.querySelectorAll('[data-testid="skeleton-card"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});
