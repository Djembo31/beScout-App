import { supabase } from '@/lib/supabaseClient';
import { invalidate } from '@/lib/cache';

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

  // Invalidate client + server caches after scoring
  invalidate('events:');
  invalidate('fantasyHistory:');
  invalidate('wallet:');
  invalidate('transactions:');
  try { await fetch('/api/events?bust=1'); } catch { /* silent */ }

  const result = data as ScoreResult;

  // Fire-and-forget: notify top 3 + refresh stats for all participants
  if (result.success) {
    (async () => {
      try {
        const lb = await getEventLeaderboard(eventId);
        const { createNotification } = await import('@/lib/services/notifications');
        const { data: evt } = await supabase.from('events').select('name').eq('id', eventId).single();
        const eventName = evt?.name ?? 'Event';
        for (const entry of lb.slice(0, 3)) {
          createNotification(
            entry.userId,
            'fantasy_reward',
            `Platz #${entry.rank} bei ${eventName}`,
            `Du hast ${entry.totalScore} Punkte erzielt!`,
            eventId,
            'event'
          );
        }
        // Refresh stats + achievements for all participants
        const { refreshUserStats, checkAndUnlockAchievements } = await import('@/lib/services/social');
        for (const entry of lb) {
          refreshUserStats(entry.userId)
            .then(() => checkAndUnlockAchievements(entry.userId))
            .catch(() => {});
        }
      } catch { /* silent */ }
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

  // Invalidate client + server caches after reset
  invalidate('events:');
  invalidate('fantasyHistory:');
  invalidate('wallet:');
  invalidate('transactions:');
  try { await fetch('/api/events?bust=1'); } catch { /* silent */ }

  return data as ResetResult;
}

// ============================================
// Gameweek Flow (Simulate + Score all events)
// ============================================

export type GameweekFlowResult = {
  success: boolean;
  fixturesSimulated: number;
  eventsScored: number;
  nextGameweek: number;
  errors: string[];
};

/**
 * Client-side orchestration: simulate fixtures + score all events for a gameweek.
 * 1. simulateGameweek(gw) → fixtures
 * 2. Find all non-ended events for this GW + club
 * 3. Score each event sequentially
 * 4. Advance active_gameweek to gw + 1
 */
export async function simulateGameweekFlow(clubId: string, gameweek: number): Promise<GameweekFlowResult> {
  const errors: string[] = [];
  let fixturesSimulated = 0;
  let eventsScored = 0;

  // 1. Simulate fixtures
  const { simulateGameweek } = await import('@/lib/services/fixtures');
  const simResult = await simulateGameweek(gameweek);
  if (simResult.success) {
    fixturesSimulated = simResult.fixtures_simulated ?? 0;
  } else {
    // If already simulated, that's okay — continue to scoring
    if (simResult.error && !simResult.error.includes('already')) {
      errors.push(`Fixture-Simulation: ${simResult.error}`);
    }
  }

  // 2. Find events for this GW + club that aren't ended
  const { data: gwEvents, error: evtErr } = await supabase
    .from('events')
    .select('id, status, scored_at')
    .eq('club_id', clubId)
    .eq('gameweek', gameweek)
    .neq('status', 'ended');

  if (evtErr) {
    errors.push(`Events laden: ${evtErr.message}`);
  }

  // Also include events with status 'ended' but not yet scored (edge case)
  const { data: unscoredEndedEvents } = await supabase
    .from('events')
    .select('id, status, scored_at')
    .eq('club_id', clubId)
    .eq('gameweek', gameweek)
    .eq('status', 'ended')
    .is('scored_at', null);

  const allEvents = [...(gwEvents ?? []), ...(unscoredEndedEvents ?? [])];
  // Deduplicate by id
  const eventMap = new Map(allEvents.map(e => [e.id, e]));
  const eventsToScore = Array.from(eventMap.values());

  // 3. Score each event sequentially
  for (const evt of eventsToScore) {
    if (evt.scored_at) continue; // already scored
    const result = await scoreEvent(evt.id);
    if (result.success) {
      eventsScored++;
    } else {
      errors.push(`Event ${evt.id}: ${result.error}`);
    }
  }

  // 4. Advance active_gameweek
  const nextGw = gameweek + 1;
  const { setActiveGameweek } = await import('@/lib/services/club');
  try {
    await setActiveGameweek(clubId, nextGw);
  } catch (e) {
    errors.push(`GW advance: ${e instanceof Error ? e.message : 'Fehler'}`);
  }

  // Invalidate all relevant caches
  invalidate('events:');
  invalidate('fantasyHistory:');
  invalidate('wallet:');
  invalidate('transactions:');
  invalidate(`fixtures:gw:${gameweek}`);
  invalidate('gw-top:');

  return {
    success: errors.length === 0,
    fixturesSimulated,
    eventsScored,
    nextGameweek: nextGw,
    errors,
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
    const simulatedCount = gwFixtures.filter(f => f.status === 'simulated').length;
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
      handle: profile?.handle ?? 'Unbekannt',
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      totalScore: l.total_score as number,
      rewardAmount: l.reward_amount ?? 0,
    };
  });
}
