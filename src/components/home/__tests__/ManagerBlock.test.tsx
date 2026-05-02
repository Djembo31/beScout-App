import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DbUserStats } from '@/types';
import ManagerBlock from '../ManagerBlock';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string, params?: Record<string, string | number>) => {
    const fullKey = `${ns}.${key}`;
    if (params && Object.keys(params).length > 0) {
      const paramsStr = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      return `${fullKey}(${paramsStr})`;
    }
    return fullKey;
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    Flame: Stub,
    Shield: Stub,
    UserCheck: Stub,
    Crown: Stub,
    AlertCircle: Stub,
    ArrowUpRight: Stub,
  };
});

vi.mock('@/components/ui/TierBadge', () => ({
  TierBadge: ({ tier }: { tier: string }) => <span data-testid="tier-badge">{tier}</span>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...c: unknown[]) => c.filter(Boolean).join(' '),
}));

const baseProps = {
  firstName: 'Anil',
  streak: 0,
  shieldsRemaining: null,
  userStats: null as DbUserStats | null,
  gw: 28,
  hasLineup: false,
  hasCaptain: false,
  captainName: null as string | null,
  holdingsCount: 5,
};

describe('ManagerBlock', () => {
  // AC-06 — GW headline contains gameweek number via gwLabel(n=...)
  it('renders GW headline with gameweek number', () => {
    render(<ManagerBlock {...baseProps} gw={28} />);
    expect(screen.getByText(/home\.manager\.gwLabel\(n=28\)/)).toBeInTheDocument();
  });

  // AC-06 — firstName sub-header rendered
  it('renders firstName as sub-header', () => {
    render(<ManagerBlock {...baseProps} firstName="Anil" />);
    expect(screen.getByText('Anil')).toBeInTheDocument();
  });

  // AC-07 — Lineup CTA when hasLineup=false
  it('shows lineupCta when hasLineup=false', () => {
    render(<ManagerBlock {...baseProps} hasLineup={false} />);
    expect(screen.getByText('home.manager.lineupCta')).toBeInTheDocument();
    expect(screen.queryByText('home.manager.lineupSet')).not.toBeInTheDocument();
  });

  // AC-07 — Lineup OK pill when hasLineup=true
  it('shows lineupSet when hasLineup=true', () => {
    render(<ManagerBlock {...baseProps} hasLineup={true} />);
    expect(screen.getByText('home.manager.lineupSet')).toBeInTheDocument();
    expect(screen.queryByText('home.manager.lineupCta')).not.toBeInTheDocument();
  });

  // AC-13 + EC-05 — Captain region hidden when !hasLineup
  it('hides captain region when hasLineup=false', () => {
    render(
      <ManagerBlock {...baseProps} hasLineup={false} hasCaptain={false} captainName={null} />,
    );
    expect(screen.queryByText('home.manager.captainCta')).not.toBeInTheDocument();
    expect(screen.queryByText(/home\.manager\.captainSet/)).not.toBeInTheDocument();
  });

  // AC-08 + EC-06 — Captain CTA when hasLineup=true, hasCaptain=false
  it('shows captainCta when hasLineup=true and hasCaptain=false', () => {
    render(
      <ManagerBlock {...baseProps} hasLineup={true} hasCaptain={false} captainName={null} />,
    );
    expect(screen.getByText('home.manager.captainCta')).toBeInTheDocument();
    expect(screen.queryByText(/home\.manager\.captainSet/)).not.toBeInTheDocument();
  });

  // AC-08 + EC-07 — Captain set with name
  it('shows captainSet with name when hasCaptain=true', () => {
    render(
      <ManagerBlock
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        captainName="Harry Kane"
      />,
    );
    expect(screen.getByText(/home\.manager\.captainSet\(name=Harry Kane\)/)).toBeInTheDocument();
    expect(screen.queryByText('home.manager.captainCta')).not.toBeInTheDocument();
  });

  // EC-11 defense — captainName=null but hasCaptain=true: show CTA fallback (treat as no-captain)
  it('falls back to captainCta when hasCaptain=true but captainName is null', () => {
    render(
      <ManagerBlock {...baseProps} hasLineup={true} hasCaptain={true} captainName={null} />,
    );
    expect(screen.getByText('home.manager.captainCta')).toBeInTheDocument();
    expect(screen.queryByText(/home\.manager\.captainSet/)).not.toBeInTheDocument();
  });

  // AC-09 — Streak pill rendered when streak >= 2
  it('shows streak number when streak >= 2', () => {
    render(<ManagerBlock {...baseProps} streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show streak pill when streak < 2', () => {
    const { container } = render(<ManagerBlock {...baseProps} streak={1} />);
    // Streak number 1 should NOT appear as a standalone pill
    expect(container.querySelector('.text-orange-300')).toBeNull();
  });

  // AC-09 — Tier-Badge rendered when userStats.tier present
  it('shows TierBadge when userStats.tier is set', () => {
    const stats = { tier: 'GOLD' } as unknown as DbUserStats;
    render(<ManagerBlock {...baseProps} userStats={stats} />);
    expect(screen.getByTestId('tier-badge')).toBeInTheDocument();
  });
});
