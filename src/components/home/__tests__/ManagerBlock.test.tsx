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
    ChartLine: Stub,  // Slice 263 — ScoutPill icon
    Sparkles: Stub,   // Slice 264b — Wildcard-Pill icon
  };
});

vi.mock('@/components/ui/TierBadge', () => ({
  TierBadge: ({ tier }: { tier: string }) => <span data-testid="tier-badge">{tier}</span>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...c: unknown[]) => c.filter(Boolean).join(' '),
  fmtScout: (v: number) => v.toLocaleString('de-DE'),  // Slice 263 — used in ScoutPill
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
  // Slice 263 — ScoutPill props
  portfolioValue: 245000,
  pnlPct: 5.4,
  // Slice 264b — Wildcard-Pill
  wildcardBalance: 0,
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

  // Slice 263 — ScoutPill Tests

  // AC-03: ScoutPill sichtbar wenn holdingsCount > 0
  it('shows ScoutPill when holdingsCount > 0', () => {
    render(<ManagerBlock {...baseProps} holdingsCount={5} portfolioValue={245000} pnlPct={5.4} />);
    expect(screen.getByText('home.manager.scoutPillLabel')).toBeInTheDocument();
  });

  // AC-04: ScoutPill hidden bei holdingsCount === 0
  it('hides ScoutPill when holdingsCount === 0', () => {
    render(<ManagerBlock {...baseProps} holdingsCount={0} portfolioValue={0} pnlPct={0} />);
    expect(screen.queryByText('home.manager.scoutPillLabel')).not.toBeInTheDocument();
  });

  // AC-05: ScoutPill zeigt Label + Portfolio-CR + PnL%-mit-Vorzeichen
  it('renders ScoutPill content: label + portfolio + signed PnL%', () => {
    render(<ManagerBlock {...baseProps} holdingsCount={5} portfolioValue={245000} pnlPct={5.4} />);
    expect(screen.getByText('home.manager.scoutPillLabel')).toBeInTheDocument();
    expect(screen.getByText('245.000')).toBeInTheDocument();
    expect(screen.getByText('+5.4%')).toBeInTheDocument();
  });

  // AC-05 negative PnL with red signed value
  it('renders ScoutPill negative PnL with minus sign', () => {
    render(<ManagerBlock {...baseProps} holdingsCount={5} portfolioValue={245000} pnlPct={-2.3} />);
    expect(screen.getByText('-2.3%')).toBeInTheDocument();
  });

  // AC-06: ScoutPill Tap → Link /manager?tab=kader
  it('ScoutPill links to /manager?tab=kader', () => {
    render(<ManagerBlock {...baseProps} holdingsCount={5} portfolioValue={245000} pnlPct={5.4} />);
    const scoutPillLink = screen
      .getByText('home.manager.scoutPillLabel')
      .closest('a');
    expect(scoutPillLink).toHaveAttribute('href', '/manager?tab=kader');
  });

  // Slice 264b — Wildcard-Pill Tests

  // AC-02: Wildcard-Pill sichtbar wenn wildcardBalance > 0
  it('shows Wildcard-Pill when wildcardBalance > 0', () => {
    render(<ManagerBlock {...baseProps} wildcardBalance={2} />);
    expect(screen.getByText('home.manager.wildcardLabel')).toBeInTheDocument();
    expect(screen.getByText(/· 2/)).toBeInTheDocument();
  });

  // AC-03: Wildcard-Pill hidden bei 0
  it('hides Wildcard-Pill when wildcardBalance === 0', () => {
    render(<ManagerBlock {...baseProps} wildcardBalance={0} />);
    expect(screen.queryByText('home.manager.wildcardLabel')).not.toBeInTheDocument();
  });

  // AC-05: Wildcard-Pill Tap → /fantasy?tab=lineup
  it('Wildcard-Pill links to /fantasy?tab=lineup', () => {
    render(<ManagerBlock {...baseProps} wildcardBalance={1} />);
    const link = screen.getByText('home.manager.wildcardLabel').closest('a');
    expect(link).toHaveAttribute('href', '/fantasy?tab=lineup');
  });

  // EC-06: 0 Holdings + 0 Wildcards → ScoutPill + WildcardPill beide hidden
  it('hides both ScoutPill and WildcardPill when 0 holdings AND 0 wildcards', () => {
    render(
      <ManagerBlock
        {...baseProps}
        holdingsCount={0}
        wildcardBalance={0}
      />,
    );
    expect(screen.queryByText('home.manager.scoutPillLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('home.manager.wildcardLabel')).not.toBeInTheDocument();
  });
});
