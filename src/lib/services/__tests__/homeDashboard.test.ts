import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockRpc, resetMocks } from '@/test/mocks/supabase';

import { getHomeDashboard } from '../homeDashboard';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getHomeDashboard', () => {
  it('maps a full RPC payload into the HomeDashboard shape', async () => {
    const payload = {
      holdings: [
        {
          id: 'h-1',
          user_id: 'u1',
          player_id: 'p-1',
          quantity: 5,
          avg_buy_price: 500000,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          player: {
            first_name: 'Hakan',
            last_name: 'Arslan',
            image_url: null,
            position: 'MID',
            club: 'Sakaryaspor',
            club_id: 'c-1',
            floor_price: 600000,
            price_change_24h: 5,
            perf_l5: 78,
            perf_l15: 72,
            matches: 20,
            goals: 3,
            assists: 7,
            status: 'active',
            shirt_number: 10,
            age: 31,
          },
        },
      ],
      user_stats: { user_id: 'u1', total_score: 42 },
      tickets: { user_id: 'u1', balance: 12 },
      highest_pass: { id: 'fp-1', tier: 'founder' },
    };
    mockRpc('get_home_dashboard_v1', payload);

    const dash = await getHomeDashboard();

    expect(dash.holdings).toHaveLength(1);
    expect(dash.holdings[0].player_id).toBe('p-1');
    expect(dash.holdings[0].player.last_name).toBe('Arslan');
    expect(dash.user_stats?.total_score).toBe(42);
    expect(dash.tickets?.balance).toBe(12);
    expect(dash.highest_pass?.tier).toBe('founder');
  });

  it('returns empty defaults when RPC returns nulls for optional slices', async () => {
    mockRpc('get_home_dashboard_v1', {
      holdings: [],
      user_stats: null,
      tickets: null,
      highest_pass: null,
    });

    const dash = await getHomeDashboard();

    expect(dash.holdings).toEqual([]);
    expect(dash.user_stats).toBeNull();
    expect(dash.tickets).toBeNull();
    expect(dash.highest_pass).toBeNull();
  });

  it('returns safe defaults when RPC returns null payload entirely', async () => {
    mockRpc('get_home_dashboard_v1', null);

    const dash = await getHomeDashboard();

    expect(dash.holdings).toEqual([]);
    expect(dash.user_stats).toBeNull();
    expect(dash.tickets).toBeNull();
    expect(dash.highest_pass).toBeNull();
  });

  it('throws on DB error so React Query can retry', async () => {
    mockRpc('get_home_dashboard_v1', null, { message: 'auth_required' });
    await expect(getHomeDashboard()).rejects.toThrow('auth_required');
  });
});
