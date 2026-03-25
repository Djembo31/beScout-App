import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { EventPulse } from '../EventPulse';
import type { FantasyEvent } from '../../types';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Calendar: Stub, Radio: Stub, DoorOpen: Stub, CheckCircle2: Stub };
});
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function makeEvent(overrides: Partial<FantasyEvent> = {}): FantasyEvent {
  return {
    id: 'e1', name: 'Test', description: '', status: 'registering', format: '7er',
    type: 'club', mode: 'tournament', gameweek: 1, entryFeeCents: 0, buyIn: 0,
    prizePool: 0, maxParticipants: 20, participants: 5, isJoined: false,
    scoredAt: null, eventTier: 'club',
    startTime: 0, endTime: 0, lockTime: 0, entryType: 'single', speed: 'normal',
    isPromoted: false, isFeatured: false, isInterested: false, requirements: {},
    rewards: [], ticketCost: 0, currency: 'tickets' as const, ...overrides,
  };
}

describe('EventPulse', () => {
  it('renders nothing when no events', () => {
    const { container } = renderWithProviders(<EventPulse events={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows total count', () => {
    renderWithProviders(<EventPulse events={[makeEvent(), makeEvent({ id: 'e2' })]} />);
    expect(screen.getByText('eventsTotal')).toBeInTheDocument();
  });

  it('counts open events', () => {
    const events = [
      makeEvent({ status: 'running' }),
      makeEvent({ id: 'e2', status: 'registering' }),
    ];
    renderWithProviders(<EventPulse events={events} />);
    expect(screen.getByText('eventsOpenCount')).toBeInTheDocument();
  });

  it('counts joined events', () => {
    const events = [
      makeEvent({ isJoined: true }),
      makeEvent({ id: 'e2', isJoined: true }),
      makeEvent({ id: 'e3', isJoined: false }),
    ];
    renderWithProviders(<EventPulse events={events} />);
    expect(screen.getByText('eventsJoinedCount')).toBeInTheDocument();
  });

  it('shows LIVE label', () => {
    renderWithProviders(<EventPulse events={[makeEvent()]} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });
});
