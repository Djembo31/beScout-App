import { supabase } from '@/lib/supabaseClient';
import type { CreatePredictionParams, CreatePredictionResult, ResolveResult } from './predictions.queries';

// ============================================
// Predictions Service — Mutations
// ============================================

/** Create a new prediction via RPC */
export async function createPrediction(params: CreatePredictionParams): Promise<CreatePredictionResult> {
  const { data, error } = await supabase.rpc('create_prediction', {
    p_fixture_id: params.fixtureId,
    p_type: params.type,
    p_player_id: params.playerId ?? null,
    p_condition: params.condition,
    p_value: params.value,
    p_confidence: params.confidence,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as Record<string, unknown>;
  if (!result?.ok) {
    return { ok: false, error: String(result?.error ?? 'Unknown error') };
  }

  return {
    ok: true,
    id: result.id as string,
    difficulty: result.difficulty as number,
    gameweek: result.gameweek as number,
  };
}

/** Resolve predictions for a gameweek via RPC.
 *  Pre-checks that all fixtures in the gameweek are finished before resolving. */
export async function resolvePredictions(gameweek: number): Promise<ResolveResult> {
  // Safety: ensure all fixtures in this GW are finished before resolving
  const { data: fixtures, error: fxError } = await supabase
    .from('fixtures')
    .select('id, status')
    .eq('gameweek', gameweek);

  if (fxError) {
    return { success: false, error: `Fixture-Check fehlgeschlagen: ${fxError.message}` };
  }

  if (!fixtures || fixtures.length === 0) {
    return { success: false, error: `Keine Fixtures für GW ${gameweek} gefunden` };
  }

  const unfinished = fixtures.filter(f => f.status !== 'finished' && f.status !== 'simulated');
  if (unfinished.length > 0) {
    return {
      success: false,
      error: `${unfinished.length}/${fixtures.length} Fixtures noch nicht fertig — Predictions können erst nach allen Spielen aufgelöst werden`,
    };
  }

  const { data, error } = await supabase.rpc('resolve_gameweek_predictions', {
    p_gameweek: gameweek,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as Record<string, unknown>;
  if (!result?.ok) {
    return { success: false, error: String(result?.error ?? 'Unknown') };
  }

  // Notify users who had >=3 predictions this GW
  const resolved = (result.resolved as number) ?? 0;
  if (resolved > 0) {
    notifyResolvedUsers(gameweek).catch(err =>
      console.error('[Predictions] Notification failed:', err)
    );
  }

  return {
    success: true,
    resolved: result.resolved as number,
    correct: result.correct as number,
    wrong: result.wrong as number,
    void: result.void as number,
  };
}

// ── Internal helpers ──

async function notifyResolvedUsers(gameweek: number): Promise<void> {
  // Find users who had 3+ predictions this GW
  const { data } = await supabase
    .from('predictions')
    .select('user_id')
    .eq('gameweek', gameweek)
    .in('status', ['correct', 'wrong']);

  if (!data || data.length === 0) return;

  // Count per user
  const countMap = new Map<string, number>();
  for (const row of data) {
    countMap.set(row.user_id, (countMap.get(row.user_id) ?? 0) + 1);
  }

  const { createNotification } = await import('@/lib/services/notifications');

  Array.from(countMap.entries()).forEach(([uid, count]) => {
    if (count >= 3) {
      createNotification(
        uid,
        'prediction_resolved',
        `GW ${gameweek}: ${count} Predictions resolved`,
        `${count} predictions evaluated — check your results!`,
        undefined,
        'prediction'
      ).catch(err => console.error('[Predictions] Notification insert failed:', err));
    }
  });
}
