import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbAirdropScore } from '@/types';

const TWO_MIN = 2 * 60 * 1000;

// ============================================
// Read
// ============================================

export async function getAirdropScore(userId: string): Promise<DbAirdropScore | null> {
  return cached(`airdropScore:${userId}`, async () => {
    const { data, error } = await supabase
      .from('airdrop_scores')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return data as DbAirdropScore;
  }, TWO_MIN);
}

export type AirdropLeaderboardEntry = DbAirdropScore & {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function getAirdropLeaderboard(limit = 50): Promise<AirdropLeaderboardEntry[]> {
  return cached(`airdropLeaderboard:${limit}`, async () => {
    const { data, error } = await supabase
      .from('airdrop_scores')
      .select('*, profiles(handle, display_name, avatar_url)')
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map(row => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const { profiles: _p, ...score } = row;
      return {
        ...score,
        handle: (profile as Record<string, unknown>)?.handle ?? '',
        display_name: (profile as Record<string, unknown>)?.display_name as string | null ?? null,
        avatar_url: (profile as Record<string, unknown>)?.avatar_url as string | null ?? null,
      } as AirdropLeaderboardEntry;
    });
  }, TWO_MIN);
}

export type AirdropStats = {
  total_users: number;
  avg_score: number;
  tier_distribution: { bronze: number; silver: number; gold: number; diamond: number };
};

export async function getAirdropStats(): Promise<AirdropStats> {
  return cached('airdropStats', async () => {
    const { data, error } = await supabase
      .from('airdrop_scores')
      .select('total_score, tier');

    if (error || !data) return { total_users: 0, avg_score: 0, tier_distribution: { bronze: 0, silver: 0, gold: 0, diamond: 0 } };

    const dist = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
    let sum = 0;
    for (const row of data) {
      sum += row.total_score;
      const t = row.tier as keyof typeof dist;
      if (t in dist) dist[t]++;
    }
    return {
      total_users: data.length,
      avg_score: data.length > 0 ? Math.round(sum / data.length) : 0,
      tier_distribution: dist,
    };
  }, TWO_MIN);
}

// ============================================
// Write / Refresh
// ============================================

export async function refreshAirdropScore(userId: string): Promise<DbAirdropScore | null> {
  const { data, error } = await supabase.rpc('refresh_airdrop_score', { p_user_id: userId });
  if (error) {
    console.error('[Airdrop] Refresh failed:', error.message);
    return null;
  }
  invalidateAirdropData(userId);
  // Re-fetch full row
  const { data: row } = await supabase
    .from('airdrop_scores')
    .select('*')
    .eq('user_id', userId)
    .single();
  return (row as DbAirdropScore) ?? null;
}

export async function refreshAllAirdropScores(): Promise<number> {
  const { data, error } = await supabase.rpc('refresh_all_airdrop_scores');
  if (error) throw new Error(error.message);
  invalidate('airdropScore:');
  invalidate('airdropLeaderboard:');
  invalidate('airdropStats');
  return (data as number) ?? 0;
}

// ============================================
// Cache Invalidation
// ============================================

export function invalidateAirdropData(userId?: string): void {
  if (userId) invalidate(`airdropScore:${userId}`);
  invalidate('airdropLeaderboard:');
  invalidate('airdropStats');
}

// ============================================
// Fire-and-forget helper for other services
// ============================================

export function triggerAirdropRefresh(userId: string): void {
  import('@/lib/services/airdropScore').then(m => {
    m.refreshAirdropScore(userId);
  }).catch(err => console.error('[Airdrop] Trigger refresh failed:', err));
}
