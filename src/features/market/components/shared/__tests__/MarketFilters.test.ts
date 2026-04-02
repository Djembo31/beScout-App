import { describe, it, expect } from 'vitest';
import { applyFilters, applySorting, getActiveFilterCount } from '../MarketFilters';
import type { Player, Pos } from '@/types';

// ============================================
// Minimal player factory
// ============================================
function makePlayer(overrides: Partial<{
  pos: Pos;
  l5: number;
  goals: number;
  assists: number;
  matches: number;
  contractMonthsLeft: number;
  status: string;
}>): Player {
  return {
    id: Math.random().toString(),
    firstName: 'Test',
    lastName: 'Player',
    pos: overrides.pos ?? 'MID',
    perf: { l5: overrides.l5 ?? 50, l15: 50, trend: 0, ratings: [] },
    stats: {
      goals: overrides.goals ?? 0,
      assists: overrides.assists ?? 0,
      matches: overrides.matches ?? 10,
      yellowCards: 0, redCards: 0, minutesPlayed: 900,
      cleanSheets: 0, goalsConceded: 0,
    },
    contractMonthsLeft: overrides.contractMonthsLeft ?? 24,
    status: overrides.status ?? 'fit',
    prices: { floor: 100, referencePrice: 100 },
    listings: [],
    clubId: 'c1',
    image: null,
    nationality: 'DE',
    shirtNumber: 10,
    age: 25,
    marketValue: 500000,
  } as unknown as Player;
}

// ============================================
// applyFilters
// ============================================
describe('applyFilters', () => {
  const defaultStore = {
    filterPos: new Set<Pos>(),
    filterMinL5: 0,
    filterMinGoals: 0,
    filterMinAssists: 0,
    filterMinMatches: 0,
    filterContractMax: 0,
    filterOnlyFit: false,
    filterPriceMin: 0,
    filterPriceMax: 0,
    filterMinSellers: 0,
    filterBestDeals: false,
  };

  it('returns all players with no filters', () => {
    const players = [makePlayer({}), makePlayer({})];
    const result = applyFilters(players, defaultStore as any);
    expect(result).toHaveLength(2);
  });

  it('filters by position', () => {
    const players = [makePlayer({ pos: 'GK' }), makePlayer({ pos: 'ATT' })];
    const store = { ...defaultStore, filterPos: new Set<Pos>(['ATT']) };
    const result = applyFilters(players, store as any);
    expect(result).toHaveLength(1);
    expect(result[0].pos).toBe('ATT');
  });

  it('filters by minimum L5 score', () => {
    const players = [makePlayer({ l5: 30 }), makePlayer({ l5: 70 })];
    const store = { ...defaultStore, filterMinL5: 50 };
    const result = applyFilters(players, store as any);
    expect(result).toHaveLength(1);
  });

  it('filters by minimum goals', () => {
    const players = [makePlayer({ goals: 0 }), makePlayer({ goals: 5 })];
    const store = { ...defaultStore, filterMinGoals: 3 };
    const result = applyFilters(players, store as any);
    expect(result).toHaveLength(1);
  });

  it('filters by contract max', () => {
    const players = [makePlayer({ contractMonthsLeft: 3 }), makePlayer({ contractMonthsLeft: 24 })];
    const store = { ...defaultStore, filterContractMax: 6 };
    const result = applyFilters(players, store as any);
    expect(result).toHaveLength(1);
  });

  it('filters only fit players', () => {
    const players = [makePlayer({ status: 'fit' }), makePlayer({ status: 'injured' })];
    const store = { ...defaultStore, filterOnlyFit: true };
    const result = applyFilters(players, store as any);
    expect(result).toHaveLength(1);
  });

  it('combines multiple filters', () => {
    const players = [
      makePlayer({ pos: 'ATT', l5: 70, goals: 5 }),
      makePlayer({ pos: 'ATT', l5: 30, goals: 5 }),
      makePlayer({ pos: 'DEF', l5: 70, goals: 5 }),
    ];
    const store = { ...defaultStore, filterPos: new Set<Pos>(['ATT']), filterMinL5: 50 };
    const result = applyFilters(players, store as any);
    expect(result).toHaveLength(1);
  });
});

// ============================================
// applySorting
// ============================================
describe('applySorting', () => {
  it('sorts by L5 descending', () => {
    const players = [makePlayer({ l5: 30 }), makePlayer({ l5: 70 }), makePlayer({ l5: 50 })];
    const sorted = applySorting(players, 'l5');
    expect(sorted[0].perf.l5).toBe(70);
    expect(sorted[2].perf.l5).toBe(30);
  });

  it('sorts by goals descending', () => {
    const players = [makePlayer({ goals: 1 }), makePlayer({ goals: 10 })];
    const sorted = applySorting(players, 'goals');
    expect(sorted[0].stats.goals).toBe(10);
  });

  it('sorts by contract ascending', () => {
    const players = [makePlayer({ contractMonthsLeft: 24 }), makePlayer({ contractMonthsLeft: 3 })];
    const sorted = applySorting(players, 'contract');
    expect(sorted[0].contractMonthsLeft).toBe(3);
  });

  it('sorts by floor_asc with getFloor function', () => {
    const p1 = makePlayer({});
    const p2 = makePlayer({});
    const getFloor = (p: Player) => p === p1 ? 200 : 100;
    const sorted = applySorting([p1, p2], 'floor_asc', getFloor);
    expect(getFloor(sorted[0])).toBe(100);
  });

  it('does not mutate original array', () => {
    const players = [makePlayer({ l5: 30 }), makePlayer({ l5: 70 })];
    const original = [...players];
    applySorting(players, 'l5');
    expect(players[0]).toBe(original[0]);
  });
});

// ============================================
// getActiveFilterCount
// ============================================
describe('getActiveFilterCount', () => {
  it('returns 0 for no active filters', () => {
    const store = {
      filterPos: new Set<Pos>(),
      filterMinL5: 0, filterMinGoals: 0, filterMinAssists: 0,
      filterMinMatches: 0, filterContractMax: 0, filterOnlyFit: false,
      filterPriceMin: 0, filterPriceMax: 0, filterMinSellers: 0, filterBestDeals: false,
    };
    expect(getActiveFilterCount(store as any)).toBe(0);
  });

  it('counts position filter', () => {
    const store = {
      filterPos: new Set<Pos>(['ATT']),
      filterMinL5: 0, filterMinGoals: 0, filterMinAssists: 0,
      filterMinMatches: 0, filterContractMax: 0, filterOnlyFit: false,
      filterPriceMin: 0, filterPriceMax: 0, filterMinSellers: 0, filterBestDeals: false,
    };
    expect(getActiveFilterCount(store as any)).toBe(1);
  });

  it('counts multiple active filters', () => {
    const store = {
      filterPos: new Set<Pos>(['ATT', 'MID']),
      filterMinL5: 50, filterMinGoals: 3, filterMinAssists: 0,
      filterMinMatches: 0, filterContractMax: 12, filterOnlyFit: true,
      filterPriceMin: 0, filterPriceMax: 0, filterMinSellers: 0, filterBestDeals: false,
    };
    expect(getActiveFilterCount(store as any)).toBe(5);
  });
});
