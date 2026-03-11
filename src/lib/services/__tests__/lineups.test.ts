import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '@/test/mocks/supabase';
import { submitLineup } from '../lineups';

// Mock getFixtureDeadlinesByGameweek (imported by lineups.ts)
vi.mock('@/lib/services/fixtures', () => ({
  getFixtureDeadlinesByGameweek: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@/lib/notifText', () => ({
  notifText: vi.fn((key: string) => key),
}));

// ============================================
// Helpers
// ============================================

const EVENT_ID = 'event-001';
const USER_ID = 'user-001';
const CLUB_ID = 'club-001';

/** 11-player slot map */
function makeSlots(count: number, clubId = CLUB_ID): { slots: Record<string, string>; playerIds: string[] } {
  const slots: Record<string, string> = {};
  const keys = ['gk', 'def1', 'def2', 'def3', 'def4', 'mid1', 'mid2', 'mid3', 'mid4', 'att', 'att2', 'att3'];
  const playerIds: string[] = [];
  for (let i = 0; i < count && i < keys.length; i++) {
    const pid = `player-${i + 1}`;
    slots[keys[i]] = pid;
    playerIds.push(pid);
  }
  return { slots, playerIds };
}

/** Creates a per-table mock for supabase.from() */
function mockFromTable(tableResponses: Record<string, { data: unknown; error: unknown }>) {
  mockSupabase.from.mockImplementation((table: string) => {
    const resp = tableResponses[table] ?? { data: null, error: null };

    const builder: Record<string, unknown> = {};
    const chainMethods = [
      'select', 'insert', 'update', 'upsert', 'delete',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
      'like', 'ilike', 'is', 'in', 'contains',
      'order', 'limit', 'offset', 'match', 'not', 'filter', 'or',
    ];
    for (const m of chainMethods) {
      builder[m] = vi.fn().mockReturnValue(builder);
    }
    builder['single'] = vi.fn().mockReturnValue(resp);
    builder['maybeSingle'] = vi.fn().mockReturnValue(resp);
    builder['then'] = vi.fn().mockImplementation(
      (resolve: (val: unknown) => void) => resolve(resp),
    );
    return builder;
  });
}

const baseEvent = {
  status: 'upcoming',
  max_entries: 100,
  current_entries: 0,
  locks_at: null,
  lineup_size: 11,
  scope: 'global',
  club_id: null,
};

const baseParams = {
  eventId: EVENT_ID,
  userId: USER_ID,
  formation: '4-4-2',
};

// ============================================
// submitLineup — lineup size validation
// ============================================

describe('submitLineup — lineup size validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws lineupSizeMismatch when submitting 7 players for an 11-player event', async () => {
    const { slots } = makeSlots(7);

    mockFromTable({
      events: { data: { ...baseEvent, lineup_size: 11 }, error: null },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('lineupSizeMismatch');
  });

  it('throws lineupSizeMismatch when submitting 11 players for a 7-player event', async () => {
    const { slots } = makeSlots(11);

    mockFromTable({
      events: { data: { ...baseEvent, lineup_size: 7 }, error: null },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('lineupSizeMismatch');
  });

  it('passes lineup size check when slot count matches lineup_size=11', async () => {
    const { slots, playerIds } = makeSlots(11);
    const fakeLineup = { id: 'lineup-1', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: { data: { ...baseEvent, lineup_size: 11 }, error: null },
      lineups: { data: fakeLineup, error: null },
      players: {
        data: playerIds.map(id => ({ id, club_id: CLUB_ID })),
        error: null,
      },
    });

    const result = await submitLineup({ ...baseParams, slots });
    expect(result).toBeDefined();
  });

  it('passes lineup size check when slot count matches lineup_size=7', async () => {
    const { slots, playerIds } = makeSlots(7);
    const fakeLineup = { id: 'lineup-2', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: { data: { ...baseEvent, lineup_size: 7 }, error: null },
      lineups: { data: fakeLineup, error: null },
      players: {
        data: playerIds.map(id => ({ id, club_id: CLUB_ID })),
        error: null,
      },
    });

    const result = await submitLineup({ ...baseParams, slots });
    expect(result).toBeDefined();
  });

  it('skips lineup size check when event has no lineup_size set', async () => {
    const { slots, playerIds } = makeSlots(5);
    const fakeLineup = { id: 'lineup-3', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: { data: { ...baseEvent, lineup_size: null }, error: null },
      lineups: { data: fakeLineup, error: null },
      players: {
        data: playerIds.map(id => ({ id, club_id: CLUB_ID })),
        error: null,
      },
    });

    const result = await submitLineup({ ...baseParams, slots });
    expect(result).toBeDefined();
  });
});

// ============================================
// submitLineup — club scope enforcement
// ============================================

describe('submitLineup — club scope enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws playerNotInClub when a player belongs to a different club', async () => {
    const { slots, playerIds } = makeSlots(11);

    mockFromTable({
      events: {
        data: { ...baseEvent, lineup_size: 11, scope: 'club', club_id: CLUB_ID },
        error: null,
      },
      players: {
        data: playerIds.map((id, i) => ({
          id,
          // Last player belongs to wrong club
          club_id: i === playerIds.length - 1 ? 'other-club' : CLUB_ID,
        })),
        error: null,
      },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('playerNotInClub');
  });

  it('passes when all players belong to the event club', async () => {
    const { slots, playerIds } = makeSlots(11);
    const fakeLineup = { id: 'lineup-4', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: {
        data: { ...baseEvent, lineup_size: 11, scope: 'club', club_id: CLUB_ID },
        error: null,
      },
      lineups: { data: fakeLineup, error: null },
      players: {
        data: playerIds.map(id => ({ id, club_id: CLUB_ID })),
        error: null,
      },
    });

    const result = await submitLineup({ ...baseParams, slots });
    expect(result).toBeDefined();
  });

  it('skips club check for global-scoped events', async () => {
    const { slots, playerIds } = makeSlots(11);
    const fakeLineup = { id: 'lineup-5', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: {
        data: { ...baseEvent, lineup_size: 11, scope: 'global', club_id: null },
        error: null,
      },
      lineups: { data: fakeLineup, error: null },
      players: {
        data: playerIds.map(id => ({ id, club_id: 'any-club' })),
        error: null,
      },
    });

    const result = await submitLineup({ ...baseParams, slots });
    expect(result).toBeDefined();
  });

  it('throws playerNotInClub when all players are from wrong club', async () => {
    const { slots, playerIds } = makeSlots(11);

    mockFromTable({
      events: {
        data: { ...baseEvent, lineup_size: 11, scope: 'club', club_id: CLUB_ID },
        error: null,
      },
      players: {
        data: playerIds.map(id => ({ id, club_id: 'wrong-club' })),
        error: null,
      },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('playerNotInClub');
  });
});

// ============================================
// submitLineup — existing guards still work
// ============================================

describe('submitLineup — existing guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws eventNotFound when event query fails', async () => {
    mockFromTable({
      events: { data: null, error: { message: 'not found' } },
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('eventNotFound');
  });

  it('throws eventEnded when event status is ended', async () => {
    mockFromTable({
      events: { data: { ...baseEvent, status: 'ended' }, error: null },
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('eventEnded');
  });

  it('throws duplicatePlayer when same player in multiple slots', async () => {
    const slots = { gk: 'player-1', def1: 'player-1' };

    mockFromTable({
      events: { data: { ...baseEvent, lineup_size: null }, error: null },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('duplicatePlayer');
  });
});
