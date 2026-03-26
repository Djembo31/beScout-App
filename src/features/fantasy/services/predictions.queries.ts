import { supabase } from '@/lib/supabaseClient';
import type { Prediction, PredictionType, PredictionCondition } from '@/types';

// ============================================
// Predictions Service — Queries
// ============================================

export type CreatePredictionParams = {
  fixtureId: string;
  type: PredictionType;
  playerId?: string;
  condition: PredictionCondition;
  value: string;
  confidence: number;
};

export type CreatePredictionResult = {
  ok: boolean;
  id?: string;
  difficulty?: number;
  gameweek?: number;
  error?: string;
};

export type ResolveResult = {
  success: boolean;
  resolved?: number;
  correct?: number;
  wrong?: number;
  void?: number;
  error?: string;
};

export type PredictionStats = {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  bestStreak: number;
  totalPoints: number;
};

/** Load own predictions for a gameweek */
export async function getPredictions(userId: string, gameweek?: number): Promise<Prediction[]> {
  let query = supabase
    .from('predictions')
    .select(`
      *,
      fixture:fixtures!predictions_fixture_id_fkey(home_club_id, away_club_id, gameweek, played_at),
      player:players!predictions_player_id_fkey(first_name, last_name, position, club_id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (gameweek != null) {
    query = query.eq('gameweek', gameweek);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map(mapPrediction);
}

/** Load resolved predictions (public — for profile view) */
export async function getResolvedPredictions(userId?: string, gameweek?: number): Promise<Prediction[]> {
  let query = supabase
    .from('predictions')
    .select(`
      *,
      fixture:fixtures!predictions_fixture_id_fkey(home_club_id, away_club_id, gameweek, played_at),
      player:players!predictions_player_id_fkey(first_name, last_name, position, club_id)
    `)
    .in('status', ['correct', 'wrong'])
    .order('resolved_at', { ascending: false })
    .limit(50);

  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (gameweek != null) {
    query = query.eq('gameweek', gameweek);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map(mapPrediction);
}

/** Get prediction count for a user's gameweek (for limit check) */
export async function getPredictionCount(userId: string, gameweek: number): Promise<number> {
  const { count, error } = await supabase
    .from('predictions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('gameweek', gameweek);

  if (error) return 0;
  return count ?? 0;
}

/** Check if user has created any prediction (any status) */
export async function hasAnyPrediction(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('predictions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

/** Get prediction stats for a user (accuracy, streak, etc.) */
export async function getPredictionStats(userId: string): Promise<PredictionStats> {
  const { data, error } = await supabase
    .from('predictions')
    .select('status, points_awarded, resolved_at')
    .eq('user_id', userId)
    .in('status', ['correct', 'wrong'])
    .order('resolved_at', { ascending: true });

  if (error || !data || data.length === 0) {
    return { total: 0, correct: 0, wrong: 0, accuracy: 0, bestStreak: 0, totalPoints: 0 };
  }

  let correct = 0;
  let wrong = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let totalPoints = 0;

  for (const row of data) {
    if (row.status === 'correct') {
      correct++;
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      wrong++;
      currentStreak = 0;
    }
    totalPoints += Number(row.points_awarded ?? 0);
  }

  const total = correct + wrong;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { total, correct, wrong, accuracy, bestStreak, totalPoints };
}

/** Get fixtures available for predictions (scheduled, not started) */
export async function getFixturesForPrediction(gameweek: number) {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      id, gameweek, home_club_id, away_club_id, played_at, status,
      home_club:clubs!fixtures_home_club_id_fkey(name, short, logo_url, primary_color),
      away_club:clubs!fixtures_away_club_id_fkey(name, short, logo_url, primary_color)
    `)
    .eq('gameweek', gameweek)
    .eq('status', 'scheduled')
    .order('played_at', { ascending: true });

  if (error || !data) return [];

  return data.map((f: Record<string, unknown>) => {
    const homeClub = f.home_club as Record<string, unknown> | null;
    const awayClub = f.away_club as Record<string, unknown> | null;
    return {
      id: f.id as string,
      gameweek: f.gameweek as number,
      homeClubId: f.home_club_id as string,
      awayClubId: f.away_club_id as string,
      playedAt: f.played_at as string | null,
      homeClubName: (homeClub?.name ?? '') as string,
      homeClubShort: (homeClub?.short ?? '') as string,
      homeClubLogo: (homeClub?.logo_url ?? null) as string | null,
      homeClubColor: (homeClub?.primary_color ?? null) as string | null,
      awayClubName: (awayClub?.name ?? '') as string,
      awayClubShort: (awayClub?.short ?? '') as string,
      awayClubLogo: (awayClub?.logo_url ?? null) as string | null,
      awayClubColor: (awayClub?.primary_color ?? null) as string | null,
    };
  });
}

export type PredictionFixture = Awaited<ReturnType<typeof getFixturesForPrediction>>[number];

/** Get players for both clubs in a fixture (for player prediction selector) */
export async function getPlayersForFixture(
  homeClubId: string,
  awayClubId: string,
): Promise<{ id: string; first_name: string; last_name: string; position: string; club?: string; image_url?: string | null }[]> {
  const { data, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, club, image_url')
    .in('club_id', [homeClubId, awayClubId])
    .order('last_name');

  if (error || !data) return [];
  return data;
}

// ── Internal helpers ──

function mapPrediction(row: Record<string, unknown>): Prediction {
  const fixture = row.fixture as Record<string, unknown> | null;
  const player = row.player as Record<string, unknown> | null;

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    fixture_id: row.fixture_id as string,
    gameweek: row.gameweek as number,
    prediction_type: row.prediction_type as Prediction['prediction_type'],
    player_id: (row.player_id as string) ?? null,
    condition: row.condition as Prediction['condition'],
    predicted_value: row.predicted_value as string,
    confidence: row.confidence as number,
    difficulty: Number(row.difficulty ?? 1),
    status: row.status as Prediction['status'],
    actual_value: (row.actual_value as string) ?? null,
    points_awarded: Number(row.points_awarded ?? 0),
    resolved_at: (row.resolved_at as string) ?? null,
    created_at: row.created_at as string,
    fixture: fixture ? {
      home_club_id: fixture.home_club_id as string,
      away_club_id: fixture.away_club_id as string,
      gameweek: fixture.gameweek as number,
      played_at: (fixture.played_at as string) ?? null,
    } : undefined,
    player: player ? {
      first_name: player.first_name as string,
      last_name: player.last_name as string,
      position: player.position as string,
      club_id: player.club_id as string,
    } : undefined,
  };
}
