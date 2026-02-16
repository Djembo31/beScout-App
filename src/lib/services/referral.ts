import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';

const TWO_MIN = 2 * 60 * 1000;

export async function getUserReferralCode(userId: string): Promise<string | null> {
  return cached(`referralCode:${userId}`, async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data.referral_code as string | null;
  }, TWO_MIN);
}

export async function getUserReferralCount(userId: string): Promise<number> {
  return cached(`referralCount:${userId}`, async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('invited_by', userId);
    if (error) return 0;
    return count ?? 0;
  }, TWO_MIN);
}

export async function getProfileByReferralCode(code: string): Promise<{ id: string; handle: string; display_name: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name')
    .eq('referral_code', code.toUpperCase())
    .single();
  if (error || !data) return null;
  return data as { id: string; handle: string; display_name: string | null };
}

export async function applyReferralCode(userId: string, referrerCode: string): Promise<{ success: boolean; error?: string }> {
  // Look up referrer
  const referrer = await getProfileByReferralCode(referrerCode);
  if (!referrer) return { success: false, error: 'Ungültiger Einladungscode.' };
  if (referrer.id === userId) return { success: false, error: 'Du kannst dich nicht selbst einladen.' };

  // Check if already has invited_by
  const { data: profile } = await supabase
    .from('profiles')
    .select('invited_by')
    .eq('id', userId)
    .single();
  if (profile?.invited_by) return { success: false, error: 'Du wurdest bereits eingeladen.' };

  // Set invited_by
  const { error } = await supabase
    .from('profiles')
    .update({ invited_by: referrer.id })
    .eq('id', userId);
  if (error) return { success: false, error: error.message };

  invalidate(`referralCount:${referrer.id}`);
  invalidate(`profile:${userId}`);

  // Fire-and-forget: refresh referrer's airdrop score
  import('@/lib/services/airdropScore').then(m => {
    m.refreshAirdropScore(referrer.id);
  }).catch(err => console.error('[Referral] Airdrop refresh failed:', err));

  return { success: true };
}

/** Fire-and-forget: reward referrer when referee makes first trade */
export async function triggerReferralReward(refereeId: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('reward_referral', { p_referee_id: refereeId });
    if (error) {
      console.error('[Referral] RPC error:', error.message);
      return;
    }
    const result = data as { success: boolean; reason?: string; referrer_id?: string };
    if (result.success && result.referrer_id) {
      invalidate(`wallet:${result.referrer_id}`);
      invalidate(`referralCount:${result.referrer_id}`);
      // Refresh referrer airdrop score
      import('@/lib/services/airdropScore').then(m => {
        m.refreshAirdropScore(result.referrer_id!);
      }).catch(err => console.error('[Referral] Airdrop refresh failed:', err));
    }
  } catch (err) {
    console.error('[Referral] triggerReferralReward failed:', err);
  }
}

export type ReferralLeaderboardEntry = { user_id: string; handle: string; display_name: string | null; count: number };

export async function getReferralLeaderboard(limit = 20): Promise<ReferralLeaderboardEntry[]> {
  return cached(`referralLeaderboard:${limit}`, async () => {
    // Count referrals per user via invited_by
    const { data, error } = await supabase
      .from('profiles')
      .select('invited_by')
      .not('invited_by', 'is', null);
    if (error || !data) return [];

    const counts = new Map<string, number>();
    for (const row of data) {
      const refId = row.invited_by as string;
      counts.set(refId, (counts.get(refId) ?? 0) + 1);
    }

    // Sort and take top N
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (sorted.length === 0) return [];

    // Fetch profiles
    const ids = sorted.map(([id]) => id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name')
      .in('id', ids);

    const profileMap = new Map<string, { handle: string; display_name: string | null }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { handle: p.handle, display_name: p.display_name });
    }

    return sorted.map(([id, count]) => ({
      user_id: id,
      handle: profileMap.get(id)?.handle ?? '',
      display_name: profileMap.get(id)?.display_name ?? null,
      count,
    }));
  }, TWO_MIN);
}
