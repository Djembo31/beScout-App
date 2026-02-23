import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  getAchievementDef,
  getAchievementsByCategory,
  getFeaturedAchievements,
  getHiddenAchievements,
  type AchievementCategory,
} from './achievements';

// ============================================
// ACHIEVEMENTS array integrity
// ============================================

describe('ACHIEVEMENTS', () => {
  it('has exactly 33 achievements', () => {
    expect(ACHIEVEMENTS.length).toBe(33);
  });

  it('all keys are unique', () => {
    const keys = ACHIEVEMENTS.map(a => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('all have required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.key).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(['trading', 'manager', 'scout']).toContain(a.category);
      expect(typeof a.featured).toBe('boolean');
    }
  });

  it('has all 3 categories represented', () => {
    const categories = Array.from(new Set(ACHIEVEMENTS.map(a => a.category)));
    expect(categories).toContain('trading');
    expect(categories).toContain('manager');
    expect(categories).toContain('scout');
  });
});

// ============================================
// getFeaturedAchievements
// ============================================

describe('getFeaturedAchievements', () => {
  it('returns 15 featured achievements', () => {
    expect(getFeaturedAchievements()).toHaveLength(15);
  });

  it('all have featured=true', () => {
    for (const a of getFeaturedAchievements()) {
      expect(a.featured).toBe(true);
    }
  });

  it('has 5 per category', () => {
    const featured = getFeaturedAchievements();
    const trading = featured.filter(a => a.category === 'trading');
    const manager = featured.filter(a => a.category === 'manager');
    const scout = featured.filter(a => a.category === 'scout');
    expect(trading).toHaveLength(5);
    expect(manager).toHaveLength(5);
    expect(scout).toHaveLength(5);
  });
});

// ============================================
// getHiddenAchievements
// ============================================

describe('getHiddenAchievements', () => {
  it('returns 18 hidden achievements', () => {
    expect(getHiddenAchievements()).toHaveLength(18);
  });

  it('all have featured=false', () => {
    for (const a of getHiddenAchievements()) {
      expect(a.featured).toBe(false);
    }
  });

  it('featured + hidden = total', () => {
    expect(getFeaturedAchievements().length + getHiddenAchievements().length).toBe(ACHIEVEMENTS.length);
  });
});

// ============================================
// getAchievementDef
// ============================================

describe('getAchievementDef', () => {
  it('finds first_trade', () => {
    const a = getAchievementDef('first_trade');
    expect(a).toBeDefined();
    expect(a!.label).toBe('Erster Deal');
    expect(a!.category).toBe('trading');
  });

  it('finds event_winner', () => {
    const a = getAchievementDef('event_winner');
    expect(a).toBeDefined();
    expect(a!.category).toBe('manager');
  });

  it('finds scout_network', () => {
    const a = getAchievementDef('scout_network');
    expect(a).toBeDefined();
    expect(a!.category).toBe('scout');
  });

  it('returns undefined for unknown key', () => {
    expect(getAchievementDef('does_not_exist')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getAchievementDef('')).toBeUndefined();
  });
});

// ============================================
// getAchievementsByCategory
// ============================================

describe('getAchievementsByCategory', () => {
  it('filters trading achievements', () => {
    const trading = getAchievementsByCategory('trading');
    expect(trading.length).toBeGreaterThan(0);
    for (const a of trading) {
      expect(a.category).toBe('trading');
    }
  });

  it('filters manager achievements', () => {
    const manager = getAchievementsByCategory('manager');
    expect(manager.length).toBeGreaterThan(0);
    for (const a of manager) {
      expect(a.category).toBe('manager');
    }
  });

  it('filters scout achievements', () => {
    const scout = getAchievementsByCategory('scout');
    expect(scout.length).toBeGreaterThan(0);
    for (const a of scout) {
      expect(a.category).toBe('scout');
    }
  });

  it('all categories sum to total', () => {
    const categories: AchievementCategory[] = ['trading', 'manager', 'scout'];
    const total = categories.reduce((sum, cat) => sum + getAchievementsByCategory(cat).length, 0);
    expect(total).toBe(ACHIEVEMENTS.length);
  });
});

// ============================================
// Known achievement keys (guard against rename)
// ============================================

describe('Critical achievement keys exist', () => {
  const criticalKeys = [
    'first_trade', '10_trades', '100_trades', 'portfolio_10000', 'smart_money',
    'first_event', '20_events', 'event_winner', 'podium_3x', 'gold_standard',
    'first_post', 'first_research', '10_upvotes', 'scout_network', 'complete_scout',
  ];

  for (const key of criticalKeys) {
    it(`has key: ${key}`, () => {
      expect(getAchievementDef(key)).toBeDefined();
    });
  }
});
