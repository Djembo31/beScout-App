import { describe, it, expect } from 'vitest';
import { pickDefaultEvent } from '../eventHelpers';
import type { FantasyEvent } from '@/features/fantasy/types';

function makeEvent(overrides: Partial<FantasyEvent> = {}): FantasyEvent {
  return {
    id: 'e1',
    name: 'Event',
    description: '',
    type: 'club',
    mode: 'tournament',
    status: 'registering',
    format: '7er',
    startTime: Date.now() + 86400000,
    endTime: Date.now() + 172800000,
    lockTime: Date.now() + 86400000,
    buyIn: 0,
    entryFeeCents: 0,
    prizePool: 0,
    participants: 0,
    maxParticipants: 30,
    entryType: 'single',
    speed: 'normal',
    isPromoted: false,
    isFeatured: false,
    isJoined: false,
    isInterested: false,
    eventTier: 'club',
    requirements: {},
    rewards: [],
    ticketCost: 0,
    currency: 'tickets',
    isLigaEvent: false,
    ...overrides,
  };
}

describe('pickDefaultEvent', () => {
  it('returns null for empty array', () => {
    expect(pickDefaultEvent([])).toBeNull();
  });

  it('prefers a joined-AND-running event', () => {
    const events = [
      makeEvent({ id: 'a', status: 'registering', isJoined: false }),
      makeEvent({ id: 'b', status: 'running', isJoined: true }),
      makeEvent({ id: 'c', status: 'running', isJoined: false }),
    ];
    expect(pickDefaultEvent(events)?.id).toBe('b');
  });

  it('prefers a joined event when no joined-running exists', () => {
    const events = [
      makeEvent({ id: 'a', status: 'running', isJoined: false }),
      makeEvent({ id: 'b', status: 'registering', isJoined: true }),
    ];
    expect(pickDefaultEvent(events)?.id).toBe('b');
  });

  it('falls back to running event when nothing joined', () => {
    const events = [
      makeEvent({ id: 'a', status: 'registering', isJoined: false }),
      makeEvent({ id: 'b', status: 'running', isJoined: false }),
    ];
    expect(pickDefaultEvent(events)?.id).toBe('b');
  });

  it('falls back to registering event when nothing else applies', () => {
    const events = [
      makeEvent({ id: 'a', status: 'late-reg', isJoined: false }),
      makeEvent({ id: 'b', status: 'registering', isJoined: false }),
    ];
    expect(pickDefaultEvent(events)?.id).toBe('b');
  });

  it('falls back to late-reg when only late-reg present', () => {
    const events = [
      makeEvent({ id: 'a', status: 'late-reg', isJoined: false }),
    ];
    expect(pickDefaultEvent(events)?.id).toBe('a');
  });

  it('falls back to first event for unknown status', () => {
    const events = [
      makeEvent({ id: 'a', status: 'upcoming' }),
      makeEvent({ id: 'b', status: 'upcoming' }),
    ];
    expect(pickDefaultEvent(events)?.id).toBe('a');
  });
});
