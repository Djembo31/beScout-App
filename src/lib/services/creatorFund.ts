import { supabase } from '@/lib/supabaseClient';
import type { DbCreatorFundPayout } from '@/types';

// ============================================
// Creator Fund — Admin Trigger + User Queries
// ============================================

/** Trigger creator fund payout for a period (admin only) */
export async function triggerCreatorFundPayout(
  adminId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ success: boolean; total_impressions?: number; pool_cents?: number; paid_count?: number; rolled_count?: number; total_paid_cents?: number; error?: string }> {
  const { data, error } = await supabase.rpc('calculate_creator_fund_payout', {
    p_admin_id: adminId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) {
    console.error('[CreatorFund] triggerPayout RPC error:', error);
    return { success: false, error: error.message };
  }
  return data as { success: boolean; total_impressions?: number; pool_cents?: number; paid_count?: number; rolled_count?: number; total_paid_cents?: number; error?: string };
}

/** Get my creator fund payouts */
export async function getMyPayouts(userId: string): Promise<DbCreatorFundPayout[]> {
  const { data, error } = await supabase
    .from('creator_fund_payouts')
    .select('*')
    .eq('user_id', userId)
    .order('period_end', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[CreatorFund] getMyPayouts failed:', error);
    return [];
  }
  return (data ?? []) as DbCreatorFundPayout[];
}

/** Get creator fund stats (admin) — recent payouts across all users */
export async function getCreatorFundStats(): Promise<{
  totalPaid: number;
  payoutCount: number;
  recentPayouts: DbCreatorFundPayout[];
}> {
  const { data, error } = await supabase
    .from('creator_fund_payouts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[CreatorFund] getCreatorFundStats failed:', error);
    return { totalPaid: 0, payoutCount: 0, recentPayouts: [] };
  }

  const payouts = (data ?? []) as DbCreatorFundPayout[];
  const paidPayouts = payouts.filter(p => p.status === 'paid');
  const totalPaid = paidPayouts.reduce((sum, p) => sum + p.payout_cents, 0);

  return {
    totalPaid,
    payoutCount: paidPayouts.length,
    recentPayouts: payouts.slice(0, 20),
  };
}
