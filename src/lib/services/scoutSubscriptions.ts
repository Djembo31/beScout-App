import { supabase } from '@/lib/supabaseClient';
import type { DbScoutSubscription, SubscribeToScoutResult, CreatorConfig } from '@/types';

// ============================================
// Creator Config
// ============================================

/** Get all creator config entries */
export async function getCreatorConfig(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('creator_config')
    .select('key, value');

  if (error) {
    console.error('[ScoutSubs] getCreatorConfig failed:', error);
    return {};
  }

  const config: Record<string, unknown> = {};
  for (const row of data ?? []) {
    config[row.key] = row.value;
  }
  return config;
}

/** Update a creator config value (admin only) */
export async function updateCreatorConfig(
  key: string,
  value: unknown,
  adminId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('creator_config')
    .update({ value: JSON.stringify(value), updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Eligibility Check
// ============================================

/** Check if user can enable subscriptions (level + follower threshold) */
export async function canEnableSubscriptions(
  userId: string,
): Promise<{ eligible: boolean; reason?: string; minLevel: number; minFollowers: number }> {
  const config = await getCreatorConfig();
  const minLevel = Number(config.beratervertrag_min_level ?? 10);
  const minFollowers = Number(config.beratervertrag_min_followers ?? 20);

  // Get user profile level
  const { data: profile } = await supabase
    .from('profiles')
    .select('level')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return { eligible: false, reason: 'Profil nicht gefunden', minLevel, minFollowers };

  // Get follower count
  const { count } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const followerCount = count ?? 0;

  if (profile.level < minLevel) {
    return { eligible: false, reason: `Mindestens Level ${minLevel} benötigt (aktuell: ${profile.level})`, minLevel, minFollowers };
  }

  if (followerCount < minFollowers) {
    return { eligible: false, reason: `Mindestens ${minFollowers} Follower benötigt (aktuell: ${followerCount})`, minLevel, minFollowers };
  }

  return { eligible: true, minLevel, minFollowers };
}

// ============================================
// Enable / Update Subscriptions
// ============================================

/** Enable subscription offering on profile */
export async function enableSubscriptions(
  userId: string,
  priceCents: number,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  const config = await getCreatorConfig();
  const minPrice = Number(config.beratervertrag_min_price_cents ?? 10000);
  const maxPrice = Number(config.beratervertrag_max_price_cents ?? 500000);

  if (priceCents < minPrice || priceCents > maxPrice) {
    return { success: false, error: `Preis muss zwischen ${minPrice / 100} und ${maxPrice / 100} $SCOUT liegen` };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_enabled: true,
      subscription_price_cents: priceCents,
      subscription_description: description ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Disable subscription offering */
export async function disableSubscriptions(userId: string): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_enabled: false, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[ScoutSubs] disableSubscriptions failed:', error);
    return { success: false };
  }
  return { success: true };
}

// ============================================
// Subscribe / Cancel
// ============================================

/** Subscribe to a scout */
export async function subscribeToScout(
  subscriberId: string,
  scoutId: string,
): Promise<SubscribeToScoutResult> {
  const { data, error } = await supabase.rpc('subscribe_to_scout', {
    p_subscriber_id: subscriberId,
    p_scout_id: scoutId,
  });

  if (error) {
    console.error('[ScoutSubs] subscribeToScout RPC error:', error);
    return { success: false, error: error.message };
  }
  return data as SubscribeToScoutResult;
}

/** Cancel auto-renew on a subscription */
export async function cancelScoutSubscription(
  subscriberId: string,
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_scout_subscription', {
    p_subscriber_id: subscriberId,
    p_subscription_id: subscriptionId,
  });

  if (error) {
    console.error('[ScoutSubs] cancel RPC error:', error);
    return { success: false, error: error.message };
  }
  return data as { success: boolean; error?: string };
}

// ============================================
// Query helpers
// ============================================

/** Check if user has active subscription to a scout */
export async function isSubscribedToScout(
  userId: string,
  scoutId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('scout_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('subscriber_id', userId)
    .eq('scout_id', scoutId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[ScoutSubs] isSubscribedToScout failed:', error);
    return false;
  }
  return (count ?? 0) > 0;
}

/** Get all scout IDs that user is subscribed to (for content blanking) */
export async function getSubscribedScoutIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('scout_subscriptions')
    .select('scout_id')
    .eq('subscriber_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[ScoutSubs] getSubscribedScoutIds failed:', error);
    return new Set();
  }
  return new Set((data ?? []).map(d => d.scout_id));
}

/** Get my subscriptions (as subscriber) */
export async function getMyScoutSubscriptions(userId: string): Promise<DbScoutSubscription[]> {
  const { data, error } = await supabase
    .from('scout_subscriptions')
    .select('*')
    .eq('subscriber_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ScoutSubs] getMyScoutSubscriptions failed:', error);
    return [];
  }
  return (data ?? []) as DbScoutSubscription[];
}

/** Get my subscribers (as scout) */
export async function getMySubscribers(userId: string): Promise<DbScoutSubscription[]> {
  const { data, error } = await supabase
    .from('scout_subscriptions')
    .select('*')
    .eq('scout_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ScoutSubs] getMySubscribers failed:', error);
    return [];
  }
  return (data ?? []) as DbScoutSubscription[];
}
