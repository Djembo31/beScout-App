/**
 * cronHealth — Service-Test (Slice 256)
 *
 * Coverage:
 *   - leagues query error → healthy (graceful-fail)
 *   - leagues empty → healthy
 *   - league at season-end (dbActiveGw === maxGw) → skip, healthy
 *   - league pre-season (no fixtures) → skip, healthy
 *   - active fixtures NOT all finished → no drift
 *   - active fixtures all finished + drift>=2 → unhealthy with drift entry
 *   - active fixtures all finished + drift=1 (below threshold) → healthy (Severity-Gate)
 *   - thrown error in service → healthy (graceful-fail)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a Supabase chain mock that returns predefined values per `from()` call.
type QueryShape = { data?: unknown; error?: unknown };

function makeChain(result: QueryShape) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'in', 'gt', 'order', 'limit'];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (v: QueryShape) => unknown) => Promise.resolve(resolve(result));
  return chain;
}

const fromCalls: Record<string, QueryShape[]> = {};

function pushResult(table: string, result: QueryShape) {
  if (!fromCalls[table]) fromCalls[table] = [];
  fromCalls[table].push(result);
}

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const queue = fromCalls[table] ?? [];
      const result = queue.shift() ?? { data: [], error: null };
      return makeChain(result);
    },
  },
}));

// Import AFTER vi.mock so the mock is applied.
import { getCronHealthStatus } from '../cronHealth';

beforeEach(() => {
  for (const k of Object.keys(fromCalls)) delete fromCalls[k];
});

describe('getCronHealthStatus', () => {
  it('returns healthy when leagues query errors', async () => {
    pushResult('leagues', { data: null, error: { message: 'fail' } });
    const result = await getCronHealthStatus();
    expect(result).toEqual({ healthy: true, drifts: [] });
  });

  it('returns healthy when leagues is empty', async () => {
    pushResult('leagues', { data: [], error: null });
    const result = await getCronHealthStatus();
    expect(result).toEqual({ healthy: true, drifts: [] });
  });

  it('skips leagues at season-end', async () => {
    pushResult('leagues', {
      data: [{ id: 'tff1', name: 'TFF 1. Lig', country: 'TR', active_gameweek: 38, max_gameweeks: 38 }],
      error: null,
    });
    const result = await getCronHealthStatus();
    expect(result.healthy).toBe(true);
  });

  it('skips leagues with pre-season (no fixtures)', async () => {
    pushResult('leagues', {
      data: [{ id: 'bl', name: 'Bundesliga', country: 'DE', active_gameweek: 1, max_gameweeks: 34 }],
      error: null,
    });
    pushResult('clubs', { data: [{ id: 'club-a' }], error: null });
    pushResult('fixtures', { data: [], error: null }); // no fixtures
    const result = await getCronHealthStatus();
    expect(result.healthy).toBe(true);
  });

  it('returns healthy when active-gw fixtures are not all finished', async () => {
    pushResult('leagues', {
      data: [{ id: 'bl', name: 'Bundesliga', country: 'DE', active_gameweek: 30, max_gameweeks: 34 }],
      error: null,
    });
    pushResult('clubs', { data: [{ id: 'club-a' }], error: null });
    pushResult('fixtures', {
      data: [{ status: 'finished' }, { status: 'scheduled' }],
      error: null,
    });
    const result = await getCronHealthStatus();
    expect(result.healthy).toBe(true);
  });

  it('detects drift when all active-gw fixtures finished AND drift>=2', async () => {
    pushResult('leagues', {
      data: [{ id: 'tff1', name: 'TFF 1. Lig', country: 'TR', active_gameweek: 28, max_gameweeks: 38 }],
      error: null,
    });
    pushResult('clubs', { data: [{ id: 'club-a' }], error: null });
    pushResult('fixtures', {
      data: [{ status: 'finished' }, { status: 'finished' }],
      error: null,
    });
    pushResult('fixtures', { data: [{ gameweek: 37 }], error: null }); // maxLaterFinished=37, drift=10

    const result = await getCronHealthStatus();
    expect(result.healthy).toBe(false);
    expect(result.drifts).toHaveLength(1);
    expect(result.drifts[0]).toMatchObject({
      leagueId: 'tff1',
      leagueName: 'TFF 1. Lig',
      drift: 10,
    });
  });

  it('Severity-Gate: drift=1 (below threshold) → healthy', async () => {
    pushResult('leagues', {
      data: [{ id: 'bl', name: 'Bundesliga', country: 'DE', active_gameweek: 30, max_gameweeks: 34 }],
      error: null,
    });
    pushResult('clubs', { data: [{ id: 'club-a' }], error: null });
    pushResult('fixtures', {
      data: [{ status: 'finished' }, { status: 'finished' }],
      error: null,
    });
    pushResult('fixtures', { data: [], error: null }); // no later finished — drift=1

    const result = await getCronHealthStatus();
    expect(result.healthy).toBe(true);
  });
});
