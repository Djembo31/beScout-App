import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import HomeSkeleton from '../HomeSkeleton';

vi.mock('@/components/ui', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

describe('HomeSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<HomeSkeleton />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders multiple skeleton elements', () => {
    const { container } = render(<HomeSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(10);
  });
});
