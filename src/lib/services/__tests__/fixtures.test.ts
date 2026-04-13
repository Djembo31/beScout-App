import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  getFixturesByGameweek, getFixturesByClub, getFixturePlayerStats,
  getGameweekStatuses, getGameweekTopScorers, getGameweekStatsForPlayers,
  getFixtureSubstitutions, getFloorPricesForPlayers,
  simulateGameweek, syncFixtureScores, getNextFixturesByClub,
} from '../fixtures';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// getFixturesByGameweek
// ============================================
describe('getFixturesByGameweek', () => {
  it('returns mapped fixtures with club names', async () => {
    mockTable('fixtures', [{
      id: 'f1', gameweek: 10, home_club_id: 'c1', away_club_id: 'c2',
      home_score: 2, away_score: 1, status: 'finished',
      played_at: '2025-03-08T18:00:00Z', home_formation: '4-4-2', away_formation: '4-3-3',
      created_at: '2025-03-01',
      home_club: { name: 'Home FC', short: 'HFC', primary_color: '#FF0000' },
      away_club: { name: 'Away FC', short: 'AFC', primary_color: '#0000FF' },
    }]);
    const result = await getFixturesByGameweek(10);
    expect(result).toHaveLength(1);
    expect(result[0].home_club_name).toBe('Home FC');
    expect(result[0].away_club_short).toBe('AFC');
    expect(result[0].home_formation).toBe('4-4-2');
  });

  it('handles null club data', async () => {
    mockTable('fixtures', [{
      id: 'f1', gameweek: 10, home_club_id: 'c1', away_club_id: 'c2',
      home_score: null, away_score: null, status: 'scheduled',
      played_at: null, home_formation: null, away_formation: null, created_at: '2025-03-01',
      home_club: null, away_club: null,
    }]);
    const result = await getFixturesByGameweek(10);
    expect(result[0].home_club_name).toBe('');
    expect(result[0].home_club_primary_color).toBeNull();
  });

  it('throws on DB error', async () => {
    mockTable('fixtures', null, { message: 'err' });
    await expect(getFixturesByGameweek(10)).rejects.toThrow('err');
  });
});

// ============================================
// getFixturesByClub
// ============================================
describe('getFixturesByClub', () => {
  it('returns fixtures for club', async () => {
    mockTable('fixtures', [{
      id: 'f1', gameweek: 5, home_club_id: 'c1', away_club_id: 'c2',
      home_score: null, away_score: null, status: 'scheduled',
      played_at: null, home_formation: null, away_formation: null, created_at: '2025-01-01',
      home_club: { name: 'A', short: 'A', primary_color: null },
      away_club: { name: 'B', short: 'B', primary_color: null },
    }]);
    expect(await getFixturesByClub('c1')).toHaveLength(1);
  });
  it('throws on DB error', async () => {
    mockTable('fixtures', null, { message: 'err' });
    await expect(getFixturesByClub('c1')).rejects.toThrow('err');
  });
});

// ============================================
// getFixturePlayerStats
// ============================================
describe('getFixturePlayerStats', () => {
  it('returns mapped player stats', async () => {
    mockTable('fixture_player_stats', [{
      id: 's1', fixture_id: 'f1', player_id: 'p1', club_id: 'c1',
      minutes_played: 90, goals: 1, assists: 0, clean_sheet: false,
      goals_conceded: 2, yellow_card: false, red_card: false,
      saves: 0, bonus: 0, fantasy_points: 72, rating: 7.2,
      match_position: 'MID', is_starter: true, grid_position: '3:1',
      api_football_player_id: null, player_name_api: null,
      player: { first_name: 'John', last_name: 'Doe', position: 'MID', image_url: '/john.png' },
      club: { short: 'HFC' },
    }]);
    const result = await getFixturePlayerStats('f1');
    expect(result).toHaveLength(1);
    expect(result[0].player_first_name).toBe('John');
    expect(result[0].club_short).toBe('HFC');
  });

  it('falls back to API name when player is null', async () => {
    mockTable('fixture_player_stats', [{
      id: 's1', fixture_id: 'f1', player_id: null, club_id: 'c1',
      minutes_played: 45, goals: 0, assists: 0, clean_sheet: false,
      goals_conceded: 0, yellow_card: false, red_card: false,
      saves: 0, bonus: 0, fantasy_points: 50, rating: null,
      match_position: 'DEF', is_starter: null, grid_position: null,
      api_football_player_id: 12345, player_name_api: 'Mehmet Yilmaz',
      player: null, club: null,
    }]);
    const result = await getFixturePlayerStats('f1');
    expect(result[0].player_first_name).toBe('Mehmet');
    expect(result[0].player_last_name).toBe('Yilmaz');
  });

  it('throws on DB error', async () => {
    mockTable('fixture_player_stats', null, { message: 'err' });
    await expect(getFixturePlayerStats('f1')).rejects.toThrow('err');
  });
});

// ============================================
// getGameweekStatuses
// ============================================
describe('getGameweekStatuses', () => {
  it('aggregates fixture statuses per gameweek', async () => {
    mockTable('fixtures', [
      { gameweek: 10, status: 'finished' },
      { gameweek: 10, status: 'finished' },
      { gameweek: 10, status: 'scheduled' },
      { gameweek: 11, status: 'simulated' },
    ]);
    const result = await getGameweekStatuses(10, 11);
    expect(result).toHaveLength(2);
    const gw10 = result.find(s => s.gameweek === 10)!;
    expect(gw10.total).toBe(3);
    expect(gw10.simulated).toBe(2); // 2 finished
    expect(gw10.is_complete).toBe(false);
    const gw11 = result.find(s => s.gameweek === 11)!;
    expect(gw11.is_complete).toBe(true);
  });

  it('throws on DB error', async () => {
    mockTable('fixtures', null, { message: 'err' });
    await expect(getGameweekStatuses(1, 10)).rejects.toThrow('err');
  });
});

// ============================================
// getGameweekTopScorers
// ============================================
describe('getGameweekTopScorers', () => {
  it('returns top scorers for completed fixtures', async () => {
    mockTable('fixtures', [{ id: 'f1' }]);
    mockTable('fixture_player_stats', [{
      id: 's1', fixture_id: 'f1', player_id: 'p1', club_id: 'c1',
      minutes_played: 90, goals: 2, assists: 1, clean_sheet: false,
      goals_conceded: 0, yellow_card: false, red_card: false,
      saves: 0, bonus: 5, fantasy_points: 95, rating: 9.0,
      match_position: 'ATT', is_starter: true, grid_position: null,
      api_football_player_id: null, player_name_api: null,
      player: { first_name: 'Star', last_name: 'Player', position: 'ATT', image_url: null },
      club: { short: 'FC' },
    }]);
    const result = await getGameweekTopScorers(10, 5);
    expect(result).toHaveLength(1);
    expect(result[0].player_first_name).toBe('Star');
  });

  it('returns [] when no fixtures', async () => {
    mockTable('fixtures', []);
    expect(await getGameweekTopScorers(10)).toEqual([]);
  });
});

// ============================================
// getGameweekStatsForPlayers
// ============================================
describe('getGameweekStatsForPlayers', () => {
  it('returns [] for empty playerIds', async () => {
    expect(await getGameweekStatsForPlayers(10, [])).toEqual([]);
  });

  it('returns stats for specified players', async () => {
    mockTable('fixtures', [{ id: 'f1' }]);
    mockTable('fixture_player_stats', [{
      id: 's1', fixture_id: 'f1', player_id: 'p1', club_id: 'c1',
      minutes_played: 90, goals: 0, assists: 0, clean_sheet: true,
      goals_conceded: 0, yellow_card: false, red_card: false,
      saves: 0, bonus: 0, fantasy_points: 65, rating: 6.8,
      match_position: 'DEF', is_starter: true, grid_position: null,
      api_football_player_id: null, player_name_api: null,
      player: { first_name: 'A', last_name: 'B', position: 'DEF', image_url: null },
      club: { short: 'FC' },
    }]);
    expect(await getGameweekStatsForPlayers(10, ['p1'])).toHaveLength(1);
  });
});

// ============================================
// getFixtureSubstitutions
// ============================================
describe('getFixtureSubstitutions', () => {
  it('returns mapped substitutions', async () => {
    mockTable('fixture_substitutions', [{
      id: 'sub1', fixture_id: 'f1', club_id: 'c1', minute: 65, extra_minute: null,
      player_in_id: 'p2', player_out_id: 'p1',
      player_in_api_id: 100, player_out_api_id: 200,
      player_in_name: 'Ali Demir', player_out_name: 'Can Yilmaz',
      player_in: { first_name: 'Ali', last_name: 'Demir' },
      player_out: { first_name: 'Can', last_name: 'Yilmaz' },
    }]);
    const result = await getFixtureSubstitutions('f1');
    expect(result).toHaveLength(1);
    expect(result[0].player_in_first_name).toBe('Ali');
    expect(result[0].player_out_last_name).toBe('Yilmaz');
    expect(result[0].minute).toBe(65);
  });

  it('falls back to API names when player joins are null', async () => {
    mockTable('fixture_substitutions', [{
      id: 'sub1', fixture_id: 'f1', club_id: 'c1', minute: 70, extra_minute: 2,
      player_in_id: null, player_out_id: null,
      player_in_api_id: 100, player_out_api_id: 200,
      player_in_name: 'Mehmet Kaya', player_out_name: 'Emre',
      player_in: null, player_out: null,
    }]);
    const result = await getFixtureSubstitutions('f1');
    expect(result[0].player_in_first_name).toBe('Mehmet');
    expect(result[0].player_in_last_name).toBe('Kaya');
    expect(result[0].player_out_first_name).toBe('');
    expect(result[0].player_out_last_name).toBe('Emre');
  });

  it('throws on DB error', async () => {
    mockTable('fixture_substitutions', null, { message: 'err' });
    await expect(getFixtureSubstitutions('f1')).rejects.toThrow('err');
  });
});

// ============================================
// Simulation
// ============================================
describe('simulateGameweek', () => {
  it('simulates via RPC', async () => {
    mockRpc('simulate_gameweek', { success: true, simulated: 9 });
    expect(await simulateGameweek(10)).toEqual({ success: true, simulated: 9 });
  });
  it('returns error on failure', async () => {
    mockRpc('simulate_gameweek', null, { message: 'err' });
    expect(await simulateGameweek(10)).toEqual({ success: false, error: 'err' });
  });
});

describe('syncFixtureScores', () => {
  it('syncs via RPC', async () => {
    mockRpc('sync_fixture_scores', { success: true, synced_count: 180 });
    expect(await syncFixtureScores(10)).toEqual({ success: true, synced_count: 180 });
  });
  it('returns error on failure', async () => {
    mockRpc('sync_fixture_scores', null, { message: 'err' });
    expect(await syncFixtureScores(10)).toEqual({ success: false, synced_count: 0, error: 'err' });
  });
});

// ============================================
// Floor Prices
// ============================================
describe('getFloorPricesForPlayers', () => {
  it('returns Map of floor prices', async () => {
    mockTable('players', [{ id: 'p1', floor_price: 5000 }, { id: 'p2', floor_price: 3000 }]);
    const result = await getFloorPricesForPlayers(['p1', 'p2']);
    expect(result.get('p1')).toBe(5000);
    expect(result.get('p2')).toBe(3000);
  });
  it('returns empty Map for empty array', async () => {
    expect((await getFloorPricesForPlayers([])).size).toBe(0);
  });
  it('returns empty Map when no data', async () => {
    mockTable('players', null);
    expect((await getFloorPricesForPlayers(['p1'])).size).toBe(0);
  });
});

// ============================================
// Next Fixtures
// ============================================
describe('getNextFixturesByClub', () => {
  it('maps home and away clubs', async () => {
    mockTable('fixtures', [{
      gameweek: 15, home_club_id: 'c1', away_club_id: 'c2', played_at: '2025-03-22T18:00:00Z',
      home_club: { name: 'Home FC', short: 'HFC' },
      away_club: { name: 'Away FC', short: 'AFC' },
    }]);
    const result = await getNextFixturesByClub();
    expect(result.get('c1')?.opponentShort).toBe('AFC');
    expect(result.get('c1')?.isHome).toBe(true);
    expect(result.get('c2')?.opponentShort).toBe('HFC');
    expect(result.get('c2')?.isHome).toBe(false);
  });
  it('returns empty Map when no data', async () => {
    mockTable('fixtures', null);
    expect((await getNextFixturesByClub()).size).toBe(0);
  });
});
