import { describe, it, expect } from 'vitest';
import {
  MV_TREND_VALUES,
  applyMvTrendFilter,
  getMvTrendLabel,
  isMvTrendValue,
  type MvTrend,
} from '../mvTrendFilter';

describe('mvTrendFilter — Slice 197d', () => {
  describe('MV_TREND_VALUES', () => {
    it('should contain exactly all/rising/stable/falling in stable order', () => {
      expect(MV_TREND_VALUES).toEqual(['all', 'rising', 'stable', 'falling']);
    });
  });

  describe('isMvTrendValue', () => {
    it('should accept valid values', () => {
      expect(isMvTrendValue('all')).toBe(true);
      expect(isMvTrendValue('rising')).toBe(true);
      expect(isMvTrendValue('stable')).toBe(true);
      expect(isMvTrendValue('falling')).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(isMvTrendValue('up')).toBe(false);
      expect(isMvTrendValue('down')).toBe(false);
      expect(isMvTrendValue('')).toBe(false);
      expect(isMvTrendValue('rising ')).toBe(false);
    });
  });

  describe('applyMvTrendFilter', () => {
    type Item = { id: string; trend: MvTrend | null | undefined };
    const items: Item[] = [
      { id: 'a', trend: 'rising' },
      { id: 'b', trend: 'stable' },
      { id: 'c', trend: 'falling' },
      { id: 'd', trend: 'rising' },
      { id: 'e', trend: null },
      { id: 'f', trend: undefined },
    ];

    const getValue = (i: Item) => i.trend;

    it('should return all items when filter is "all"', () => {
      const result = applyMvTrendFilter(items, 'all', getValue);
      expect(result).toHaveLength(items.length);
      expect(result).toBe(items); // same reference for the all-pass path
    });

    it('should filter to rising', () => {
      const result = applyMvTrendFilter(items, 'rising', getValue);
      expect(result.map(i => i.id)).toEqual(['a', 'd']);
    });

    it('should filter to stable', () => {
      const result = applyMvTrendFilter(items, 'stable', getValue);
      expect(result.map(i => i.id)).toEqual(['b']);
    });

    it('should filter to falling', () => {
      const result = applyMvTrendFilter(items, 'falling', getValue);
      expect(result.map(i => i.id)).toEqual(['c']);
    });

    it('should exclude null/undefined when filter is active', () => {
      const result = applyMvTrendFilter(items, 'rising', getValue);
      expect(result.find(i => i.id === 'e')).toBeUndefined();
      expect(result.find(i => i.id === 'f')).toBeUndefined();
    });

    it('should not mutate input', () => {
      const before = [...items];
      applyMvTrendFilter(items, 'falling', getValue);
      expect(items).toEqual(before);
    });

    it('should support different extractor shapes', () => {
      type Player = { id: string; mvTrend7d?: MvTrend | null };
      const players: Player[] = [
        { id: 'p1', mvTrend7d: 'rising' },
        { id: 'p2', mvTrend7d: null },
        { id: 'p3', mvTrend7d: 'falling' },
      ];
      const result = applyMvTrendFilter(players, 'rising', p => p.mvTrend7d);
      expect(result.map(p => p.id)).toEqual(['p1']);
    });
  });

  describe('getMvTrendLabel', () => {
    it('should return literal value for all variants', () => {
      expect(getMvTrendLabel('all')).toBe('all');
      expect(getMvTrendLabel('rising')).toBe('rising');
      expect(getMvTrendLabel('stable')).toBe('stable');
      expect(getMvTrendLabel('falling')).toBe('falling');
    });
  });
});
