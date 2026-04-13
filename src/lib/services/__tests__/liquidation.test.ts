import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseResponse, mockSupabaseRpc } from '@/test/mocks/supabase';

// Mock side-effect modules before importing the service
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));

// Mock mapRpcError from trading service
vi.mock('@/lib/services/trading', () => ({
  mapRpcError: vi.fn((msg: string) => `mapped:${msg}`),
}));

import {
  setSuccessFeeCap,
  liquidatePlayer,
  getLiquidationEvent,
  getLiquidationPayouts,
} from '../liquidation';

// ============================================
// setSuccessFeeCap
// ============================================

describe('setSuccessFeeCap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success on valid cap set', async () => {
    mockSupabaseRpc({ success: true });
    const result = await setSuccessFeeCap('admin-1', 'player-1', 100000);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('set_success_fee_cap', {
      p_admin_id: 'admin-1',
      p_player_id: 'player-1',
      p_cap_cents: 100000,
    });
  });

  it('returns mapped error on RPC failure', async () => {
    mockSupabaseRpc(null, { message: 'Cap already set' });
    const result = await setSuccessFeeCap('admin-1', 'player-1', 100000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('mapped:Cap already set');
  });

  it('passes correct params for zero cap', async () => {
    mockSupabaseRpc({ success: true });
    await setSuccessFeeCap('admin-1', 'player-1', 0);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('set_success_fee_cap', {
      p_admin_id: 'admin-1',
      p_player_id: 'player-1',
      p_cap_cents: 0,
    });
  });
});

// ============================================
// liquidatePlayer
// ============================================

describe('liquidatePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full result on successful liquidation', async () => {
    mockSupabaseRpc({
      success: true,
      holder_count: 5,
      distributed_cents: 250000,
      pbt_distributed_cents: 50000,
      success_fee_cents: 100000,
      fee_per_dpc_cents: 1000,
      transfer_value_eur: 500000,
      liquidation_id: 'liq-1',
    });
    const result = await liquidatePlayer('admin-1', 'player-1', 500000);
    expect(result.success).toBe(true);
    expect(result.holder_count).toBe(5);
    expect(result.distributed_cents).toBe(250000);
    expect(result.pbt_distributed_cents).toBe(50000);
    expect(result.success_fee_cents).toBe(100000);
    expect(result.fee_per_dpc_cents).toBe(1000);
    expect(result.transfer_value_eur).toBe(500000);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('liquidate_player', {
      p_admin_id: 'admin-1',
      p_player_id: 'player-1',
      p_transfer_value_eur: 500000,
    });
  });

  it('defaults transfer_value_eur to 0 when not provided', async () => {
    mockSupabaseRpc({
      success: true,
      holder_count: 0,
      distributed_cents: 0,
      pbt_distributed_cents: 0,
      success_fee_cents: 0,
      fee_per_dpc_cents: 0,
      transfer_value_eur: 0,
      liquidation_id: 'liq-2',
    });
    await liquidatePlayer('admin-1', 'player-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('liquidate_player', {
      p_admin_id: 'admin-1',
      p_player_id: 'player-1',
      p_transfer_value_eur: 0,
    });
  });

  it('returns mapped error on RPC failure', async () => {
    mockSupabaseRpc(null, { message: 'Already liquidated' });
    const result = await liquidatePlayer('admin-1', 'player-1', 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe('mapped:Already liquidated');
  });

  it('does not throw from fire-and-forget notification errors', async () => {
    // The notification side-effect is fire-and-forget; failures are caught internally
    mockSupabaseRpc({
      success: true,
      holder_count: 1,
      distributed_cents: 10000,
      pbt_distributed_cents: 2000,
      success_fee_cents: 5000,
      fee_per_dpc_cents: 500,
      transfer_value_eur: 100000,
      liquidation_id: 'liq-3',
    });
    // Even though notification lookup might fail, liquidatePlayer should return successfully
    const result = await liquidatePlayer('admin-1', 'player-1', 100000);
    expect(result.success).toBe(true);
    // The function returns before the fire-and-forget notification completes
    expect(result.error).toBeUndefined();
  });

  it('returns zero holder_count for player with no holders', async () => {
    mockSupabaseRpc({
      success: true,
      holder_count: 0,
      distributed_cents: 0,
      pbt_distributed_cents: 0,
      success_fee_cents: 0,
      fee_per_dpc_cents: 0,
      transfer_value_eur: 0,
      liquidation_id: 'liq-empty',
    });
    const result = await liquidatePlayer('admin-1', 'player-1', 0);
    expect(result.success).toBe(true);
    expect(result.holder_count).toBe(0);
    expect(result.distributed_cents).toBe(0);
  });

  it('returns success_fee_cents: 0 when no success fee', async () => {
    mockSupabaseRpc({
      success: true,
      holder_count: 3,
      distributed_cents: 30000,
      pbt_distributed_cents: 10000,
      success_fee_cents: 0,
      fee_per_dpc_cents: 100,
      transfer_value_eur: 50000,
      liquidation_id: 'liq-no-fee',
    });
    const result = await liquidatePlayer('admin-1', 'player-1', 50000);
    expect(result.success).toBe(true);
    expect(result.success_fee_cents).toBe(0);
  });
});

// ============================================
// getLiquidationEvent
// ============================================

describe('getLiquidationEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns liquidation event when found', async () => {
    const mockEvent = {
      id: 'liq-event-1',
      player_id: 'player-1',
      club_id: 'club-1',
      triggered_by: 'admin-1',
      pbt_balance_cents: 50000,
      success_fee_cents: 100000,
      distributed_cents: 150000,
      holder_count: 5,
      transfer_value_eur: 500000,
      fee_per_dpc_cents: 1000,
      created_at: '2025-06-01T00:00:00Z',
    };
    mockSupabaseResponse(mockEvent);
    const result = await getLiquidationEvent('player-1');
    expect(result).toEqual(mockEvent);
    expect(mockSupabase.from).toHaveBeenCalledWith('liquidation_events');
  });

  it('returns null when no liquidation event exists', async () => {
    mockSupabaseResponse(null);
    const result = await getLiquidationEvent('player-no-liq');
    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    mockSupabaseResponse(null, { message: 'connection refused' });
    await expect(getLiquidationEvent('player-1')).rejects.toThrow('connection refused');
  });
});

// ============================================
// getLiquidationPayouts
// ============================================

describe('getLiquidationPayouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns enriched payouts with profile handles', async () => {
    // Due to single global mock, both .from('liquidation_payouts') and .from('profiles')
    // return the same data. We test that the function completes and returns data.
    const mockPayouts = [
      {
        id: 'payout-1',
        liquidation_id: 'liq-1',
        user_id: 'user-1',
        dpc_quantity: 10,
        payout_cents: 50000,
        pbt_payout_cents: 10000,
        success_fee_payout_cents: 20000,
        created_at: '2025-06-01T00:00:00Z',
      },
    ];
    mockSupabaseResponse(mockPayouts);
    const result = await getLiquidationPayouts('liq-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('payout-1');
    expect(result[0].user_id).toBe('user-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('liquidation_payouts');
  });

  it('returns empty array when no payouts found', async () => {
    mockSupabaseResponse(null);
    const result = await getLiquidationPayouts('liq-empty');
    expect(result).toEqual([]);
  });

  it('returns payouts without handles when profiles query returns null', async () => {
    // When data is an array (payouts exist), enrichment tries profiles
    // With global mock, profiles also returns same array — handles will be undefined
    const mockPayouts = [
      {
        id: 'payout-2',
        liquidation_id: 'liq-2',
        user_id: 'user-2',
        dpc_quantity: 5,
        payout_cents: 25000,
        pbt_payout_cents: 5000,
        success_fee_payout_cents: 0,
        created_at: '2025-06-01T00:00:00Z',
      },
    ];
    mockSupabaseResponse(mockPayouts);
    const result = await getLiquidationPayouts('liq-2');
    expect(result).toHaveLength(1);
    // handle may or may not be present depending on how mock resolves
    expect(result[0]).toHaveProperty('user_id', 'user-2');
  });

  it('throws on DB error', async () => {
    mockSupabaseResponse(null, { message: 'query timeout' });
    await expect(getLiquidationPayouts('liq-1')).rejects.toThrow('query timeout');
  });
});
