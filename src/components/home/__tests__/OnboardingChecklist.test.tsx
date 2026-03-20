import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OnboardingChecklist from '../OnboardingChecklist';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { CheckCircle2: Stub, Circle: Stub, Gift: Stub, ChevronRight: Stub };
});
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

const makeItems = (completed: boolean[]) =>
  completed.map((c, i) => ({
    action: `action_${i}`,
    completed: c,
    href: `/step/${i}`,
    labelDe: `Schritt ${i + 1}`,
    rewardLabel: `${(i + 1) * 10} XP`,
  }));

describe('OnboardingChecklist', () => {
  it('renders all items', () => {
    render(<OnboardingChecklist items={makeItems([false, false, true])} />);
    expect(screen.getByText('Schritt 1')).toBeInTheDocument();
    expect(screen.getByText('Schritt 2')).toBeInTheDocument();
    expect(screen.getByText('Schritt 3')).toBeInTheDocument();
  });

  it('shows progress counter', () => {
    render(<OnboardingChecklist items={makeItems([true, false, false])} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('shows reward labels', () => {
    render(<OnboardingChecklist items={makeItems([false, false])} />);
    expect(screen.getByText('10 XP')).toBeInTheDocument();
    expect(screen.getByText('20 XP')).toBeInTheDocument();
  });

  it('renders nothing when all items are completed', () => {
    const { container } = render(<OnboardingChecklist items={makeItems([true, true, true])} />);
    expect(container.innerHTML).toBe('');
  });

  it('links to correct hrefs', () => {
    render(<OnboardingChecklist items={makeItems([false])} />);
    const link = screen.getByText('Schritt 1').closest('a');
    expect(link).toHaveAttribute('href', '/step/0');
  });
});
