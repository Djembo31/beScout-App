import { supabase } from '@/lib/supabaseClient';
import { notifText } from '@/lib/notifText';
import { logSilentRejects } from '@/lib/observability/silentRejects';

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

/** Load gameweek score history for a player.
 *  Slice 419: scores are fixture-bound (UNIQUE player_id,fixture_id) → a player can
 *  have >1 row per gameweek (Doppelspiel/cross-league). Aggregate per gameweek (SUM)
 *  so the history keeps the "one entry per gameweek" contract. 99.9% = 1 row = unchanged. */
export async function getPlayerGameweekScores(playerId: string): Promise<PlayerGameweekScore[]> {
  const { data, error } = await supabase
    .from('player_gameweek_scores')
    .select('gameweek, score, created_at')
    .eq('player_id', playerId)
    .order('gameweek', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  const byGw = new Map<number, { score: number; date: string }>();
  for (const row of data) {
    const gw = row.gameweek as number;
    const prev = byGw.get(gw);
    byGw.set(gw, {
      score: (prev?.score ?? 0) + (row.score as number),
      date: prev?.date ?? (row.created_at as string),
    });
  }
  return Array.from(byGw.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([gameweek, v]) => ({ gameweek, score: v.score, date: v.date }));
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

/** Load detailed per-match timeline for a player.
 *
 *  Slice 270c fix: Pre-Slice baute Window aus `players.club_id` (= Step 1
 *  query), holt dann ALL club fixtures (Step 2). Bei Cross-Club-Spielern
 *  (Slice 081d Pattern: API-Football current-Club ≠ DB players.club_id —
 *  z.B. Zaniolo aktuell Udinese, DB-club_id noch Galatasaray) führte das zu
 *  einer 5/5 N/K-Anzeige obwohl 23 fixture_player_stats-Rows existieren.
 *
 *  Fix: Service liest direkt aus `fixture_player_stats` (Step 1) und
 *  rekonstruiert die Fixtures aus den Stat-Rows (Step 2). Damit ist die
 *  Match-Timeline robust gegen stale players.club_id und zeigt immer die
 *  echte Match-History des Spielers.
 *
 *  Trade-off: Reine Bench/Not-In-Squad-Fixtures (kein Stat-Row) erscheinen
 *  nicht mehr in der Timeline. Pre-Slice zeigte sie als "N/K"; Post-Slice
 *  zeigt nur Fixtures, in denen der Spieler kader-relevant war (incl.
 *  minutes=0 Bench wenn Stat-Row existiert). Visual-Win > Vollständigkeit.
 */
export async function getPlayerMatchTimeline(
  playerId: string,
  limit = 15
): Promise<MatchTimelineEntry[]> {
  // 1. Get player's stat-rows directly. fixture_id ist die Wahrheits-Quelle
  //    für „in welchem Match war der Spieler kader-relevant".
  const { data: statRows, error: statError } = await supabase
    .from('fixture_player_stats')
    .select('fixture_id, minutes_played, goals, assists, clean_sheet, yellow_card, red_card, saves, rating, is_starter')
    .eq('player_id', playerId);

  if (statError) throw new Error(statError.message);
  if (!statRows || statRows.length === 0) return [];

  const statMap = new Map<string, Record<string, unknown>>();
  for (const row of statRows) {
    statMap.set(row.fixture_id as string, row);
  }
  const fixtureIds = Array.from(statMap.keys());

  // 2. Get fixtures for those stat-rows (only finished, latest first, limited)
  const { data: fixtures, error: fixError } = await supabase
    .from('fixtures')
    .select(`
      id, gameweek, home_club_id, away_club_id, home_score, away_score, created_at,
      home_club:clubs!fixtures_home_club_id_fkey(short, logo_url),
      away_club:clubs!fixtures_away_club_id_fkey(short, logo_url)
    `)
    .in('id', fixtureIds)
    .not('home_score', 'is', null)
    .order('gameweek', { ascending: false })
    .limit(limit);

  if (fixError) throw new Error(fixError.message);
  if (!fixtures || fixtures.length === 0) return [];

  // 3. Determine player's effective club (majority of his stat-fixtures).
  //    Used to determine isHome/opponent. Robust gegen Cross-Club-Drift,
  //    weil wir die Wahrheit aus den Match-Daten ableiten, nicht aus dem
  //    möglicherweise stale `players.club_id`-Feld.
  const clubVoteCount = new Map<string, number>();
  for (const fix of fixtures) {
    const home = fix.home_club_id as string;
    const away = fix.away_club_id as string;
    clubVoteCount.set(home, (clubVoteCount.get(home) ?? 0) + 1);
    clubVoteCount.set(away, (clubVoteCount.get(away) ?? 0) + 1);
  }
  // Beide Clubs jeder Fixture haben +1 — der echte Club erscheint in JEDER
  // Fixture (also count = N). Andere Clubs erscheinen nur einmalig.
  let effectiveClubId: string | null = null;
  let maxVotes = 0;
  clubVoteCount.forEach((count, clubId) => {
    if (count > maxVotes) {
      maxVotes = count;
      effectiveClubId = clubId;
    }
  });

  // 4. Get scores for the fixtures in this timeline.
  //    Slice 419: scores are fixture-bound — map per fixture_id (not gameweek).
  //    Behebt den GW-Map-Bug: bei mehreren Fixtures desselben Spielers in einer GW
  //    bekommt jetzt jedes Fixture seinen eigenen Score statt einem geteilten GW-Score.
  const { data: scoresData, error: scoresError } = await supabase
    .from('player_gameweek_scores')
    .select('fixture_id, score')
    .eq('player_id', playerId)
    .in('fixture_id', fixtureIds);

  if (scoresError) throw new Error(scoresError.message);
  const scoreByFixture = new Map<string, number>();
  for (const row of scoresData ?? []) {
    scoreByFixture.set(row.fixture_id as string, row.score as number);
  }

  // 5. Merge: every stat-fixture becomes a timeline entry
  return fixtures.map((fix) => {
    const homeClub = fix.home_club as unknown as { short: string; logo_url: string | null } | null;
    const awayClub = fix.away_club as unknown as { short: string; logo_url: string | null } | null;
    const gw = fix.gameweek as number;
    const isHome = effectiveClubId === (fix.home_club_id as string);
    const opponent = isHome ? (awayClub?.short ?? '???') : (homeClub?.short ?? '???');
    const opponentLogoUrl = isHome ? (awayClub?.logo_url ?? null) : (homeClub?.logo_url ?? null);
    const homeScore = fix.home_score as number | null;
    const awayScore = fix.away_score as number | null;
    const matchScore = homeScore != null && awayScore != null
      ? (isHome ? `${homeScore}-${awayScore}` : `${awayScore}-${homeScore}`)
      : '';

    const stat = statMap.get(fix.id as string);
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
      score: scoreByFixture.get(fix.id as string) ?? 0,
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
  // Slice 419: fixture-bound scores → a player can have >1 row per gameweek
  // (cross-league/Doppelspiel). Accumulate (SUM) so we never silently pick one row.
  const result = new Map<string, number>();
  for (const row of data ?? []) {
    const pid = row.player_id as string;
    result.set(pid, (result.get(pid) ?? 0) + (row.score as number));
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
// Slice 195e — Captain-Distribution + Player-Pick-Rates
// ============================================

export type EventCaptainPick = {
  player_id: string;
  count: number;
  pct: number;
};

export type EventPlayerPickRate = {
  player_id: string;
  count: number;
  pct: number;
};

/**
 * Anonymized captain-pick-distribution per event.
 * Returns array of {player_id, count, pct} sorted by count DESC.
 * Empty event (0 lineups with captain) → [].
 *
 * Anonymization: RPC SECURITY DEFINER — projektierter Output, kein user_id.
 */
export async function getEventCaptainDistribution(
  eventId: string,
): Promise<EventCaptainPick[]> {
  const { data, error } = await supabase.rpc('get_event_captain_distribution', {
    p_event_id: eventId,
  });
  if (error) throw new Error(error.message);
  return (data as EventCaptainPick[] | null) ?? [];
}

/**
 * Anonymized player-pick-rate per event (aggregates ueber 12 starting-slots).
 * Returns array of {player_id, count, pct} sorted by count DESC.
 * Empty event → [].
 *
 * Bench-Spieler werden NICHT mitgezaehlt (nur starting-slots).
 */
export async function getEventPlayerPickRates(
  eventId: string,
): Promise<EventPlayerPickRate[]> {
  const { data, error } = await supabase.rpc('get_event_player_pick_rates', {
    p_event_id: eventId,
  });
  if (error) throw new Error(error.message);
  return (data as EventPlayerPickRate[] | null) ?? [];
}

// Slice 307: getBatchFormScores entfernt — last-5-Scores vereinheitlicht auf den
// kanonischen RPC-Pfad (getRecentPlayerScoresAndGameweeks via useRecentScores).
// Der Fantasy-Picker nutzt jetzt dieselbe per-Player-Liga-Window-Quelle wie KaderTab/Markt.

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
  const results = await Promise.allSettled([
    supabase.from('fixtures').select('gameweek, status'),
    supabase.from('events').select('gameweek, status, scored_at').not('gameweek', 'is', null),
  ]);
  logSilentRejects('scoring.getFullGameweekStatus', results);
  const [fixturesRes, eventsRes] = results;

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
