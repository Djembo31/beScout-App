import { describe, it, expect, vi } from 'vitest';

// Mock transitive supabase dependency
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import { formatTimeAgo, POST_CATEGORIES } from '../PostCard';

// ============================================
// Pure function + constants tests
// ============================================
describe('PostCard helpers', () => {
  describe('formatTimeAgo', () => {
    it('returns "just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(formatTimeAgo(now)).toBe('just now');
    });

    it('returns custom nowLabel', () => {
      const now = new Date().toISOString();
      expect(formatTimeAgo(now, 'gerade eben')).toBe('gerade eben');
    });

    it('returns minutes for < 1 hour', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60000).toISOString();
      expect(formatTimeAgo(thirtyMinsAgo)).toBe('30m');
    });

    it('returns hours for < 24 hours', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 3600000).toISOString();
      expect(formatTimeAgo(fiveHoursAgo)).toBe('5h');
    });

    it('returns days for < 7 days', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(formatTimeAgo(threeDaysAgo)).toBe('3d');
    });

    it('returns formatted date for >= 7 days', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      const result = formatTimeAgo(tenDaysAgo);
      // Should be a date string, not a relative format
      expect(result).not.toMatch(/^\d+[mhd]$/);
    });
  });

  describe('POST_CATEGORIES', () => {
    it('has 4 categories', () => {
      expect(POST_CATEGORIES).toHaveLength(4);
    });

    it('each category has id, labelKey, color', () => {
      for (const cat of POST_CATEGORIES) {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('labelKey');
        expect(cat).toHaveProperty('color');
      }
    });

    it('includes expected category IDs', () => {
      const ids = POST_CATEGORIES.map(c => c.id);
      expect(ids).toContain('Analyse');
      expect(ids).toContain('Prediction');
      expect(ids).toContain('Meinung');
      expect(ids).toContain('News');
    });
  });
});
