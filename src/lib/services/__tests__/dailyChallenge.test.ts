import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));

import {
  getTodaysChallenge,
  submitDailyChallenge,
  getUserChallengeHistory,
} from '../dailyChallenge';

beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// getTodaysChallenge
// ============================================
describe('getTodaysChallenge', () => {
  it('returns challenge from RPC (single object)', async () => {
    const challenge = {
      id: 'ch-1', question: 'Who scored?', options: ['A', 'B', 'C', 'D'],
      category: 'football', difficulty: 2, active_date: '2025-03-20',
    };
    mockRpc('get_todays_challenge', challenge);
    const result = await getTodaysChallenge();
    expect(result).toEqual(challenge);
  });

  it('handles array response from RPC', async () => {
    const challenge = {
      id: 'ch-1', question: 'Who scored?', options: ['A', 'B', 'C', 'D'],
      category: 'football', difficulty: 2, active_date: '2025-03-20',
    };
    mockRpc('get_todays_challenge', [challenge]);
    const result = await getTodaysChallenge();
    expect(result).toEqual(challenge);
  });

  it('throws on RPC error', async () => {
    mockRpc('get_todays_challenge', null, { message: 'RPC failed' });
    await expect(getTodaysChallenge()).rejects.toThrow('RPC failed');
  });

  it('returns null when no data', async () => {
    mockRpc('get_todays_challenge', null);
    expect(await getTodaysChallenge()).toBeNull();
  });

  it('returns null for empty array', async () => {
    mockRpc('get_todays_challenge', []);
    expect(await getTodaysChallenge()).toBeNull();
  });

  it('returns null when options is not an array (malformed data)', async () => {
    mockRpc('get_todays_challenge', {
      id: 'ch-bad', question: 'Bad', options: 'not-array',
      category: 'test', difficulty: 1,
    });
    expect(await getTodaysChallenge()).toBeNull();
  });

  it('returns null when options is null', async () => {
    mockRpc('get_todays_challenge', {
      id: 'ch-bad', question: 'Bad', options: null,
      category: 'test', difficulty: 1,
    });
    expect(await getTodaysChallenge()).toBeNull();
  });
});

// ============================================
// submitDailyChallenge
// ============================================
describe('submitDailyChallenge', () => {
  it('submits answer and returns result', async () => {
    mockRpc('submit_daily_challenge', {
      ok: true, is_correct: true, tickets_awarded: 5,
    });
    const result = await submitDailyChallenge('ch-1', 2);
    expect(result).toEqual({ ok: true, isCorrect: true, ticketsAwarded: 5 });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_daily_challenge', {
      p_challenge_id: 'ch-1', p_selected_option: 2,
    });
  });

  it('returns incorrect answer result', async () => {
    mockRpc('submit_daily_challenge', {
      ok: true, is_correct: false, tickets_awarded: 1,
    });
    const result = await submitDailyChallenge('ch-1', 0);
    expect(result.isCorrect).toBe(false);
    expect(result.ticketsAwarded).toBe(1);
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('submit_daily_challenge', null, { message: 'Already submitted' });
    const result = await submitDailyChallenge('ch-1', 0);
    expect(result).toEqual({ ok: false, isCorrect: null, ticketsAwarded: 0, error: 'Already submitted' });
    consoleSpy.mockRestore();
  });

  it('returns error when RPC returns ok=false', async () => {
    mockRpc('submit_daily_challenge', { ok: false, error: 'Challenge expired' });
    const result = await submitDailyChallenge('ch-1', 1);
    expect(result).toEqual({ ok: false, isCorrect: null, ticketsAwarded: 0, error: 'Challenge expired' });
  });

  it('handles null error in failure response', async () => {
    mockRpc('submit_daily_challenge', { ok: false });
    const result = await submitDailyChallenge('ch-1', 1);
    expect(result.error).toBe('Unknown error');
  });
});

// ============================================
// getUserChallengeHistory
// ============================================
describe('getUserChallengeHistory', () => {
  it('returns challenge history', async () => {
    const history = [
      { id: 'uc1', user_id: 'u1', challenge_id: 'ch-1', selected_option: 2, is_correct: true, tickets_awarded: 5, completed_at: '2025-03-20' },
      { id: 'uc2', user_id: 'u1', challenge_id: 'ch-2', selected_option: 0, is_correct: false, tickets_awarded: 1, completed_at: '2025-03-19' },
    ];
    mockTable('user_daily_challenges', history);
    const result = await getUserChallengeHistory('u1');
    expect(result).toEqual(history);
    expect(mockSupabase.from).toHaveBeenCalledWith('user_daily_challenges');
  });

  it('uses custom limit', async () => {
    mockTable('user_daily_challenges', []);
    await getUserChallengeHistory('u1', 5);
    // Function should work without errors
  });

  it('throws on DB error', async () => {
    mockTable('user_daily_challenges', null, { message: 'err' });
    await expect(getUserChallengeHistory('u1')).rejects.toThrow('err');
  });

  it('returns [] when data is null', async () => {
    mockTable('user_daily_challenges', null);
    expect(await getUserChallengeHistory('u1')).toEqual([]);
  });
});
