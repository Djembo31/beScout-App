import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventScopeBadge } from '../EventScopeBadge';

vi.mock('lucide-react', () => ({
  Globe: () => <span data-testid="globe-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('EventScopeBadge', () => {
  it('renders "BeScout Event" for global scope', () => {
    render(<EventScopeBadge scope="global" />);
    expect(screen.getByText('BeScout Event')).toBeInTheDocument();
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
  });

  it('renders "Club Event" for club scope', () => {
    render(<EventScopeBadge scope="club" />);
    expect(screen.getByText('Club Event')).toBeInTheDocument();
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
  });

  it('has aria-label for global', () => {
    render(<EventScopeBadge scope="global" />);
    expect(screen.getByLabelText('BeScout Event')).toBeInTheDocument();
  });

  it('has aria-label for club', () => {
    render(<EventScopeBadge scope="club" />);
    expect(screen.getByLabelText('Club Event')).toBeInTheDocument();
  });
});
