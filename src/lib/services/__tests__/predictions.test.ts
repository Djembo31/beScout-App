import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/services/notifications', () => ({ createNotification: vi.fn() }));

import {
  createPrediction,
  getPredictions,
  getResolvedPredictions,
  getPredictionCount,
  hasAnyPrediction,
  getPredictionStats,
  getFixturesForPrediction,
  getPlayersForFixture,
  resolvePredictions,
} from '../predictions';

beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// createPrediction
// ============================================
describe('createPrediction', () => {
  const params = {
    fixtureId: 'fix-1',
    type: 'player_goals' as const,
    playerId: 'p-1',
    condition: 'over' as const,
    value: '1.5',
    confidence: 80,
  };

  it('creates prediction via RPC on success', async () => {
    mockRpc('create_prediction', { ok: true, id: 'pred-1', difficulty: 3, gameweek: 10 });
    const result = await createPrediction(params);
    expect(result).toEqual({ ok: true, id: 'pred-1', difficulty: 3, gameweek: 10 });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_prediction', {
      p_fixture_id: 'fix-1',
      p_type: 'player_goals',
      p_player_id: 'p-1',
      p_condition: 'over',
      p_value: '1.5',
      p_confidence: 80,
    });
  });

  it('passes null for missing playerId', async () => {
    mockRpc('create_prediction', { ok: true, id: 'pred-2', difficulty: 1, gameweek: 5 });
    await createPrediction({ ...params, playerId: undefined });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_prediction', expect.objectContaining({
      p_player_id: null,
    }));
  });

  it('returns error on RPC failure', async () => {
    mockRpc('create_prediction', null, { message: 'RPC timeout' });
    const result = await createPrediction(params);
    expect(result).toEqual({ ok: false, error: 'RPC timeout' });
  });

  it('returns error when RPC returns ok=false', async () => {
    mockRpc('create_prediction', { ok: false, error: 'Limit reached' });
    const result = await createPrediction(params);
    expect(result).toEqual({ ok: false, error: 'Limit reached' });
  });

  it('handles null error in RPC response', async () => {
    mockRpc('create_prediction', { ok: false });
    const result = await createPrediction(params);
    expect(result).toEqual({ ok: false, error: 'Unknown error' });
  });
});

// ============================================
// getPredictions
// ============================================
describe('getPredictions', () => {
  it('returns mapped predictions', async () => {
    mockTable('predictions', [{
      id: 'pred-1',
      user_id: 'u1',
      fixture_id: 'fix-1',
      gameweek: 10,
      prediction_type: 'player_goals',
      player_id: 'p-1',
      condition: 'over',
      predicted_value: '1.5',
      confidence: 80,
      difficulty: 3,
      status: 'pending',
      actual_value: null,
      points_awarded: 0,
      resolved_at: null,
      created_at: '2025-03-01T00:00:00Z',
      fixture: { home_club_id: 'c1', away_club_id: 'c2', gameweek: 10, played_at: null },
      player: { first_name: 'John', last_name: 'Doe', position: 'MID', club_id: 'c1' },
    }]);
    const result = await getPredictions('u1', 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pred-1');
    expect(result[0].fixture?.home_club_id).toBe('c1');
    expect(result[0].player?.first_name).toBe('John');
  });

  it('handles null fixture and player', async () => {
    mockTable('predictions', [{
      id: 'pred-2',
      user_id: 'u1',
      fixture_id: 'fix-1',
      gameweek: 10,
      prediction_type: 'match_result',
      player_id: null,
      condition: 'exact',
      predicted_value: '2-1',
      confidence: 60,
      difficulty: null,
      status: 'pending',
      actual_value: null,
      points_awarded: null,
      resolved_at: null,
      created_at: '2025-03-01T00:00:00Z',
      fixture: null,
      player: null,
    }]);
    const result = await getPredictions('u1');
    expect(result[0].difficulty).toBe(1); // default
    expect(result[0].points_awarded).toBe(0); // default
    expect(result[0].fixture).toBeUndefined();
    expect(result[0].player).toBeUndefined();
  });

  it('returns [] on error', async () => {
    mockTable('predictions', null, { message: 'err' });
    expect(await getPredictions('u1')).toEqual([]);
  });

  it('returns [] on null data', async () => {
    mockTable('predictions', null);
    expect(await getPredictions('u1')).toEqual([]);
  });
});

// ============================================
// getResolvedPredictions
// ============================================
describe('getResolvedPredictions', () => {
  it('returns resolved predictions', async () => {
    mockTable('predictions', [{
      id: 'pred-1', user_id: 'u1', fixture_id: 'f1', gameweek: 10,
      prediction_type: 'match_result', player_id: null, condition: 'exact',
      predicted_value: '2-1', confidence: 70, difficulty: 2, status: 'correct',
      actual_value: '2-1', points_awarded: 150, resolved_at: '2025-03-02T00:00:00Z',
      created_at: '2025-03-01T00:00:00Z', fixture: null, player: null,
    }]);
    const result = await getResolvedPredictions('u1', 10);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('correct');
  });

  it('works without userId filter (public)', async () => {
    mockTable('predictions', []);
    const result = await getResolvedPredictions();
    expect(result).toEqual([]);
  });

  it('returns [] on error', async () => {
    mockTable('predictions', null, { message: 'err' });
    expect(await getResolvedPredictions('u1')).toEqual([]);
  });
});

// ============================================
// getPredictionCount
// ============================================
describe('getPredictionCount', () => {
  it('returns count', async () => {
    mockTable('predictions', null, null, 5);
    expect(await getPredictionCount('u1', 10)).toBe(5);
  });

  it('returns 0 on error', async () => {
    mockTable('predictions', null, { message: 'err' }, null);
    expect(await getPredictionCount('u1', 10)).toBe(0);
  });

  it('returns 0 when count is null', async () => {
    mockTable('predictions', null, null, null);
    expect(await getPredictionCount('u1', 10)).toBe(0);
  });
});

// ============================================
// hasAnyPrediction
// ============================================
describe('hasAnyPrediction', () => {
  it('returns true when user has predictions', async () => {
    mockTable('predictions', null, null, 3);
    expect(await hasAnyPrediction('u1')).toBe(true);
  });

  it('returns false when count is 0', async () => {
    mockTable('predictions', null, null, 0);
    expect(await hasAnyPrediction('u1')).toBe(false);
  });

  it('returns false when count is null', async () => {
    mockTable('predictions', null, null, null);
    expect(await hasAnyPrediction('u1')).toBe(false);
  });
});

// ============================================
// getPredictionStats
// ============================================
describe('getPredictionStats', () => {
  it('calculates stats with streak', async () => {
    mockTable('predictions', [
      { status: 'correct', points_awarded: 100, resolved_at: '2025-01-01' },
      { status: 'correct', points_awarded: 150, resolved_at: '2025-01-02' },
      { status: 'wrong', points_awarded: 0, resolved_at: '2025-01-03' },
      { status: 'correct', points_awarded: 200, resolved_at: '2025-01-04' },
    ]);
    const stats = await getPredictionStats('u1');
    expect(stats.total).toBe(4);
    expect(stats.correct).toBe(3);
    expect(stats.wrong).toBe(1);
    expect(stats.accuracy).toBe(75);
    expect(stats.bestStreak).toBe(2); // first 2 correct, then broken
    expect(stats.totalPoints).toBe(450);
  });

  it('handles all-correct streak', async () => {
    mockTable('predictions', [
      { status: 'correct', points_awarded: 100, resolved_at: '2025-01-01' },
      { status: 'correct', points_awarded: 100, resolved_at: '2025-01-02' },
      { status: 'correct', points_awarded: 100, resolved_at: '2025-01-03' },
    ]);
    const stats = await getPredictionStats('u1');
    expect(stats.bestStreak).toBe(3);
  });

  it('handles all-wrong results', async () => {
    mockTable('predictions', [
      { status: 'wrong', points_awarded: 0, resolved_at: '2025-01-01' },
      { status: 'wrong', points_awarded: 0, resolved_at: '2025-01-02' },
    ]);
    const stats = await getPredictionStats('u1');
    expect(stats.bestStreak).toBe(0);
    expect(stats.accuracy).toBe(0);
  });

  it('returns zeros on empty data', async () => {
    mockTable('predictions', []);
    const stats = await getPredictionStats('u1');
    expect(stats).toEqual({ total: 0, correct: 0, wrong: 0, accuracy: 0, bestStreak: 0, totalPoints: 0 });
  });

  it('returns zeros on error', async () => {
    mockTable('predictions', null, { message: 'err' });
    const stats = await getPredictionStats('u1');
    expect(stats).toEqual({ total: 0, correct: 0, wrong: 0, accuracy: 0, bestStreak: 0, totalPoints: 0 });
  });

  it('handles null points_awarded', async () => {
    mockTable('predictions', [
      { status: 'correct', points_awarded: null, resolved_at: '2025-01-01' },
    ]);
    const stats = await getPredictionStats('u1');
    expect(stats.totalPoints).toBe(0);
    expect(stats.correct).toBe(1);
  });
});

// ============================================
// getFixturesForPrediction
// ============================================
describe('getFixturesForPrediction', () => {
  it('returns mapped fixtures with club data', async () => {
    mockTable('fixtures', [{
      id: 'f1', gameweek: 10, home_club_id: 'c1', away_club_id: 'c2',
      played_at: '2025-03-08T18:00:00Z', status: 'scheduled',
      home_club: { name: 'Home FC', short: 'HFC', logo_url: '/home.png', primary_color: '#FF0000' },
      away_club: { name: 'Away FC', short: 'AFC', logo_url: '/away.png', primary_color: '#0000FF' },
    }]);
    const result = await getFixturesForPrediction(10);
    expect(result).toHaveLength(1);
    expect(result[0].homeClubName).toBe('Home FC');
    expect(result[0].awayClubShort).toBe('AFC');
    expect(result[0].homeClubColor).toBe('#FF0000');
  });

  it('handles null club data', async () => {
    mockTable('fixtures', [{
      id: 'f1', gameweek: 10, home_club_id: 'c1', away_club_id: 'c2',
      played_at: null, status: 'scheduled',
      home_club: null, away_club: null,
    }]);
    const result = await getFixturesForPrediction(10);
    expect(result[0].homeClubName).toBe('');
    expect(result[0].awayClubLogo).toBeNull();
    expect(result[0].playedAt).toBeNull();
  });

  it('returns [] on error', async () => {
    mockTable('fixtures', null, { message: 'err' });
    expect(await getFixturesForPrediction(10)).toEqual([]);
  });

  it('returns [] when no data', async () => {
    mockTable('fixtures', null);
    expect(await getFixturesForPrediction(10)).toEqual([]);
  });
});

// ============================================
// getPlayersForFixture
// ============================================
describe('getPlayersForFixture', () => {
  it('returns players from both clubs', async () => {
    mockTable('players', [
      { id: 'p1', first_name: 'John', last_name: 'Doe', position: 'MID', club: 'Home FC', image_url: '/john.png' },
      { id: 'p2', first_name: 'Jane', last_name: 'Smith', position: 'ATT', club: 'Away FC', image_url: null },
    ]);
    const result = await getPlayersForFixture('c1', 'c2');
    expect(result).toHaveLength(2);
  });

  it('returns [] on error', async () => {
    mockTable('players', null, { message: 'err' });
    expect(await getPlayersForFixture('c1', 'c2')).toEqual([]);
  });

  it('returns [] when no data', async () => {
    mockTable('players', null);
    expect(await getPlayersForFixture('c1', 'c2')).toEqual([]);
  });
});

// ============================================
// resolvePredictions
// ============================================
describe('resolvePredictions', () => {
  it('resolves when all fixtures finished', async () => {
    mockTable('fixtures', [
      { id: 'f1', status: 'finished' },
      { id: 'f2', status: 'finished' },
    ]);
    mockRpc('resolve_gameweek_predictions', {
      ok: true, resolved: 10, correct: 6, wrong: 3, void: 1,
    });
    // For fire-and-forget notification
    mockTable('predictions', []);

    const result = await resolvePredictions(10);
    expect(result).toEqual({
      success: true, resolved: 10, correct: 6, wrong: 3, void: 1,
    });
  });

  it('accepts simulated fixtures', async () => {
    mockTable('fixtures', [{ id: 'f1', status: 'simulated' }]);
    mockRpc('resolve_gameweek_predictions', { ok: true, resolved: 1, correct: 1, wrong: 0, void: 0 });
    mockTable('predictions', []);
    const result = await resolvePredictions(5);
    expect(result.success).toBe(true);
  });

  it('returns error when fixture check fails', async () => {
    mockTable('fixtures', null, { message: 'DB down' });
    const result = await resolvePredictions(10);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Fixture-Check fehlgeschlagen');
  });

  it('returns error when no fixtures found', async () => {
    mockTable('fixtures', []);
    const result = await resolvePredictions(10);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Keine Fixtures');
  });

  it('returns error when fixtures are null', async () => {
    mockTable('fixtures', null);
    const result = await resolvePredictions(10);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Keine Fixtures');
  });

  it('returns error when unfinished fixtures exist', async () => {
    mockTable('fixtures', [
      { id: 'f1', status: 'finished' },
      { id: 'f2', status: 'scheduled' },
      { id: 'f3', status: 'live' },
    ]);
    const result = await resolvePredictions(10);
    expect(result.success).toBe(false);
    expect(result.error).toContain('2/3 Fixtures noch nicht fertig');
  });

  it('returns error on RPC failure', async () => {
    mockTable('fixtures', [{ id: 'f1', status: 'finished' }]);
    mockRpc('resolve_gameweek_predictions', null, { message: 'RPC timeout' });
    const result = await resolvePredictions(10);
    expect(result).toEqual({ success: false, error: 'RPC timeout' });
  });

  it('returns error when RPC returns ok=false', async () => {
    mockTable('fixtures', [{ id: 'f1', status: 'finished' }]);
    mockRpc('resolve_gameweek_predictions', { ok: false, error: 'No pending predictions' });
    const result = await resolvePredictions(10);
    expect(result).toEqual({ success: false, error: 'No pending predictions' });
  });

  it('handles null error in RPC response', async () => {
    mockTable('fixtures', [{ id: 'f1', status: 'finished' }]);
    mockRpc('resolve_gameweek_predictions', { ok: false });
    const result = await resolvePredictions(10);
    expect(result.error).toBe('Unknown');
  });
});
