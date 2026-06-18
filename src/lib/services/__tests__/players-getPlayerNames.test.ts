import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';
import { getPlayerNames } from '../players';

// Slice 339: getPlayerNames muss ALLE Spieler (>1000) via Range-Loop lesen,
// nicht still bei PostgREST-1000-Cap abschneiden.

beforeEach(() => resetMocks());

const page = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${offset + i}`,
    first_name: 'First',
    last_name: `Last${offset + i}`,
    position: 'MID',
  }));

describe('getPlayerNames — PostgREST-Cap-Härtung (Slice 339)', () => {
  it('AC-01: paginiert über >1000 Spieler (1000 + 500 = 1500)', async () => {
    mockTable('players', page(1000));      // Seite 1 (voll → Loop weiter)
    mockTable('players', page(500, 1000)); // Seite 2 (<1000 → Loop bricht)
    const result = await getPlayerNames();
    expect(result).toHaveLength(1500);
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(result[0]).toEqual({ id: 'p0', name: 'First Last0', pos: 'MID' });
    expect(result[1499].id).toBe('p1499');
  });

  it('AC-02: < 1000 Spieler → genau 1 Seite (kein zweiter Call)', async () => {
    mockTable('players', page(300));
    const result = await getPlayerNames();
    expect(result).toHaveLength(300);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it('AC-02b: 0 Spieler → leeres Array, kein Crash', async () => {
    mockTable('players', []);
    const result = await getPlayerNames();
    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it('AC-03: Fehler auf einer Seite → throw (kein silent leeres Array)', async () => {
    mockTable('players', null, { message: 'db boom' });
    await expect(getPlayerNames()).rejects.toThrow('db boom');
  });
});
