import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('EmptyState', () => {
  it('shows title', () => {
    render(<EmptyState icon={<span>📭</span>} title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    render(<EmptyState icon={<span>📭</span>} title="Empty" description="Try adding something" />);
    expect(screen.getByText('Try adding something')).toBeInTheDocument();
  });

  it('renders action button with onClick', () => {
    const onClick = vi.fn();
    render(<EmptyState icon={<span>📭</span>} title="Empty" action={{ label: 'Add', onClick }} />);
    fireEvent.click(screen.getByText('Add'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders action link with href', () => {
    render(<EmptyState icon={<span>📭</span>} title="Empty" action={{ label: 'Go', href: '/market' }} />);
    const link = screen.getByText('Go').closest('a');
    expect(link).toHaveAttribute('href', '/market');
  });

  it('shows icon', () => {
    render(<EmptyState icon={<span data-testid="icon">📭</span>} title="Empty" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
