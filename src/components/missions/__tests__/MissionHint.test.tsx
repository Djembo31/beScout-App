import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import MissionHint from '../MissionHint';

vi.mock('lucide-react', () => ({
  Target: () => <span data-testid="target-icon" />,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/players', () => ({
  centsToBsd: (n: number) => n / 100,
}));

describe('MissionHint', () => {
  const baseProps = {
    title: 'Trade 5 Players',
    icon: '📈',
    reward: 5000,
    progress: 2,
    target: 5,
  };

  it('renders title in default variant', () => {
    renderWithProviders(<MissionHint {...baseProps} />);
    expect(screen.getByText('Trade 5 Players')).toBeInTheDocument();
  });

  it('shows target icon', () => {
    renderWithProviders(<MissionHint {...baseProps} />);
    expect(screen.getByTestId('target-icon')).toBeInTheDocument();
  });

  it('shows progress text', () => {
    renderWithProviders(<MissionHint {...baseProps} />);
    expect(screen.getByText('hintProgress')).toBeInTheDocument();
  });

  it('renders compact variant', () => {
    renderWithProviders(<MissionHint {...baseProps} compact />);
    expect(screen.getByText('Trade 5 Players')).toBeInTheDocument();
    expect(screen.getByText('hintProgress')).toBeInTheDocument();
  });

  it('shows reward amount in default variant', () => {
    renderWithProviders(<MissionHint {...baseProps} />);
    // fmtScout(centsToBsd(5000)) = fmtScout(50) = "50"
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });
});
