/**
 * Tests for wildcards.ts — Slice 251 Wave 2 Track F
 * Per-league wildcard balance (Composite-PK: user_id + league_id)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWildcardBalance, getWildcardRecord, getWildcardHistory } from './wildcards';

// Mock supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabaseClient';

const USER_ID = 'user-uuid-0001';
const LEAGUE_ID = 'league-uuid-1234';

describe('getWildcardBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return balance for (userId, leagueId)', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: 5,
      error: null,
    });

    const result = await getWildcardBalance(USER_ID, LEAGUE_ID);

    expect(supabase.rpc).toHaveBeenCalledWith('get_wildcard_balance', {
      p_user_id: USER_ID,
      p_league_id: LEAGUE_ID,
    });
    expect(result).toBe(5);
  });

  it('should return 0 when RPC returns null (new user, no row yet)', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await getWildcardBalance(USER_ID, LEAGUE_ID);
    expect(result).toBe(0);
  });

  it('should throw on RPC error (not swallow)', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: { message: 'auth_uid_mismatch' },
    });

    await expect(getWildcardBalance(USER_ID, LEAGUE_ID)).rejects.toThrow('auth_uid_mismatch');
  });
});

describe('getWildcardRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query with both user_id and league_id filters', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: {
          user_id: USER_ID,
          league_id: LEAGUE_ID,
          balance: 3,
          earned_total: 10,
          spent_total: 7,
          updated_at: '2026-04-28T12:00:00Z',
        },
        error: null,
      }),
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockChain);

    const result = await getWildcardRecord(USER_ID, LEAGUE_ID);

    expect(supabase.from).toHaveBeenCalledWith('user_wildcards');
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockChain.eq).toHaveBeenCalledWith('league_id', LEAGUE_ID);
    expect(result?.balance).toBe(3);
    expect(result?.league_id).toBe(LEAGUE_ID);
  });

  it('should return null when no row exists for (user, league)', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockChain);

    const result = await getWildcardRecord(USER_ID, LEAGUE_ID);
    expect(result).toBeNull();
  });

  it('should throw on DB error (not swallow)', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'connection_error' },
      }),
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockChain);

    await expect(getWildcardRecord(USER_ID, LEAGUE_ID)).rejects.toThrow('connection_error');
  });
});

describe('getWildcardHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockHistoryChain(result: { data: unknown; error: unknown }) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValueOnce(result),
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(chain);
    return chain;
  }

  it('should return transaction rows for the user', async () => {
    const rows = [
      { id: 'tx-1', user_id: USER_ID, amount: 2, balance_after: 2, source: 'admin_grant' },
    ];
    const chain = mockHistoryChain({ data: rows, error: null });

    const result = await getWildcardHistory(USER_ID, 20);

    expect(supabase.from).toHaveBeenCalledWith('wildcard_transactions');
    expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual(rows);
  });

  it('should return [] when there are no rows (dormant — no error)', async () => {
    mockHistoryChain({ data: null, error: null });
    const result = await getWildcardHistory(USER_ID);
    expect(result).toEqual([]);
  });

  it('should throw on DB error (not swallow to [])', async () => {
    mockHistoryChain({ data: null, error: { message: 'connection_error' } });
    await expect(getWildcardHistory(USER_ID)).rejects.toThrow('connection_error');
  });
});
