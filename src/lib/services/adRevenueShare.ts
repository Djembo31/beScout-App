import { supabase } from '@/lib/supabaseClient';
import type { DbCreatorFundPayout } from '@/types';

// ============================================
// Ad Revenue Share — Sponsor Impressions + Payouts
// ============================================

/** Log a sponsor banner impression with context authors */
export function logSponsorImpression(
  sponsorId: string,
  placement: string,
  contextAuthorIds: string[],
  viewerId: string | null,
): void {
  if (!viewerId) return;

  supabase
    .from('sponsor_impressions')
    .insert({
      sponsor_id: sponsorId,
      placement,
      context_author_ids: contextAuthorIds,
      viewer_id: viewerId,
    })
    .then(({ error }) => {
      if (error) {
        console.error('[AdRevenue] logSponsorImpression failed:', error);
      }
    });
}

/** Trigger ad revenue share payout (admin only) */
export async function triggerAdRevenuePayout(
  adminId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ success: boolean; total_revenue_cents?: number; pool_cents?: number; paid_count?: number; total_paid_cents?: number; error?: string }> {
  const { data, error } = await supabase.rpc('calculate_ad_revenue_share', {
    p_admin_id: adminId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) {
    console.error('[AdRevenue] triggerAdRevenuePayout RPC error:', error);
    return { success: false, error: error.message };
  }
  return data as { success: boolean; total_revenue_cents?: number; pool_cents?: number; paid_count?: number; total_paid_cents?: number; error?: string };
}

/** Get ad revenue stats (admin) */
export async function getAdRevenueStats(): Promise<{
  totalPaid: number;
  payoutCount: number;
}> {
  const { data, error } = await supabase
    .from('creator_fund_payouts')
    .select('payout_cents, status')
    .eq('payout_type', 'ad_revenue_share')
    .eq('status', 'paid');

  if (error) {
    console.error('[AdRevenue] getAdRevenueStats failed:', error);
    return { totalPaid: 0, payoutCount: 0 };
  }

  const payouts = (data ?? []) as Pick<DbCreatorFundPayout, 'payout_cents' | 'status'>[];
  return {
    totalPaid: payouts.reduce((sum, p) => sum + p.payout_cents, 0),
    payoutCount: payouts.length,
  };
}

/** Get my ad revenue payouts */
export async function getMyAdPayouts(userId: string): Promise<DbCreatorFundPayout[]> {
  const { data, error } = await supabase
    .from('creator_fund_payouts')
    .select('*')
    .eq('user_id', userId)
    .eq('payout_type', 'ad_revenue_share')
    .order('period_end', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[AdRevenue] getMyAdPayouts failed:', error);
    return [];
  }
  return (data ?? []) as DbCreatorFundPayout[];
}
