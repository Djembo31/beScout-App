import { supabase } from '@/lib/supabaseClient';
import type { DbUserFoundingPass, FoundingPassTier } from '@/types';
import { compareTiers } from '@/lib/foundingPasses';

// ============================================
// Founding Passes Service
// ============================================

/** Fetch all founding passes for a user (newest first) */
export async function getUserFoundingPasses(userId: string): Promise<DbUserFoundingPass[]> {
  const { data, error } = await supabase
    .from('user_founding_passes')
    .select('id, user_id, tier, price_eur_cents, bcredits_granted, migration_bonus_pct, payment_reference, granted_by, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[FoundingPasses] getUserFoundingPasses error:', error);
    return [];
  }
  return (data ?? []) as DbUserFoundingPass[];
}

/** Get the highest-tier pass for a user (founder > pro > scout > fan) */
export async function getHighestPass(userId: string): Promise<DbUserFoundingPass | null> {
  const passes = await getUserFoundingPasses(userId);
  if (passes.length === 0) return null;

  return passes.reduce((best, current) =>
    compareTiers(current.tier as FoundingPassTier, best.tier as FoundingPassTier) > 0
      ? current
      : best
  );
}

/** Grant a founding pass via RPC (admin action) */
export async function grantFoundingPass(
  userId: string,
  tier: FoundingPassTier,
  priceEurCents: number,
  paymentReference?: string,
): Promise<{ ok: boolean; passId?: string; bcreditsGranted?: number; newBalance?: number; error?: string }> {
  const { data, error } = await supabase.rpc('grant_founding_pass', {
    p_user_id: userId,
    p_tier: tier,
    p_price_eur_cents: priceEurCents,
    p_payment_reference: paymentReference ?? null,
  });

  if (error) {
    console.error('[FoundingPasses] grantFoundingPass error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; pass_id?: string; bcredits_granted?: number; new_balance?: number; error?: string };

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Unknown error' };
  }

  return {
    ok: true,
    passId: result.pass_id,
    bcreditsGranted: result.bcredits_granted,
    newBalance: result.new_balance,
  };
}

/** Quick check: does user have any founding pass? */
export async function hasFoundingPass(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('user_founding_passes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('[FoundingPasses] hasFoundingPass error:', error);
    return false;
  }
  return (count ?? 0) > 0;
}
