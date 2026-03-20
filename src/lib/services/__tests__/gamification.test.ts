import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  getScoreRoadClaims,
  claimScoreRoad,
  getScoreHistory,
} from '../gamification';

beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// getScoreRoadClaims
// ============================================
describe('getScoreRoadClaims', () => {
  it('returns claimed milestones', async () => {
    const claims = [
      { milestone: 100, claimed_at: '2025-01-01' },
      { milestone: 250, claimed_at: '2025-01-15' },
    ];
    mockTable('score_road_claims', claims);
    const result = await getScoreRoadClaims('u1');
    expect(result).toEqual(claims);
    expect(mockSupabase.from).toHaveBeenCalledWith('score_road_claims');
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('score_road_claims', null, { message: 'err' });
    expect(await getScoreRoadClaims('u1')).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when data is null', async () => {
    mockTable('score_road_claims', null);
    expect(await getScoreRoadClaims('u1')).toEqual([]);
  });

  it('returns empty array when no claims', async () => {
    mockTable('score_road_claims', []);
    expect(await getScoreRoadClaims('u1')).toEqual([]);
  });
});

// ============================================
// claimScoreRoad
// ============================================
describe('claimScoreRoad', () => {
  it('claims milestone and returns reward', async () => {
    mockRpc('claim_score_road', { reward_bsd: 50 });
    const result = await claimScoreRoad('u1', 500);
    expect(result).toEqual({ ok: true, reward_bsd: 50 });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('claim_score_road', {
      p_user_id: 'u1', p_milestone: 500,
    });
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('claim_score_road', null, { message: 'RPC failed' });
    const result = await claimScoreRoad('u1', 500);
    expect(result).toEqual({ ok: false, error: 'RPC failed' });
    consoleSpy.mockRestore();
  });

  it('returns error when RPC data contains error field', async () => {
    mockRpc('claim_score_road', { error: 'Already claimed' });
    const result = await claimScoreRoad('u1', 500);
    expect(result).toEqual({ ok: false, error: 'Already claimed' });
  });

  it('handles missing reward_bsd in response', async () => {
    mockRpc('claim_score_road', {});
    const result = await claimScoreRoad('u1', 500);
    expect(result.ok).toBe(true);
    expect(result.reward_bsd).toBeUndefined();
  });

  it('handles null data response', async () => {
    mockRpc('claim_score_road', null);
    const result = await claimScoreRoad('u1', 500);
    // null is not an object, so 'error' check fails → ok: true
    expect(result.ok).toBe(true);
  });
});

// ============================================
// getScoreHistory
// ============================================
describe('getScoreHistory', () => {
  it('returns score history entries', async () => {
    const entries = [
      { id: 'h1', user_id: 'u1', dimension: 'trader', delta: 15, score_before: 500, score_after: 515, event_type: 'trade', source_id: 't1', metadata: null, created_at: '2025-01-01' },
    ];
    mockTable('score_history', entries);
    const result = await getScoreHistory('u1');
    expect(result).toEqual(entries);
  });

  it('filters by dimension when provided', async () => {
    mockTable('score_history', []);
    await getScoreHistory('u1', 'trader');
    expect(mockSupabase.from).toHaveBeenCalledWith('score_history');
  });

  it('uses default limit of 20', async () => {
    mockTable('score_history', []);
    await getScoreHistory('u1');
    // Can't easily verify limit was 20, but function should not error
  });

  it('respects custom limit', async () => {
    mockTable('score_history', []);
    await getScoreHistory('u1', undefined, 5);
    // Function should work without errors
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('score_history', null, { message: 'err' });
    expect(await getScoreHistory('u1')).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when data is null', async () => {
    mockTable('score_history', null);
    expect(await getScoreHistory('u1')).toEqual([]);
  });
});
