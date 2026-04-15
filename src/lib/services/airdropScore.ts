import { supabase } from '@/lib/supabaseClient';
import type { DbAirdropScore } from '@/types';
import { normaliseAirdropTier } from '@/types';

// ============================================
// Read
// ============================================

/**
 * Normalise the tier column — DB RPC returns 'silver' (English CHECK),
 * while TS/UI uses 'silber' (German). Prevents TIER_CONFIG[undefined] crash.
 */
function normaliseRow<T extends { tier?: unknown } | null>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const tier = (row as { tier?: unknown }).tier;
  if (typeof tier === 'string') {
    (row as { tier: string }).tier = normaliseAirdropTier(tier);
  }
  return row;
}

export async function getAirdropScore(userId: string): Promise<DbAirdropScore | null> {
  const { data, error } = await supabase
    .from('airdrop_scores')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normaliseRow(data as DbAirdropScore);
}

export type AirdropLeaderboardEntry = DbAirdropScore & {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function getAirdropLeaderboard(limit = 50): Promise<AirdropLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('airdrop_scores')
    .select('*, profiles(handle, display_name, avatar_url)')
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!data) return [];
  return (data as Array<Record<string, unknown>>).map(row => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const { profiles: _p, ...score } = row;
    const entry = {
      ...score,
      tier: normaliseAirdropTier(score.tier as string),
      handle: (profile as Record<string, unknown>)?.handle ?? '',
      display_name: (profile as Record<string, unknown>)?.display_name as string | null ?? null,
      avatar_url: (profile as Record<string, unknown>)?.avatar_url as string | null ?? null,
    } as AirdropLeaderboardEntry;
    return entry;
  });
}

export type AirdropStats = {
  total_users: number;
  avg_score: number;
  tier_distribution: { bronze: number; silber: number; gold: number; diamond: number };
};

export async function getAirdropStats(): Promise<AirdropStats> {
  const { data, error } = await supabase
    .from('airdrop_scores')
    .select('total_score, tier')
    .limit(1000);

  if (error) throw new Error(error.message);
  if (!data) return { total_users: 0, avg_score: 0, tier_distribution: { bronze: 0, silber: 0, gold: 0, diamond: 0 } };

  const dist = { bronze: 0, silber: 0, gold: 0, diamond: 0 };
  let sum = 0;
  for (const row of data) {
    sum += row.total_score;
    // Normalise DB 'silver' -> 'silber' before bucketing
    const t = normaliseAirdropTier(row.tier as string);
    dist[t]++;
  }
  return {
    total_users: data.length,
    avg_score: data.length > 0 ? Math.round(sum / data.length) : 0,
    tier_distribution: dist,
  };
}

// ============================================
// Write / Refresh
// ============================================

export async function refreshAirdropScore(userId: string): Promise<DbAirdropScore | null> {
  // Use wrapper RPC that calls auth.uid() internally (direct refresh_airdrop_score is REVOKED)
  const { data, error } = await supabase.rpc('refresh_my_airdrop_score');
  if (error) throw new Error(error.message);
  // Re-fetch full row
  const { data: row } = await supabase
    .from('airdrop_scores')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!row) return null;
  return normaliseRow(row as DbAirdropScore);
}

export async function refreshAllAirdropScores(): Promise<number> {
  const { data, error } = await supabase.rpc('refresh_all_airdrop_scores');
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

