import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AchievementUnlockModal from '../AchievementUnlockModal';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title, onClose }: { open: boolean; children: React.ReactNode; title?: string; onClose?: () => void }) =>
    open ? <div data-testid="modal" data-title={title}>{children}<button data-testid="modal-close" onClick={onClose}>x</button></div> : null,
}));
vi.mock('@/components/ui/Confetti', () => ({
  Confetti: () => null,
}));

const mockAchievement = {
  key: 'first_trade',
  category: 'trading' as const,
  icon: '🏆',
  threshold: 1,
  xp: 50,
};

describe('AchievementUnlockModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <AchievementUnlockModal achievement={mockAchievement} open={false} onClose={vi.fn()} />,
    );
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(
      <AchievementUnlockModal achievement={mockAchievement} open={true} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows achievement icon', () => {
    render(
      <AchievementUnlockModal achievement={mockAchievement} open={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('shows continue and view all buttons', () => {
    render(
      <AchievementUnlockModal achievement={mockAchievement} open={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText('continue')).toBeInTheDocument();
    expect(screen.getByText('viewAll')).toBeInTheDocument();
  });

  it('calls onClose when continue is clicked', () => {
    const onClose = vi.fn();
    render(
      <AchievementUnlockModal achievement={mockAchievement} open={true} onClose={onClose} />,
    );
    fireEvent.click(screen.getByText('continue'));
    expect(onClose).toHaveBeenCalled();
  });

  it('links to profile page', () => {
    render(
      <AchievementUnlockModal achievement={mockAchievement} open={true} onClose={vi.fn()} />,
    );
    const link = screen.getByText('viewAll').closest('a');
    expect(link).toHaveAttribute('href', '/profile?tab=overview');
  });
});
