import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '@/test/mocks/supabase';
import { submitLineup, getLineup, getEventParticipants, getEventParticipantCount } from '../lineups';

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

const baseParams = {
  eventId: EVENT_ID,
  userId: USER_ID,
  formation: '4-4-2',
};

// ============================================
// submitLineup — RPC-based validation (all guards now in save_lineup RPC)
// ============================================

describe('submitLineup — RPC error propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('succeeds when RPC returns ok: true', async () => {
    const { slots } = makeSlots(7);
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: true, lineup_id: 'lineup-1', is_new: true },
      error: null,
    });

    const result = await submitLineup({ ...baseParams, slots });
    expect(result).toBeDefined();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('save_lineup', expect.objectContaining({
      p_event_id: EVENT_ID,
      p_formation: '4-4-2',
    }));
  });

  it('throws RPC error message on RPC failure', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'event_not_found' },
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('event_not_found');
  });

  it('throws event_ended from RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'event_ended' },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('event_ended');
  });

  it('throws event_locked from RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'event_locked' },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('event_locked');
  });

  it('throws must_enter_first from RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'must_enter_first' },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('must_enter_first');
  });

  it('throws duplicate_player from RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'duplicate_player' },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: { gk: 'p1', def1: 'p1' } }),
    ).rejects.toThrow('duplicate_player');
  });

  it('throws insufficient_sc from RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'insufficient_sc' },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: { gk: 'p1' } }),
    ).rejects.toThrow('insufficient_sc');
  });

  it('throws wildcards_not_allowed from RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'wildcards_not_allowed' },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: {}, wildcardSlots: ['gk'] }),
    ).rejects.toThrow('wildcards_not_allowed');
  });

  it('throws too_many_wildcards from RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false, error: 'too_many_wildcards' },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: {}, wildcardSlots: ['gk', 'def1', 'def2'] }),
    ).rejects.toThrow('too_many_wildcards');
  });

  it('throws lineup_save_failed when RPC returns ok: false without error', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: false },
      error: null,
    });

    await expect(
      submitLineup({ ...baseParams, slots: {} }),
    ).rejects.toThrow('lineup_save_failed');
  });

  it('passes slot mapping correctly to RPC', async () => {
    const slots = { gk: 'p1', def1: 'p2', mid1: 'p3', att: 'p4' };
    mockSupabase.rpc.mockResolvedValue({
      data: { ok: true, lineup_id: 'lineup-map', is_new: true },
      error: null,
    });

    await submitLineup({ ...baseParams, slots, captainSlot: 'gk', wildcardSlots: ['att'] });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('save_lineup', expect.objectContaining({
      p_slot_gk: 'p1',
      p_slot_def1: 'p2',
      p_slot_mid1: 'p3',
      p_slot_att: 'p4',
      p_captain_slot: 'gk',
      p_wildcard_slots: ['att'],
    }));
  });
});

// removeLineup: REMOVED — unlock_event_entry RPC handles cleanup atomically

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

  it('throws on DB error', async () => {
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

    await expect(getLineup(EVENT_ID, USER_ID)).rejects.toThrow('query error');
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

  it('throws when lineups query errors', async () => {
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

    await expect(getEventParticipants(EVENT_ID)).rejects.toThrow('err');
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

  it('throws on DB error', async () => {
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

    await expect(getEventParticipantCount(EVENT_ID)).rejects.toThrow('err');
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
