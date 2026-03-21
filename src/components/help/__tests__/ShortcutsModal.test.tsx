import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import ShortcutsModal from '../ShortcutsModal';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div data-testid="modal" data-title={title}>{children}</div> : null,
}));

describe('ShortcutsModal', () => {
  it('renders nothing when closed', () => {
    render(<ShortcutsModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    renderWithProviders(<ShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows keyboard shortcut keys', () => {
    renderWithProviders(<ShortcutsModal open={true} onClose={vi.fn()} />);
    // Navigation shortcuts use G + letter keys
    expect(screen.getAllByText('G').length).toBeGreaterThan(0);
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('shows Esc key', () => {
    renderWithProviders(<ShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('shows ? key', () => {
    renderWithProviders(<ShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows navigation and actions groups', () => {
    renderWithProviders(<ShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('navigation')).toBeInTheDocument();
    expect(screen.getByText('actions')).toBeInTheDocument();
  });
});
