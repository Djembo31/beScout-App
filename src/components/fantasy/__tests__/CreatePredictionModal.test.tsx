import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CreatePredictionModal } from '../CreatePredictionModal';

// Slice 163: lucide-react mock expanded (AlertCircle/CheckCircle2/Info/X) because
// useSafeMutation now pulls in ToastProvider transitively at module-load.
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Target: Stub, ChevronRight: Stub, ChevronLeft: Stub, User: Stub, Loader2: Stub, AlertCircle: Stub, CheckCircle2: Stub, Info: Stub, X: Stub };
});
// Stub ToastProvider (useSafeMutation's useToast dependency).
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Dialog: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div data-testid="modal" data-title={title}>{children}</div> : null,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button onClick={onClick} disabled={!!disabled}>{children}</button>,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/player', () => ({
  PlayerIdentity: () => null,
}));
vi.mock('@/lib/clubs', () => ({ getClub: () => null }));
// Slice 163: useCreatePrediction hook removed — component uses useSafeMutation directly.
vi.mock('@/lib/queries/predictions', () => ({
  usePredictionFixtures: () => ({ data: [] }),
}));
vi.mock('@/lib/services/predictions', () => ({
  createPrediction: vi.fn(() => Promise.resolve({ ok: true, id: 'pred-1' })),
  getPlayersForFixture: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  gameweek: 10,
  userId: 'u1',
  currentCount: 2,
};

describe('CreatePredictionModal', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <CreatePredictionModal {...defaultProps} open={false} />,
    );
    expect(container.querySelector('[data-testid="modal"]')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    renderWithProviders(<CreatePredictionModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows step 1 fixture selection', () => {
    renderWithProviders(<CreatePredictionModal {...defaultProps} />);
    // First step shows fixture selection header
    expect(screen.getByText('selectFixture')).toBeInTheDocument();
  });

  it('shows empty message when no fixtures', () => {
    renderWithProviders(<CreatePredictionModal {...defaultProps} />);
    expect(screen.getByText('noFixtures')).toBeInTheDocument();
  });
});
