import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getActivityIcon,
  getActivityColor,
  getActivityLabelKey,
  getRelativeTime,
} from './activityHelpers';

// ============================================
// getActivityIcon
// ============================================

describe('getActivityIcon', () => {
  it('returns CircleDollarSign for trade types', () => {
    expect(getActivityIcon('trade_buy')).toBe('CircleDollarSign');
    expect(getActivityIcon('trade_sell')).toBe('CircleDollarSign');
    expect(getActivityIcon('buy')).toBe('CircleDollarSign');
    expect(getActivityIcon('sell')).toBe('CircleDollarSign');
    expect(getActivityIcon('ipo_buy')).toBe('CircleDollarSign');
  });

  it('returns Trophy for fantasy types', () => {
    expect(getActivityIcon('entry_fee')).toBe('Trophy');
    expect(getActivityIcon('entry_refund')).toBe('Trophy');
  });

  it('returns Award for rewards', () => {
    expect(getActivityIcon('fantasy_reward')).toBe('Award');
    expect(getActivityIcon('reward')).toBe('Award');
  });

  it('returns Target for bounty/mission types', () => {
    expect(getActivityIcon('mission_reward')).toBe('Target');
    expect(getActivityIcon('bounty_cost')).toBe('Target');
    expect(getActivityIcon('bounty_reward')).toBe('Target');
  });

  it('returns Flame for streak_bonus', () => {
    expect(getActivityIcon('streak_bonus')).toBe('Flame');
  });

  it('returns Activity as fallback for unknown types', () => {
    expect(getActivityIcon('unknown_type')).toBe('Activity');
    expect(getActivityIcon('')).toBe('Activity');
  });
});

// ============================================
// getActivityColor
// ============================================

describe('getActivityColor', () => {
  it('returns gold for buy types', () => {
    expect(getActivityColor('trade_buy')).toContain('gold');
    expect(getActivityColor('ipo_buy')).toContain('gold');
  });

  it('returns green for sell/earning types', () => {
    expect(getActivityColor('trade_sell')).toContain('green');
    expect(getActivityColor('research_earning')).toContain('green');
    expect(getActivityColor('bounty_reward')).toContain('green');
  });

  it('returns fallback for unknown type', () => {
    const color = getActivityColor('unknown');
    expect(color).toContain('white');
  });

  it('always returns text-* and bg-* classes', () => {
    const types = ['trade_buy', 'trade_sell', 'entry_fee', 'deposit', 'streak_bonus'];
    for (const t of types) {
      const c = getActivityColor(t);
      expect(c).toMatch(/text-/);
      expect(c).toMatch(/bg-/);
    }
  });
});

// ============================================
// getActivityLabelKey
// ============================================

describe('getActivityLabelKey', () => {
  it('returns i18n keys for known types', () => {
    expect(getActivityLabelKey('trade_buy')).toBe('tradeBuy');
    expect(getActivityLabelKey('trade_sell')).toBe('tradeSell');
    expect(getActivityLabelKey('ipo_buy')).toBe('ipoBuy');
    expect(getActivityLabelKey('entry_fee')).toBe('entryFee');
    expect(getActivityLabelKey('entry_refund')).toBe('entryRefund');
    expect(getActivityLabelKey('fantasy_reward')).toBe('fantasyReward');
    expect(getActivityLabelKey('deposit')).toBe('deposit');
    expect(getActivityLabelKey('research_unlock')).toBe('researchUnlock');
    expect(getActivityLabelKey('research_earning')).toBe('researchEarning');
    expect(getActivityLabelKey('mission_reward')).toBe('missionReward');
    expect(getActivityLabelKey('bounty_cost')).toBe('bountyCost');
    expect(getActivityLabelKey('bounty_reward')).toBe('bountyReward');
    expect(getActivityLabelKey('pbt_liquidation')).toBe('pbtLiquidation');
    // B3: both legacy streak_bonus and DB-canonical streak_reward map to streakReward i18n key
    expect(getActivityLabelKey('streak_bonus')).toBe('streakReward');
    expect(getActivityLabelKey('streak_reward')).toBe('streakReward');
  });

  it('returns raw type for unknown types', () => {
    expect(getActivityLabelKey('custom_action')).toBe('custom_action');
  });
});

// ============================================
// getRelativeTime
// ============================================

describe('getRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns justNowLabel for less than 1 minute ago', () => {
    expect(getRelativeTime('2026-02-23T11:59:30Z')).toBe('just now');
    expect(getRelativeTime('2026-02-23T11:59:30Z', 'az önce')).toBe('az önce');
  });

  it('returns minutes format', () => {
    expect(getRelativeTime('2026-02-23T11:45:00Z')).toBe('15m');
  });

  it('returns hours format', () => {
    expect(getRelativeTime('2026-02-23T09:00:00Z')).toBe('3h');
  });

  it('returns days format', () => {
    expect(getRelativeTime('2026-02-20T12:00:00Z')).toBe('3d');
  });

  it('returns localized date for 7+ days', () => {
    const result = getRelativeTime('2026-02-10T12:00:00Z');
    // Should be a German locale date string (default locale)
    expect(result).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/);
  });
});
