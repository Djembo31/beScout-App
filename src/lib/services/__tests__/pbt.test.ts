import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseResponse } from '@/test/mocks/supabase';

import {
  getPbtForPlayer,
  getPbtTransactions,
  getFeeConfig,
  getAllFeeConfigs,
} from '../pbt';

// ============================================
// getPbtForPlayer
// ============================================

describe('getPbtForPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return PBT treasury when found', async () => {
    const mockTreasury = {
      player_id: 'player-1',
      balance: 500000,
      trading_inflow: 200000,
      ipo_inflow: 100000,
      votes_inflow: 50000,
      content_inflow: 150000,
      last_inflow_at: '2025-06-01T12:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-06-01T12:00:00Z',
    };
    mockSupabaseResponse(mockTreasury);
    const result = await getPbtForPlayer('player-1');
    expect(result).toEqual(mockTreasury);
    expect(mockSupabase.from).toHaveBeenCalledWith('pbt_treasury');
  });

  it('should return null when no PBT treasury exists', async () => {
    mockSupabaseResponse(null);
    const result = await getPbtForPlayer('player-no-pbt');
    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    mockSupabaseResponse(null, { message: 'connection refused' });
    await expect(getPbtForPlayer('player-1')).rejects.toThrow('connection refused');
  });
});

// ============================================
// getPbtTransactions
// ============================================

describe('getPbtTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return transactions for a player', async () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        player_id: 'player-1',
        source: 'trading',
        amount: 15000,
        balance_after: 515000,
        trade_id: 'trade-abc',
        description: 'Trade fee',
        created_at: '2025-06-01T12:00:00Z',
      },
      {
        id: 'tx-2',
        player_id: 'player-1',
        source: 'ipo',
        amount: 100000,
        balance_after: 615000,
        trade_id: null,
        description: 'IPO inflow',
        created_at: '2025-06-02T12:00:00Z',
      },
    ];
    mockSupabaseResponse(mockTransactions);
    const result = await getPbtTransactions('player-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('tx-1');
    expect(result[1].source).toBe('ipo');
    expect(mockSupabase.from).toHaveBeenCalledWith('pbt_transactions');
  });

  it('should return empty array when no transactions exist', async () => {
    mockSupabaseResponse([]);
    const result = await getPbtTransactions('player-no-tx');
    expect(result).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    mockSupabaseResponse(null);
    const result = await getPbtTransactions('player-1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockSupabaseResponse(null, { message: 'query timeout' });
    await expect(getPbtTransactions('player-1')).rejects.toThrow('query timeout');
  });
});

// ============================================
// getFeeConfig
// ============================================

describe('getFeeConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return club-specific fee config when found', async () => {
    const mockConfig = {
      id: 'fee-1',
      club_name: 'Sakaryaspor',
      club_id: 'club-sak',
      trade_fee_bps: 600,
      trade_platform_bps: 350,
      trade_pbt_bps: 150,
      trade_club_bps: 100,
      ipo_club_bps: 8500,
      ipo_platform_bps: 1000,
      ipo_pbt_bps: 500,
      updated_by: 'admin-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z',
    };
    mockSupabaseResponse(mockConfig);
    const result = await getFeeConfig('Sakaryaspor');
    expect(result).toEqual(mockConfig);
    expect(result?.trade_fee_bps).toBe(600);
    expect(result?.club_name).toBe('Sakaryaspor');
    expect(mockSupabase.from).toHaveBeenCalledWith('fee_config');
  });

  it('should return global fallback config when no club-specific config exists', async () => {
    const globalConfig = {
      id: 'fee-global',
      club_name: null,
      club_id: null,
      trade_fee_bps: 600,
      trade_platform_bps: 350,
      trade_pbt_bps: 150,
      trade_club_bps: 100,
      ipo_club_bps: 8500,
      ipo_platform_bps: 1000,
      ipo_pbt_bps: 500,
      updated_by: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockSupabaseResponse(globalConfig);
    const result = await getFeeConfig();
    expect(result).toEqual(globalConfig);
    expect(result?.club_name).toBeNull();
  });

  it('should return null when no fee config exists', async () => {
    mockSupabaseResponse(null);
    const result = await getFeeConfig('unknown-club');
    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    mockSupabaseResponse(null, { message: 'permission denied' });
    await expect(getFeeConfig('Sakaryaspor')).rejects.toThrow('permission denied');
  });

  it('should accept byId option for club_id lookup', async () => {
    const mockConfig = {
      id: 'fee-by-id',
      club_name: 'Sakaryaspor',
      club_id: 'club-sak-uuid',
      trade_fee_bps: 600,
      trade_platform_bps: 350,
      trade_pbt_bps: 150,
      trade_club_bps: 100,
      ipo_club_bps: 8500,
      ipo_platform_bps: 1000,
      ipo_pbt_bps: 500,
      updated_by: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockSupabaseResponse(mockConfig);
    const result = await getFeeConfig('club-sak-uuid', { byId: true });
    expect(result).toEqual(mockConfig);
    expect(mockSupabase.from).toHaveBeenCalledWith('fee_config');
  });
});

// ============================================
// getAllFeeConfigs
// ============================================

describe('getAllFeeConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all fee configs', async () => {
    const mockConfigs = [
      {
        id: 'fee-global',
        club_name: null,
        club_id: null,
        trade_fee_bps: 600,
        trade_platform_bps: 350,
        trade_pbt_bps: 150,
        trade_club_bps: 100,
        ipo_club_bps: 8500,
        ipo_platform_bps: 1000,
        ipo_pbt_bps: 500,
        updated_by: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'fee-sak',
        club_name: 'Sakaryaspor',
        club_id: 'club-sak',
        trade_fee_bps: 500,
        trade_platform_bps: 300,
        trade_pbt_bps: 100,
        trade_club_bps: 100,
        ipo_club_bps: 8500,
        ipo_platform_bps: 1000,
        ipo_pbt_bps: 500,
        updated_by: 'admin-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-03-01T00:00:00Z',
      },
    ];
    mockSupabaseResponse(mockConfigs);
    const result = await getAllFeeConfigs();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('fee-global');
    expect(result[1].club_name).toBe('Sakaryaspor');
    expect(mockSupabase.from).toHaveBeenCalledWith('fee_config');
  });

  it('should return empty array when no configs exist', async () => {
    mockSupabaseResponse([]);
    const result = await getAllFeeConfigs();
    expect(result).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    mockSupabaseResponse(null);
    const result = await getAllFeeConfigs();
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockSupabaseResponse(null, { message: 'table not found' });
    await expect(getAllFeeConfigs()).rejects.toThrow('table not found');
  });
});
