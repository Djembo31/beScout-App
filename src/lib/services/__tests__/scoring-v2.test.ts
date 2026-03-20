import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Hoisted mock state (accessible inside vi.mock factories)
// ============================================

const {
  rpcResponsesRef,
  fromResponsesRef,
  updateCallsRef,
  mockSupabase,
} = vi.hoisted(() => {
  const rpcResponsesRef: { current: Record<string, { data: unknown; error: unknown }> } = { current: {} };
  const fromResponsesRef: { current: Record<string, { data: unknown; error: unknown }> } = { current: {} };
  const updateCallsRef: { current: Array<{ table: string; data: unknown; eqField: string; eqValue: unknown }> } = { current: [] };

  function createChainBuilder(tableName: string) {
    const getResponse = () => fromResponsesRef.current[tableName] ?? { data: [], error: null };

    const builder: Record<string, unknown> = {};
    const chainMethods = [
      'select', 'eq', 'neq', 'not', 'in', 'order', 'limit', 'or', 'filter', 'gte', 'lte',
    ];

    for (const method of chainMethods) {
      builder[method] = (..._args: unknown[]) => builder;
    }

    // update() returns a sub-builder with eq() that resolves
    builder['update'] = (data: unknown) => {
      const subBuilder: Record<string, unknown> = {};
      subBuilder['eq'] = (field: string, value: unknown) => {
        updateCallsRef.current.push({ table: tableName, data, eqField: field, eqValue: value });
        return { data: null, error: null };
      };
      return subBuilder;
    };

    // Terminal methods
    builder['single'] = () => getResponse();
    builder['maybeSingle'] = () => getResponse();

    // Thenable for awaiting chain directly
    builder['then'] = (resolve: (val: unknown) => void) => resolve(getResponse());

    return builder;
  }

  const mockSupabase = {
    from: (tableName: string) => createChainBuilder(tableName),
    rpc: (rpcName: string) => {
      return rpcResponsesRef.current[rpcName] ?? { data: null, error: null };
    },
  };

  return { rpcResponsesRef, fromResponsesRef, updateCallsRef, mockSupabase };
});

// ============================================
// vi.mock declarations (hoisted to top by vitest)
// ============================================

vi.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/services/notifications', () => ({
  createNotification: vi.fn(),
  createNotificationsBatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/social', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue(undefined),
  refreshUserStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/missions', () => ({
  triggerMissionProgress: vi.fn(),
}));

vi.mock('@/lib/services/activityLog', () => ({
  logActivity: vi.fn(),
}));

vi.mock('@/lib/notifText', () => ({
  notifText: vi.fn((key: string) => key),
}));

vi.mock('@/lib/services/fanRanking', () => ({
  batchRecalculateFanRanks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/predictions', () => ({
  resolvePredictions: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/services/events', () => ({
  createNextGameweekEvents: vi.fn().mockResolvedValue({ created: 2, error: null, skipped: false }),
}));

vi.mock('@/lib/services/club', () => ({
  setActiveGameweek: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/dpcOfTheWeek', () => ({
  calculateDpcOfWeek: vi.fn().mockResolvedValue(undefined),
}));

// ============================================
// Imports (after mocks)
// ============================================

import {
  scoreEvent,
  resetEvent,
  getEventLeaderboard,
  getProgressiveScores,
  finalizeGameweek,
} from '@/lib/services/scoring';

// ============================================
// Helpers
// ============================================

function setRpcResponse(rpcName: string, data: unknown, error: unknown = null) {
  rpcResponsesRef.current[rpcName] = { data, error };
}

function setFromResponse(tableName: string, data: unknown, error: unknown = null) {
  fromResponsesRef.current[tableName] = { data, error };
}

// ============================================
// Tests
// ============================================

describe('Scoring Service v2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcResponsesRef.current = {};
    fromResponsesRef.current = {};
    updateCallsRef.current = [];
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok'));
  });

  // ------------------------------------------
  // 1. scoreEvent
  // ------------------------------------------
  describe('scoreEvent', () => {
    it('returns success when RPC returns {success: true}', async () => {
      setRpcResponse('score_event', { success: true, scored_count: 5, winner_name: 'Alice' });

      const result = await scoreEvent('event-1');

      expect(result.success).toBe(true);
      expect(result.scored_count).toBe(5);
      expect(result.winner_name).toBe('Alice');
    });

    it('returns error when RPC returns {success: false, error: msg}', async () => {
      setRpcResponse('score_event', { success: false, error: 'Event already scored' });

      const result = await scoreEvent('event-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event already scored');
    });

    it('returns error when RPC returns a DB error', async () => {
      setRpcResponse('score_event', null, { message: 'DB connection failed' });

      const result = await scoreEvent('event-3');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB connection failed');
    });

    it('throws when RPC returns null data (no error)', async () => {
      setRpcResponse('score_event', null);

      // null data is cast as ScoreResult, then result.success throws TypeError
      await expect(scoreEvent('event-4')).rejects.toThrow();
    });

    it('calls fetch to bust events API cache', async () => {
      setRpcResponse('score_event', { success: true });

      await scoreEvent('event-5');

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/events?bust=1');
    });

    it('does not throw when cache bust fetch fails', async () => {
      setRpcResponse('score_event', { success: true });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

      // Should not throw
      const result = await scoreEvent('event-7');
      expect(result.success).toBe(true);
    });
  });

  // ------------------------------------------
  // 2. resetEvent
  // ------------------------------------------
  describe('resetEvent', () => {
    it('returns success when RPC succeeds', async () => {
      setRpcResponse('reset_event', { success: true, message: 'Event reset' });

      const result = await resetEvent('event-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Event reset');
    });

    it('returns error when RPC fails with DB error', async () => {
      setRpcResponse('reset_event', null, { message: 'Permission denied' });

      const result = await resetEvent('event-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('busts cache after reset', async () => {
      setRpcResponse('reset_event', { success: true });

      await resetEvent('event-3');

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/events?bust=1');
    });
  });

  // ------------------------------------------
  // 3. getEventLeaderboard
  // ------------------------------------------
  describe('getEventLeaderboard', () => {
    it('returns sorted leaderboard entries with profile data', async () => {
      setFromResponse('lineups', [
        { user_id: 'u1', total_score: 500, rank: 1, reward_amount: 10000 },
        { user_id: 'u2', total_score: 400, rank: 2, reward_amount: 5000 },
      ]);
      setFromResponse('profiles', [
        { id: 'u1', handle: 'alice', display_name: 'Alice', avatar_url: 'https://a.com/1.jpg' },
        { id: 'u2', handle: 'bob', display_name: null, avatar_url: null },
      ]);

      const result = await getEventLeaderboard('event-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        rank: 1,
        userId: 'u1',
        handle: 'alice',
        displayName: 'Alice',
        avatarUrl: 'https://a.com/1.jpg',
        totalScore: 500,
        rewardAmount: 10000,
      });
      expect(result[1]).toEqual({
        rank: 2,
        userId: 'u2',
        handle: 'bob',
        displayName: null,
        avatarUrl: null,
        totalScore: 400,
        rewardAmount: 5000,
      });
    });

    it('returns empty array for event with no entries', async () => {
      setFromResponse('lineups', []);

      const result = await getEventLeaderboard('empty-event');

      expect(result).toEqual([]);
    });

    it('returns empty array on query error', async () => {
      setFromResponse('lineups', null, { message: 'query failed' });

      const result = await getEventLeaderboard('err-event');

      expect(result).toEqual([]);
    });

    it('handles missing profiles gracefully with fallback handle', async () => {
      setFromResponse('lineups', [
        { user_id: 'u-orphan', total_score: 300, rank: 1, reward_amount: 0 },
      ]);
      setFromResponse('profiles', []);

      const result = await getEventLeaderboard('event-orphan');

      expect(result).toHaveLength(1);
      // notifText is mocked to return the key string
      expect(result[0].handle).toBe('unknownFallback');
      expect(result[0].displayName).toBeNull();
      expect(result[0].avatarUrl).toBeNull();
    });

    it('uses 0 as default for null reward_amount', async () => {
      setFromResponse('lineups', [
        { user_id: 'u1', total_score: 100, rank: 1, reward_amount: null },
      ]);
      setFromResponse('profiles', [
        { id: 'u1', handle: 'test', display_name: null, avatar_url: null },
      ]);

      const result = await getEventLeaderboard('event-nullreward');

      expect(result[0].rewardAmount).toBe(0);
    });
  });

  // ------------------------------------------
  // 4. getProgressiveScores
  // ------------------------------------------
  describe('getProgressiveScores', () => {
    it('returns map of player_id -> score', async () => {
      setFromResponse('player_gameweek_scores', [
        { player_id: 'p1', score: 75 },
        { player_id: 'p2', score: 82 },
      ]);

      const result = await getProgressiveScores(10, ['p1', 'p2']);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('p1')).toBe(75);
      expect(result.get('p2')).toBe(82);
      expect(result.size).toBe(2);
    });

    it('returns empty map for empty playerIds without querying', async () => {
      const result = await getProgressiveScores(10, []);

      expect(result.size).toBe(0);
    });

    it('returns empty map when no scores found', async () => {
      setFromResponse('player_gameweek_scores', []);

      const result = await getProgressiveScores(10, ['p1']);

      expect(result.size).toBe(0);
    });

    it('handles null data gracefully', async () => {
      setFromResponse('player_gameweek_scores', null);

      const result = await getProgressiveScores(10, ['p1']);

      expect(result.size).toBe(0);
    });
  });

  // ------------------------------------------
  // 5. finalizeGameweek
  // ------------------------------------------
  describe('finalizeGameweek', () => {
    const CLUB_ID = 'club-abc';
    const GW = 10;

    it('handles no events gracefully (empty GW)', async () => {
      setFromResponse('events', []);

      const result = await finalizeGameweek(CLUB_ID, GW);

      expect(result.eventsScored).toBe(0);
      expect(result.nextGameweek).toBe(GW + 1);
    });

    it('scores events that have entries via score_event RPC', async () => {
      setFromResponse('events', [
        { id: 'evt-1', status: 'registering', scored_at: null, current_entries: 5 },
      ]);
      setRpcResponse('score_event', { success: true, scored_count: 5 });

      const result = await finalizeGameweek(CLUB_ID, GW);

      expect(result.eventsScored).toBe(1);
    });

    it('closes empty events directly (status=ended) without calling score_event', async () => {
      setFromResponse('events', [
        { id: 'evt-empty', status: 'registering', scored_at: null, current_entries: 0 },
      ]);

      const result = await finalizeGameweek(CLUB_ID, GW);

      expect(result.eventsScored).toBe(1);
      // Should call update on events table
      expect(updateCallsRef.current.some(c => c.table === 'events' && c.eqValue === 'evt-empty')).toBe(true);
    });

    it('skips already scored events', async () => {
      setFromResponse('events', [
        { id: 'evt-done', status: 'ended', scored_at: '2025-01-01T00:00:00Z', current_entries: 3 },
      ]);

      const result = await finalizeGameweek(CLUB_ID, GW);

      // Already scored (scored_at is truthy), so eventsToScore is empty
      expect(result.eventsScored).toBe(0);
    });

    it('handles mix of scored, unscored with entries, and empty events', async () => {
      setFromResponse('events', [
        { id: 'evt-scored', status: 'ended', scored_at: '2025-01-01', current_entries: 3 },
        { id: 'evt-entries', status: 'registering', scored_at: null, current_entries: 10 },
        { id: 'evt-empty', status: 'registering', scored_at: null, current_entries: 0 },
      ]);
      setRpcResponse('score_event', { success: true });

      const result = await finalizeGameweek(CLUB_ID, GW);

      // evt-scored skipped, evt-entries scored via RPC, evt-empty closed directly
      expect(result.eventsScored).toBe(2);
    });

    it('continues scoring remaining events when one fails', async () => {
      setFromResponse('events', [
        { id: 'evt-fail', status: 'registering', scored_at: null, current_entries: 5 },
        { id: 'evt-ok', status: 'registering', scored_at: null, current_entries: 3 },
      ]);
      setRpcResponse('score_event', { success: false, error: 'scoring failed' });

      const result = await finalizeGameweek(CLUB_ID, GW);

      // Both fail but loop continues — errors for each
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.eventsScored).toBe(0);
    });

    it('advances gameweek to next', async () => {
      setFromResponse('events', []);

      const { setActiveGameweek } = await import('@/lib/services/club');

      await finalizeGameweek(CLUB_ID, GW);

      expect(setActiveGameweek).toHaveBeenCalledWith(CLUB_ID, GW + 1);
    });

    it('creates next gameweek events', async () => {
      setFromResponse('events', []);

      const { createNextGameweekEvents } = await import('@/lib/services/events');

      const result = await finalizeGameweek(CLUB_ID, GW);

      expect(createNextGameweekEvents).toHaveBeenCalledWith(CLUB_ID, GW);
      expect(result.nextGwEventsCreated).toBe(2);
    });

    it('resolves predictions before scoring', async () => {
      setFromResponse('events', []);

      const { resolvePredictions } = await import('@/lib/services/predictions');

      await finalizeGameweek(CLUB_ID, GW);

      expect(resolvePredictions).toHaveBeenCalledWith(GW);
    });

    it('records error when events query fails', async () => {
      setFromResponse('events', null, { message: 'events table unavailable' });

      const result = await finalizeGameweek(CLUB_ID, GW);

      expect(result.errors).toContain('Events laden: events table unavailable');
    });

    it('records error when prediction resolution fails', async () => {
      setFromResponse('events', []);
      const { resolvePredictions } = await import('@/lib/services/predictions');
      vi.mocked(resolvePredictions).mockResolvedValueOnce({ success: false, error: 'pred fail' });

      const result = await finalizeGameweek(CLUB_ID, GW);

      expect(result.errors.some(e => e.includes('pred fail'))).toBe(true);
    });

    it('returns nextGameweek = gameweek + 1', async () => {
      setFromResponse('events', []);

      const result = await finalizeGameweek(CLUB_ID, 15);

      expect(result.nextGameweek).toBe(16);
    });

    it('treats null current_entries as 0 (empty event)', async () => {
      setFromResponse('events', [
        { id: 'evt-null', status: 'registering', scored_at: null, current_entries: null },
      ]);

      const result = await finalizeGameweek(CLUB_ID, GW);

      // null current_entries -> (null ?? 0) === 0 -> close directly
      expect(result.eventsScored).toBe(1);
    });
  });
});
