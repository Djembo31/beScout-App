import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getGreetingKey, SectionHeader, pickScopedEvent, ACTIVE_STATUSES } from '../helpers';
import type { DbEvent } from '@/types';

vi.mock('@/lib/clubs', () => ({
  getClub: (clubId: string) => {
    const map: Record<string, { league_id: string }> = {
      'club-bundesliga-a': { league_id: 'bundesliga' },
      'club-superlig-a': { league_id: 'super-lig' },
    };
    return map[clubId] ?? null;
  },
}));

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

// Slice 262 — pickScopedEvent (extracted from GameweekStatusBar Slice 261)
describe('pickScopedEvent', () => {
  const mk = (overrides: Partial<DbEvent>): DbEvent => ({
    id: 'evt-' + Math.random(),
    name: 'Test',
    type: 'bescout',
    status: 'registering',
    format: 'fantasy',
    gameweek: 28,
    entry_fee: 0,
    prize_pool: 0,
    max_entries: null,
    current_entries: 0,
    starts_at: new Date(Date.now() + 3600_000).toISOString(),
    locks_at: new Date(Date.now() + 3600_000).toISOString(),
    ends_at: new Date(Date.now() + 86400_000).toISOString(),
    scored_at: null,
    created_by: null,
    club_id: null,
    league_id: null,
    sponsor_name: null,
    ...overrides,
  } as DbEvent);

  it('returns null when no events match league', () => {
    const result = pickScopedEvent([mk({ league_id: 'other-league' })], 'bundesliga');
    expect(result).toBeNull();
  });

  it('returns event matching league_id directly', () => {
    const evt = mk({ league_id: 'bundesliga' });
    const result = pickScopedEvent([evt], 'bundesliga');
    expect(result?.id).toBe(evt.id);
  });

  it('returns event matching via club_id → getClub league_id fallback', () => {
    const evt = mk({ league_id: null, club_id: 'club-bundesliga-a' });
    const result = pickScopedEvent([evt], 'bundesliga');
    expect(result?.id).toBe(evt.id);
  });

  it('skips events with non-active status', () => {
    const result = pickScopedEvent(
      [mk({ league_id: 'bundesliga', status: 'upcoming' })],
      'bundesliga',
    );
    expect(result).toBeNull();
  });

  it('prefers running > registering when both exist', () => {
    const reg = mk({ league_id: 'bundesliga', status: 'registering', starts_at: new Date(Date.now() + 1000).toISOString() });
    const run = mk({ league_id: 'bundesliga', status: 'running', starts_at: new Date(Date.now() + 5000).toISOString() });
    const result = pickScopedEvent([reg, run], 'bundesliga');
    expect(result?.status).toBe('running');
  });

  it('picks earliest starts_at among same-status events', () => {
    const earlier = mk({ league_id: 'bundesliga', status: 'registering', starts_at: new Date(Date.now() + 1000).toISOString() });
    const later = mk({ league_id: 'bundesliga', status: 'registering', starts_at: new Date(Date.now() + 5000).toISOString() });
    const result = pickScopedEvent([later, earlier], 'bundesliga');
    expect(result?.id).toBe(earlier.id);
  });

  it('returns null when club_id resolves to different league', () => {
    const evt = mk({ league_id: null, club_id: 'club-superlig-a' });
    const result = pickScopedEvent([evt], 'bundesliga');
    expect(result).toBeNull();
  });

  it('exports ACTIVE_STATUSES with registering, late-reg, running', () => {
    expect(ACTIVE_STATUSES).toEqual(['registering', 'late-reg', 'running']);
  });
});
