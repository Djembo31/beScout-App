import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const S = () => null;
  return { Zap: S, Check: S, X: S, Ticket: S, Flame: S, AlertCircle: S, Gift: S };
});
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(' ') }));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  Skeleton: () => <div data-testid="skeleton" />,
  InfoTooltip: () => null,
}));
vi.mock('@/lib/streakBenefits', () => ({ getStreakBenefitLabels: () => [] }));

import DailyChallengeCard from '../DailyChallengeCard';

const mockChallenge = {
  id: 'dc1',
  question: 'Wer erzielte das Tor?',
  options: ['Spieler A', 'Spieler B', 'Spieler C'],
  correct_option: 0,
  category: 'trivia',
  difficulty: 'medium',
} as any;

describe('DailyChallengeCard', () => {
  it('shows loading skeleton', () => {
    renderWithProviders(<DailyChallengeCard challenge={null} userAnswer={null} onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders challenge content', () => {
    const { container } = renderWithProviders(<DailyChallengeCard challenge={mockChallenge} userAnswer={null} onSubmit={vi.fn()} />);
    // Challenge renders options as buttons
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // 3 options
  });

  it('renders without crashing when no challenge', () => {
    const { container } = renderWithProviders(<DailyChallengeCard challenge={null} userAnswer={null} onSubmit={vi.fn()} />);
    expect(container.innerHTML).not.toBe('');
  });
});
