import { describe, it, expect } from 'vitest';
import {
  applyTimeFilter,
  applyStatusFilter,
  sortResults,
  detectLineupFormat,
} from '../historieHelpers';
import type { UserFantasyResult } from '@/types';

function makeResult(overrides: Partial<UserFantasyResult> = {}): UserFantasyResult {
  return {
    eventId: 'e1',
    eventName: 'Test Event',
    gameweek: 34,
    eventDate: '2026-04-01T18:00:00Z',
    totalScore: 400,
    rank: 5,
    rewardAmount: 0,
    ...overrides,
  };
}

describe('historieHelpers', () => {
  describe('applyTimeFilter', () => {
    const NOW = new Date('2026-04-08T12:00:00Z').getTime();
    const results = [
      makeResult({ eventId: 'a', eventDate: '2026-04-07T12:00:00Z' }), // 1 day ago
      makeResult({ eventId: 'b', eventDate: '2026-03-15T12:00:00Z' }), // 24 days ago
      makeResult({ eventId: 'c', eventDate: '2026-02-15T12:00:00Z' }), // 52 days ago
      makeResult({ eventId: 'd', eventDate: '2025-12-15T12:00:00Z' }), // 114 days ago
    ];

    it('returns all when filter is "all"', () => {
      expect(applyTimeFilter(results, 'all', NOW)).toHaveLength(4);
    });

    it('returns all when filter is "season" (no cutoff yet)', () => {
      expect(applyTimeFilter(results, 'season', NOW)).toHaveLength(4);
    });

    it('returns events within 30 days', () => {
      const out = applyTimeFilter(results, '30d', NOW);
      expect(out.map((r) => r.eventId)).toEqual(['a', 'b']);
    });

    it('returns events within 90 days', () => {
      const out = applyTimeFilter(results, '90d', NOW);
      expect(out.map((r) => r.eventId)).toEqual(['a', 'b', 'c']);
    });

    it('skips entries without eventDate', () => {
      const withMissing = [...results, makeResult({ eventId: 'x', eventDate: '' })];
      const out = applyTimeFilter(withMissing, '30d', NOW);
      expect(out.map((r) => r.eventId)).toEqual(['a', 'b']);
    });
  });

  describe('applyStatusFilter', () => {
    const results = [
      makeResult({ eventId: 'r1', rank: 1 }),
      makeResult({ eventId: 'r2', rank: 2 }),
      makeResult({ eventId: 'r3', rank: 3 }),
      makeResult({ eventId: 'r5', rank: 5 }),
      makeResult({ eventId: 'r10', rank: 10 }),
      makeResult({ eventId: 'r15', rank: 15 }),
      makeResult({ eventId: 'r0', rank: 0 }), // unranked
    ];

    it('returns all when filter is "all"', () => {
      expect(applyStatusFilter(results, 'all')).toHaveLength(7);
    });

    it('returns top3 (rank 1..3, excludes rank 0)', () => {
      const out = applyStatusFilter(results, 'top3');
      expect(out.map((r) => r.eventId)).toEqual(['r1', 'r2', 'r3']);
    });

    it('returns top10 (rank 1..10, excludes rank 0)', () => {
      const out = applyStatusFilter(results, 'top10');
      expect(out.map((r) => r.eventId)).toEqual(['r1', 'r2', 'r3', 'r5', 'r10']);
    });

    it('returns "other" (rank > 10)', () => {
      const out = applyStatusFilter(results, 'other');
      expect(out.map((r) => r.eventId)).toEqual(['r15']);
    });
  });

  describe('sortResults', () => {
    const results = [
      makeResult({ eventId: 'a', totalScore: 400, rank: 5, rewardAmount: 1000, eventDate: '2026-04-01T00:00:00Z' }),
      makeResult({ eventId: 'b', totalScore: 500, rank: 2, rewardAmount: 5000, eventDate: '2026-03-01T00:00:00Z' }),
      makeResult({ eventId: 'c', totalScore: 300, rank: 1, rewardAmount: 10000, eventDate: '2026-04-05T00:00:00Z' }),
    ];

    it('sorts by date desc (newest first)', () => {
      const out = sortResults(results, 'date');
      expect(out.map((r) => r.eventId)).toEqual(['c', 'a', 'b']);
    });

    it('sorts by score desc (highest first)', () => {
      const out = sortResults(results, 'score');
      expect(out.map((r) => r.eventId)).toEqual(['b', 'a', 'c']);
    });

    it('sorts by rank asc (best rank first), unranked treated as 9999', () => {
      const withUnranked = [...results, makeResult({ eventId: 'u', rank: 0 })];
      const out = sortResults(withUnranked, 'rank');
      expect(out.map((r) => r.eventId)).toEqual(['c', 'b', 'a', 'u']);
    });

    it('sorts by reward desc (highest first)', () => {
      const out = sortResults(results, 'reward');
      expect(out.map((r) => r.eventId)).toEqual(['c', 'b', 'a']);
    });

    it('returns a new array (does not mutate input)', () => {
      const original = [...results];
      sortResults(results, 'score');
      expect(results).toEqual(original);
    });
  });

  describe('detectLineupFormat', () => {
    it('detects 7er for 7 filled slots', () => {
      expect(detectLineupFormat(7)).toBe('7er');
    });

    it('detects 11er for 11 filled slots', () => {
      expect(detectLineupFormat(11)).toBe('11er');
    });

    it('detects 7er for incomplete 7er (6 filled)', () => {
      expect(detectLineupFormat(6)).toBe('7er');
    });

    it('detects 11er for any count > 7', () => {
      expect(detectLineupFormat(8)).toBe('11er');
      expect(detectLineupFormat(9)).toBe('11er');
      expect(detectLineupFormat(10)).toBe('11er');
    });

    it('detects 7er for 0 filled slots (degenerate empty case)', () => {
      expect(detectLineupFormat(0)).toBe('7er');
    });
  });
});
