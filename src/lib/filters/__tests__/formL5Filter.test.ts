import { describe, it, expect } from 'vitest';
import {
  FORM_L5_VALUES,
  applyFormL5Filter,
  getFormL5Label,
  isFormL5Threshold,
} from '../formL5Filter';

describe('formL5Filter — Slice 197a', () => {
  describe('FORM_L5_VALUES', () => {
    it('should contain exactly 0/45/55/65 in stable order', () => {
      expect(FORM_L5_VALUES).toEqual([0, 45, 55, 65]);
    });
  });

  describe('isFormL5Threshold', () => {
    it('should accept valid thresholds', () => {
      expect(isFormL5Threshold(0)).toBe(true);
      expect(isFormL5Threshold(45)).toBe(true);
      expect(isFormL5Threshold(55)).toBe(true);
      expect(isFormL5Threshold(65)).toBe(true);
    });

    it('should reject invalid thresholds', () => {
      expect(isFormL5Threshold(50)).toBe(false);
      expect(isFormL5Threshold(-1)).toBe(false);
      expect(isFormL5Threshold(100)).toBe(false);
    });
  });

  describe('applyFormL5Filter', () => {
    type Item = { id: string; l5: number | null | undefined };
    const items: Item[] = [
      { id: 'a', l5: 30 },
      { id: 'b', l5: 50 },
      { id: 'c', l5: 60 },
      { id: 'd', l5: 70 },
      { id: 'e', l5: null },
      { id: 'f', l5: undefined },
    ];

    const getValue = (i: Item) => i.l5;

    it('should return all items when threshold is 0', () => {
      const result = applyFormL5Filter(items, 0, getValue);
      expect(result).toHaveLength(items.length);
      expect(result).toBe(items); // same reference for the all-pass path
    });

    it('should filter to >= 45+', () => {
      const result = applyFormL5Filter(items, 45, getValue);
      expect(result.map(i => i.id)).toEqual(['b', 'c', 'd']);
    });

    it('should filter to >= 55+', () => {
      const result = applyFormL5Filter(items, 55, getValue);
      expect(result.map(i => i.id)).toEqual(['c', 'd']);
    });

    it('should filter to >= 65+', () => {
      const result = applyFormL5Filter(items, 65, getValue);
      expect(result.map(i => i.id)).toEqual(['d']);
    });

    it('should treat null/undefined as 0 (excluded for any threshold > 0)', () => {
      const result = applyFormL5Filter(items, 45, getValue);
      expect(result.find(i => i.id === 'e')).toBeUndefined();
      expect(result.find(i => i.id === 'f')).toBeUndefined();
    });

    it('should not mutate input', () => {
      const before = [...items];
      applyFormL5Filter(items, 65, getValue);
      expect(items).toEqual(before);
    });

    it('should support different value-extractor shapes', () => {
      // Player-like: nested perf.l5
      type Player = { id: string; perf: { l5: number } };
      const players: Player[] = [
        { id: 'p1', perf: { l5: 40 } },
        { id: 'p2', perf: { l5: 60 } },
      ];
      const result = applyFormL5Filter(players, 55, p => p.perf.l5);
      expect(result.map(p => p.id)).toEqual(['p2']);
    });
  });

  describe('getFormL5Label', () => {
    it('should return "all" sentinel for 0 (caller resolves via i18n)', () => {
      expect(getFormL5Label(0)).toBe('all');
    });

    it('should return "{n}+" for non-zero thresholds', () => {
      expect(getFormL5Label(45)).toBe('45+');
      expect(getFormL5Label(55)).toBe('55+');
      expect(getFormL5Label(65)).toBe('65+');
    });
  });
});
