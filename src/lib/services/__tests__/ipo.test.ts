import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseResponse, mockSupabaseRpc } from '@/test/mocks/supabase';

// Mock fire-and-forget dependencies at module level (vitest hoists these)
vi.mock('@/lib/services/trading', () => ({
  mapRpcError: vi.fn((msg: string) =>
    msg.toLowerCase().includes('insufficient') ? 'insufficientBalance' : 'generic'
  ),
  isRestrictedFromTrading: vi.fn().mockResolvedValue(false),
}));
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/social', () => ({ checkAndUnlockAchievements: vi.fn() }));
vi.mock('@/lib/services/referral', () => ({ triggerReferralReward: vi.fn() }));
vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotificationsBatch: vi.fn() }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));

import {
  buyFromIpo,
  createIpo,
  updateIpoStatus,
  getActiveIpos,
  getIpoForPlayer,
  getUserIpoPurchases,
  getRecentlyEndedIpos,
  getAnnouncedIpos,
} from '../ipo';

// ============================================
// Constants
// ============================================

const USER_ID = 'user-uuid-111';
const IPO_ID = 'ipo-uuid-222';
const PLAYER_ID = 'player-uuid-333';
const CLUB_ID = 'club-uuid-444';

// ============================================
// buyFromIpo
// ============================================

describe('buyFromIpo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------
  // Input validation (synchronous throws)
  // ------------------------------------------

  describe('input validation', () => {
    it('throws invalidQuantity when quantity = 0', async () => {
      await expect(buyFromIpo(USER_ID, IPO_ID, 0)).rejects.toThrow('invalidQuantity');
    });

    it('throws invalidQuantity when quantity is negative', async () => {
      await expect(buyFromIpo(USER_ID, IPO_ID, -1)).rejects.toThrow('invalidQuantity');
    });

    it('throws invalidQuantity when quantity is a float', async () => {
      await expect(buyFromIpo(USER_ID, IPO_ID, 1.5)).rejects.toThrow('invalidQuantity');
    });

    it('throws maxQuantityExceeded when quantity > 300', async () => {
      await expect(buyFromIpo(USER_ID, IPO_ID, 301)).rejects.toThrow('maxQuantityExceeded');
    });

    it('accepts quantity = 1 (boundary)', async () => {
      mockSupabaseResponse({ is_liquidated: false });
      // RPC call will use the same mock — reset for RPC
      mockSupabase.rpc.mockImplementationOnce(() => ({
        data: { success: true, trade_id: 'trade-1' },
        error: null,
      }));

      const result = await buyFromIpo(USER_ID, IPO_ID, 1, PLAYER_ID);
      expect(result.success).toBe(true);
    });

    it('accepts quantity = 300 (boundary)', async () => {
      // Skip player check by not passing playerId
      mockSupabaseRpc({ success: true, trade_id: 'trade-300' });

      const result = await buyFromIpo(USER_ID, IPO_ID, 300);
      expect(result.success).toBe(true);
    });
  });

  // ------------------------------------------
  // Defense-in-depth: liquidation + club admin
  // ------------------------------------------

  describe('defense-in-depth checks (playerId provided)', () => {
    it('throws playerLiquidated when player is_liquidated = true', async () => {
      mockSupabaseResponse({ is_liquidated: true });

      await expect(buyFromIpo(USER_ID, IPO_ID, 5, PLAYER_ID)).rejects.toThrow(
        'playerLiquidated'
      );
    });

    it('throws clubAdminRestricted when user is restricted', async () => {
      // Player is not liquidated
      mockSupabaseResponse({ is_liquidated: false });

      // Override isRestrictedFromTrading to return true for this test
      const { isRestrictedFromTrading } = await import('@/lib/services/trading');
      vi.mocked(isRestrictedFromTrading).mockResolvedValueOnce(true);

      await expect(buyFromIpo(USER_ID, IPO_ID, 5, PLAYER_ID)).rejects.toThrow(
        'clubAdminRestricted'
      );
    });

    it('skips liquidation + admin checks when playerId is not provided', async () => {
      mockSupabaseRpc({ success: true, trade_id: 'trade-skip' });

      const result = await buyFromIpo(USER_ID, IPO_ID, 5);

      // from('players') should NOT have been called
      expect(mockSupabase.from).not.toHaveBeenCalledWith('players');
      expect(result.success).toBe(true);
    });
  });

  // ------------------------------------------
  // RPC call scenarios (without playerId to simplify)
  // ------------------------------------------

  describe('RPC call', () => {
    it('throws mapped error when RPC returns error', async () => {
      mockSupabase.rpc.mockImplementationOnce(() => ({
        data: null,
        error: { message: 'Insufficient balance for purchase' },
      }));

      await expect(buyFromIpo(USER_ID, IPO_ID, 5)).rejects.toThrow('insufficientBalance');
    });

    it('returns {success: false} with server error when RPC returns null data', async () => {
      mockSupabaseRpc(null);

      const result = await buyFromIpo(USER_ID, IPO_ID, 5);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No response from server');
    });

    it('returns successful result from RPC', async () => {
      const rpcResult = {
        success: true,
        trade_id: 'trade-abc',
        total_cost: 50000,
        new_balance: 950000,
        quantity: 5,
        price_per_dpc: 10000,
        source: 'ipo',
        user_total_purchased: 5,
        ipo_remaining: 95,
      };
      mockSupabaseRpc(rpcResult);

      const result = await buyFromIpo(USER_ID, IPO_ID, 5);
      expect(result).toEqual(rpcResult);
    });

    it('returns failed result from RPC (success=false)', async () => {
      const rpcResult = {
        success: false,
        error: 'IPO is sold out',
      };
      mockSupabaseRpc(rpcResult);

      const result = await buyFromIpo(USER_ID, IPO_ID, 5);
      expect(result.success).toBe(false);
      expect(result.error).toBe('IPO is sold out');
    });

    it('passes correct params to RPC', async () => {
      mockSupabaseRpc({ success: true });

      await buyFromIpo(USER_ID, IPO_ID, 10);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('buy_from_ipo', {
        p_user_id: USER_ID,
        p_ipo_id: IPO_ID,
        p_quantity: 10,
      });
    });
  });
});

// ============================================
// createIpo
// ============================================

describe('createIpo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls RPC with correct params and returns result', async () => {
    const rpcResult = {
      success: true,
      ipo_id: IPO_ID,
      status: 'announced',
      starts_at: '2025-04-01T00:00:00Z',
      ends_at: '2025-04-15T00:00:00Z',
    };
    mockSupabaseRpc(rpcResult);

    const result = await createIpo({
      userId: USER_ID,
      playerId: PLAYER_ID,
      priceCents: 10000,
      totalOffered: 200,
      maxPerUser: 30,
      durationDays: 7,
      startImmediately: true,
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_ipo', {
      p_user_id: USER_ID,
      p_player_id: PLAYER_ID,
      p_price: 10000,
      p_total_offered: 200,
      p_max_per_user: 30,
      p_duration_days: 7,
      p_start_immediately: true,
    });
    expect(result).toEqual(rpcResult);
  });

  it('applies default values when optional params not provided', async () => {
    mockSupabaseRpc({ success: true, ipo_id: IPO_ID });

    await createIpo({
      userId: USER_ID,
      playerId: PLAYER_ID,
      priceCents: 5000,
      totalOffered: 100,
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_ipo', {
      p_user_id: USER_ID,
      p_player_id: PLAYER_ID,
      p_price: 5000,
      p_total_offered: 100,
      p_max_per_user: 50,
      p_duration_days: 14,
      p_start_immediately: false,
    });
  });

  it('throws when RPC returns error', async () => {
    mockSupabase.rpc.mockImplementationOnce(() => ({
      data: null,
      error: { message: 'Player already has active IPO' },
    }));

    await expect(
      createIpo({
        userId: USER_ID,
        playerId: PLAYER_ID,
        priceCents: 10000,
        totalOffered: 200,
      })
    ).rejects.toThrow('Player already has active IPO');
  });
});

// ============================================
// updateIpoStatus
// ============================================

describe('updateIpoStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls RPC and returns result', async () => {
    const rpcResult = {
      success: true,
      ipo_id: IPO_ID,
      new_status: 'ended',
    };
    mockSupabaseRpc(rpcResult);

    const result = await updateIpoStatus(USER_ID, IPO_ID, 'ended');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('update_ipo_status', {
      p_user_id: USER_ID,
      p_ipo_id: IPO_ID,
      p_new_status: 'ended',
    });
    expect(result).toEqual(rpcResult);
  });

  it('throws when RPC returns error', async () => {
    mockSupabase.rpc.mockImplementationOnce(() => ({
      data: null,
      error: { message: 'IPO not found' },
    }));

    await expect(updateIpoStatus(USER_ID, IPO_ID, 'open')).rejects.toThrow('IPO not found');
  });

  it('does not throw when newStatus is "open" (notification is fire-and-forget)', async () => {
    // The notification block runs async and should not block the main flow
    mockSupabaseRpc({ success: true, ipo_id: IPO_ID, new_status: 'open' });

    const result = await updateIpoStatus(USER_ID, IPO_ID, 'open');
    expect(result.success).toBe(true);
  });
});

// ============================================
// Query functions
// ============================================

describe('getActiveIpos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of active IPOs', async () => {
    const mockIpos = [
      { id: 'ipo-1', status: 'open', player_id: PLAYER_ID },
      { id: 'ipo-2', status: 'early_access', player_id: 'player-2' },
    ];
    mockSupabaseResponse(mockIpos);

    const result = await getActiveIpos();

    expect(result).toEqual(mockIpos);
    expect(mockSupabase.from).toHaveBeenCalledWith('ipos');
  });

  it('returns empty array when no active IPOs', async () => {
    mockSupabaseResponse(null);

    const result = await getActiveIpos();
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'Connection failed' });

    await expect(getActiveIpos()).rejects.toThrow('Connection failed');
  });
});

describe('getIpoForPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns IPO for player', async () => {
    const mockIpo = { id: IPO_ID, player_id: PLAYER_ID, status: 'open' };
    mockSupabaseResponse(mockIpo);

    const result = await getIpoForPlayer(PLAYER_ID);

    expect(result).toEqual(mockIpo);
    expect(mockSupabase.from).toHaveBeenCalledWith('ipos');
  });

  it('returns null when no IPO found', async () => {
    mockSupabaseResponse(null);

    const result = await getIpoForPlayer(PLAYER_ID);
    expect(result).toBeNull();
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'Query failed' });

    await expect(getIpoForPlayer(PLAYER_ID)).rejects.toThrow('Query failed');
  });
});

describe('getUserIpoPurchases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sum of purchased quantities', async () => {
    mockSupabaseResponse([{ quantity: 5 }, { quantity: 10 }, { quantity: 3 }]);

    const result = await getUserIpoPurchases(USER_ID, IPO_ID);
    expect(result).toBe(18);
  });

  it('returns 0 when no purchases', async () => {
    mockSupabaseResponse([]);

    const result = await getUserIpoPurchases(USER_ID, IPO_ID);
    expect(result).toBe(0);
  });

  it('returns 0 when data is null', async () => {
    mockSupabaseResponse(null);

    const result = await getUserIpoPurchases(USER_ID, IPO_ID);
    expect(result).toBe(0);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'RLS violation' });

    await expect(getUserIpoPurchases(USER_ID, IPO_ID)).rejects.toThrow('RLS violation');
  });
});

describe('getRecentlyEndedIpos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of ended IPOs', async () => {
    const mockIpos = [
      { id: 'ipo-ended-1', status: 'ended' },
      { id: 'ipo-ended-2', status: 'ended' },
    ];
    mockSupabaseResponse(mockIpos);

    const result = await getRecentlyEndedIpos();

    expect(result).toEqual(mockIpos);
    expect(mockSupabase.from).toHaveBeenCalledWith('ipos');
  });

  it('returns empty array when null data', async () => {
    mockSupabaseResponse(null);

    const result = await getRecentlyEndedIpos();
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'Timeout' });

    await expect(getRecentlyEndedIpos()).rejects.toThrow('Timeout');
  });
});

describe('getAnnouncedIpos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of announced IPOs', async () => {
    const mockIpos = [{ id: 'ipo-announced-1', status: 'announced' }];
    mockSupabaseResponse(mockIpos);

    const result = await getAnnouncedIpos();

    expect(result).toEqual(mockIpos);
    expect(mockSupabase.from).toHaveBeenCalledWith('ipos');
  });

  it('returns empty array when null data', async () => {
    mockSupabaseResponse(null);

    const result = await getAnnouncedIpos();
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'Network error' });

    await expect(getAnnouncedIpos()).rejects.toThrow('Network error');
  });
});
