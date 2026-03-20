import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseResponse, mockSupabaseCount } from '@/test/mocks/supabase';
import { submitLineup, removeLineup, getLineup, getEventParticipants, getEventParticipantCount } from '../lineups';

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

// ============================================
// submitLineup — capacity checks (max_entries)
// ============================================

describe('submitLineup — capacity checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws eventFull when event at max_entries with no existing lineup', async () => {
    const { slots } = makeSlots(11);

    mockFromTable({
      events: {
        data: { ...baseEvent, max_entries: 50, current_entries: 50 },
        error: null,
      },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('eventFull');
  });

  it('throws eventFull when current_entries exceeds max_entries', async () => {
    const { slots } = makeSlots(11);

    mockFromTable({
      events: {
        data: { ...baseEvent, max_entries: 50, current_entries: 55 },
        error: null,
      },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('eventFull');
  });

  it('succeeds when event is below max_entries', async () => {
    const { slots, playerIds } = makeSlots(11);
    const fakeLineup = { id: 'lineup-cap-1', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: {
        data: { ...baseEvent, max_entries: 100, current_entries: 50 },
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

  it('succeeds when max_entries is null (unlimited)', async () => {
    const { slots, playerIds } = makeSlots(11);
    const fakeLineup = { id: 'lineup-cap-2', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: {
        data: { ...baseEvent, max_entries: null, current_entries: 9999 },
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
});

// ============================================
// submitLineup — locks_at enforcement
// ============================================

describe('submitLineup — locks_at enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws eventLocked when locks_at is in the past', async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const { slots } = makeSlots(11);

    mockFromTable({
      events: {
        data: { ...baseEvent, locks_at: pastDate },
        error: null,
      },
    });

    await expect(
      submitLineup({ ...baseParams, slots }),
    ).rejects.toThrow('eventLocked');
  });

  it('proceeds when locks_at is in the future', async () => {
    const futureDate = new Date(Date.now() + 3_600_000).toISOString(); // 1 hour ahead
    const { slots, playerIds } = makeSlots(11);
    const fakeLineup = { id: 'lineup-lock-1', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: {
        data: { ...baseEvent, locks_at: futureDate },
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

  it('proceeds when locks_at is null', async () => {
    const { slots, playerIds } = makeSlots(11);
    const fakeLineup = { id: 'lineup-lock-2', event_id: EVENT_ID, user_id: USER_ID };

    mockFromTable({
      events: {
        data: { ...baseEvent, locks_at: null },
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
});

// ============================================
// submitLineup — scoring status
// ============================================

describe('submitLineup — scoring status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws eventEnded when event status is scoring', async () => {
    mockFromTable({
      events: { data: { ...baseEvent, status: 'scoring' }, error: null },
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('eventEnded');
  });
});

// ============================================
// removeLineup
// ============================================

describe('removeLineup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('succeeds when delete returns count=1', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: null, count: 1 });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: null, count: 1 });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: null, count: 1 }),
      );
      return builder;
    });

    await expect(removeLineup(EVENT_ID, USER_ID)).resolves.toBeUndefined();
  });

  it('throws when delete returns an error', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: { message: 'delete error' }, count: null });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: { message: 'delete error' }, count: null });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: { message: 'delete error' }, count: null }),
      );
      return builder;
    });

    await expect(removeLineup(EVENT_ID, USER_ID)).rejects.toThrow('removeLineup failed: delete error');
  });

  it('throws lineupDeleteFailed when delete returns count=0', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: null, count: 0 });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: null, count: 0 });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: null, count: 0 }),
      );
      return builder;
    });

    await expect(removeLineup(EVENT_ID, USER_ID)).rejects.toThrow('lineupDeleteFailed');
  });
});

// ============================================
// getLineup
// ============================================

describe('getLineup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns DbLineup on success', async () => {
    const fakeLineup = { id: 'lineup-gl-1', event_id: EVENT_ID, user_id: USER_ID, formation: '4-4-2' };

    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: fakeLineup, error: null });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: fakeLineup, error: null });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: fakeLineup, error: null }),
      );
      return builder;
    });

    const result = await getLineup(EVENT_ID, USER_ID);
    expect(result).toEqual(fakeLineup);
  });

  it('returns null when no lineup found', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: null });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: null });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: null }),
      );
      return builder;
    });

    const result = await getLineup(EVENT_ID, USER_ID);
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: { message: 'query error' } });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: { message: 'query error' } });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: { message: 'query error' } }),
      );
      return builder;
    });

    const result = await getLineup(EVENT_ID, USER_ID);
    expect(result).toBeNull();
  });
});

// ============================================
// getEventParticipants
// ============================================

describe('getEventParticipants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns profiles for lineup users', async () => {
    const lineups = [{ user_id: 'u1' }, { user_id: 'u2' }];
    const profiles = [
      { id: 'u1', handle: 'user1', display_name: 'User One', avatar_url: null },
      { id: 'u2', handle: 'user2', display_name: 'User Two', avatar_url: null },
    ];

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
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

      // First call is lineups, second is profiles
      const isLineups = table === 'lineups';
      const resp = isLineups
        ? { data: lineups, error: null }
        : { data: profiles, error: null };

      builder['single'] = vi.fn().mockReturnValue(resp);
      builder['maybeSingle'] = vi.fn().mockReturnValue(resp);
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve(resp),
      );
      return builder;
    });

    const result = await getEventParticipants(EVENT_ID);
    expect(result).toHaveLength(2);
    expect(result[0].handle).toBe('user1');
    expect(result[1].handle).toBe('user2');
  });

  it('returns empty array for event with no lineups', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: [], error: null });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: [], error: null });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: [], error: null }),
      );
      return builder;
    });

    const result = await getEventParticipants(EVENT_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when lineups query errors', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: { message: 'err' } });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: { message: 'err' } });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: { message: 'err' } }),
      );
      return builder;
    });

    const result = await getEventParticipants(EVENT_ID);
    expect(result).toEqual([]);
  });
});

// ============================================
// getEventParticipantCount
// ============================================

describe('getEventParticipantCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns count number on success', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: null, count: 42 });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: null, count: 42 });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: null, count: 42 }),
      );
      return builder;
    });

    const result = await getEventParticipantCount(EVENT_ID);
    expect(result).toBe(42);
  });

  it('returns 0 on error', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: { message: 'err' }, count: null });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: { message: 'err' }, count: null });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: { message: 'err' }, count: null }),
      );
      return builder;
    });

    const result = await getEventParticipantCount(EVENT_ID);
    expect(result).toBe(0);
  });

  it('returns 0 when count is null', async () => {
    mockSupabase.from.mockImplementation(() => {
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
      builder['single'] = vi.fn().mockReturnValue({ data: null, error: null, count: null });
      builder['maybeSingle'] = vi.fn().mockReturnValue({ data: null, error: null, count: null });
      builder['then'] = vi.fn().mockImplementation(
        (resolve: (val: unknown) => void) => resolve({ data: null, error: null, count: null }),
      );
      return builder;
    });

    const result = await getEventParticipantCount(EVENT_ID);
    expect(result).toBe(0);
  });
});
