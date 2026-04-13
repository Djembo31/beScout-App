import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockTable, mockRpc, resetMocks, mockSupabase } from '@/test/mocks/supabase';

import {
  getFixturesByGameweek,
  getFixturesByClub,
  getFixturePlayerStats,
  getGameweekStatuses,
  getGameweekTopScorers,
  getGameweekStatsForPlayers,
  getFixtureSubstitutions,
  getFixtureDeadlinesByGameweek,
  getRecentPlayerScores,
  getFloorPricesForPlayers,
  simulateGameweek,
  syncFixtureScores,
} from '../fixtures';

// ============================================
// Helpers
// ============================================

function makeFixtureRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fix-1',
    gameweek: 10,
    home_club_id: 'club-home',
    away_club_id: 'club-away',
    home_score: 2,
    away_score: 1,
    status: 'finished',
    played_at: '2026-04-10T18:00:00Z',
    home_formation: '4-3-3',
    away_formation: '4-4-2',
    created_at: '2026-04-01T00:00:00Z',
    home_club: { name: 'Sakaryaspor', short: 'SAK', primary_color: '#00a651' },
    away_club: { name: 'Eyupspor', short: 'EYU', primary_color: '#ffd700' },
    ...overrides,
  };
}

function makeStatRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stat-1',
    fixture_id: 'fix-1',
    player_id: 'p-1',
    club_id: 'club-1',
    minutes_played: 90,
    goals: 1,
    assists: 0,
    clean_sheet: false,
    goals_conceded: 2,
    yellow_card: false,
    red_card: false,
    saves: 0,
    bonus: 3,
    fantasy_points: 8,
    rating: 7.5,
    match_position: 'ATT',
    is_starter: true,
    grid_position: '1:1',
    api_football_player_id: 12345,
    player_name_api: 'Test Player',
    player: { first_name: 'Test', last_name: 'Player', position: 'ATT', image_url: 'https://img.test/1.jpg' },
    club: { short: 'SAK' },
    ...overrides,
  };
}

// ============================================
// getFixturesByGameweek
// ============================================

describe('getFixturesByGameweek', () => {
  beforeEach(() => resetMocks());

  it('should return mapped fixtures with club names for a gameweek', async () => {
    mockTable('fixtures', [makeFixtureRow()]);

    const result = await getFixturesByGameweek(10);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fix-1');
    expect(result[0].home_club_name).toBe('Sakaryaspor');
    expect(result[0].home_club_short).toBe('SAK');
    expect(result[0].away_club_name).toBe('Eyupspor');
    expect(result[0].away_club_short).toBe('EYU');
    expect(result[0].home_club_primary_color).toBe('#00a651');
    expect(result[0].away_club_primary_color).toBe('#ffd700');
    expect(mockSupabase.from).toHaveBeenCalledWith('fixtures');
  });

  it('should return empty array when no fixtures exist for gameweek', async () => {
    mockTable('fixtures', []);

    const result = await getFixturesByGameweek(99);

    expect(result).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    mockTable('fixtures', null);

    const result = await getFixturesByGameweek(10);

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('fixtures', null, { message: 'connection timeout' });

    await expect(getFixturesByGameweek(10)).rejects.toThrow('connection timeout');
  });

  it('should handle null club joins gracefully', async () => {
    mockTable('fixtures', [makeFixtureRow({ home_club: null, away_club: null })]);

    const result = await getFixturesByGameweek(10);

    expect(result).toHaveLength(1);
    expect(result[0].home_club_name).toBe('');
    expect(result[0].away_club_short).toBe('');
    expect(result[0].home_club_primary_color).toBeNull();
  });

  it('should preserve null scores for scheduled fixtures', async () => {
    mockTable('fixtures', [makeFixtureRow({ home_score: null, away_score: null, status: 'scheduled' })]);

    const result = await getFixturesByGameweek(10);

    expect(result[0].home_score).toBeNull();
    expect(result[0].away_score).toBeNull();
    expect(result[0].status).toBe('scheduled');
  });
});

// ============================================
// getFixturesByClub
// ============================================

describe('getFixturesByClub', () => {
  beforeEach(() => resetMocks());

  it('should return fixtures for a specific club', async () => {
    mockTable('fixtures', [makeFixtureRow()]);

    const result = await getFixturesByClub('club-home');

    expect(result).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('fixtures');
  });

  it('should return empty array when club has no fixtures', async () => {
    mockTable('fixtures', []);

    const result = await getFixturesByClub('club-nobody');

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('fixtures', null, { message: 'query failed' });

    await expect(getFixturesByClub('club-home')).rejects.toThrow('query failed');
  });
});

// ============================================
// getFixturePlayerStats
// ============================================

describe('getFixturePlayerStats', () => {
  beforeEach(() => resetMocks());

  it('should return player stats with player names and club short', async () => {
    mockTable('fixture_player_stats', [makeStatRow()]);

    const result = await getFixturePlayerStats('fix-1');

    expect(result).toHaveLength(1);
    expect(result[0].player_first_name).toBe('Test');
    expect(result[0].player_last_name).toBe('Player');
    expect(result[0].club_short).toBe('SAK');
    expect(result[0].fantasy_points).toBe(8);
    expect(mockSupabase.from).toHaveBeenCalledWith('fixture_player_stats');
  });

  it('should return empty array when no stats exist for fixture', async () => {
    mockTable('fixture_player_stats', []);

    const result = await getFixturePlayerStats('fix-empty');

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('fixture_player_stats', null, { message: 'table not found' });

    await expect(getFixturePlayerStats('fix-1')).rejects.toThrow('table not found');
  });

  it('should handle null player join (nullable FK) — falls back to API name', async () => {
    mockTable('fixture_player_stats', [makeStatRow({ player: null, player_id: null })]);

    const result = await getFixturePlayerStats('fix-1');

    expect(result).toHaveLength(1);
    // When player join is null, mapStatRow falls back to parseApiName(player_name_api)
    // Our mock row has player_name_api: 'Test Player' -> first='Test', last='Player'
    expect(result[0].player_first_name).toBe('Test');
    expect(result[0].player_last_name).toBe('Player');
  });

  it('should handle null player join AND null api name', async () => {
    mockTable('fixture_player_stats', [makeStatRow({ player: null, player_id: null, player_name_api: null })]);

    const result = await getFixturePlayerStats('fix-1');

    expect(result).toHaveLength(1);
    // No player join AND no API name -> empty fallback
    expect(result[0].player_first_name).toBe('');
    expect(result[0].player_last_name).toBe('');
  });
});

// ============================================
// getGameweekStatuses
// ============================================

describe('getGameweekStatuses', () => {
  beforeEach(() => resetMocks());

  it('should aggregate fixture statuses by gameweek', async () => {
    mockTable('fixtures', [
      { gameweek: 10, status: 'simulated' },
      { gameweek: 10, status: 'finished' },
      { gameweek: 10, status: 'scheduled' },
      { gameweek: 11, status: 'scheduled' },
    ]);

    const result = await getGameweekStatuses(10, 11);

    expect(result).toHaveLength(2);
    const gw10 = result.find(r => r.gameweek === 10)!;
    expect(gw10.total).toBe(3);
    expect(gw10.simulated).toBe(2); // simulated + finished both count
    expect(gw10.is_complete).toBe(false);

    const gw11 = result.find(r => r.gameweek === 11)!;
    expect(gw11.total).toBe(1);
    expect(gw11.simulated).toBe(0);
  });

  it('should return is_complete true when all fixtures are scored', async () => {
    mockTable('fixtures', [
      { gameweek: 10, status: 'finished' },
      { gameweek: 10, status: 'simulated' },
    ]);

    const result = await getGameweekStatuses(10, 10);

    expect(result[0].is_complete).toBe(true);
  });

  it('should return empty array when no fixtures in range', async () => {
    mockTable('fixtures', []);

    const result = await getGameweekStatuses(50, 55);

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('fixtures', null, { message: 'query error' });

    await expect(getGameweekStatuses(1, 5)).rejects.toThrow('query error');
  });

  it('should return gameweeks sorted by gameweek number', async () => {
    mockTable('fixtures', [
      { gameweek: 12, status: 'scheduled' },
      { gameweek: 10, status: 'finished' },
      { gameweek: 11, status: 'simulated' },
    ]);

    const result = await getGameweekStatuses(10, 12);

    expect(result.map(r => r.gameweek)).toEqual([10, 11, 12]);
  });
});

// ============================================
// getGameweekTopScorers
// ============================================

describe('getGameweekTopScorers', () => {
  beforeEach(() => resetMocks());

  it('should return top scorers when fixtures exist', async () => {
    // First call: fixtures for GW
    mockTable('fixtures', [{ id: 'fix-1' }]);
    // Second call: fixture_player_stats (but mock resolves via table-aware matching)
    mockTable('fixture_player_stats', [makeStatRow()]);

    const result = await getGameweekTopScorers(10, 5);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no fixtures for gameweek', async () => {
    mockTable('fixtures', []);

    const result = await getGameweekTopScorers(99);

    expect(result).toEqual([]);
  });

  it('should return empty array when fixtures have null data', async () => {
    mockTable('fixtures', null);

    const result = await getGameweekTopScorers(10);

    expect(result).toEqual([]);
  });
});

// ============================================
// getGameweekStatsForPlayers
// ============================================

describe('getGameweekStatsForPlayers', () => {
  beforeEach(() => resetMocks());

  it('should return empty array for empty playerIds without querying', async () => {
    const result = await getGameweekStatsForPlayers(10, []);

    expect(result).toEqual([]);
    // Should not even call supabase.from when playerIds is empty
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should return stats for specific players', async () => {
    mockTable('fixtures', [{ id: 'fix-1' }]);
    mockTable('fixture_player_stats', [makeStatRow({ player_id: 'p-1' })]);

    const result = await getGameweekStatsForPlayers(10, ['p-1']);

    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================
// getFixtureDeadlinesByGameweek
// ============================================

describe('getFixtureDeadlinesByGameweek', () => {
  beforeEach(() => resetMocks());

  it('should return deadline map keyed by club ID', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    mockTable('fixtures', [makeFixtureRow({ played_at: futureDate, status: 'scheduled' })]);

    const result = await getFixtureDeadlinesByGameweek(10);

    expect(result).toBeInstanceOf(Map);
    // Should have entries for both home and away club
    expect(result.has('club-home')).toBe(true);
    expect(result.has('club-away')).toBe(true);

    const homeDeadline = result.get('club-home')!;
    expect(homeDeadline.isHome).toBe(true);
    expect(homeDeadline.opponentShort).toBe('EYU');
    expect(homeDeadline.isLocked).toBe(false); // future date

    const awayDeadline = result.get('club-away')!;
    expect(awayDeadline.isHome).toBe(false);
    expect(awayDeadline.opponentShort).toBe('SAK');
  });

  it('should mark fixture as locked when played_at is in the past and status is not scheduled', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    mockTable('fixtures', [makeFixtureRow({ played_at: pastDate, status: 'finished' })]);

    const result = await getFixtureDeadlinesByGameweek(10);

    expect(result.get('club-home')!.isLocked).toBe(true);
    expect(result.get('club-away')!.isLocked).toBe(true);
  });

  it('should NOT lock fixture when played_at is past but status is scheduled', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockTable('fixtures', [makeFixtureRow({ played_at: pastDate, status: 'scheduled' })]);

    const result = await getFixtureDeadlinesByGameweek(10);

    // status === 'scheduled' => isLocked false (postponed/not yet started)
    expect(result.get('club-home')!.isLocked).toBe(false);
  });

  it('should return empty map when no fixtures', async () => {
    mockTable('fixtures', []);

    const result = await getFixtureDeadlinesByGameweek(99);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should handle null played_at (not locked)', async () => {
    mockTable('fixtures', [makeFixtureRow({ played_at: null, status: 'scheduled' })]);

    const result = await getFixtureDeadlinesByGameweek(10);

    expect(result.get('club-home')!.isLocked).toBe(false);
    expect(result.get('club-home')!.playedAt).toBeNull();
  });
});

// ============================================
// getRecentPlayerScores
// ============================================

describe('getRecentPlayerScores', () => {
  beforeEach(() => resetMocks());

  it('should return empty map when no scores exist', async () => {
    // maybeSingle returns null for latest GW
    mockTable('player_gameweek_scores', null);

    const result = await getRecentPlayerScores();

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });
});

// ============================================
// getFloorPricesForPlayers
// ============================================

describe('getFloorPricesForPlayers', () => {
  beforeEach(() => resetMocks());

  it('should return floor prices as a Map', async () => {
    mockTable('players', [
      { id: 'p-1', floor_price: 150000 },
      { id: 'p-2', floor_price: 200000 },
    ]);

    const result = await getFloorPricesForPlayers(['p-1', 'p-2']);

    expect(result).toBeInstanceOf(Map);
    expect(result.get('p-1')).toBe(150000);
    expect(result.get('p-2')).toBe(200000);
    expect(result.size).toBe(2);
  });

  it('should return empty Map for empty playerIds without querying', async () => {
    const result = await getFloorPricesForPlayers([]);

    expect(result.size).toBe(0);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should return empty Map when no players have floor prices', async () => {
    mockTable('players', []);

    const result = await getFloorPricesForPlayers(['p-1']);

    expect(result.size).toBe(0);
  });

  it('should handle null data gracefully', async () => {
    mockTable('players', null);

    const result = await getFloorPricesForPlayers(['p-1']);

    expect(result.size).toBe(0);
  });
});

// ============================================
// simulateGameweek
// ============================================

describe('simulateGameweek', () => {
  beforeEach(() => resetMocks());

  it('should return SimulateResult on success', async () => {
    mockRpc('simulate_gameweek', { success: true, gameweek: 10, fixtures_simulated: 5, player_stats_created: 50 });

    const result = await simulateGameweek(10);

    expect(result.success).toBe(true);
    expect(result.fixtures_simulated).toBe(5);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('simulate_gameweek', { p_gameweek: 10 });
  });

  it('should return error result on DB error', async () => {
    mockRpc('simulate_gameweek', null, { message: 'RPC execution failed' });

    const result = await simulateGameweek(10);

    expect(result.success).toBe(false);
    expect(result.error).toBe('RPC execution failed');
  });
});

// ============================================
// syncFixtureScores
// ============================================

describe('syncFixtureScores', () => {
  beforeEach(() => resetMocks());

  it('should return sync result on success', async () => {
    mockRpc('sync_fixture_scores', { success: true, synced_count: 42 });

    const result = await syncFixtureScores(10);

    expect(result.success).toBe(true);
    expect(result.synced_count).toBe(42);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('sync_fixture_scores', { p_gameweek: 10 });
  });

  it('should return error result on DB error', async () => {
    mockRpc('sync_fixture_scores', null, { message: 'sync failed' });

    const result = await syncFixtureScores(10);

    expect(result.success).toBe(false);
    expect(result.synced_count).toBe(0);
    expect(result.error).toBe('sync failed');
  });
});
