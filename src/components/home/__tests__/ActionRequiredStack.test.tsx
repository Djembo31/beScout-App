import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActionRequiredStack from '../ActionRequiredStack';

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
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    // ActionRequiredStack-Icons
    Users: Stub,
    Crown: Stub,
    ArrowRight: Stub,
    // helpers.tsx transitive imports (FEED_ICON_MAP + ICON_MAP)
    ChevronRight: Stub, CircleDollarSign: Stub, Trophy: Stub, Award: Stub,
    Zap: Stub, FileText: Stub, Vote: Stub, Activity: Stub, Target: Stub,
    Flame: Stub, Banknote: Stub, MessageCircle: Stub, Send: Stub,
    ArrowRightLeft: Stub, UserPlus: Stub,
  };
});

vi.mock('@/lib/clubs', () => ({
  getClub: () => null,
}));

vi.mock('@/lib/activityHelpers', () => ({
  getActivityIcon: () => 'Trophy',
  getActivityColor: () => 'text-gold',
}));

vi.mock('@/lib/utils', () => ({
  cn: (...c: unknown[]) => c.filter(Boolean).join(' '),
}));

const baseProps = {
  heroMode: 'manager' as const,
  gw: 28,
  hasLineup: false,
  hasCaptain: false,
  locksAtIso: new Date(Date.now() + 86400_000).toISOString(),  // tomorrow default
  scopedActiveEventStatus: 'registering' as const,
};

describe('ActionRequiredStack', () => {
  // Date.now-mock for deterministic countdown tests
  const NOW = new Date('2026-05-02T12:00:00Z').getTime();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // AC-01 — Stack rendert null wenn heroMode !== 'manager'
  it('renders null when heroMode is scout', () => {
    const { container } = render(<ActionRequiredStack {...baseProps} heroMode="scout" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when heroMode is cta-new', () => {
    const { container } = render(<ActionRequiredStack {...baseProps} heroMode="cta-new" />);
    expect(container.firstChild).toBeNull();
  });

  // AC-03 — Stack rendert null wenn locksAtIso === null
  it('renders null when locksAtIso is null', () => {
    const { container } = render(<ActionRequiredStack {...baseProps} locksAtIso={null} />);
    expect(container.firstChild).toBeNull();
  });

  // AC-02 — Stack rendert null wenn beide Actions erfüllt
  it('renders null when hasLineup AND hasCaptain', () => {
    const { container } = render(
      <ActionRequiredStack {...baseProps} hasLineup={true} hasCaptain={true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // AC-04 — EC-08: status === 'running' AND now > locks_at → Stack hidden
  it('renders null when status=running and locks_at is in the past (Live-GW + locked)', () => {
    const pastIso = new Date(NOW - 1000).toISOString();
    const { container } = render(
      <ActionRequiredStack
        {...baseProps}
        locksAtIso={pastIso}
        scopedActiveEventStatus="running"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  // AC-05 — Lineup-Card rendert wenn !hasLineup
  it('renders Lineup-Card when !hasLineup', () => {
    render(<ActionRequiredStack {...baseProps} hasLineup={false} />);
    expect(screen.getByText('home.actionStack.lineupTitle')).toBeInTheDocument();
  });

  // AC-06 — Captain-Card rendert nur wenn hasLineup && !hasCaptain (cascading)
  it('renders Captain-Card only when hasLineup && !hasCaptain', () => {
    render(
      <ActionRequiredStack {...baseProps} hasLineup={true} hasCaptain={false} />,
    );
    expect(screen.getByText('home.actionStack.captainTitle')).toBeInTheDocument();
    expect(screen.queryByText('home.actionStack.lineupTitle')).not.toBeInTheDocument();
  });

  it('hides Captain-Card when !hasLineup (cascading)', () => {
    render(<ActionRequiredStack {...baseProps} hasLineup={false} hasCaptain={false} />);
    expect(screen.queryByText('home.actionStack.captainTitle')).not.toBeInTheDocument();
  });

  // AC-07 — URGENT-Branch wenn countdownMs < URGENT_THRESHOLD_MS (6h)
  it('shows urgentBadge when countdownMs < 6h', () => {
    const urgentIso = new Date(NOW + 3 * 3600_000).toISOString();  // 3h
    render(<ActionRequiredStack {...baseProps} locksAtIso={urgentIso} />);
    expect(screen.getByText(/home\.actionStack\.urgentBadge/)).toBeInTheDocument();
  });

  // AC-08 — Default-Branch wenn countdownMs >= 6h
  it('hides urgentBadge when countdownMs >= 6h', () => {
    const distantIso = new Date(NOW + 24 * 3600_000).toISOString();  // 24h
    render(<ActionRequiredStack {...baseProps} locksAtIso={distantIso} />);
    expect(screen.queryByText(/home\.actionStack\.urgentBadge/)).not.toBeInTheDocument();
  });

  // AC-09 — Lineup-Card Tap → Link /fantasy?tab=lineup
  it('Lineup-Card links to /fantasy?tab=lineup', () => {
    render(<ActionRequiredStack {...baseProps} hasLineup={false} />);
    const link = screen.getByLabelText('home.actionStack.lineupCta');
    expect(link).toHaveAttribute('href', '/fantasy?tab=lineup');
  });

  // AC-10 — Captain-Card Tap → Link /fantasy?tab=lineup (UX-Compromise)
  it('Captain-Card links to /fantasy?tab=lineup (UX-Compromise, no deep-link)', () => {
    render(
      <ActionRequiredStack {...baseProps} hasLineup={true} hasCaptain={false} />,
    );
    const link = screen.getByLabelText('home.actionStack.captainCta');
    expect(link).toHaveAttribute('href', '/fantasy?tab=lineup');
  });
});
