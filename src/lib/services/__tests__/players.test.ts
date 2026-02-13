import { describe, it, expect, beforeEach } from 'vitest';
import '@/test/mocks/supabase'; // Must be imported before any service that uses supabaseClient
import { centsToBsd, bsdToCents, dbToPlayer, dbToPlayers } from '../players';
import type { DbPlayer } from '@/types';

// ============================================
// centsToBsd
// ============================================

describe('centsToBsd', () => {
  it('converts standard values', () => {
    expect(centsToBsd(15600)).toBe(156);
  });

  it('converts zero', () => {
    expect(centsToBsd(0)).toBe(0);
  });

  it('converts sub-dollar cents', () => {
    expect(centsToBsd(99)).toBe(0.99);
  });

  it('converts single cent', () => {
    expect(centsToBsd(1)).toBe(0.01);
  });

  it('converts large values', () => {
    expect(centsToBsd(1_000_000)).toBe(10_000);
  });
});

// ============================================
// bsdToCents
// ============================================

describe('bsdToCents', () => {
  it('converts standard values', () => {
    expect(bsdToCents(156)).toBe(15600);
  });

  it('converts zero', () => {
    expect(bsdToCents(0)).toBe(0);
  });

  it('converts fractional BSD', () => {
    expect(bsdToCents(0.01)).toBe(1);
  });

  it('rounds to avoid float issues', () => {
    // 1.005 * 100 = 100.49999... in floating point — Math.round rounds to 100
    expect(bsdToCents(1.005)).toBe(100);
    // 1.006 * 100 = 100.6 — Math.round rounds to 101
    expect(bsdToCents(1.006)).toBe(101);
    // Key point: bsdToCents uses Math.round, not truncation
    expect(bsdToCents(1.999)).toBe(200);
  });

  it('converts large values', () => {
    expect(bsdToCents(10_000)).toBe(1_000_000);
  });
});

// ============================================
// dbToPlayer
// ============================================

function createMockDbPlayer(overrides?: Partial<DbPlayer>): DbPlayer {
  return {
    id: 'player-123',
    first_name: 'Ali',
    last_name: 'Yilmaz',
    position: 'ATT',
    club: 'Sakaryaspor',
    club_id: '2bf30014-db88-4567-9885-9da215e3a0d4',
    age: 25,
    shirt_number: 9,
    nationality: 'TR',
    image_url: null,
    matches: 18,
    goals: 7,
    assists: 3,
    clean_sheets: 0,
    perf_l5: 72,
    perf_l15: 65,
    perf_season: 68,
    dpc_total: 500,
    dpc_available: 200,
    floor_price: 50000, // 500 BSD
    last_price: 48000,  // 480 BSD
    ipo_price: 50000,   // 500 BSD
    price_change_24h: 5.2,
    volume_24h: 150000,
    status: 'fit',
    success_fee_cap_cents: 100000, // 1000 BSD
    is_liquidated: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
    ...overrides,
  };
}

describe('dbToPlayer', () => {
  it('maps all basic fields correctly', () => {
    const db = createMockDbPlayer();
    const p = dbToPlayer(db);

    expect(p.id).toBe('player-123');
    expect(p.first).toBe('Ali');
    expect(p.last).toBe('Yilmaz');
    expect(p.club).toBe('Sakaryaspor');
    expect(p.pos).toBe('ATT');
    expect(p.status).toBe('fit');
    expect(p.age).toBe(25);
    expect(p.ticket).toBe(9);
    expect(p.country).toBe('TR');
    expect(p.league).toBe('TFF 1. Lig');
    expect(p.contractMonthsLeft).toBe(12);
  });

  it('converts prices from cents to BSD', () => {
    const db = createMockDbPlayer();
    const p = dbToPlayer(db);

    expect(p.prices.floor).toBe(500);       // 50000 cents -> 500 BSD
    expect(p.prices.lastTrade).toBe(480);   // 48000 cents -> 480 BSD
    expect(p.prices.ipoPrice).toBe(500);    // 50000 cents -> 500 BSD
    expect(p.prices.change24h).toBe(5.2);
  });

  it('calculates perf trend correctly', () => {
    // l5 > l15 -> UP
    const dbUp = createMockDbPlayer({ perf_l5: 80, perf_l15: 60 });
    expect(dbToPlayer(dbUp).perf.trend).toBe('UP');

    // l5 < l15 -> DOWN
    const dbDown = createMockDbPlayer({ perf_l5: 50, perf_l15: 70 });
    expect(dbToPlayer(dbDown).perf.trend).toBe('DOWN');

    // l5 == l15 -> FLAT
    const dbFlat = createMockDbPlayer({ perf_l5: 60, perf_l15: 60 });
    expect(dbToPlayer(dbFlat).perf.trend).toBe('FLAT');
  });

  it('maps stats correctly', () => {
    const db = createMockDbPlayer();
    const p = dbToPlayer(db);

    expect(p.stats.matches).toBe(18);
    expect(p.stats.goals).toBe(7);
    expect(p.stats.assists).toBe(3);
  });

  it('calculates DPC supply fields', () => {
    const db = createMockDbPlayer({ dpc_total: 500, dpc_available: 200 });
    const p = dbToPlayer(db);

    expect(p.dpc.supply).toBe(500);
    expect(p.dpc.float).toBe(500);
    expect(p.dpc.circulation).toBe(300); // 500 - 200
    expect(p.dpc.onMarket).toBe(0);
    expect(p.dpc.owned).toBe(0);
  });

  it('handles null shirt_number', () => {
    const db = createMockDbPlayer({ shirt_number: null });
    expect(dbToPlayer(db).ticket).toBe(0);
  });

  it('handles null age', () => {
    const db = createMockDbPlayer({ age: null });
    expect(dbToPlayer(db).age).toBe(0);
  });

  it('handles null nationality', () => {
    const db = createMockDbPlayer({ nationality: null });
    expect(dbToPlayer(db).country).toBe('TR');
  });

  it('handles null status', () => {
    const db = createMockDbPlayer({ status: null });
    expect(dbToPlayer(db).status).toBe('fit');
  });

  it('maps successFeeCap from cents to BSD', () => {
    const db = createMockDbPlayer({ success_fee_cap_cents: 100000 });
    expect(dbToPlayer(db).successFeeCap).toBe(1000);
  });

  it('handles null success_fee_cap_cents', () => {
    const db = createMockDbPlayer({ success_fee_cap_cents: null });
    expect(dbToPlayer(db).successFeeCap).toBeUndefined();
  });

  it('maps isLiquidated', () => {
    const dbLiq = createMockDbPlayer({ is_liquidated: true });
    expect(dbToPlayer(dbLiq).isLiquidated).toBe(true);

    const dbNotLiq = createMockDbPlayer({ is_liquidated: false });
    expect(dbToPlayer(dbNotLiq).isLiquidated).toBe(false);
  });

  it('sets default IPO and listings', () => {
    const p = dbToPlayer(createMockDbPlayer());

    expect(p.ipo).toEqual({ status: 'none' });
    expect(p.listings).toEqual([]);
    expect(p.topOwners).toEqual([]);
  });

  it('uses ipo_price as fallback when ipo_price is not null', () => {
    const db = createMockDbPlayer({ ipo_price: 75000, floor_price: 50000 });
    const p = dbToPlayer(db);
    expect(p.prices.ipoPrice).toBe(750); // 75000 cents
  });
});

// ============================================
// dbToPlayers
// ============================================

describe('dbToPlayers', () => {
  it('handles empty array', () => {
    expect(dbToPlayers([])).toEqual([]);
  });

  it('maps multiple players', () => {
    const rows = [
      createMockDbPlayer({ id: 'a', first_name: 'A' }),
      createMockDbPlayer({ id: 'b', first_name: 'B' }),
    ];
    const result = dbToPlayers(rows);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });
});
