import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LoadMoreButton } from '../LoadMoreButton';

vi.mock('lucide-react', () => ({ Loader2: () => <span data-testid="loader" /> }));

describe('LoadMoreButton', () => {
  it('shows load more button when hasMore', () => {
    renderWithProviders(<LoadMoreButton loading={false} hasMore={true} onLoadMore={vi.fn()} />);
    expect(screen.getByText('loadMore')).toBeInTheDocument();
  });

  it('shows all loaded message when no more', () => {
    renderWithProviders(<LoadMoreButton loading={false} hasMore={false} onLoadMore={vi.fn()} />);
    expect(screen.getByText('allLoaded')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithProviders(<LoadMoreButton loading={true} hasMore={true} onLoadMore={vi.fn()} />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('calls onLoadMore when clicked', () => {
    const onLoadMore = vi.fn();
    renderWithProviders(<LoadMoreButton loading={false} hasMore={true} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByText('loadMore'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('disables button when loading', () => {
    renderWithProviders(<LoadMoreButton loading={true} hasMore={true} onLoadMore={vi.fn()} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
