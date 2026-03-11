import { supabase } from '@/lib/supabaseClient';
import { notifText } from '@/lib/notifText';

// ============================================
// Scoring Service
// ============================================

export type ScoreResult = {
  success: boolean;
  scored_count?: number;
  winner_name?: string;
  error?: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalScore: number;
  rewardAmount: number;
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

  const result = data as ScoreResult;

  // NOTE: score_event RPC sets status='ended' + scored_at=NOW() internally (SECURITY DEFINER).
  // No client-side update needed — RLS would block it anyway.

  // Fire-and-forget: notify all participants + top 3 rewards
  if (result.success) {
    (async () => {
      try {
        const lb = await getEventLeaderboard(eventId);
        const { createNotification } = await import('@/lib/services/notifications');
        const { data: evt } = await supabase.from('events').select('name').eq('id', eventId).single();
        const eventName = evt?.name ?? 'Event';
        // All participants: event_scored
        for (const entry of lb) {
          createNotification(
            entry.userId,
            'event_scored',
            notifText('eventScoredTitle', { name: eventName }),
            notifText('eventScoredBody', { rank: entry.rank, score: entry.totalScore }),
            eventId,
            'event'
          );
        }
        // Top 3: additional fantasy_reward with prize info
        for (const entry of lb.slice(0, 3)) {
          createNotification(
            entry.userId,
            'fantasy_reward',
            notifText('fantasyRewardTitle', { rank: entry.rank, name: eventName }),
            notifText('fantasyRewardBody', { score: entry.totalScore }),
            eventId,
            'event'
          );
        }
        // Recalculate fan-ranks for club-scoped events
        const { data: evtDetail } = await supabase.from('events').select('scope, club_id').eq('id', eventId).single();
        if (evtDetail?.scope === 'club' && evtDetail.club_id) {
          const { recalculateFanRank } = await import('@/lib/services/fanRanking');
          for (const entry of lb) {
            recalculateFanRank(entry.userId, evtDetail.club_id).catch(() => {});
          }
        }
      } catch (err) { console.error('[Scoring] Post-score notification/fan-rank failed:', err); }
    })();
  }

  return result;
}

// ============================================
// Player Gameweek Scores
// ============================================

export type PlayerGameweekScore = {
  gameweek: number;
  score: number;
  date: string;
};

/** Load gameweek score history for a player */
export async function getPlayerGameweekScores(playerId: string): Promise<PlayerGameweekScore[]> {
  const { data, error } = await supabase
    .from('player_gameweek_scores')
    .select('gameweek, score, created_at')
    .eq('player_id', playerId)
    .order('gameweek', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    gameweek: row.gameweek as number,
    score: row.score as number,
    date: row.created_at as string,
  }));
}

// ============================================
// Event Reset (Testing)
// ============================================

export type ResetResult = {
  success: boolean;
  message?: string;
  error?: string;
};

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

export type ImportResult = {
  success: boolean;
  fixturesImported: number;
  scoresSynced: number;
  errors: string[];
};

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

// ============================================
// Progressive Scores (Client-readable)
// ============================================

/**
 * Get live/progressive scores for players in a gameweek.
 * Uses player_gameweek_scores table (SELECT RLS: qual=true for authenticated).
 * Safe to call from any user context — no admin required.
 */
export async function getProgressiveScores(
  gameweek: number,
  playerIds: string[]
): Promise<Map<string, number>> {
  if (playerIds.length === 0) return new Map();

  const { data } = await supabase
    .from('player_gameweek_scores')
    .select('player_id, score')
    .eq('gameweek', gameweek)
    .in('player_id', playerIds);

  const result = new Map<string, number>();
  for (const row of data ?? []) {
    result.set(row.player_id as string, row.score as number);
  }
  return result;
}

// ============================================
// Gameweek Flow (Convenience Wrapper)
// ============================================

export type GameweekFlowResult = {
  success: boolean;
  fixturesSimulated: number;
  eventsScored: number;
  nextGameweek: number;
  nextGwEventsCreated: number;
  errors: string[];
};

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

// ============================================
// Full Gameweek Status (for Admin Dashboard)
// ============================================

export type FullGameweekStatus = {
  gameweek: number;
  totalFixtures: number;
  simulatedFixtures: number;
  eventCount: number;
  scoredEvents: number;
  isSimulated: boolean;
  isFullyScored: boolean;
};

/** Get status for all 38 gameweeks */
export async function getFullGameweekStatus(): Promise<FullGameweekStatus[]> {
  const [fixturesRes, eventsRes] = await Promise.allSettled([
    supabase.from('fixtures').select('gameweek, status'),
    supabase.from('events').select('gameweek, status, scored_at').not('gameweek', 'is', null),
  ]);

  const fixtures = fixturesRes.status === 'fulfilled' ? (fixturesRes.value.data ?? []) : [];
  const events = eventsRes.status === 'fulfilled' ? (eventsRes.value.data ?? []) : [];

  const result: FullGameweekStatus[] = [];
  for (let gw = 1; gw <= 38; gw++) {
    const gwFixtures = fixtures.filter(f => f.gameweek === gw);
    const gwEvents = events.filter(e => e.gameweek === gw);
    const simulatedCount = gwFixtures.filter(f => f.status === 'simulated' || f.status === 'finished').length;
    const scoredCount = gwEvents.filter(e => e.scored_at !== null).length;

    result.push({
      gameweek: gw,
      totalFixtures: gwFixtures.length,
      simulatedFixtures: simulatedCount,
      eventCount: gwEvents.length,
      scoredEvents: scoredCount,
      isSimulated: gwFixtures.length > 0 && simulatedCount === gwFixtures.length,
      isFullyScored: gwEvents.length > 0 && scoredCount === gwEvents.length,
    });
  }
  return result;
}

/** Load leaderboard for a scored event: lineups JOIN profiles, ordered by rank */
export async function getEventLeaderboard(eventId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('lineups')
    .select('user_id, total_score, rank, reward_amount')
    .eq('event_id', eventId)
    .not('rank', 'is', null)
    .order('rank', { ascending: true });

  if (error || !data || data.length === 0) return [];

  // Fetch profiles for all participants
  const userIds = data.map(l => l.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.id, p])
  );

  return data.map(l => {
    const profile = profileMap.get(l.user_id);
    return {
      rank: l.rank as number,
      userId: l.user_id,
      handle: profile?.handle ?? notifText('unknownFallback'),
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      totalScore: l.total_score as number,
      rewardAmount: l.reward_amount ?? 0,
    };
  });
}

// ============================================
// Season Leaderboard
// ============================================

export type SeasonLeaderboardEntry = {
  rank: number;
  userId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  eventsPlayed: number;
  totalRewardCents: number;
  wins: number;
};

/** Aggregate season leaderboard: top users by total points across all scored events */
export async function getSeasonLeaderboard(limit = 50): Promise<SeasonLeaderboardEntry[]> {
  // Aggregate lineups where scoring happened (total_score IS NOT NULL)
  const { data, error } = await supabase
    .from('lineups')
    .select('user_id, total_score, rank, reward_amount')
    .not('total_score', 'is', null);

  if (error || !data || data.length === 0) return [];

  // Aggregate per user
  const userMap = new Map<string, { totalPoints: number; eventsPlayed: number; totalRewardCents: number; wins: number }>();
  for (const l of data) {
    const existing = userMap.get(l.user_id);
    const score = (l.total_score as number) ?? 0;
    const reward = l.reward_amount ?? 0;
    const isWin = l.rank === 1;
    if (existing) {
      existing.totalPoints += score;
      existing.eventsPlayed += 1;
      existing.totalRewardCents += reward;
      if (isWin) existing.wins += 1;
    } else {
      userMap.set(l.user_id, { totalPoints: score, eventsPlayed: 1, totalRewardCents: reward, wins: isWin ? 1 : 0 });
    }
  }

  // Sort by total points desc, take top N
  const sorted = Array.from(userMap.entries())
    .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
    .slice(0, limit);

  // Fetch profiles
  const userIds = sorted.map(([uid]) => uid);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.id, p])
  );

  return sorted.map(([uid, stats], idx) => {
    const profile = profileMap.get(uid);
    return {
      rank: idx + 1,
      userId: uid,
      handle: profile?.handle ?? notifText('unknownFallback'),
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      totalPoints: stats.totalPoints,
      eventsPlayed: stats.eventsPlayed,
      totalRewardCents: stats.totalRewardCents,
      wins: stats.wins,
    };
  });
}
