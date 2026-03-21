import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getGreetingKey, SectionHeader } from '../helpers';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    ChevronRight: Stub, CircleDollarSign: Stub, Trophy: Stub, Award: Stub,
    Users: Stub, Zap: Stub, FileText: Stub, Vote: Stub, Activity: Stub,
    Target: Stub, Flame: Stub, Banknote: Stub, MessageCircle: Stub,
    Send: Stub, ArrowRightLeft: Stub, UserPlus: Stub,
  };
});
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/activityHelpers', () => ({
  getActivityIcon: () => 'Trophy',
  getActivityColor: () => 'text-gold',
}));

describe('getGreetingKey', () => {
  it('returns a greeting key string', () => {
    const key = getGreetingKey();
    expect(['greetingNight', 'greetingMorning', 'greetingAfternoon', 'greetingEvening']).toContain(key);
  });
});

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Trending" />);
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('renders as link when href provided', () => {
    render(<SectionHeader title="Market" href="/market" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/market');
  });

  it('renders badge when provided', () => {
    render(<SectionHeader title="Live" badge={<span data-testid="badge">5</span>} />);
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('renders without link when no href', () => {
    render(<SectionHeader title="Stats" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
