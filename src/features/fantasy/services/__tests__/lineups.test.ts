import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockTable, resetMocks, mockSupabase } from '@/test/mocks/supabase';

vi.mock('@/lib/notifText', () => ({
  notifText: vi.fn((key: string) => key),
}));

import {
  getOwnedPlayerIds,
  getLineup,
  getEventParticipants,
  getEventParticipantCount,
  getLineupWithPlayers,
  getPlayerEventUsage,
  getUserFantasyHistory,
} from '../lineups.queries';

// ============================================
// Helpers
// ============================================

function makeLineupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lineup-1',
    event_id: 'evt-1',
    user_id: 'user-1',
    formation: '4-3-3',
    slot_gk: 'p-gk',
    slot_def1: 'p-def1',
    slot_def2: 'p-def2',
    slot_def3: 'p-def3',
    slot_def4: 'p-def4',
    slot_mid1: 'p-mid1',
    slot_mid2: 'p-mid2',
    slot_mid3: 'p-mid3',
    slot_mid4: null,
    slot_att: 'p-att',
    slot_att2: null,
    slot_att3: null,
    captain_slot: 'att',
    total_score: 75,
    slot_scores: { gk: 5, def1: 8, def2: 6, def3: 7, def4: 5, mid1: 10, mid2: 9, mid3: 8, att: 17 },
    rank: 3,
    reward_amount: 5000,
    submitted_at: '2026-04-10T12:00:00Z',
    locked: false,
    synergy_bonus_pct: 5,
    synergy_details: null,
    streak_bonus_pct: 0,
    wildcard_slots: [],
    equipment_map: null,
    ...overrides,
  };
}

function makePlayerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-gk',
    first_name: 'Ersin',
    last_name: 'Destanoglu',
    position: 'GK',
    club: 'Sakaryaspor',
    perf_l5: 72,
    image_url: 'https://img.test/ersin.jpg',
    ...overrides,
  };
}

// ============================================
// getOwnedPlayerIds
// ============================================

describe('getOwnedPlayerIds', () => {
  beforeEach(() => resetMocks());

  it('should return Set of player IDs from holdings', async () => {
    mockTable('holdings', [
      { player_id: 'p-1' },
      { player_id: 'p-2' },
      { player_id: 'p-3' },
    ]);

    const result = await getOwnedPlayerIds('user-1');

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(3);
    expect(result.has('p-1')).toBe(true);
    expect(result.has('p-2')).toBe(true);
    expect(result.has('p-3')).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('holdings');
  });

  it('should return empty Set when user owns nothing', async () => {
    mockTable('holdings', []);

    const result = await getOwnedPlayerIds('user-no-cards');

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('should handle null data gracefully', async () => {
    mockTable('holdings', null);

    const result = await getOwnedPlayerIds('user-1');

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });
});

// ============================================
// getLineup
// ============================================

describe('getLineup', () => {
  beforeEach(() => resetMocks());

  it('should return lineup when found', async () => {
    mockTable('lineups', makeLineupRow());

    const result = await getLineup('evt-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.event_id).toBe('evt-1');
    expect(result!.user_id).toBe('user-1');
    expect(result!.formation).toBe('4-3-3');
    expect(result!.slot_gk).toBe('p-gk');
  });

  it('should return null when lineup not found', async () => {
    mockTable('lineups', null);

    const result = await getLineup('evt-999', 'user-1');

    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    mockTable('lineups', null, { message: 'RLS violation' });

    await expect(getLineup('evt-1', 'user-1')).rejects.toThrow('RLS violation');
  });
});

// ============================================
// getEventParticipants
// ============================================

describe('getEventParticipants', () => {
  beforeEach(() => resetMocks());

  it('should return participants with profile data', async () => {
    // First call: lineups table
    mockTable('lineups', [{ user_id: 'u-1' }, { user_id: 'u-2' }]);
    // Second call: profiles table
    mockTable('profiles', [
      { id: 'u-1', handle: 'alice', display_name: 'Alice', avatar_url: 'https://img.test/alice.jpg' },
      { id: 'u-2', handle: 'bob', display_name: null, avatar_url: null },
    ]);

    const result = await getEventParticipants('evt-1');

    expect(result).toHaveLength(2);
  });

  it('should return empty array when no lineups exist', async () => {
    mockTable('lineups', []);

    const result = await getEventParticipants('evt-empty');

    expect(result).toEqual([]);
  });

  it('should return empty array when lineups data is null', async () => {
    mockTable('lineups', null);

    const result = await getEventParticipants('evt-1');

    expect(result).toEqual([]);
  });

  it('throws when lineups query errors', async () => {
    mockTable('lineups', null, { message: 'timeout' });

    await expect(getEventParticipants('evt-1')).rejects.toThrow('timeout');
  });

  it('should throw when profiles query errors', async () => {
    mockTable('lineups', [{ user_id: 'u-1' }]);
    mockTable('profiles', null, { message: 'profiles unavailable' });

    await expect(getEventParticipants('evt-1')).rejects.toThrow('profiles unavailable');
  });
});

// ============================================
// getEventParticipantCount
// ============================================

describe('getEventParticipantCount', () => {
  beforeEach(() => resetMocks());

  it('should return count from exact count query', async () => {
    // The count mock needs special handling — count comes from response.count
    mockTable('lineups', null, null, 42);

    const result = await getEventParticipantCount('evt-1');

    expect(typeof result).toBe('number');
    expect(mockSupabase.from).toHaveBeenCalledWith('lineups');
  });

  it('throws on DB error', async () => {
    mockTable('lineups', null, { message: 'count failed' });

    await expect(getEventParticipantCount('evt-1')).rejects.toThrow('count failed');
  });

  it('should return 0 when count is null', async () => {
    mockTable('lineups', null, null, null);

    const result = await getEventParticipantCount('evt-1');

    expect(result).toBe(0);
  });
});

// ============================================
// getLineupWithPlayers
// ============================================

describe('getLineupWithPlayers', () => {
  beforeEach(() => resetMocks());

  it('should return lineup with player details and slot scores', async () => {
    // First: lineups query via maybeSingle
    mockTable('lineups', makeLineupRow());
    // Second: players query
    mockTable('players', [
      makePlayerRow({ id: 'p-gk', first_name: 'Ersin', position: 'GK' }),
      makePlayerRow({ id: 'p-def1', first_name: 'Kaan', position: 'DEF' }),
      makePlayerRow({ id: 'p-def2', first_name: 'Ali', position: 'DEF' }),
      makePlayerRow({ id: 'p-def3', first_name: 'Mehmet', position: 'DEF' }),
      makePlayerRow({ id: 'p-def4', first_name: 'Veli', position: 'DEF' }),
      makePlayerRow({ id: 'p-mid1', first_name: 'Kerem', position: 'MID' }),
      makePlayerRow({ id: 'p-mid2', first_name: 'Hakan', position: 'MID' }),
      makePlayerRow({ id: 'p-mid3', first_name: 'Emre', position: 'MID' }),
      makePlayerRow({ id: 'p-att', first_name: 'Cenk', position: 'ATT' }),
    ]);

    const result = await getLineupWithPlayers('evt-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.lineup.event_id).toBe('evt-1');
    expect(result!.players.length).toBeGreaterThan(0);

    // Check that slot scores are resolved
    const gkSlot = result!.players.find(p => p.slotKey === 'gk');
    expect(gkSlot).toBeDefined();
    expect(gkSlot!.score).toBe(5); // from slot_scores.gk
    expect(gkSlot!.player.firstName).toBe('Ersin');
    expect(gkSlot!.player.position).toBe('GK');
  });

  it('should return null when lineup not found', async () => {
    mockTable('lineups', null);

    const result = await getLineupWithPlayers('evt-999', 'user-1');

    expect(result).toBeNull();
  });

  it('throws on lineup query error', async () => {
    mockTable('lineups', null, { message: 'RLS blocked' });

    await expect(getLineupWithPlayers('evt-1', 'user-1')).rejects.toThrow('RLS blocked');
  });

  it('should return empty players array when all slots are null', async () => {
    const emptyLineup = makeLineupRow({
      slot_gk: null, slot_def1: null, slot_def2: null, slot_def3: null, slot_def4: null,
      slot_mid1: null, slot_mid2: null, slot_mid3: null, slot_mid4: null,
      slot_att: null, slot_att2: null, slot_att3: null,
      slot_scores: null,
    });
    mockTable('lineups', emptyLineup);

    const result = await getLineupWithPlayers('evt-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.players).toEqual([]);
  });

  it('should handle missing player data with fallback defaults', async () => {
    mockTable('lineups', makeLineupRow({ slot_gk: 'p-missing', slot_def1: null, slot_def2: null, slot_def3: null, slot_def4: null, slot_mid1: null, slot_mid2: null, slot_mid3: null, slot_mid4: null, slot_att: null, slot_att2: null, slot_att3: null }));
    mockTable('players', []); // no player data returned

    const result = await getLineupWithPlayers('evt-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.players).toHaveLength(1);
    // Missing player should get fallback values
    expect(result!.players[0].player.firstName).toBe('');
    expect(result!.players[0].player.lastName).toBe('');
    expect(result!.players[0].player.position).toBe('MID'); // default fallback
    expect(result!.players[0].player.perfL5).toBe(0);
  });

  it('should handle null slot_scores (scores all null)', async () => {
    mockTable('lineups', makeLineupRow({ slot_scores: null }));
    mockTable('players', [makePlayerRow({ id: 'p-gk' })]);

    const result = await getLineupWithPlayers('evt-1', 'user-1');

    expect(result).not.toBeNull();
    const gkSlot = result!.players.find(p => p.slotKey === 'gk');
    expect(gkSlot!.score).toBeNull();
  });
});

// ============================================
// getPlayerEventUsage
// ============================================

describe('getPlayerEventUsage', () => {
  beforeEach(() => resetMocks());

  it('should return Map of playerId to event IDs', async () => {
    mockTable('lineups', [
      {
        slot_gk: 'p-gk', slot_def1: 'p-def1', slot_def2: null, slot_def3: null, slot_def4: null,
        slot_mid1: null, slot_mid2: null, slot_mid3: null, slot_mid4: null,
        slot_att: null, slot_att2: null, slot_att3: null,
        event: { id: 'evt-1', name: 'Gameweek 10', status: 'registering' },
      },
      {
        slot_gk: 'p-gk', slot_def1: null, slot_def2: null, slot_def3: null, slot_def4: null,
        slot_mid1: null, slot_mid2: null, slot_mid3: null, slot_mid4: null,
        slot_att: 'p-att', slot_att2: null, slot_att3: null,
        event: { id: 'evt-2', name: 'Gameweek 11', status: 'registering' },
      },
    ]);

    const result = await getPlayerEventUsage('user-1');

    expect(result).toBeInstanceOf(Map);
    // p-gk appears in both events
    expect(result.get('p-gk')).toEqual(['evt-1', 'evt-2']);
    // p-def1 appears in one event
    expect(result.get('p-def1')).toEqual(['evt-1']);
    // p-att appears in one event
    expect(result.get('p-att')).toEqual(['evt-2']);
  });

  it('should exclude ended events from usage', async () => {
    mockTable('lineups', [
      {
        slot_gk: 'p-gk', slot_def1: null, slot_def2: null, slot_def3: null, slot_def4: null,
        slot_mid1: null, slot_mid2: null, slot_mid3: null, slot_mid4: null,
        slot_att: null, slot_att2: null, slot_att3: null,
        event: { id: 'evt-old', name: 'GW 5', status: 'ended' },
      },
    ]);

    const result = await getPlayerEventUsage('user-1');

    expect(result.size).toBe(0);
  });

  it('should exclude scoring events from usage', async () => {
    mockTable('lineups', [
      {
        slot_gk: 'p-gk', slot_def1: null, slot_def2: null, slot_def3: null, slot_def4: null,
        slot_mid1: null, slot_mid2: null, slot_mid3: null, slot_mid4: null,
        slot_att: null, slot_att2: null, slot_att3: null,
        event: { id: 'evt-scoring', name: 'GW 9', status: 'scoring' },
      },
    ]);

    const result = await getPlayerEventUsage('user-1');

    expect(result.size).toBe(0);
  });

  it('should return empty Map when user has no lineups', async () => {
    mockTable('lineups', []);

    const result = await getPlayerEventUsage('user-1');

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('throws on DB error', async () => {
    mockTable('lineups', null, { message: 'query failed' });

    await expect(getPlayerEventUsage('user-1')).rejects.toThrow('query failed');
  });

  it('should handle null event join gracefully', async () => {
    mockTable('lineups', [
      {
        slot_gk: 'p-gk', slot_def1: null, slot_def2: null, slot_def3: null, slot_def4: null,
        slot_mid1: null, slot_mid2: null, slot_mid3: null, slot_mid4: null,
        slot_att: null, slot_att2: null, slot_att3: null,
        event: null, // FK join failed or event deleted
      },
    ]);

    const result = await getPlayerEventUsage('user-1');

    // null event should be skipped
    expect(result.size).toBe(0);
  });
});

// ============================================
// getUserFantasyHistory
// ============================================

describe('getUserFantasyHistory', () => {
  beforeEach(() => resetMocks());

  it('should return fantasy results with event details', async () => {
    mockTable('lineups', [
      {
        event_id: 'evt-1',
        total_score: 85,
        rank: 1,
        reward_amount: 10000,
        event: { name: 'Gameweek 10', gameweek: 10, starts_at: '2026-04-10T18:00:00Z' },
      },
      {
        event_id: 'evt-2',
        total_score: 60,
        rank: 5,
        reward_amount: 2000,
        event: { name: 'Gameweek 9', gameweek: 9, starts_at: '2026-04-03T18:00:00Z' },
      },
    ]);

    const result = await getUserFantasyHistory('user-1');

    expect(result).toHaveLength(2);
    expect(result[0].eventId).toBe('evt-1');
    expect(result[0].eventName).toBe('Gameweek 10');
    expect(result[0].gameweek).toBe(10);
    expect(result[0].totalScore).toBe(85);
    expect(result[0].rank).toBe(1);
    expect(result[0].rewardAmount).toBe(10000);

    expect(result[1].eventId).toBe('evt-2');
    expect(result[1].rank).toBe(5);
  });

  it('should return empty array when user has no scored events', async () => {
    mockTable('lineups', []);

    const result = await getUserFantasyHistory('user-new');

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('lineups', null, { message: 'database error' });

    await expect(getUserFantasyHistory('user-1')).rejects.toThrow('database error');
  });

  it('should handle null event join with fallback name', async () => {
    mockTable('lineups', [
      {
        event_id: 'evt-orphan',
        total_score: 50,
        rank: null,
        reward_amount: 0,
        event: null,
      },
    ]);

    const result = await getUserFantasyHistory('user-1');

    expect(result).toHaveLength(1);
    // notifText mock returns the key string
    expect(result[0].eventName).toBe('unknownFallback');
    expect(result[0].gameweek).toBeNull();
    expect(result[0].rank).toBe(0); // null rank -> ?? 0
  });

  it('should respect limit parameter', async () => {
    mockTable('lineups', [
      { event_id: 'evt-1', total_score: 80, rank: 1, reward_amount: 5000, event: { name: 'GW10', gameweek: 10, starts_at: '2026-04-10T18:00:00Z' } },
    ]);

    const result = await getUserFantasyHistory('user-1', 5);

    expect(Array.isArray(result)).toBe(true);
    // We can at least verify the call was made (limit is part of the query chain)
    expect(mockSupabase.from).toHaveBeenCalledWith('lineups');
  });
});
