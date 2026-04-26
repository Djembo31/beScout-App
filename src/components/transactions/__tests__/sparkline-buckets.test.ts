import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildDailyBuckets } from '../TransactionsPageContent';
import type { DbTransaction } from '@/types';

/**
 * Slice 208 — Trend-Sparkline Bucket-Aggregation Tests.
 * Tests are time-deterministic via vi.useFakeTimers() so day-boundary math is reproducible.
 */

const FIXED_NOW = new Date('2026-04-26T14:00:00.000Z').getTime();
const DAY = 86_400_000;

function tx(amountCents: number, daysAgo: number, hour = 12): DbTransaction {
  const d = new Date(FIXED_NOW - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return {
    id: `tx-${daysAgo}-${amountCents}-${hour}`,
    user_id: 'u1',
    type: 'trade_buy',
    amount: amountCents,
    description: 'test',
    reference_id: null,
    created_at: d.toISOString(),
  } as DbTransaction;
}

describe('buildDailyBuckets', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns empty array for zero transactions (any range)', () => {
    expect(buildDailyBuckets([], '7d')).toEqual([]);
    expect(buildDailyBuckets([], 'all')).toEqual([]);
  });

  it('range 7d returns 7 buckets', () => {
    const buckets = buildDailyBuckets([tx(100, 0), tx(-50, 3)], '7d');
    expect(buckets).toHaveLength(7);
    // Newest day (idx 6) has +100, day 3-ago (idx 3) has -50, rest 0
    expect(buckets[6].net).toBe(100);
    expect(buckets[3].net).toBe(-50);
    expect(buckets[0].net).toBe(0);
  });

  it('range 30d returns 30 buckets, txs out of range excluded', () => {
    const buckets = buildDailyBuckets([tx(100, 5), tx(200, 35)], '30d');
    expect(buckets).toHaveLength(30);
    // tx 5d ago in range, tx 35d ago out of range
    const sum = buckets.reduce((s, b) => s + b.net, 0);
    expect(sum).toBe(100);
  });

  it('aggregates multiple txs on same day to single bucket', () => {
    const buckets = buildDailyBuckets(
      [tx(100, 2), tx(-30, 2), tx(50, 2)],
      '7d',
    );
    const day2idx = 7 - 1 - 2; // newest is idx 6, 2-ago is idx 4
    expect(buckets[day2idx].net).toBe(120);
  });

  it("range 'all' caps to 90 days even if oldest tx is older", () => {
    const buckets = buildDailyBuckets(
      [tx(100, 0), tx(50, 200)],
      'all',
    );
    expect(buckets.length).toBeLessThanOrEqual(90);
    // 200d-ago tx should NOT contribute (out of cap)
    const sum = buckets.reduce((s, b) => s + b.net, 0);
    expect(sum).toBe(100);
  });

  it("range 'all' shrinks to oldest tx if younger than 90 days", () => {
    const buckets = buildDailyBuckets([tx(100, 0), tx(50, 4)], 'all');
    // start = oldest tx (4 days ago), end = today → 5 buckets
    expect(buckets).toHaveLength(5);
    expect(buckets[0].net).toBe(50);
    expect(buckets[4].net).toBe(100);
  });

  it('returns empty array if dayCount < 2 (only same day txs in range)', () => {
    const buckets = buildDailyBuckets([tx(100, 0, 9), tx(-30, 0, 18)], 'all');
    // oldest = today, end = today → dayCount = 1 → return []
    expect(buckets).toEqual([]);
  });

  it('handles negative-only correctly (all spend, mixed days)', () => {
    const buckets = buildDailyBuckets(
      [tx(-100, 0), tx(-50, 1), tx(-200, 3)],
      '7d',
    );
    expect(buckets[6].net).toBe(-100);
    expect(buckets[5].net).toBe(-50);
    expect(buckets[3].net).toBe(-200);
  });

  it('handles all-positive correctly (all earned, mixed days)', () => {
    const buckets = buildDailyBuckets(
      [tx(100, 0), tx(50, 1), tx(200, 3)],
      '7d',
    );
    expect(buckets[6].net).toBe(100);
    expect(buckets[5].net).toBe(50);
    expect(buckets[3].net).toBe(200);
  });

  it('mixed sign on same day nets correctly (earned + spent cancel)', () => {
    const buckets = buildDailyBuckets(
      [tx(100, 1), tx(-100, 1)],
      '7d',
    );
    // 1d ago = idx 5
    expect(buckets[5].net).toBe(0);
  });
});
