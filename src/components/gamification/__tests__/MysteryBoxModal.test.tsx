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

  // Daily-free-only model (Track C1): the modal no longer exposes the
  // ticket balance or a paid-open path. `ticketBalance` remains in props
  // for API compatibility but is not rendered. The previous assertions
  // (ticket balance visible, default-state open button) are replaced by
  // the current states: daily-claimed text when hasFreeBox=false, and
  // a free-box CTA when hasFreeBox=true.

  it('shows daily-claimed state when no free box available', () => {
    renderWithProviders(<MysteryBoxModal {...defaultProps} hasFreeBox={false} />);
    expect(screen.getByText('dailyBoxClaimed')).toBeInTheDocument();
  });

  it('shows free box CTA when hasFreeBox', () => {
    renderWithProviders(<MysteryBoxModal {...defaultProps} hasFreeBox={true} />);
    expect(screen.getAllByText('freeBox').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onOpen when the free-box button is clicked', async () => {
    const onOpen = vi.fn().mockResolvedValue(null);
    renderWithProviders(<MysteryBoxModal {...defaultProps} hasFreeBox={true} onOpen={onOpen} />);
    const buttons = screen.getAllByRole('button');
    const openBtn = buttons.find(b => b.textContent?.includes('freeBox'));
    if (openBtn) fireEvent.click(openBtn);
    await waitFor(() => {
      expect(onOpen).toHaveBeenCalled();
    });
  });
});
