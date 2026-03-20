import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FillBar } from '../FillBar';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('FillBar', () => {
  it('shows participant count when max is null', () => {
    renderWithProviders(<FillBar current={5} max={null} />);
    // Rendered as "5 participants" (useTranslations returns key)
    const el = screen.getByText(/5.*participants/);
    expect(el).toBeInTheDocument();
  });

  it('returns null for mini variant when max is null', () => {
    const { container } = renderWithProviders(<FillBar current={5} max={null} variant="mini" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows current/max fraction', () => {
    renderWithProviders(<FillBar current={10} max={20} />);
    expect(screen.getByText('10 / 20')).toBeInTheDocument();
  });

  it('shows percentage', () => {
    renderWithProviders(<FillBar current={10} max={20} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows eventFull when at 100%', () => {
    renderWithProviders(<FillBar current={20} max={20} />);
    expect(screen.getByText('eventFull')).toBeInTheDocument();
  });

  it('does not show eventFull below 100%', () => {
    renderWithProviders(<FillBar current={15} max={20} />);
    expect(screen.queryByText('eventFull')).not.toBeInTheDocument();
  });
});
