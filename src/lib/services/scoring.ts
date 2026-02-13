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
  eventId: string;
  eventName: string;
  gameweek: number | null;
  score: number;
  date: string;
};

/** Load gameweek score history for a player (joined with events for name/gameweek) */
export async function getPlayerGameweekScores(playerId: string): Promise<PlayerGameweekScore[]> {
  const { data, error } = await supabase
    .from('player_gameweek_scores')
    .select('score, created_at, event_id, events(name, gameweek, starts_at)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const event = row.events as { name: string; gameweek: number | null; starts_at: string } | null;
    return {
      eventId: row.event_id as string,
      eventName: event?.name ?? 'Unbekannt',
      gameweek: event?.gameweek ?? null,
      score: row.score as number,
      date: event?.starts_at ?? (row.created_at as string),
    };
  });
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
