import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import CreatePostModal from '../CreatePostModal';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Camera: Stub, X: Stub, Loader2: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div data-testid="modal" data-title={title}>{children}</div> : null,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button onClick={onClick} disabled={!!disabled}>{children}</button>,
}));
vi.mock('@/lib/hooks/useDraft', () => ({
  useDraft: () => ({ draft: '', setDraft: vi.fn(), clearDraft: vi.fn() }),
}));
vi.mock('@/components/community/PostCard', () => ({
  POST_CATEGORIES: [
    { id: 'Meinung', labelKey: 'cat_meinung', color: '' },
    { id: 'Analyse', labelKey: 'cat_analyse', color: '' },
  ],
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  players: [
    { id: 'p1', name: 'Test Player', pos: 'MID' as const },
  ],
  onSubmit: vi.fn(),
  loading: false,
};

describe('CreatePostModal', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(<CreatePostModal {...defaultProps} open={false} />);
    expect(container.querySelector('[data-testid="modal"]')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    renderWithProviders(<CreatePostModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows category pills', () => {
    renderWithProviders(<CreatePostModal {...defaultProps} />);
    expect(screen.getByText('cat_meinung')).toBeInTheDocument();
    expect(screen.getByText('cat_analyse')).toBeInTheDocument();
  });

  it('has content textarea', () => {
    renderWithProviders(<CreatePostModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('messagePlaceholder');
    expect(textarea).toBeInTheDocument();
  });
});
