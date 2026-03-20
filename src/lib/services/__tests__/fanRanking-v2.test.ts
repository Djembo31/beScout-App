import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  getFanRanking,
  getClubFanLeaderboard,
  recalculateFanRank,
  batchRecalculateFanRanks,
} from '../fanRanking';

beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// getFanRanking
// ============================================
describe('getFanRanking', () => {
  it('returns fan ranking for user+club', async () => {
    const ranking = {
      user_id: 'u1', club_id: 'c1', rank_tier: 'silber',
      csf_multiplier: 1.5, event_score: 100, dpc_score: 200,
      abo_score: 50, community_score: 30, streak_score: 20,
      total_score: 400, calculated_at: '2025-03-01', created_at: '2025-01-01',
    };
    mockTable('fan_rankings', ranking);
    const result = await getFanRanking('u1', 'c1');
    expect(result).toEqual(ranking);
    expect(mockSupabase.from).toHaveBeenCalledWith('fan_rankings');
  });

  it('returns null when no ranking exists', async () => {
    mockTable('fan_rankings', null);
    expect(await getFanRanking('u1', 'c1')).toBeNull();
  });

  it('returns null on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('fan_rankings', null, { message: 'err' });
    expect(await getFanRanking('u1', 'c1')).toBeNull();
    consoleSpy.mockRestore();
  });
});

// ============================================
// getClubFanLeaderboard
// ============================================
describe('getClubFanLeaderboard', () => {
  it('returns leaderboard with profile data', async () => {
    mockTable('fan_rankings', [{
      user_id: 'u1', club_id: 'c1', rank_tier: 'gold',
      csf_multiplier: 2.0, event_score: 200, dpc_score: 300,
      abo_score: 100, community_score: 50, streak_score: 30,
      total_score: 680, calculated_at: '2025-03-01', created_at: '2025-01-01',
      profiles: { handle: 'alice', avatar_url: '/alice.png' },
    }]);
    const result = await getClubFanLeaderboard('c1');
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe('u1');
    expect(result[0].total_score).toBe(680);
    expect(result[0].profile.handle).toBe('alice');
  });

  it('uses default limit of 50', async () => {
    mockTable('fan_rankings', []);
    await getClubFanLeaderboard('c1');
    // Should not error
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('fan_rankings', null, { message: 'err' });
    expect(await getClubFanLeaderboard('c1')).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when data is null', async () => {
    mockTable('fan_rankings', null);
    expect(await getClubFanLeaderboard('c1')).toEqual([]);
  });
});

// ============================================
// recalculateFanRank
// ============================================
describe('recalculateFanRank', () => {
  it('recalculates and returns result', async () => {
    mockRpc('calculate_fan_rank', {
      ok: true, rank_tier: 'gold', csf_multiplier: 2.0, total_score: 750,
      components: { event: 200, dpc: 300, abo: 100, community: 80, streak: 70 },
    });
    const result = await recalculateFanRank('u1', 'c1');
    expect(result).toEqual({
      ok: true, rankTier: 'gold', csfMultiplier: 2.0, totalScore: 750,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_fan_rank', {
      p_user_id: 'u1', p_club_id: 'c1',
    });
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('calculate_fan_rank', null, { message: 'RPC timeout' });
    const result = await recalculateFanRank('u1', 'c1');
    expect(result).toEqual({ ok: false, error: 'RPC timeout' });
    consoleSpy.mockRestore();
  });

  it('returns error when RPC returns ok=false', async () => {
    mockRpc('calculate_fan_rank', { ok: false, error: 'User not found' });
    const result = await recalculateFanRank('u1', 'c1');
    expect(result).toEqual({ ok: false, error: 'User not found' });
  });

  it('handles missing error in failure response', async () => {
    mockRpc('calculate_fan_rank', { ok: false });
    const result = await recalculateFanRank('u1', 'c1');
    expect(result).toEqual({ ok: false, error: 'Unknown error' });
  });
});

// ============================================
// batchRecalculateFanRanks
// ============================================
describe('batchRecalculateFanRanks', () => {
  it('batch recalculates for event participants', async () => {
    mockRpc('batch_recalculate_fan_ranks', { ok: true, recalculated: 15, errors: [] });
    const result = await batchRecalculateFanRanks('evt-1');
    expect(result).toEqual({ ok: true, recalculated: 15, errors: [] });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('batch_recalculate_fan_ranks', {
      p_event_id: 'evt-1',
    });
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('batch_recalculate_fan_ranks', null, { message: 'DB error' });
    const result = await batchRecalculateFanRanks('evt-1');
    expect(result).toEqual({ ok: false, error: 'DB error' });
    consoleSpy.mockRestore();
  });

  it('returns partial results with errors', async () => {
    mockRpc('batch_recalculate_fan_ranks', {
      ok: true, recalculated: 10, errors: ['user-5: division by zero'],
    });
    const result = await batchRecalculateFanRanks('evt-1');
    expect(result.recalculated).toBe(10);
    expect(result.errors).toHaveLength(1);
  });
});
