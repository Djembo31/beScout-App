import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SpieltagPulse } from '../SpieltagPulse';
import type { Fixture } from '@/types';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Swords: Stub, CheckCircle2: Stub, Goal: Stub, Activity: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: Math.random().toString(),
    status: 'scheduled',
    home_score: null,
    away_score: null,
    gameweek: 1,
    ...overrides,
  } as unknown as Fixture;
}

describe('SpieltagPulse', () => {
  it('renders nothing when no fixtures', () => {
    const { container } = renderWithProviders(<SpieltagPulse fixtures={[]} gwStatus="empty" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders stats grid when fixtures exist', () => {
    const fixtures = [
      makeFixture({ status: 'simulated', home_score: 2, away_score: 1 }),
      makeFixture({ status: 'scheduled' }),
    ];
    const { container } = renderWithProviders(<SpieltagPulse fixtures={fixtures} gwStatus="open" />);
    // Should render content (not empty)
    expect(container.innerHTML).not.toBe('');
  });

  it('counts finished fixtures', () => {
    const fixtures = [
      makeFixture({ status: 'simulated', home_score: 1, away_score: 0 }),
      makeFixture({ status: 'finished', home_score: 3, away_score: 2 }),
      makeFixture({ status: 'scheduled' }),
    ];
    renderWithProviders(<SpieltagPulse fixtures={fixtures} gwStatus="simulated" />);
    // 2 finished out of 3 total
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('sums total goals from finished fixtures', () => {
    const fixtures = [
      makeFixture({ status: 'simulated', home_score: 2, away_score: 1 }), // 3 goals
      makeFixture({ status: 'finished', home_score: 0, away_score: 0 }),   // 0 goals
    ];
    renderWithProviders(<SpieltagPulse fixtures={fixtures} gwStatus="simulated" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
