import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import NewUserTip from '../NewUserTip';

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon" />,
  Sparkles: () => null,
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('NewUserTip', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom */ }
  });

  const baseProps = {
    tipKey: 'test-tip',
    icon: <span>🎯</span>,
    title: 'Pro Tip',
    description: 'This is helpful info',
    show: true,
  };

  it('renders when show=true', () => {
    renderWithProviders(<NewUserTip {...baseProps} />);
    expect(screen.getByText('Pro Tip')).toBeInTheDocument();
    expect(screen.getByText('This is helpful info')).toBeInTheDocument();
  });

  it('renders nothing when show=false', () => {
    const { container } = renderWithProviders(<NewUserTip {...baseProps} show={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('dismisses on X click and persists to localStorage', () => {
    renderWithProviders(<NewUserTip {...baseProps} />);
    fireEvent.click(screen.getByLabelText('dismiss'));
    expect(screen.queryByText('Pro Tip')).not.toBeInTheDocument();
    expect(localStorage.getItem('bescout-tip-test-tip-dismissed')).toBe('1');
  });

  it('stays dismissed after re-render', () => {
    localStorage.setItem('bescout-tip-test-tip-dismissed', '1');
    const { container } = renderWithProviders(<NewUserTip {...baseProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders action button with href', () => {
    renderWithProviders(
      <NewUserTip {...baseProps} action={{ label: 'Go', href: '/market' }} />,
    );
    expect(screen.getByText('Go')).toBeInTheDocument();
    const link = screen.getByText('Go').closest('a');
    expect(link).toHaveAttribute('href', '/market');
  });

  it('renders action button with onClick', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <NewUserTip {...baseProps} action={{ label: 'Click Me', onClick }} />,
    );
    fireEvent.click(screen.getByText('Click Me'));
    expect(onClick).toHaveBeenCalled();
  });
});
