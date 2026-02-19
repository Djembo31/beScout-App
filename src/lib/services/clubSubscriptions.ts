import { supabase } from '@/lib/supabaseClient';

export type SubscriptionTier = 'bronze' | 'silber' | 'gold';

export type ClubSubscription = {
  id: string;
  user_id: string;
  club_id: string;
  tier: SubscriptionTier;
  price_cents: number;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  status: 'active' | 'cancelled' | 'expired';
};

export type SubscribeResult = {
  success: boolean;
  error?: string;
  subscription_id?: string;
  tier?: string;
  price_cents?: number;
  expires_at?: string;
  new_balance?: number;
};

export const TIER_CONFIG: Record<SubscriptionTier, {
  label: string;
  priceBsd: number;
  priceCents: number;
  color: string;
  feeDiscountBps: number;
  benefits: string[];
}> = {
  bronze: {
    label: 'Bronze',
    priceBsd: 500,
    priceCents: 50000,
    color: '#CD7F32',
    feeDiscountBps: 50,
    benefits: ['Profil-Abzeichen', 'Stimmgewicht ×2 bei Votes', 'Trading-Rabatt (0.5%)'],
  },
  silber: {
    label: 'Silber',
    priceBsd: 1500,
    priceCents: 150000,
    color: '#C0C0C0',
    feeDiscountBps: 100,
    benefits: ['Alle Bronze-Vorteile', 'IPO-Vorkaufsrecht (24h)', 'Exklusive Aufträge', 'Trading-Rabatt (1%)'],
  },
  gold: {
    label: 'Gold',
    priceBsd: 3000,
    priceCents: 300000,
    color: '#FFD700',
    feeDiscountBps: 150,
    benefits: ['Alle Silber-Vorteile', 'Score Boost (+20%)', 'Premium Fantasy Events', 'Trading-Rabatt (1.5%)'],
  },
};

/** Get user's active subscription for a club */
export async function getMySubscription(userId: string, clubId: string): Promise<ClubSubscription | null> {
  const { data, error } = await supabase
    .from('club_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;
  return data as ClubSubscription;
}

/** Subscribe to a club */
export async function subscribeTo(
  userId: string,
  clubId: string,
  tier: SubscriptionTier
): Promise<SubscribeResult> {
  const { data, error } = await supabase.rpc('subscribe_to_club', {
    p_user_id: userId,
    p_club_id: clubId,
    p_tier: tier,
  });

  if (error) throw new Error(error.message);
  const result = data as SubscribeResult;

  if (result.success) {
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'subscription_purchase', 'club', { clubId, tier });
    }).catch(err => console.error('[ClubSub] Activity log failed:', err));
  }

  return result;
}

/** Cancel auto-renew */
export async function cancelSubscription(userId: string, clubId: string): Promise<boolean> {
  const { error } = await supabase
    .from('club_subscriptions')
    .update({ auto_renew: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('status', 'active');

  if (error) return false;
  return true;
}

/** Get all active subscribers for a club (admin) */
export async function getClubSubscribers(clubId: string): Promise<{
  total: number;
  byTier: Record<SubscriptionTier, number>;
  revenueCents: number;
}> {
  const { data, error } = await supabase
    .from('club_subscriptions')
    .select('tier, price_cents')
    .eq('club_id', clubId)
    .eq('status', 'active');

  if (error || !data) return { total: 0, byTier: { bronze: 0, silber: 0, gold: 0 }, revenueCents: 0 };

  const byTier = { bronze: 0, silber: 0, gold: 0 };
  let revenueCents = 0;
  for (const row of data) {
    const tier = row.tier as SubscriptionTier;
    if (byTier[tier] !== undefined) byTier[tier]++;
    revenueCents += row.price_cents;
  }

  return { total: data.length, byTier, revenueCents };
}
