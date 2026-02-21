/**
 * Scouting Service — Aggregated scouting data for club admins.
 * Reads from research_posts (category='Scouting-Report' with evaluation)
 * and bounty_submissions (with evaluation).
 */
import { supabase } from '@/lib/supabaseClient';
import type { PlayerScoutingSummary, TopScout, ScoutingEvaluation, Pos } from '@/types';
import { toPos } from '@/types';

// ============================================
// Player Scouting Summaries
// ============================================

export async function getPlayerScoutingSummaries(clubId: string): Promise<PlayerScoutingSummary[]> {
  // Fetch scouting reports (research_posts with evaluation) for players in this club
  const { data: reports, error } = await supabase
    .from('research_posts')
    .select('player_id, evaluation, created_at')
    .eq('category', 'Scouting-Report')
    .not('evaluation', 'is', null)
    .not('player_id', 'is', null);

  if (error) {
    console.error('[Scouting] Failed to fetch reports:', error.message);
    return [];
  }

  if (!reports || reports.length === 0) return [];

  // Get unique player IDs
  const playerIds = Array.from(new Set((reports as { player_id: string }[]).map(r => r.player_id)));

  // Fetch player details for these IDs (only club players)
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, club_id')
    .in('id', playerIds)
    .eq('club_id', clubId);

  if (!players || players.length === 0) return [];

  const playerMap = new Map(players.map(p => [p.id, p]));

  // Aggregate evaluations per player
  const aggregated = new Map<string, { evals: ScoutingEvaluation[]; lastAt: string }>();
  for (const r of reports) {
    const pid = r.player_id as string;
    if (!playerMap.has(pid)) continue;
    const ev = r.evaluation as ScoutingEvaluation;
    if (!ev || typeof ev.technik !== 'number') continue;
    const existing = aggregated.get(pid);
    if (existing) {
      existing.evals.push(ev);
      if (r.created_at > existing.lastAt) existing.lastAt = r.created_at as string;
    } else {
      aggregated.set(pid, { evals: [ev], lastAt: r.created_at as string });
    }
  }

  const results: PlayerScoutingSummary[] = [];
  Array.from(aggregated.entries()).forEach(([pid, { evals, lastAt }]) => {
    const player = playerMap.get(pid);
    if (!player) return;
    const n = evals.length;
    const avg = (key: keyof ScoutingEvaluation) => {
      const sum = evals.reduce((s, e) => s + (typeof e[key] === 'number' ? (e[key] as number) : 0), 0);
      return Math.round((sum / n) * 10) / 10;
    };
    const avgT = avg('technik');
    const avgTk = avg('taktik');
    const avgA = avg('athletik');
    const avgM = avg('mentalitaet');
    const avgP = avg('potenzial');
    results.push({
      playerId: pid,
      firstName: player.first_name,
      lastName: player.last_name,
      position: toPos(player.position),
      clubId: player.club_id,
      reportCount: n,
      avgTechnik: avgT,
      avgTaktik: avgTk,
      avgAthletik: avgA,
      avgMentalitaet: avgM,
      avgPotenzial: avgP,
      avgOverall: Math.round(((avgT + avgTk + avgA + avgM + avgP) / 5) * 10) / 10,
      lastScoutedAt: lastAt,
    });
  });

  // Sort by report count desc, then overall desc
  results.sort((a, b) => b.reportCount - a.reportCount || b.avgOverall - a.avgOverall);
  return results;
}

// ============================================
// Single-User Scouting Stats (for Profile)
// ============================================

export type ScoutingStats = {
  reportCount: number;
  avgRating: number;
  approvedBounties: number;
  hitRate: number;
  totalCalls: number;
};

export async function getScoutingStatsForUser(userId: string): Promise<ScoutingStats> {
  const [researchResult, bountiesResult, trackResult] = await Promise.allSettled([
    supabase
      .from('research_posts')
      .select('avg_rating, ratings_count')
      .eq('user_id', userId),
    supabase
      .from('bounty_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved'),
    supabase
      .from('research_posts')
      .select('outcome')
      .eq('user_id', userId)
      .gt('price_at_creation', 0)
      .not('outcome', 'is', null),
  ]);

  let reportCount = 0;
  let totalRating = 0;
  let ratingCount = 0;
  if (researchResult.status === 'fulfilled' && researchResult.value.data) {
    const rows = researchResult.value.data;
    reportCount = rows.length;
    for (const r of rows) {
      if ((r.ratings_count as number) > 0) {
        totalRating += (r.avg_rating as number) * (r.ratings_count as number);
        ratingCount += (r.ratings_count as number);
      }
    }
  }

  const approvedBounties = bountiesResult.status === 'fulfilled'
    ? (bountiesResult.value.data?.length ?? 0) : 0;

  let correct = 0;
  let totalCalls = 0;
  if (trackResult.status === 'fulfilled' && trackResult.value.data) {
    for (const r of trackResult.value.data) {
      totalCalls++;
      if (r.outcome === 'correct') correct++;
    }
  }

  return {
    reportCount,
    avgRating: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0,
    approvedBounties,
    hitRate: totalCalls > 0 ? Math.round((correct / totalCalls) * 100) : 0,
    totalCalls,
  };
}

// ============================================
// Top Scouts Leaderboard
// ============================================

/**
 * Global Top Scouts — ranked by analyst_score, not club-scoped.
 * Enriched with report count + hit rate.
 */
export async function getGlobalTopScouts(limit = 10): Promise<TopScout[]> {
  // Get top users by analyst score
  const { data: scores, error } = await supabase
    .from('user_stats')
    .select('user_id, scout_score')
    .order('scout_score', { ascending: false })
    .gt('scout_score', 0)
    .limit(limit);

  if (error || !scores || scores.length === 0) return [];

  const userIds = scores.map(s => s.user_id as string);

  // Parallel: profiles + research stats + approved bounties
  const [profilesResult, researchResult, bountiesResult] = await Promise.allSettled([
    supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', userIds),
    supabase.from('research_posts').select('user_id, avg_rating, ratings_count').in('user_id', userIds),
    supabase.from('bounty_submissions').select('user_id').eq('status', 'approved').in('user_id', userIds),
  ]);

  const profiles = profilesResult.status === 'fulfilled' ? (profilesResult.value.data ?? []) : [];
  const research = researchResult.status === 'fulfilled' ? (researchResult.value.data ?? []) : [];
  const bounties = bountiesResult.status === 'fulfilled' ? (bountiesResult.value.data ?? []) : [];

  const profileMap = new Map(profiles.map((p: { id: string; handle: string; display_name: string | null; avatar_url: string | null }) => [p.id, p]));

  // Aggregate research per user
  const researchMap = new Map<string, { count: number; totalRating: number; ratingCount: number }>();
  for (const r of research) {
    const uid = r.user_id as string;
    const existing = researchMap.get(uid) ?? { count: 0, totalRating: 0, ratingCount: 0 };
    existing.count++;
    if ((r.ratings_count as number) > 0) {
      existing.totalRating += (r.avg_rating as number) * (r.ratings_count as number);
      existing.ratingCount += (r.ratings_count as number);
    }
    researchMap.set(uid, existing);
  }

  // Count approved bounties per user
  const bountyMap = new Map<string, number>();
  for (const b of bounties) {
    bountyMap.set(b.user_id as string, (bountyMap.get(b.user_id as string) ?? 0) + 1);
  }

  const scoreMap = new Map(scores.map(s => [s.user_id as string, s.scout_score as number]));

  const results: TopScout[] = [];
  for (const uid of userIds) {
    const profile = profileMap.get(uid);
    if (!profile) continue;
    const rs = researchMap.get(uid);
    results.push({
      userId: uid,
      handle: profile.handle,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      reportCount: rs?.count ?? 0,
      approvedBounties: bountyMap.get(uid) ?? 0,
      avgRating: rs && rs.ratingCount > 0 ? Math.round((rs.totalRating / rs.ratingCount) * 10) / 10 : 0,
      analystScore: scoreMap.get(uid) ?? 0,
    });
  }

  return results;
}

export async function getTopScouts(clubId: string, limit = 20): Promise<TopScout[]> {
  // Parallel: research reports + approved bounty submissions
  const [researchResult, bountiesResult] = await Promise.allSettled([
    supabase
      .from('research_posts')
      .select('user_id, avg_rating, ratings_count')
      .eq('category', 'Scouting-Report')
      .not('evaluation', 'is', null),
    supabase
      .from('bounty_submissions')
      .select('user_id, bounties!inner(club_id)')
      .eq('status', 'approved')
      .not('evaluation', 'is', null)
      .eq('bounties.club_id', clubId),
  ]);

  const reports = researchResult.status === 'fulfilled' ? (researchResult.value.data ?? []) : [];
  const approvals = bountiesResult.status === 'fulfilled' ? (bountiesResult.value.data ?? []) : [];

  // Aggregate per user
  const userMap = new Map<string, { reportCount: number; approvedBounties: number; totalRating: number; ratingCount: number }>();

  for (const r of reports) {
    const uid = r.user_id as string;
    const existing = userMap.get(uid) ?? { reportCount: 0, approvedBounties: 0, totalRating: 0, ratingCount: 0 };
    existing.reportCount++;
    if ((r.ratings_count as number) > 0) {
      existing.totalRating += (r.avg_rating as number) * (r.ratings_count as number);
      existing.ratingCount += (r.ratings_count as number);
    }
    userMap.set(uid, existing);
  }

  for (const a of approvals) {
    const uid = a.user_id as string;
    const existing = userMap.get(uid) ?? { reportCount: 0, approvedBounties: 0, totalRating: 0, ratingCount: 0 };
    existing.approvedBounties++;
    userMap.set(uid, existing);
  }

  if (userMap.size === 0) return [];

  // Fetch profiles
  const userIds = Array.from(userMap.keys());
  const [profilesResult, scoresResult] = await Promise.allSettled([
    supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .in('id', userIds),
    supabase
      .from('user_stats')
      .select('user_id, scout_score')
      .in('user_id', userIds),
  ]);

  const profiles = profilesResult.status === 'fulfilled' ? (profilesResult.value.data ?? []) : [];
  const scores = scoresResult.status === 'fulfilled' ? (scoresResult.value.data ?? []) : [];

  const profileMap = new Map(profiles.map((p: { id: string; handle: string; display_name: string | null; avatar_url: string | null }) => [p.id, p]));
  const scoreMap = new Map(scores.map((s: { user_id: string; scout_score: number }) => [s.user_id, s.scout_score]));

  const results: TopScout[] = [];
  Array.from(userMap.entries()).forEach(([uid, stats]) => {
    const profile = profileMap.get(uid);
    if (!profile) return;
    results.push({
      userId: uid,
      handle: profile.handle,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      reportCount: stats.reportCount,
      approvedBounties: stats.approvedBounties,
      avgRating: stats.ratingCount > 0 ? Math.round((stats.totalRating / stats.ratingCount) * 10) / 10 : 0,
      analystScore: scoreMap.get(uid) ?? 0,
    });
  });

  // Sort by report count + approved bounties combined
  results.sort((a, b) => (b.reportCount + b.approvedBounties) - (a.reportCount + a.approvedBounties));
  return results.slice(0, limit);
}
