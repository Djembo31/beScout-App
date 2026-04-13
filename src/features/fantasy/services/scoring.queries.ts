import { supabase } from '@/lib/supabaseClient';
import { notifText } from '@/lib/notifText';

// ============================================
// Scoring Service — Queries
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

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => ({
    gameweek: row.gameweek as number,
    score: row.score as number,
    date: row.created_at as string,
  }));
}

// ============================================
// Match Timeline (per-match details for player)
// ============================================

export type MatchTimelineStatus = 'played' | 'bench' | 'not_in_squad';

export type MatchTimelineEntry = {
  gameweek: number;
  fixtureId: string;
  opponent: string;       // 3-letter abbreviation
  opponentLogoUrl: string | null;
  isHome: boolean;
  matchScore: string;     // "2-1"
  minutesPlayed: number;
  isStarter: boolean;
  score: number;          // GW score (55-100 range, rating×10)
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellowCard: boolean;
  redCard: boolean;
  saves: number;
  rating: number | null;
  date: string;
  status: MatchTimelineStatus;
};

/** Load detailed per-match timeline for a player — ALL club gameweeks, including non-appearances */
export async function getPlayerMatchTimeline(
  playerId: string,
  limit = 15
): Promise<MatchTimelineEntry[]> {
  // 1. Get the player's club_id
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('club_id')
    .eq('id', playerId)
    .maybeSingle();

  if (playerError) throw new Error(playerError.message);
  if (!playerData?.club_id) return [];
  const clubId = playerData.club_id as string;

  // 2. Get ALL finished fixtures for this club (desc by GW, limited)
  const { data: clubFixtures, error: fixError } = await supabase
    .from('fixtures')
    .select(`
      id, gameweek, home_club_id, away_club_id, home_score, away_score, created_at,
      home_club:clubs!fixtures_home_club_id_fkey(short, logo_url),
      away_club:clubs!fixtures_away_club_id_fkey(short, logo_url)
    `)
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
    .not('home_score', 'is', null)
    .order('gameweek', { ascending: false })
    .limit(limit);

  if (fixError) throw new Error(fixError.message);
  if (!clubFixtures || clubFixtures.length === 0) return [];

  const fixtureIds = clubFixtures.map(f => f.id as string);

  // 3. Get player stats for these fixtures (includes minutes=0 bench entries)
  const { data: statsData, error: statsError } = await supabase
    .from('fixture_player_stats')
    .select('fixture_id, minutes_played, goals, assists, clean_sheet, yellow_card, red_card, saves, rating, is_starter')
    .eq('player_id', playerId)
    .in('fixture_id', fixtureIds);

  if (statsError) throw new Error(statsError.message);
  const statsMap = new Map<string, Record<string, unknown>>();
  for (const row of statsData ?? []) {
    statsMap.set(row.fixture_id as string, row);
  }

  // 4. Get GW scores
  const gameweeks = clubFixtures.map(f => f.gameweek as number);
  const { data: scoresData, error: scoresError } = await supabase
    .from('player_gameweek_scores')
    .select('gameweek, score')
    .eq('player_id', playerId)
    .in('gameweek', gameweeks);

  if (scoresError) throw new Error(scoresError.message);
  const scoreMap = new Map<number, number>();
  for (const row of scoresData ?? []) {
    scoreMap.set(row.gameweek as number, row.score as number);
  }

  // 5. Merge: every club fixture becomes a timeline entry
  return clubFixtures.map((fix) => {
    const homeClub = fix.home_club as unknown as { short: string; logo_url: string | null } | null;
    const awayClub = fix.away_club as unknown as { short: string; logo_url: string | null } | null;
    const gw = fix.gameweek as number;
    const isHome = clubId === (fix.home_club_id as string);
    const opponent = isHome ? (awayClub?.short ?? '???') : (homeClub?.short ?? '???');
    const opponentLogoUrl = isHome ? (awayClub?.logo_url ?? null) : (homeClub?.logo_url ?? null);
    const homeScore = fix.home_score as number | null;
    const awayScore = fix.away_score as number | null;
    const matchScore = homeScore != null && awayScore != null
      ? (isHome ? `${homeScore}-${awayScore}` : `${awayScore}-${homeScore}`)
      : '';

    const stat = statsMap.get(fix.id as string);
    const minutesPlayed = (stat?.minutes_played as number) ?? 0;
    const hasEntry = !!stat;

    let status: MatchTimelineStatus;
    if (hasEntry && minutesPlayed > 0) status = 'played';
    else if (hasEntry && minutesPlayed === 0) status = 'bench';
    else status = 'not_in_squad';

    return {
      gameweek: gw,
      fixtureId: fix.id as string,
      opponent,
      opponentLogoUrl,
      isHome,
      matchScore,
      minutesPlayed,
      isStarter: (stat?.is_starter as boolean) ?? false,
      score: scoreMap.get(gw) ?? 0,
      goals: (stat?.goals as number) ?? 0,
      assists: (stat?.assists as number) ?? 0,
      cleanSheet: (stat?.clean_sheet as boolean) ?? false,
      yellowCard: (stat?.yellow_card as boolean) ?? false,
      redCard: (stat?.red_card as boolean) ?? false,
      saves: (stat?.saves as number) ?? 0,
      rating: (stat?.rating as number | null) ?? null,
      date: fix.created_at as string,
      status,
    };
  });
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

  const { data, error } = await supabase
    .from('player_gameweek_scores')
    .select('player_id, score')
    .eq('gameweek', gameweek)
    .in('player_id', playerIds);

  if (error) throw new Error(error.message);
  const result = new Map<string, number>();
  for (const row of data ?? []) {
    result.set(row.player_id as string, row.score as number);
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

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Fetch profiles for all participants
  const userIds = data.map(l => l.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw new Error(profilesError.message);

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
  const { data, error } = await supabase.rpc('get_season_leaderboard', { p_limit: limit });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return (data as Array<{
    user_id: string;
    handle: string;
    display_name: string | null;
    avatar_url: string | null;
    total_points: number;
    events_played: number;
    total_reward_cents: number;
    wins: number;
  }>).map((row, idx) => ({
    rank: idx + 1,
    userId: row.user_id,
    handle: row.handle ?? 'Unbekannt',
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalPoints: row.total_points,
    eventsPlayed: row.events_played,
    totalRewardCents: row.total_reward_cents,
    wins: row.wins,
  }));
}

// ============================================
// Batch Form Scores (Fantasy Picker)
// ============================================

/** Batch-fetch last 5 GW scores for multiple players (for Fantasy Picker FormBars) */
export async function getBatchFormScores(
  playerIds: string[],
  limit = 5
): Promise<Map<string, { score: number; status: 'played' | 'bench' | 'not_in_squad' }[]>> {
  if (playerIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('player_gameweek_scores')
    .select('player_id, gameweek, score')
    .in('player_id', playerIds)
    .order('gameweek', { ascending: false })
    .limit(playerIds.length * limit);

  if (error) throw new Error(error.message);
  if (!data) return new Map();

  const result = new Map<string, { score: number; status: 'played' | 'bench' | 'not_in_squad' }[]>();
  for (const row of data) {
    const pid = row.player_id as string;
    const arr = result.get(pid) ?? [];
    if (arr.length < limit) {
      arr.push({ score: row.score as number, status: 'played' });
    }
    result.set(pid, arr);
  }

  for (const [pid, arr] of Array.from(result.entries())) {
    result.set(pid, arr.reverse());
  }

  return result;
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
