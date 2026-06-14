import { describe, it, expect } from 'vitest';
import { computeGwStatus, isFixtureDone } from '../gwStatus';

// Minimal event shape (computeGwStatus only reads status + scoredAt).
const ev = (status: string, scoredAt: string | null = null) =>
  ({ status, scoredAt }) as { status: string; scoredAt: string | null };

describe('isFixtureDone (Slice 311)', () => {
  it('treats simulated/finished/cancelled as done', () => {
    expect(isFixtureDone('simulated')).toBe(true);
    expect(isFixtureDone('finished')).toBe(true);
    expect(isFixtureDone('cancelled')).toBe(true);
  });
  it('treats scheduled/live as not done', () => {
    expect(isFixtureDone('scheduled')).toBe(false);
    expect(isFixtureDone('live')).toBe(false);
    expect(isFixtureDone('')).toBe(false);
  });
});

describe('computeGwStatus (Slice 311 Fantasy-#5 single-source)', () => {
  it('AC-2c: all fixtures complete → simulated (regardless of events)', () => {
    expect(computeGwStatus({ fixturesComplete: true, fixtureCount: 9, events: [] })).toBe('simulated');
    expect(computeGwStatus({ fixturesComplete: true, fixtureCount: 9, events: [ev('current')] })).toBe('simulated');
  });

  it('AC-2b: events all ended/scored → simulated even if 0 fixtures complete', () => {
    expect(computeGwStatus({ fixturesComplete: false, fixtureCount: 9, events: [ev('ended'), ev('ended')] })).toBe('simulated');
    expect(computeGwStatus({ fixturesComplete: false, fixtureCount: 0, events: [ev('current', '2026-06-14')] })).toBe('simulated');
  });

  it('AC-2a: fixtures exist + no events + not complete → open (NOT empty — reconciliation vs old useGameweek)', () => {
    expect(computeGwStatus({ fixturesComplete: false, fixtureCount: 9, events: [] })).toBe('open');
  });

  it('AC-2d: nothing scheduled (no fixtures, no events) → empty', () => {
    expect(computeGwStatus({ fixturesComplete: false, fixtureCount: 0, events: [] })).toBe('empty');
  });

  it('partial events (some not ended) + not complete → open', () => {
    expect(computeGwStatus({ fixturesComplete: false, fixtureCount: 9, events: [ev('ended'), ev('current')] })).toBe('open');
  });

  it('0 fixtures + open events → open', () => {
    expect(computeGwStatus({ fixturesComplete: false, fixtureCount: 0, events: [ev('upcoming')] })).toBe('open');
  });

  it('scoredAt counts as ended even when status is not "ended"', () => {
    expect(computeGwStatus({ fixturesComplete: false, fixtureCount: 5, events: [ev('current', '2026-06-14T12:00:00Z')] })).toBe('simulated');
  });
});
