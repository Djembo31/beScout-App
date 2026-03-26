import { supabase } from '@/lib/supabaseClient';
import { notifText } from '@/lib/notifText';
import type { BatchNotificationInput } from '@/lib/services/notifications';
import { getEventLeaderboard } from './scoring.queries';
import type { ScoreResult } from './scoring.queries';

// ============================================
// Scoring Service — Admin / Write Operations
// ============================================

export type ResetResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export type ImportResult = {
  success: boolean;
  fixturesImported: number;
  scoresSynced: number;
  errors: string[];
};

export type GameweekFlowResult = {
  success: boolean;
  fixturesSimulated: number;
  eventsScored: number;
  nextGameweek: number;
  nextGwEventsCreated: number;
  errors: string[];
};

/** Trigger scoring for an event via RPC */
export async function scoreEvent(eventId: string): Promise<ScoreResult> {
  const { data, error } = await supabase.rpc('score_event', {
    p_event_id: eventId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  try { await fetch('/api/events?bust=1'); } catch { /* bust cache best-effort */ }

  if (!data) {
    return { success: false, error: 'score_event returned null' };
  }
  const result = data as ScoreResult;

  // NOTE: score_event RPC sets status='ended' + scored_at=NOW() internally (SECURITY DEFINER).
  // No client-side update needed — RLS would block it anyway.

  // Fire-and-forget: batch notifications + fan ranks + achievements
  if (result.success) {
    (async () => {
      try {
        const lb = await getEventLeaderboard(eventId);
        const { createNotificationsBatch } = await import('@/lib/services/notifications');
        const { data: evt } = await supabase.from('events').select('name').eq('id', eventId).single();
        const eventName = evt?.name ?? 'Event';

        // Build batch: all participants + top 3 rewards
        const notifBatch: BatchNotificationInput[] = lb.map((entry) => ({
          userId: entry.userId,
          type: 'event_scored' as const,
          title: notifText('eventScoredTitle', { name: eventName }),
          body: notifText('eventScoredBody', { rank: entry.rank, score: entry.totalScore }),
          referenceId: eventId,
          referenceType: 'event',
        }));

        for (const entry of lb.slice(0, 3)) {
          notifBatch.push({
            userId: entry.userId,
            type: 'fantasy_reward' as const,
            title: notifText('fantasyRewardTitle', { rank: entry.rank, name: eventName }),
            body: notifText('fantasyRewardBody', { score: entry.totalScore }),
            referenceId: eventId,
            referenceType: 'event',
          });
        }

        // Single batch insert for all notifications
        await createNotificationsBatch(notifBatch);
        // Batch recalculate fan-ranks for club-scoped events (single DB round-trip)
        const { batchRecalculateFanRanks } = await import('@/lib/services/fanRanking');
        batchRecalculateFanRanks(eventId).catch((err) =>
          console.error('[Scoring] Batch fan-rank recalculation failed:', err)
        );

        // Fire-and-forget: check achievements for all participants
        const { checkAndUnlockAchievements } = await import('@/lib/services/social');
        for (const entry of lb) {
          checkAndUnlockAchievements(entry.userId).catch((err) =>
            console.error('[Scoring] Achievement check failed for', entry.userId, err)
          );
        }
      } catch (err) { console.error('[Scoring] Post-score tasks failed:', err); }
    })();
  }

  return result;
}

/** Reset a scored event back to registering state (testing only) */
export async function resetEvent(eventId: string): Promise<ResetResult> {
  const { data, error } = await supabase.rpc('reset_event', {
    p_event_id: eventId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  try { await fetch('/api/events?bust=1'); } catch { /* bust cache best-effort */ }

  return data as ResetResult;
}

// ============================================
// Progressive Import (Phase 2 Live-Betrieb)
// ============================================

/**
 * Import stats + sync scores for a gameweek (idempotent, safe to call multiple times).
 * admin_import_gameweek_stats RPC: DELETE + reimport → idempotent
 * sync_fixture_scores RPC: ON CONFLICT DO UPDATE → idempotent
 */
export async function importProgressiveStats(
  clubId: string,
  gameweek: number,
  adminId?: string
): Promise<ImportResult> {
  const errors: string[] = [];
  let fixturesImported = 0;

  // 1. Try API import (importGameweek calls admin_import_gameweek_stats which internally calls sync_fixture_scores)
  try {
    const { isApiConfigured, hasApiFixtures, importGameweek } = await import('@/lib/services/footballData');
    if (isApiConfigured()) {
      const hasMapped = await hasApiFixtures(gameweek);
      if (hasMapped) {
        const importResult = await importGameweek(adminId || '', gameweek);
        if (importResult.success) {
          return {
            success: true,
            fixturesImported: importResult.fixturesImported,
            scoresSynced: importResult.scoresSynced ?? 0,
            errors: importResult.errors,
          };
        } else {
          errors.push(...importResult.errors.map(e => `API-Import: ${e}`));
        }
      }
    }
  } catch (e) {
    errors.push(`Import: ${e instanceof Error ? e.message : 'Fehler'}`);
  }

  // 2. Fallback: manual sync_fixture_scores if API not available
  try {
    const { syncFixtureScores } = await import('@/lib/services/fixtures');
    const syncResult = await syncFixtureScores(gameweek);
    return {
      success: errors.length === 0,
      fixturesImported,
      scoresSynced: syncResult.synced_count ?? 0,
      errors,
    };
  } catch (e) {
    errors.push(`Score-Sync: ${e instanceof Error ? e.message : 'Fehler'}`);
  }

  return { success: false, fixturesImported, scoresSynced: 0, errors };
}

// ============================================
// Finalize Gameweek (Score + Advance)
// ============================================

/**
 * Finalize a gameweek: resolve predictions, score events, create next GW events, advance GW.
 * Should only be called once when all fixtures are finished.
 */
export async function finalizeGameweek(
  clubId: string,
  gameweek: number,
  adminId?: string
): Promise<GameweekFlowResult> {
  const errors: string[] = [];
  let eventsScored = 0;
  let nextGwEventsCreated = 0;

  // 1. Resolve predictions for this gameweek
  try {
    const { resolvePredictions } = await import('@/lib/services/predictions');
    const predResult = await resolvePredictions(gameweek);
    if (!predResult.success && predResult.error) {
      errors.push(`Prediction-Auflösung: ${predResult.error}`);
    }
  } catch (e) {
    errors.push(`Prediction-Auflösung: ${e instanceof Error ? e.message : 'Fehler'}`);
  }

  // 2. Load all GW events
  const { data: gwEvents, error: evtErr } = await supabase
    .from('events')
    .select('id, status, scored_at, current_entries')
    .eq('club_id', clubId)
    .eq('gameweek', gameweek);

  if (evtErr) {
    errors.push(`Events laden: ${evtErr.message}`);
  }

  const allEvents = gwEvents ?? [];
  const eventsToScore = allEvents.filter(e => !e.scored_at);

  // 3. Score events with lineups, close empty events directly
  for (const evt of eventsToScore) {
    if ((evt.current_entries ?? 0) === 0) {
      const { error: closeErr } = await supabase
        .from('events')
        .update({ status: 'ended', scored_at: new Date().toISOString() })
        .eq('id', evt.id);
      if (closeErr) errors.push(`Event ${evt.id} schließen: ${closeErr.message}`);
      else eventsScored++;
    } else {
      const result = await scoreEvent(evt.id);
      if (result.success) {
        eventsScored++;
      } else {
        errors.push(`Event ${evt.id}: ${result.error}`);
      }
    }
  }

  // 4. Auto-create events for next GW
  const { createNextGameweekEvents } = await import('@/lib/services/events');
  try {
    const cloneResult = await createNextGameweekEvents(clubId, gameweek);
    nextGwEventsCreated = cloneResult.created;
    if (cloneResult.error && !cloneResult.skipped) {
      errors.push(`Nächster GW Events: ${cloneResult.error}`);
    }
  } catch (e) {
    errors.push(`Nächster GW Events: ${e instanceof Error ? e.message : 'Fehler'}`);
  }

  // 5. Advance active_gameweek
  const nextGw = gameweek + 1;
  const { setActiveGameweek } = await import('@/lib/services/club');
  try {
    await setActiveGameweek(clubId, nextGw);
  } catch (e) {
    errors.push(`GW advance: ${e instanceof Error ? e.message : 'Fehler'}`);
  }

  // 6. Bust API cache
  try { await fetch('/api/events?bust=1'); } catch { /* best-effort */ }

  // 7. DPC of the Week (fire-and-forget)
  import('@/lib/services/dpcOfTheWeek').then(({ calculateDpcOfWeek }) => {
    calculateDpcOfWeek(gameweek).catch(err => console.error('[GW Flow] DPC of Week failed:', err));
  }).catch(err => console.error('[GW Flow] DPC of Week import failed:', err));

  return {
    success: errors.length === 0,
    fixturesSimulated: 0,
    eventsScored,
    nextGameweek: nextGw,
    nextGwEventsCreated,
    errors,
  };
}

/**
 * Full gameweek flow: import + finalize in one call.
 * Kept for backward compatibility — new code should use importProgressiveStats + finalizeGameweek.
 */
export async function simulateGameweekFlow(clubId: string, gameweek: number, adminId?: string): Promise<GameweekFlowResult> {
  // Step 1: Import + Sync
  const importResult = await importProgressiveStats(clubId, gameweek, adminId);

  // Step 2: Finalize (Score + Advance)
  const finalResult = await finalizeGameweek(clubId, gameweek, adminId);

  return {
    ...finalResult,
    fixturesSimulated: importResult.fixturesImported,
    errors: [...importResult.errors, ...finalResult.errors],
  };
}
