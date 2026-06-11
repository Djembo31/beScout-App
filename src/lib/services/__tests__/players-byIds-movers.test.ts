/**
 * Slice 282 (Review F-07) — Service-Tests für die neuen Home-Mini-Fetches.
 * getPlayersByIds: Chunk-Boundary + error-throw. getGlobalMovers: fetch-Pfad
 * (!res.ok-throw, non-array-Fallback).
 */
import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import { mockTable, resetMocks } from '@/test/mocks/supabase';
import { supabase } from '@/lib/supabaseClient';

// ACHTUNG: KEIN vi.spyOn(supabase, 'from') + mockRestore() — supabase.from ist
// bereits eine vi.fn aus dem Mock; mockRestore() würde deren Implementation
// löschen und alle Folge-Queries auf undefined laufen lassen. Call-Counts
// stattdessen direkt über die Mock-Property lesen.
const fromMock = supabase.from as unknown as Mock;
import { getPlayersByIds, getGlobalMovers } from '../players';

beforeEach(() => resetMocks());

// ============================================
// getPlayersByIds
// ============================================

describe('getPlayersByIds', () => {
  it('returns [] without any query for empty ids', async () => {
    const before = fromMock.mock.calls.length;
    const result = await getPlayersByIds([]);
    expect(result).toEqual([]);
    expect(fromMock.mock.calls.length).toBe(before);
  });

  it('returns rows for a single chunk', async () => {
    mockTable('players', [{ id: 'p-1' }, { id: 'p-2' }]);
    const result = await getPlayersByIds(['p-1', 'p-2']);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('p-1');
  });

  it('chunks at 100 ids — 101 ids produce 2 queries (common-errors §1)', async () => {
    const before = fromMock.mock.calls.length;
    mockTable('players', [{ id: 'chunk-1-row' }]);
    mockTable('players', [{ id: 'chunk-2-row' }]);
    const ids = Array.from({ length: 101 }, (_, i) => `p-${i}`);
    const result = await getPlayersByIds(ids);
    expect(fromMock.mock.calls.length - before).toBe(2);
    expect(result.map((p) => p.id)).toEqual(['chunk-1-row', 'chunk-2-row']);
  });

  it('throws on supabase error (kein silent-fail)', async () => {
    mockTable('players', null, { message: 'boom' });
    await expect(getPlayersByIds(['p-1'])).rejects.toThrow('boom');
  });
});

// ============================================
// getGlobalMovers
// ============================================

describe('getGlobalMovers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches movers endpoint with limit and returns array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 'p-1' }]),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await getGlobalMovers(5);
    expect(fetchMock).toHaveBeenCalledWith('/api/players?movers=true&limit=5');
    expect(result).toHaveLength(1);
  });

  it('throws on !res.ok (kein silent-fail)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(getGlobalMovers(5)).rejects.toThrow('Failed to fetch global movers');
  });

  it('returns [] for non-array response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: 'weird' }),
    }));
    const result = await getGlobalMovers(5);
    expect(result).toEqual([]);
  });
});
