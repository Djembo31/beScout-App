import { describe, it, expect, vi } from 'vitest';

// Mock transitive supabase dependency
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import {
  posColors, posTintColors,
  getContractInfo,
  getSuccessFeeTier, SUCCESS_FEE_TIERS,
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

  describe('getSuccessFeeTier', () => {
    it('returns lowest tier for 0', () => {
      const tier = getSuccessFeeTier(0);
      expect(tier.fee).toBe(5000);
      expect(tier.label).toBe('< 100K');
    });

    it('returns correct tier for 250K', () => {
      const tier = getSuccessFeeTier(250000);
      expect(tier.fee).toBe(20000);
      expect(tier.label).toBe('100K-300K');
    });

    it('returns highest tier for 100M', () => {
      const tier = getSuccessFeeTier(100000000);
      expect(tier.fee).toBe(7500000);
      expect(tier.label).toBe('> 50M');
    });

    it('has 10 tiers', () => {
      expect(SUCCESS_FEE_TIERS).toHaveLength(10);
    });

    it('tiers are contiguous (no gaps)', () => {
      for (let i = 1; i < SUCCESS_FEE_TIERS.length; i++) {
        expect(SUCCESS_FEE_TIERS[i].minValue).toBe(SUCCESS_FEE_TIERS[i - 1].maxValue);
      }
    });

    it('fees increase monotonically', () => {
      for (let i = 1; i < SUCCESS_FEE_TIERS.length; i++) {
        expect(SUCCESS_FEE_TIERS[i].fee).toBeGreaterThan(SUCCESS_FEE_TIERS[i - 1].fee);
      }
    });
  });
});
