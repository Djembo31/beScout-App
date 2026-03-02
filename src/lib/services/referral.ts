import { supabase } from '@/lib/supabaseClient';

export async function getUserReferralCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();
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
    .single();
  if (error || !data) return null;
  return data as { id: string; handle: string; display_name: string | null };
}

export async function applyReferralCode(userId: string, referrerCode: string): Promise<{ success: boolean; error?: string }> {
  // Look up referrer
  const referrer = await getProfileByReferralCode(referrerCode);
  if (!referrer) return { success: false, error: 'invalidCode' };
  if (referrer.id === userId) return { success: false, error: 'selfInvite' };

  // Check if already has invited_by
  const { data: profile } = await supabase
    .from('profiles')
    .select('invited_by')
    .eq('id', userId)
    .single();
  if (profile?.invited_by) return { success: false, error: 'alreadyInvited' };

  // Set invited_by
  const { error } = await supabase
    .from('profiles')
    .update({ invited_by: referrer.id })
    .eq('id', userId);
  if (error) return { success: false, error: error.message };

  // Referrer airdrop refresh handled by periodic pg_cron job
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
    .select('id, name, slug, logo')
    .eq('referral_code', code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.name, slug: data.slug, logo_url: data.logo };
}

/** Apply a club referral: ensure user follows the club as primary */
export async function applyClubReferral(userId: string, clubId: string): Promise<void> {
  const { error } = await supabase
    .from('club_followers')
    .upsert(
      { user_id: userId, club_id: clubId, is_primary: true },
      { onConflict: 'user_id,club_id' }
    );
  if (error) console.error('[Referral] applyClubReferral failed:', error.message);
}

