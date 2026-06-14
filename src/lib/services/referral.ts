import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError } from '@/lib/supabaseErrors';

export async function getUserReferralCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.referral_code as string | null;
}

export async function getUserReferralCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('invited_by', userId);
  if (error) return 0;
  return count ?? 0;
}

export async function getProfileByReferralCode(code: string): Promise<{ id: string; handle: string; display_name: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name')
    .eq('referral_code', code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; handle: string; display_name: string | null };
}

/**
 * Apply a referral code to the current user (sets profiles.invited_by).
 *
 * Slice 317b: routed through the SECURITY DEFINER RPC `apply_referral_code` because
 * `invited_by` is frozen against direct client `.update()` by the Slice-317 guard trigger.
 * The RPC also validates valid-code / self-invite / already-invited server-side (the old
 * client-side checks were bypassable via direct PostgREST). Uses auth.uid() — no userId param.
 */
export async function applyReferralCode(referrerCode: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('apply_referral_code', { p_referrer_code: referrerCode });
  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string };
  if (!result.success) return { success: false, error: result.error ?? 'referral_failed' };
  return { success: true };
}

/** Fire-and-forget: reward referrer (500 $SCOUT) + referee (250 $SCOUT) on first trade */
export async function triggerReferralReward(refereeId: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('reward_referral', { p_referee_id: refereeId });
    if (error) {
      console.error('[Referral] RPC error:', error.message);
      return;
    }
    const result = data as { success: boolean; reason?: string; referrer_id?: string; referee_reward?: number };
    if (!result.success) {
      // Already rewarded or no referrer — expected, not an error
    }
    // Notifications are handled inside the RPC — no client-side notification needed
  } catch (err) {
    console.error('[Referral] triggerReferralReward failed:', err);
  }
}

/** Look up a club by its referral code */
export async function getClubByReferralCode(code: string): Promise<{ id: string; name: string; slug: string; logo_url: string | null } | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, slug, logo_url')
    .eq('referral_code', code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.name, slug: data.slug, logo_url: data.logo_url };
}

/** Apply a club referral: ensure user follows the club as primary */
export async function applyClubReferral(userId: string, clubId: string): Promise<void> {
  const { error } = await supabase
    .from('club_followers')
    .upsert(
      { user_id: userId, club_id: clubId, is_primary: true },
      { onConflict: 'user_id,club_id' }
    );
  if (error) {
    logSupabaseError('[Referral] applyClubReferral failed', error);
    throw new Error(error.message);
  }
}

