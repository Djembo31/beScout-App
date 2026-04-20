import { describe, it, expect, vi } from 'vitest';

// Mock transitive supabase dependency
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import {
  posColors, posTintColors,
  getContractInfo,
  getSuccessFeeTier, SUCCESS_FEE_TIERS, calcSuccessFee,
} from '../PlayerRow';

// ============================================
// Pure function tests — no rendering needed
// ============================================
describe('PlayerRow helpers', () => {
  describe('posColors', () => {
    it('has all 4 positions defined', () => {
      expect(Object.keys(posColors)).toEqual(['GK', 'DEF', 'MID', 'ATT']);
    });

    it('each position has bg, border, text', () => {
      for (const pos of Object.keys(posColors) as Array<keyof typeof posColors>) {
        expect(posColors[pos]).toHaveProperty('bg');
        expect(posColors[pos]).toHaveProperty('border');
        expect(posColors[pos]).toHaveProperty('text');
      }
    });
  });

  describe('posTintColors', () => {
    it('has hex values for all positions', () => {
      expect(posTintColors.GK).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(posTintColors.DEF).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(posTintColors.MID).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(posTintColors.ATT).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('getContractInfo', () => {
    it('returns red for <= 6 months', () => {
      const info = getContractInfo(3);
      expect(info.color).toBe('text-red-400');
      expect(info.urgent).toBe(true);
      expect(info.monthsLeft).toBe(3);
    });

    it('returns orange for 7-12 months', () => {
      const info = getContractInfo(10);
      expect(info.color).toBe('text-orange-400');
      expect(info.urgent).toBe(false);
    });

    it('returns neutral for > 12 months', () => {
      const info = getContractInfo(24);
      expect(info.color).toBe('text-white/60');
      expect(info.urgent).toBe(false);
    });

    it('includes formatted date string', () => {
      const info = getContractInfo(6);
      expect(info.dateStr).toBeTruthy();
      expect(typeof info.dateStr).toBe('string');
    });
  });

  describe('calcSuccessFee (CEO linear formula)', () => {
    it('returns 0 for MV 0', () => {
      expect(calcSuccessFee(0)).toBe(0);
    });

    it('returns 0 for negative MV', () => {
      expect(calcSuccessFee(-1000)).toBe(0);
    });

    it('returns 0 for NaN / Infinity', () => {
      expect(calcSuccessFee(NaN)).toBe(0);
      expect(calcSuccessFee(Infinity)).toBe(0);
    });

    it('1M€ MV → 100.000 cents (Bekir-Baseline)', () => {
      expect(calcSuccessFee(1_000_000)).toBe(100_000);
    });

    it('5M€ MV → 500.000 cents (5× growth)', () => {
      expect(calcSuccessFee(5_000_000)).toBe(500_000);
    });

    it('50M€ MV → 5.000.000 cents (scales linearly)', () => {
      expect(calcSuccessFee(50_000_000)).toBe(5_000_000);
    });

    it('100K€ MV → 10.000 cents', () => {
      expect(calcSuccessFee(100_000)).toBe(10_000);
    });

    it('floors fractional results', () => {
      // 15 EUR / 10 = 1.5 → floor to 1
      expect(calcSuccessFee(15)).toBe(1);
    });
  });

  describe('getSuccessFeeTier', () => {
    it('returns lowest tier for MV 0 with linear fee', () => {
      const tier = getSuccessFeeTier(0);
      expect(tier.fee).toBe(0); // linear: 0/10 = 0
      expect(tier.label).toBe('< 100K');
    });

    it('returns correct tier for 250K with exact linear fee', () => {
      const tier = getSuccessFeeTier(250000);
      expect(tier.fee).toBe(25000); // linear: 250000/10
      expect(tier.label).toBe('100K-300K');
    });

    it('returns highest tier for 100M with linear fee', () => {
      const tier = getSuccessFeeTier(100000000);
      expect(tier.fee).toBe(10000000); // linear: 100M/10
      expect(tier.label).toBe('> 50M');
    });

    it('1M€ falls into "1M-2M" tier with 100K cents fee', () => {
      const tier = getSuccessFeeTier(1_000_000);
      expect(tier.label).toBe('1M-2M');
      expect(tier.fee).toBe(100_000);
    });

    it('has 10 buckets', () => {
      expect(SUCCESS_FEE_TIERS).toHaveLength(10);
    });

    it('buckets are contiguous (no gaps)', () => {
      for (let i = 1; i < SUCCESS_FEE_TIERS.length; i++) {
        expect(SUCCESS_FEE_TIERS[i].minValue).toBe(SUCCESS_FEE_TIERS[i - 1].maxValue);
      }
    });

    it('ladder fees (at bucket minValue) increase monotonically', () => {
      // Slice 108: Erstes Bucket hat minValue=0 → fee=0. Alle anderen > Vorgänger.
      expect(SUCCESS_FEE_TIERS[0].fee).toBe(0);
      for (let i = 1; i < SUCCESS_FEE_TIERS.length; i++) {
        expect(SUCCESS_FEE_TIERS[i].fee).toBeGreaterThan(SUCCESS_FEE_TIERS[i - 1].fee);
      }
    });

    it('ladder fees match calcSuccessFee(minValue) — formula sync', () => {
      for (const tier of SUCCESS_FEE_TIERS) {
        expect(tier.fee).toBe(calcSuccessFee(tier.minValue));
      }
    });
  });
});
