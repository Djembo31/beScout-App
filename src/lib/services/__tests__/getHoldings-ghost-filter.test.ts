import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockTable, resetMocks } from '@/test/mocks/supabase';
import { getHoldings } from '../wallet';

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: vi.fn(),
}));
import { logSilentCatch } from '@/lib/observability/silentRejects';

const validHolding = (overrides: Record<string, unknown> = {}) => ({
  id: 'h1',
  user_id: 'u1',
  player_id: 'p1',
  quantity: 2,
  avg_buy_price: 50000,
  created_at: '2026-04-24T00:00:00Z',
  updated_at: '2026-04-24T00:00:00Z',
  player: {
    first_name: 'Mert',
    last_name: 'Çelik',
    position: 'DEF',
    club: 'Sivasspor',
    club_id: 'club-1',
    floor_price: 50000,
    price_change_24h: 0,
    perf_l5: 66,
    perf_l15: 60,
    matches: 27,
    goals: 1,
    assists: 0,
    status: 'fit',
    shirt_number: 20,
    age: 28,
    image_url: 'https://media.api-sports.io/football/players/49839.png',
  },
  ...overrides,
});

const ghostHolding = (overrides: Record<string, unknown> = {}) => ({
  id: 'ghost-h',
  user_id: 'u1',
  player_id: 'ghost-p',
  quantity: 1,
  avg_buy_price: 0,
  created_at: '2026-04-24T00:00:00Z',
  updated_at: '2026-04-24T00:00:00Z',
  player: null,
  ...overrides,
});

describe('getHoldings (Slice 192 ghost-filter)', () => {
  beforeEach(() => {
    resetMocks();
    vi.mocked(logSilentCatch).mockClear();
  });

  it('returns valid holdings unchanged when no ghosts present', async () => {
    mockTable('holdings', [validHolding()]);
    const result = await getHoldings('u1');
    expect(result).toHaveLength(1);
    expect(result[0].player?.first_name).toBe('Mert');
    expect(logSilentCatch).not.toHaveBeenCalled();
  });

  it('filters out ghost rows (player=null) and logs to Sentry', async () => {
    mockTable('holdings', [validHolding(), ghostHolding(), validHolding({ player_id: 'p2' })]);
    const result = await getHoldings('u1');
    expect(result).toHaveLength(2);
    expect(result.every((h) => h.player != null)).toBe(true);
    expect(logSilentCatch).toHaveBeenCalledTimes(1);
    expect(logSilentCatch).toHaveBeenCalledWith(
      'getHoldings.ghostRows',
      expect.any(Error),
      expect.objectContaining({ userId: 'u1', totalRows: 3 }),
    );
  });

  it('THROWS holdings_ghost_all when ALL rows are ghosts (auth-race recovery)', async () => {
    mockTable('holdings', [ghostHolding(), ghostHolding({ player_id: 'ghost2' })]);
    await expect(getHoldings('u1')).rejects.toThrow('holdings_ghost_all');
    expect(logSilentCatch).toHaveBeenCalledTimes(1);
  });

  it('returns empty array gracefully when no holdings (true new-user)', async () => {
    mockTable('holdings', []);
    const result = await getHoldings('u1');
    expect(result).toEqual([]);
    expect(logSilentCatch).not.toHaveBeenCalled();
  });
});
