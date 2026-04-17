import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mockSupabaseResponse,
  mockSupabaseRpc,
  mockSupabaseCount,
} from '@/test/mocks/supabase';

// Must come after supabase mock is set up (imported above triggers vi.mock)
import {
  getWallet,
  getHoldings,
  getHoldingQty,
  getPlayerHolderCount,
  getTransactions,
  formatScout,
} from '../wallet';

// ============================================
// Reset mocks before each test
// ============================================

beforeEach(() => {
  mockSupabaseResponse(null, null);
  mockSupabaseCount(0);
  vi.restoreAllMocks();
  // Re-apply the supabase mock after restoreAllMocks
  // (vi.mock is hoisted so it stays, but we need to reset state)
});

// ============================================
// getWallet
// ============================================

describe('getWallet', () => {
  const walletData = {
    user_id: 'u1',
    balance: 500000,
    locked_balance: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('returns DbWallet on success', async () => {
    mockSupabaseResponse(walletData);
    const result = await getWallet('u1');
    expect(result).toEqual(walletData);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'connection error' });
    await expect(getWallet('u1')).rejects.toThrow('connection error');
  });

  it('returns null when no wallet found', async () => {
    mockSupabaseResponse(null);
    const result = await getWallet('u-nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================
// getHoldings
// ============================================

describe('getHoldings', () => {
  const holdingsData = [
    {
      id: 'h1',
      user_id: 'u1',
      player_id: 'p1',
      quantity: 5,
      avg_buy_price: 10000,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      player: {
        first_name: 'Max',
        last_name: 'Mustermann',
        position: 'MID',
        club: 'Sakaryaspor',
        club_id: 'c1',
        floor_price: 12000,
        price_change_24h: 5,
        perf_l5: 7.2,
        perf_l15: 6.8,
        matches: 20,
        goals: 3,
        assists: 5,
        status: 'active',
        shirt_number: 10,
        age: 25,
        image_url: 'https://example.com/player.png',
      },
    },
  ];

  it('returns HoldingWithPlayer[] on success', async () => {
    mockSupabaseResponse(holdingsData);
    const result = await getHoldings('u1');
    expect(result).toEqual(holdingsData);
    expect(result).toHaveLength(1);
    expect(result[0].player.first_name).toBe('Max');
  });

  it('returns empty array when no holdings', async () => {
    mockSupabaseResponse(null);
    const result = await getHoldings('u1');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'RLS violation' });
    await expect(getHoldings('u1')).rejects.toThrow('RLS violation');
  });
});

// ============================================
// getHoldingQty
// ============================================

describe('getHoldingQty', () => {
  it('returns quantity on success', async () => {
    mockSupabaseResponse({ quantity: 12 });
    const result = await getHoldingQty('u1', 'p1');
    expect(result).toBe(12);
  });

  it('returns 0 when no holding found (data is null)', async () => {
    mockSupabaseResponse(null);
    const result = await getHoldingQty('u1', 'p-missing');
    expect(result).toBe(0);
  });

  it('throws on DB error', async () => {
    mockSupabaseResponse(null, { message: 'some db error' });
    await expect(getHoldingQty('u1', 'p1')).rejects.toThrow('some db error');
  });

  it('returns 0 when holding has quantity=0', async () => {
    mockSupabaseResponse({ quantity: 0 });
    const result = await getHoldingQty('u1', 'p1');
    expect(result).toBe(0);
  });
});

// ============================================
// getPlayerHolderCount
// ============================================

describe('getPlayerHolderCount', () => {
  // Slice 014 (2026-04-17): now delegates to `get_player_holder_count` RPC
  // because holdings SELECT policy is scoped to (own | club_admin |
  // platform_admin). A direct client count would only see own-user rows
  // for non-admins.
  it('returns count on success', async () => {
    mockSupabaseRpc(42);
    const result = await getPlayerHolderCount('p1');
    expect(result).toBe(42);
  });

  it('throws on RPC error', async () => {
    mockSupabaseRpc(null, { message: 'count failed' });
    await expect(getPlayerHolderCount('p1')).rejects.toThrow('count failed');
  });

  it('returns 0 when zero holders', async () => {
    mockSupabaseRpc(0);
    const result = await getPlayerHolderCount('p-new');
    expect(result).toBe(0);
  });
});

// ============================================
// getTransactions
// ============================================

describe('getTransactions', () => {
  const txData = [
    {
      id: 'tx1',
      user_id: 'u1',
      type: 'entry_fee',
      amount: -50000,
      balance_after: 450000,
      reference_id: 'evt1',
      description: 'Event-Eintritt: Gameweek 5',
      created_at: '2026-01-15T12:00:00Z',
    },
    {
      id: 'tx2',
      user_id: 'u1',
      type: 'entry_refund',
      amount: 50000,
      balance_after: 500000,
      reference_id: 'evt1',
      description: 'Event-Erstattung: Gameweek 5',
      created_at: '2026-01-15T13:00:00Z',
    },
  ];

  it('returns DbTransaction[] on success', async () => {
    mockSupabaseResponse(txData);
    const result = await getTransactions('u1');
    expect(result).toEqual(txData);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no transactions', async () => {
    mockSupabaseResponse(null);
    const result = await getTransactions('u1');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'timeout' });
    await expect(getTransactions('u1')).rejects.toThrow('timeout');
  });
});

// ============================================
// formatScout (pure function)
// ============================================

describe('formatScout', () => {
  it('formats 0 cents as "0"', () => {
    expect(formatScout(0)).toBe('0');
  });

  it('formats 100 cents as "1"', () => {
    expect(formatScout(100)).toBe('1');
  });

  it('formats 1000 cents as "10"', () => {
    expect(formatScout(1000)).toBe('10');
  });

  it('formats 100000 cents as "1.000" (de-DE thousands separator)', () => {
    expect(formatScout(100000)).toBe('1.000');
  });

  it('formats 1000000 cents as "10.000"', () => {
    expect(formatScout(1000000)).toBe('10.000');
  });

  it('rounds 50 cents (0.5 BSD) up to "1"', () => {
    // Math.round(50) / 100 = 0.5, toLocaleString de-DE maxFractionDigits:0 rounds to 1
    expect(formatScout(50)).toBe('1');
  });

  it('rounds 49 cents (0.49 BSD) down to "0"', () => {
    // Math.round(49) / 100 = 0.49, toLocaleString de-DE maxFractionDigits:0 rounds to 0
    expect(formatScout(49)).toBe('0');
  });

  it('formats negative values: -100 cents as "-1"', () => {
    expect(formatScout(-100)).toBe('-1');
  });

  it('formats large negative: -1000000 cents as "-10.000"', () => {
    expect(formatScout(-1000000)).toBe('-10.000');
  });
});
