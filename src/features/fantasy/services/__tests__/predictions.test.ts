import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockTable, resetMocks, mockSupabase } from '@/test/mocks/supabase';

import {
  getPredictions,
  getResolvedPredictions,
  getPredictionCount,
  hasAnyPrediction,
  getPredictionStats,
  getFixturesForPrediction,
  getPlayersForFixture,
} from '../predictions.queries';

// ============================================
// Helpers
// ============================================

function makePredictionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pred-1',
    user_id: 'user-1',
    fixture_id: 'fix-1',
    gameweek: 10,
    prediction_type: 'match',
    player_id: null,
    condition: 'match_result',
    predicted_value: 'home_win',
    confidence: 3,
    difficulty: 2,
    status: 'pending',
    actual_value: null,
    points_awarded: 0,
    resolved_at: null,
    created_at: '2026-04-10T10:00:00Z',
    fixture: { home_club_id: 'club-1', away_club_id: 'club-2', gameweek: 10, played_at: '2026-04-10T18:00:00Z' },
    player: null,
    ...overrides,
  };
}

function makeFixtureForPredictionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fix-1',
    gameweek: 10,
    home_club_id: 'club-home',
    away_club_id: 'club-away',
    played_at: '2026-04-10T18:00:00Z',
    status: 'scheduled',
    home_club: { name: 'Sakaryaspor', short: 'SAK', logo_url: 'https://img.test/sak.png', primary_color: '#00a651' },
    away_club: { name: 'Eyupspor', short: 'EYU', logo_url: 'https://img.test/eyu.png', primary_color: '#ffd700' },
    ...overrides,
  };
}

// ============================================
// getPredictions
// ============================================

describe('getPredictions', () => {
  beforeEach(() => resetMocks());

  it('should return mapped predictions for a user', async () => {
    mockTable('predictions', [makePredictionRow()]);

    const result = await getPredictions('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pred-1');
    expect(result[0].user_id).toBe('user-1');
    expect(result[0].fixture_id).toBe('fix-1');
    expect(result[0].gameweek).toBe(10);
    expect(result[0].prediction_type).toBe('match');
    expect(result[0].condition).toBe('match_result');
    expect(result[0].predicted_value).toBe('home_win');
    expect(result[0].confidence).toBe(3);
    expect(result[0].status).toBe('pending');
    expect(mockSupabase.from).toHaveBeenCalledWith('predictions');
  });

  it('should return empty array when user has no predictions', async () => {
    mockTable('predictions', []);

    const result = await getPredictions('user-empty');

    expect(result).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    mockTable('predictions', null);

    const result = await getPredictions('user-1');

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('predictions', null, { message: 'query timeout' });

    await expect(getPredictions('user-1')).rejects.toThrow('query timeout');
  });

  it('should accept optional gameweek filter', async () => {
    mockTable('predictions', [makePredictionRow({ gameweek: 10 })]);

    const result = await getPredictions('user-1', 10);

    expect(result).toHaveLength(1);
    expect(result[0].gameweek).toBe(10);
  });

  it('should include player predictions with player join', async () => {
    const playerPrediction = makePredictionRow({
      prediction_type: 'player',
      player_id: 'p-1',
      condition: 'player_goals',
      predicted_value: '2',
      player: { first_name: 'Cenk', last_name: 'Tosun', position: 'ATT', club_id: 'club-1' },
    });
    mockTable('predictions', [playerPrediction]);

    const result = await getPredictions('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].prediction_type).toBe('player');
    expect(result[0].player_id).toBe('p-1');
  });
});

// ============================================
// getResolvedPredictions
// ============================================

describe('getResolvedPredictions', () => {
  beforeEach(() => resetMocks());

  it('should return resolved predictions (correct and wrong)', async () => {
    mockTable('predictions', [
      makePredictionRow({ status: 'correct', points_awarded: 10, resolved_at: '2026-04-10T20:00:00Z' }),
      makePredictionRow({ id: 'pred-2', status: 'wrong', points_awarded: 0, resolved_at: '2026-04-10T20:00:00Z' }),
    ]);

    const result = await getResolvedPredictions('user-1');

    expect(result).toHaveLength(2);
  });

  it('should work without userId (public feed)', async () => {
    mockTable('predictions', [
      makePredictionRow({ status: 'correct' }),
    ]);

    const result = await getResolvedPredictions();

    expect(result).toHaveLength(1);
  });

  it('should return empty array when no resolved predictions', async () => {
    mockTable('predictions', []);

    const result = await getResolvedPredictions('user-1');

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('predictions', null, { message: 'failed' });

    await expect(getResolvedPredictions('user-1')).rejects.toThrow('failed');
  });

  it('should accept optional gameweek filter', async () => {
    mockTable('predictions', [makePredictionRow({ status: 'correct', gameweek: 10 })]);

    const result = await getResolvedPredictions('user-1', 10);

    expect(result).toHaveLength(1);
  });
});

// ============================================
// getPredictionCount
// ============================================

describe('getPredictionCount', () => {
  beforeEach(() => resetMocks());

  it('should return count for user/gameweek', async () => {
    mockTable('predictions', null, null, 3);

    const result = await getPredictionCount('user-1', 10);

    expect(typeof result).toBe('number');
    expect(mockSupabase.from).toHaveBeenCalledWith('predictions');
  });

  it('throws on DB error', async () => {
    mockTable('predictions', null, { message: 'count error' });

    await expect(getPredictionCount('user-1', 10)).rejects.toThrow('count error');
  });

  it('should return 0 when count is null', async () => {
    mockTable('predictions', null, null, null);

    const result = await getPredictionCount('user-1', 10);

    expect(result).toBe(0);
  });
});

// ============================================
// hasAnyPrediction
// ============================================

describe('hasAnyPrediction', () => {
  beforeEach(() => resetMocks());

  it('should return true when user has predictions', async () => {
    mockTable('predictions', null, null, 5);

    const result = await hasAnyPrediction('user-1');

    expect(result).toBe(true);
  });

  it('should return false when user has no predictions', async () => {
    mockTable('predictions', null, null, 0);

    const result = await hasAnyPrediction('user-new');

    expect(result).toBe(false);
  });

  it('should return false when count is null', async () => {
    mockTable('predictions', null, null, null);

    const result = await hasAnyPrediction('user-1');

    expect(result).toBe(false);
  });
});

// ============================================
// getPredictionStats
// ============================================

describe('getPredictionStats', () => {
  beforeEach(() => resetMocks());

  it('should compute stats from resolved predictions', async () => {
    mockTable('predictions', [
      { status: 'correct', points_awarded: 10, resolved_at: '2026-04-01T00:00:00Z' },
      { status: 'correct', points_awarded: 15, resolved_at: '2026-04-02T00:00:00Z' },
      { status: 'wrong', points_awarded: 0, resolved_at: '2026-04-03T00:00:00Z' },
      { status: 'correct', points_awarded: 8, resolved_at: '2026-04-04T00:00:00Z' },
    ]);

    const result = await getPredictionStats('user-1');

    expect(result.total).toBe(4);
    expect(result.correct).toBe(3);
    expect(result.wrong).toBe(1);
    expect(result.accuracy).toBe(75); // 3/4 = 75%
    expect(result.bestStreak).toBe(2); // first 2 correct before wrong
    expect(result.totalPoints).toBe(33); // 10+15+0+8
  });

  it('should return zero stats when user has no resolved predictions', async () => {
    mockTable('predictions', []);

    const result = await getPredictionStats('user-new');

    expect(result).toEqual({
      total: 0,
      correct: 0,
      wrong: 0,
      accuracy: 0,
      bestStreak: 0,
      totalPoints: 0,
    });
  });

  it('throws on DB error', async () => {
    mockTable('predictions', null, { message: 'query failed' });

    await expect(getPredictionStats('user-1')).rejects.toThrow('query failed');
  });

  it('should return zero stats when data is null', async () => {
    mockTable('predictions', null);

    const result = await getPredictionStats('user-1');

    expect(result.total).toBe(0);
  });

  it('should track best streak correctly across multiple wrong sequences', async () => {
    mockTable('predictions', [
      { status: 'correct', points_awarded: 5, resolved_at: '2026-04-01T00:00:00Z' },
      { status: 'correct', points_awarded: 5, resolved_at: '2026-04-02T00:00:00Z' },
      { status: 'correct', points_awarded: 5, resolved_at: '2026-04-03T00:00:00Z' },
      { status: 'wrong', points_awarded: 0, resolved_at: '2026-04-04T00:00:00Z' },
      { status: 'correct', points_awarded: 5, resolved_at: '2026-04-05T00:00:00Z' },
      { status: 'correct', points_awarded: 5, resolved_at: '2026-04-06T00:00:00Z' },
    ]);

    const result = await getPredictionStats('user-1');

    expect(result.bestStreak).toBe(3); // first 3, not the later 2
    expect(result.total).toBe(6);
    expect(result.correct).toBe(5);
    expect(result.wrong).toBe(1);
  });

  it('should handle all correct predictions (100% accuracy)', async () => {
    mockTable('predictions', [
      { status: 'correct', points_awarded: 10, resolved_at: '2026-04-01T00:00:00Z' },
      { status: 'correct', points_awarded: 10, resolved_at: '2026-04-02T00:00:00Z' },
    ]);

    const result = await getPredictionStats('user-1');

    expect(result.accuracy).toBe(100);
    expect(result.bestStreak).toBe(2);
  });

  it('should handle all wrong predictions (0% accuracy)', async () => {
    mockTable('predictions', [
      { status: 'wrong', points_awarded: 0, resolved_at: '2026-04-01T00:00:00Z' },
      { status: 'wrong', points_awarded: 0, resolved_at: '2026-04-02T00:00:00Z' },
    ]);

    const result = await getPredictionStats('user-1');

    expect(result.accuracy).toBe(0);
    expect(result.bestStreak).toBe(0);
  });

  it('should handle null points_awarded as 0', async () => {
    mockTable('predictions', [
      { status: 'correct', points_awarded: null, resolved_at: '2026-04-01T00:00:00Z' },
    ]);

    const result = await getPredictionStats('user-1');

    expect(result.totalPoints).toBe(0);
    expect(result.correct).toBe(1);
  });
});

// ============================================
// getFixturesForPrediction
// ============================================

describe('getFixturesForPrediction', () => {
  beforeEach(() => resetMocks());

  it('should return mapped fixture data with club details', async () => {
    mockTable('fixtures', [makeFixtureForPredictionRow()]);

    const result = await getFixturesForPrediction(10);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fix-1');
    expect(result[0].gameweek).toBe(10);
    expect(result[0].homeClubId).toBe('club-home');
    expect(result[0].awayClubId).toBe('club-away');
    expect(result[0].homeClubName).toBe('Sakaryaspor');
    expect(result[0].homeClubShort).toBe('SAK');
    expect(result[0].homeClubLogo).toBe('https://img.test/sak.png');
    expect(result[0].homeClubColor).toBe('#00a651');
    expect(result[0].awayClubName).toBe('Eyupspor');
    expect(result[0].awayClubShort).toBe('EYU');
    expect(result[0].awayClubLogo).toBe('https://img.test/eyu.png');
    expect(result[0].awayClubColor).toBe('#ffd700');
    expect(mockSupabase.from).toHaveBeenCalledWith('fixtures');
  });

  it('should return empty array when no scheduled fixtures', async () => {
    mockTable('fixtures', []);

    const result = await getFixturesForPrediction(99);

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('fixtures', null, { message: 'query failed' });

    await expect(getFixturesForPrediction(10)).rejects.toThrow('query failed');
  });

  it('should return empty array when data is null', async () => {
    mockTable('fixtures', null);

    const result = await getFixturesForPrediction(10);

    expect(result).toEqual([]);
  });

  it('should handle null club joins with empty string fallbacks', async () => {
    mockTable('fixtures', [makeFixtureForPredictionRow({ home_club: null, away_club: null })]);

    const result = await getFixturesForPrediction(10);

    expect(result).toHaveLength(1);
    expect(result[0].homeClubName).toBe('');
    expect(result[0].homeClubShort).toBe('');
    expect(result[0].homeClubLogo).toBeNull();
    expect(result[0].awayClubName).toBe('');
    expect(result[0].awayClubColor).toBeNull();
  });
});

// ============================================
// getPlayersForFixture
// ============================================

describe('getPlayersForFixture', () => {
  beforeEach(() => resetMocks());

  it('should return players from both clubs', async () => {
    mockTable('players', [
      { id: 'p-1', first_name: 'Ersin', last_name: 'Destanoglu', position: 'GK', club: 'Sakaryaspor', image_url: 'https://img.test/1.jpg' },
      { id: 'p-2', first_name: 'Cenk', last_name: 'Tosun', position: 'ATT', club: 'Sakaryaspor', image_url: null },
      { id: 'p-3', first_name: 'Kerem', last_name: 'Akturkoglu', position: 'MID', club: 'Eyupspor', image_url: 'https://img.test/3.jpg' },
    ]);

    const result = await getPlayersForFixture('club-home', 'club-away');

    expect(result).toHaveLength(3);
    expect(result[0].first_name).toBe('Ersin');
    expect(mockSupabase.from).toHaveBeenCalledWith('players');
  });

  it('should return empty array when no players found', async () => {
    mockTable('players', []);

    const result = await getPlayersForFixture('club-x', 'club-y');

    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockTable('players', null, { message: 'query failed' });

    await expect(getPlayersForFixture('club-home', 'club-away')).rejects.toThrow('query failed');
  });

  it('should return empty array when data is null', async () => {
    mockTable('players', null);

    const result = await getPlayersForFixture('club-home', 'club-away');

    expect(result).toEqual([]);
  });
});
