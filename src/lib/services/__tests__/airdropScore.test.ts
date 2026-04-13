import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  getAirdropScore, getAirdropLeaderboard, getAirdropStats,
  refreshAirdropScore, refreshAllAirdropScores,
} from '../airdropScore';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getAirdropScore', () => {
  it('returns score for user', async () => {
    const score = { user_id: 'u1', total_score: 1500, tier: 'gold' };
    mockTable('airdrop_scores', score);
    expect(await getAirdropScore('u1')).toEqual(score);
  });
  it('throws on DB error', async () => {
    mockTable('airdrop_scores', null, { message: 'err' });
    await expect(getAirdropScore('u1')).rejects.toThrow('err');
  });
  it('returns null when no data', async () => {
    mockTable('airdrop_scores', null);
    expect(await getAirdropScore('u1')).toBeNull();
  });
});

describe('getAirdropLeaderboard', () => {
  it('returns leaderboard with profile data', async () => {
    mockTable('airdrop_scores', [{
      user_id: 'u1', total_score: 2000, tier: 'diamond',
      profiles: { handle: 'alice', display_name: 'Alice', avatar_url: '/alice.png' },
    }]);
    const result = await getAirdropLeaderboard(10);
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe('alice');
    expect(result[0].total_score).toBe(2000);
  });

  it('handles array profiles (PostgREST)', async () => {
    mockTable('airdrop_scores', [{
      user_id: 'u1', total_score: 1000, tier: 'silver',
      profiles: [{ handle: 'bob', display_name: null, avatar_url: null }],
    }]);
    const result = await getAirdropLeaderboard();
    expect(result[0].handle).toBe('bob');
  });

  it('throws on DB error', async () => {
    mockTable('airdrop_scores', null, { message: 'err' });
    await expect(getAirdropLeaderboard()).rejects.toThrow('err');
  });

  it('returns [] when null data', async () => {
    mockTable('airdrop_scores', null);
    expect(await getAirdropLeaderboard()).toEqual([]);
  });
});

describe('getAirdropStats', () => {
  it('calculates stats with tier distribution', async () => {
    mockTable('airdrop_scores', [
      { total_score: 100, tier: 'bronze' },
      { total_score: 500, tier: 'silber' },
      { total_score: 1000, tier: 'gold' },
      { total_score: 2000, tier: 'diamond' },
    ]);
    const stats = await getAirdropStats();
    expect(stats.total_users).toBe(4);
    expect(stats.avg_score).toBe(900); // (100+500+1000+2000)/4 = 900
    expect(stats.tier_distribution).toEqual({ bronze: 1, silber: 1, gold: 1, diamond: 1 });
  });

  it('throws on DB error', async () => {
    mockTable('airdrop_scores', null, { message: 'err' });
    await expect(getAirdropStats()).rejects.toThrow('err');
  });

  it('ignores unknown tiers', async () => {
    mockTable('airdrop_scores', [
      { total_score: 100, tier: 'platinum' },
    ]);
    const stats = await getAirdropStats();
    expect(stats.total_users).toBe(1);
    expect(stats.tier_distribution).toEqual({ bronze: 0, silber: 0, gold: 0, diamond: 0 });
  });

  it('returns 0 avg for empty data', async () => {
    mockTable('airdrop_scores', []);
    expect((await getAirdropStats()).avg_score).toBe(0);
  });
});

describe('refreshAirdropScore', () => {
  it('refreshes via RPC and re-fetches', async () => {
    mockRpc('refresh_my_airdrop_score', {});
    mockTable('airdrop_scores', { user_id: 'u1', total_score: 1600 });
    const result = await refreshAirdropScore('u1');
    expect(result?.total_score).toBe(1600);
  });

  it('throws on RPC error', async () => {
    mockRpc('refresh_my_airdrop_score', null, { message: 'err' });
    await expect(refreshAirdropScore('u1')).rejects.toThrow('err');
  });
});

describe('refreshAllAirdropScores', () => {
  it('returns count of refreshed scores', async () => {
    mockRpc('refresh_all_airdrop_scores', 42);
    expect(await refreshAllAirdropScores()).toBe(42);
  });

  it('throws on error', async () => {
    mockRpc('refresh_all_airdrop_scores', null, { message: 'Admin only' });
    await expect(refreshAllAirdropScores()).rejects.toThrow('Admin only');
  });
});

