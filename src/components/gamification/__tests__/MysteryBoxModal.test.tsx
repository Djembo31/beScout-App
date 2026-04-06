import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

// jsdom doesn't provide matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Gift: Stub, Ticket: Stub, Sparkles: Stub, AlertCircle: Stub, Coins: Stub, Swords: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div data-testid="modal" data-title={title}>{children}</div> : null,
  Button: ({ children, onClick, disabled, ...rest }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={!!disabled}>{children}</button>
  ),
}));
vi.mock('../particles', () => {
  class MockParticleSystem {
    burst = vi.fn();
    glow = vi.fn();
    destroy = vi.fn();
  }
  return { ParticleSystem: MockParticleSystem };
});

import MysteryBoxModal from '../MysteryBoxModal';

describe('MysteryBoxModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onOpen: vi.fn().mockResolvedValue(null),
    ticketBalance: 20,
  };

  it('renders nothing when closed', () => {
    render(<MysteryBoxModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    renderWithProviders(<MysteryBoxModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows ticket balance', () => {
    renderWithProviders(<MysteryBoxModal {...defaultProps} ticketBalance={42} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('shows free box button when hasFreeBox', () => {
    renderWithProviders(<MysteryBoxModal {...defaultProps} hasFreeBox={true} />);
    expect(screen.getAllByText('freeBox').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onOpen when open button clicked', async () => {
    const onOpen = vi.fn().mockResolvedValue(null);
    renderWithProviders(<MysteryBoxModal {...defaultProps} onOpen={onOpen} />);
    const buttons = screen.getAllByRole('button');
    const openBtn = buttons.find(b => b.textContent?.includes('openBox'));
    if (openBtn) fireEvent.click(openBtn);
    await waitFor(() => {
      expect(onOpen).toHaveBeenCalled();
    });
  });
});
