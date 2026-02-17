import { supabase } from '@/lib/supabaseClient';

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

  // Auto-transition event to 'ended' after successful scoring
  if (result.success) {
    await supabase
      .from('events')
      .update({ status: 'ended', scored_at: new Date().toISOString() })
      .eq('id', eventId)
      .in('status', ['running', 'scoring', 'registering', 'late-reg']);
  }

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
        // Refresh stats + achievements + airdrop scores for all participants
        const { refreshUserStats, checkAndUnlockAchievements } = await import('@/lib/services/social');
        const { refreshAirdropScore } = await import('@/lib/services/airdropScore');
        for (const entry of lb) {
          refreshUserStats(entry.userId)
            .then(() => checkAndUnlockAchievements(entry.userId))
            .catch(err => console.error('[Scoring] Stats refresh failed:', err));
          refreshAirdropScore(entry.userId).catch(err => console.error('[Scoring] Airdrop refresh failed:', err));
        }
      } catch (err) { console.error('[Scoring] Post-score side-effects failed:', err); }
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
// Gameweek Flow (Simulate + Score all events)
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
  let nextGwEventsCreated = 0;

  // 1. Try API import first, fallback to simulation
  let useApi = false;
  try {
    const { isApiConfigured, hasApiFixtures, importGameweek } = await import('@/lib/services/footballData');
    if (isApiConfigured()) {
      const hasMapped = await hasApiFixtures(gameweek);
      if (hasMapped) {
        useApi = true;
        const importResult = await importGameweek(gameweek);
        if (importResult.success) {
          fixturesSimulated = importResult.fixturesImported;
        } else {
          errors.push(...importResult.errors.map(e => `API-Import: ${e}`));
        }
      }
    }
  } catch (e) {
    console.error('[GW Flow] API import failed, falling back to simulation:', e);
  }

  // Fallback: simulate if API not used or failed
  if (!useApi) {
    const { simulateGameweek } = await import('@/lib/services/fixtures');
    const simResult = await simulateGameweek(gameweek);
    if (simResult.success) {
      fixturesSimulated = simResult.fixtures_simulated ?? 0;
    } else {
      if (simResult.error && !simResult.error.includes('already')) {
        errors.push(`Fixture-Simulation: ${simResult.error}`);
      }
    }
  }

  // Bridge: sync fixture_player_stats → player_gameweek_scores
  try {
    const { syncFixtureScores } = await import('@/lib/services/fixtures');
    const syncResult = await syncFixtureScores(gameweek);
    if (!syncResult.success && syncResult.error) {
      errors.push(`Score-Sync: ${syncResult.error}`);
    }
  } catch (e) {
    errors.push(`Score-Sync: ${e instanceof Error ? e.message : 'Fehler'}`);
  }

  // 2. Set all GW events to "running" (close registration)
  const { data: gwEvents, error: evtErr } = await supabase
    .from('events')
    .select('id, status, scored_at')
    .eq('club_id', clubId)
    .eq('gameweek', gameweek);

  if (evtErr) {
    errors.push(`Events laden: ${evtErr.message}`);
  }

  const allEvents = gwEvents ?? [];
  const eventsToClose = allEvents.filter(e => e.status === 'registering' || e.status === 'late-reg');
  if (eventsToClose.length > 0) {
    const { error: closeErr } = await supabase
      .from('events')
      .update({ status: 'running' })
      .in('id', eventsToClose.map(e => e.id));
    if (closeErr) errors.push(`Events schließen: ${closeErr.message}`);
  }

  // 3. Score each unscored event sequentially
  const eventsToScore = allEvents.filter(e => !e.scored_at);
  for (const evt of eventsToScore) {
    const result = await scoreEvent(evt.id);
    if (result.success) {
      eventsScored++;
    } else {
      errors.push(`Event ${evt.id}: ${result.error}`);
    }
  }

  // 4. Auto-create events for next GW (clone from current)
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

  // 6. Calculate DPC of the Week (fire-and-forget)
  import('@/lib/services/dpcOfTheWeek').then(({ calculateDpcOfWeek }) => {
    calculateDpcOfWeek(gameweek).catch(err => console.error('[GW Flow] DPC of Week failed:', err));
  }).catch(err => console.error('[GW Flow] DPC of Week import failed:', err));

  return {
    success: errors.length === 0,
    fixturesSimulated,
    eventsScored,
    nextGameweek: nextGw,
    nextGwEventsCreated,
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
      handle: profile?.handle ?? 'Unbekannt',
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      totalPoints: stats.totalPoints,
      eventsPlayed: stats.eventsPlayed,
      totalRewardCents: stats.totalRewardCents,
      wins: stats.wins,
    };
  });
}
