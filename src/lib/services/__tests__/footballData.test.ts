import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/footballApi', () => ({
  apiFetch: vi.fn(),
  getLeagueId: () => 203,
  getCurrentSeason: () => 2024,
  isApiConfigured: () => true,
  mapPosition: (p: string) => p,
  calcFantasyPoints: () => 50,
  scaleFormulaToRating: (p: number) => p,
  normalizeForMatch: (s: string) => s.toLowerCase(),
}));

import { getMappingStatus, hasApiFixtures } from '../footballData';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// getMappingStatus
// ============================================
describe('getMappingStatus', () => {
  it('returns mapping counts from parallel queries', async () => {
    mockTable('clubs', [{ id: 'c1' }, { id: 'c2' }]);
    mockTable('club_external_ids', [{ club_id: 'c1' }]);
    mockTable('players', null, null, 3); // count-only query (head:true)
    mockTable('player_external_ids', [{ player_id: 'p1' }, { player_id: 'p2' }]);
    mockTable('fixtures', [
      { id: 'f1', api_fixture_id: 12345 },
      { id: 'f2', api_fixture_id: null },
      { id: 'f3', api_fixture_id: 67890 },
    ]);

    const result = await getMappingStatus();
    expect(result.clubsTotal).toBe(2);
    expect(result.clubsMapped).toBe(1);
    expect(result.playersTotal).toBe(3);
    expect(result.playersMapped).toBe(2);
    expect(result.fixturesTotal).toBe(3);
    expect(result.fixturesMapped).toBe(2); // 2 with api_fixture_id
  });

  it('handles all queries failing', async () => {
    mockTable('clubs', null, { message: 'err' });
    mockTable('club_external_ids', null, { message: 'err' });
    mockTable('players', null, { message: 'err' });
    mockTable('player_external_ids', null, { message: 'err' });
    mockTable('fixtures', null, { message: 'err' });

    const result = await getMappingStatus();
    expect(result).toEqual({
      clubsTotal: 0, clubsMapped: 0,
      playersTotal: 0, playersMapped: 0,
      fixturesTotal: 0, fixturesMapped: 0,
    });
  });

  it('handles empty data', async () => {
    mockTable('clubs', []);
    mockTable('club_external_ids', []);
    mockTable('players', []);
    mockTable('player_external_ids', []);
    mockTable('fixtures', []);

    const result = await getMappingStatus();
    expect(result.clubsTotal).toBe(0);
    expect(result.fixturesMapped).toBe(0);
  });
});

// ============================================
// hasApiFixtures
// ============================================
describe('hasApiFixtures', () => {
  it('returns true when mapped fixtures exist', async () => {
    mockTable('fixtures', null, null, 5);
    expect(await hasApiFixtures(10)).toBe(true);
  });

  it('returns false when no mapped fixtures', async () => {
    mockTable('fixtures', null, null, 0);
    expect(await hasApiFixtures(10)).toBe(false);
  });

  it('returns false on error', async () => {
    mockTable('fixtures', null, { message: 'err' });
    expect(await hasApiFixtures(10)).toBe(false);
  });

  it('returns false when count is null', async () => {
    mockTable('fixtures', null, null, null);
    expect(await hasApiFixtures(10)).toBe(false);
  });
});
