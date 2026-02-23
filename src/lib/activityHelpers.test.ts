import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getActivityIcon,
  getActivityColor,
  getActivityLabel,
  getRelativeTime,
} from './activityHelpers';
import type { DbTransaction } from '@/types';

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
    expect(getActivityColor('trade_buy')).toContain('#FFD700');
    expect(getActivityColor('ipo_buy')).toContain('#FFD700');
  });

  it('returns green for sell/earning types', () => {
    expect(getActivityColor('trade_sell')).toContain('#22C55E');
    expect(getActivityColor('research_earning')).toContain('#22C55E');
    expect(getActivityColor('bounty_reward')).toContain('#22C55E');
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
// getActivityLabel
// ============================================

describe('getActivityLabel', () => {
  function makeTx(type: string, description?: string): DbTransaction {
    return { type, description } as DbTransaction;
  }

  it('returns description if present', () => {
    expect(getActivityLabel(makeTx('trade_buy', 'Custom label'))).toBe('Custom label');
  });

  it('returns German labels for known types', () => {
    expect(getActivityLabel(makeTx('trade_buy'))).toBe('DPC gekauft');
    expect(getActivityLabel(makeTx('trade_sell'))).toBe('DPC verkauft');
    expect(getActivityLabel(makeTx('ipo_buy'))).toBe('IPO-Kauf');
    expect(getActivityLabel(makeTx('entry_fee'))).toBe('Event-Eintritt');
    expect(getActivityLabel(makeTx('entry_refund'))).toBe('Event-Erstattung');
    expect(getActivityLabel(makeTx('fantasy_reward'))).toBe('Fantasy-Belohnung');
    expect(getActivityLabel(makeTx('deposit'))).toBe('Einzahlung');
    expect(getActivityLabel(makeTx('research_unlock'))).toBe('Bericht freigeschaltet');
    expect(getActivityLabel(makeTx('research_earning'))).toBe('Bericht-Einnahme');
    expect(getActivityLabel(makeTx('mission_reward'))).toBe('Missions-Belohnung');
    expect(getActivityLabel(makeTx('bounty_cost'))).toBe('Bounty-Zahlung');
    expect(getActivityLabel(makeTx('bounty_reward'))).toBe('Bounty-Belohnung');
    expect(getActivityLabel(makeTx('pbt_liquidation'))).toBe('PBT-Ausschüttung');
    expect(getActivityLabel(makeTx('streak_bonus'))).toBe('Streak-Bonus');
  });

  it('returns raw type for unknown types', () => {
    expect(getActivityLabel(makeTx('custom_action'))).toBe('custom_action');
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

  it('returns "gerade eben" for less than 1 minute ago', () => {
    expect(getRelativeTime('2026-02-23T11:59:30Z')).toBe('gerade eben');
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
    // Should be a German locale date string
    expect(result).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/);
  });
});
