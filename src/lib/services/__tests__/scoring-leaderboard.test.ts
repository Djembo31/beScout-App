import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
          single: vi.fn(() => ({ data: null, error: null })),
        })),
        not: vi.fn(() => ({ data: [], error: null })),
        in: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  },
}));

import { supabase } from '@/lib/supabaseClient';
import { getSeasonLeaderboard } from '@/lib/services/scoring';

describe('getSeasonLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get_season_leaderboard RPC with limit and maps results', async () => {
    const mockData = [
      {
        user_id: 'user-1',
        handle: 'alice',
        display_name: 'Alice',
        avatar_url: null,
        total_points: 5000,
        events_played: 10,
        total_reward_cents: 100000,
        wins: 3,
      },
      {
        user_id: 'user-2',
        handle: 'bob',
        display_name: null,
        avatar_url: 'https://example.com/bob.jpg',
        total_points: 4500,
        events_played: 8,
        total_reward_cents: 50000,
        wins: 1,
      },
    ];
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null } as never);

    const result = await getSeasonLeaderboard(50);

    expect(supabase.rpc).toHaveBeenCalledWith('get_season_leaderboard', { p_limit: 50 });
    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].handle).toBe('alice');
    expect(result[0].totalPoints).toBe(5000);
    expect(result[1].rank).toBe(2);
    expect(result[1].userId).toBe('user-2');
  });

  it('returns empty array on error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'fail' },
    } as never);

    const result = await getSeasonLeaderboard();

    expect(result).toEqual([]);
  });

  it('returns empty array when no data', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);

    const result = await getSeasonLeaderboard();

    expect(result).toEqual([]);
  });
});
