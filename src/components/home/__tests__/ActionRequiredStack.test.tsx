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
    // ActionRequiredStack-Icons (Slice 264 + 265)
    Users: Stub,
    Crown: Stub,
    ArrowRight: Stub,
    Flame: Stub,  // Slice 265 StreakRiskCard
    // helpers.tsx transitive imports (FEED_ICON_MAP + ICON_MAP)
    ChevronRight: Stub, CircleDollarSign: Stub, Trophy: Stub, Award: Stub,
    Zap: Stub, FileText: Stub, Vote: Stub, Activity: Stub, Target: Stub,
    Banknote: Stub, MessageCircle: Stub, Send: Stub,
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
  // Slice 265 — Default: kein Streak-Risk (streak < 7)
  streak: 0,
  shieldsRemaining: null,
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

  // ═══════════════════════════════════════════════════════════════
  // Slice 265 — StreakRiskCard tests
  // ═══════════════════════════════════════════════════════════════

  // AC-01 — Streak-Card sichtbar bei streak >= 7 + shieldsRemaining === 0
  it('renders Streak-Card when streak=7 and shieldsRemaining=0 (default style)', () => {
    render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={7}
        shieldsRemaining={0}
      />,
    );
    expect(screen.getByText('home.actionStack.streakRiskTitle')).toBeInTheDocument();
    expect(screen.getByText(/home\.actionStack\.streakRiskSubtitle/)).toBeInTheDocument();
  });

  // AC-02 — Streak-Card unsichtbar bei streak < 7
  it('hides Streak-Card when streak < 7', () => {
    render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={6}
        shieldsRemaining={0}
      />,
    );
    expect(screen.queryByText('home.actionStack.streakRiskTitle')).not.toBeInTheDocument();
  });

  // AC-03 — Streak-Card unsichtbar wenn Shields verfügbar
  it('hides Streak-Card when shieldsRemaining > 0', () => {
    render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={14}
        shieldsRemaining={2}
      />,
    );
    expect(screen.queryByText('home.actionStack.streakRiskTitle')).not.toBeInTheDocument();
  });

  // AC-04 — Urgent-Variant: streak >= 14 → red-pulse
  it('uses urgent (red) style when streak >= 14', () => {
    const { container } = render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={14}
        shieldsRemaining={0}
      />,
    );
    const card = container.querySelector('[role="status"]');
    expect(card).toBeTruthy();
    expect(card?.className).toContain('border-red-400/30');
    expect(card?.className).toContain('animate-pulse');
  });

  // AC-05 — Default-Variant: 7 <= streak < 14 → orange (no pulse)
  it('uses default (orange, no pulse) style when 7 <= streak < 14', () => {
    const { container } = render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={10}
        shieldsRemaining={0}
      />,
    );
    const card = container.querySelector('[role="status"]');
    expect(card).toBeTruthy();
    expect(card?.className).toContain('border-orange-400/30');
    expect(card?.className).not.toContain('animate-pulse');
  });

  // AC-08 — Streak-Card unsichtbar in scout-Mode
  it('hides Streak-Card in scout-Mode even when at-risk', () => {
    const { container } = render(
      <ActionRequiredStack
        {...baseProps}
        heroMode="scout"
        streak={14}
        shieldsRemaining={0}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  // AC-09 — Streak-Card ist Notification-only (kein Link)
  it('Streak-Card is notification-only (no link, no href)', () => {
    render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={14}
        shieldsRemaining={0}
      />,
    );
    // Streak-Title sichtbar, aber keine Streak-CTA-Link mehr
    expect(screen.getByText('home.actionStack.streakRiskTitle')).toBeInTheDocument();
    // Lineup/Captain-Cards sind ausgeblendet (hasLineup+hasCaptain=true)
    // → keine Links mit lineupCta oder captainCta
    expect(screen.queryByLabelText('home.actionStack.lineupCta')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('home.actionStack.captainCta')).not.toBeInTheDocument();
  });

  // AC-10 — Streak-Card overrides Lineup-done (sichtbar auch wenn Lineup+Captain done)
  it('renders Streak-Card alone when Lineup+Captain done but streak at-risk', () => {
    render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={14}
        shieldsRemaining={0}
      />,
    );
    // Nur Streak-Card sichtbar
    expect(screen.getByText('home.actionStack.streakRiskTitle')).toBeInTheDocument();
    expect(screen.queryByText('home.actionStack.lineupTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('home.actionStack.captainTitle')).not.toBeInTheDocument();
  });

  // AC-11 — Off-GW + Streak-at-risk → Card sichtbar
  it('renders Streak-Card off-GW (locksAtIso=null) when streak at-risk', () => {
    render(
      <ActionRequiredStack
        {...baseProps}
        locksAtIso={null}
        streak={14}
        shieldsRemaining={0}
      />,
    );
    expect(screen.getByText('home.actionStack.streakRiskTitle')).toBeInTheDocument();
  });

  // AC-12 — Defensive: shieldsRemaining=null → Card unsichtbar (strict equality)
  it('hides Streak-Card when shieldsRemaining is null (defensive)', () => {
    render(
      <ActionRequiredStack
        {...baseProps}
        hasLineup={true}
        hasCaptain={true}
        streak={14}
        shieldsRemaining={null}
      />,
    );
    expect(screen.queryByText('home.actionStack.streakRiskTitle')).not.toBeInTheDocument();
  });
});
