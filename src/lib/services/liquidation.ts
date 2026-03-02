import { supabase } from '@/lib/supabaseClient';
import { mapRpcError } from '@/lib/services/trading';
import { notifText } from '@/lib/notifText';
import type { DbLiquidationEvent, DbLiquidationPayout } from '@/types';

// ============================================
// Success Fee Cap
// ============================================

export async function setSuccessFeeCap(
  adminId: string,
  playerId: string,
  capCents: number,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('set_success_fee_cap', {
    p_admin_id: adminId,
    p_player_id: playerId,
    p_cap_cents: capCents,
  });
  if (error) return { success: false, error: mapRpcError(error.message) };
  return { success: true };
}

// ============================================
// Liquidate Player
// ============================================

export async function liquidatePlayer(
  adminId: string,
  playerId: string,
  transferValueEur?: number,
): Promise<{
  success: boolean;
  holder_count?: number;
  distributed_cents?: number;
  pbt_distributed_cents?: number;
  success_fee_cents?: number;
  fee_per_dpc_cents?: number;
  transfer_value_eur?: number;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('liquidate_player', {
    p_admin_id: adminId,
    p_player_id: playerId,
    p_transfer_value_eur: transferValueEur ?? 0,
  });
  if (error) return { success: false, error: mapRpcError(error.message) };

  const result = data as {
    success: boolean;
    holder_count: number;
    distributed_cents: number;
    pbt_distributed_cents: number;
    success_fee_cents: number;
    fee_per_dpc_cents: number;
    transfer_value_eur: number;
    liquidation_id: string;
  };

  // Fire-and-forget: notify all holders
  (async () => {
    try {
      const { createNotification } = await import('@/lib/services/notifications');
      const { data: payouts } = await supabase
        .from('liquidation_payouts')
        .select('user_id, payout_cents, pbt_payout_cents, success_fee_payout_cents')
        .eq('liquidation_id', result.liquidation_id);
      if (payouts) {
        for (const p of payouts) {
          const totalBsd = (Math.round(p.payout_cents ?? 0) / 100).toFixed(2);
          const pbtBsd = (Math.round(p.pbt_payout_cents ?? 0) / 100).toFixed(2);
          const sfBsd = (Math.round(p.success_fee_payout_cents ?? 0) / 100).toFixed(2);
          const msg = Number(p.success_fee_payout_cents) > 0
            ? notifText('liquidationBodyFull', { total: totalBsd, pbt: pbtBsd, sf: sfBsd })
            : notifText('liquidationBodyPbt', { total: totalBsd });
          await createNotification(
            p.user_id,
            'pbt_liquidation',
            notifText('liquidationTitle'),
            msg,
            playerId,
            'player',
          );
        }
      }
    } catch (err) { console.error('[Liquidation] Holder notification failed:', err); }
  })();

  // Mission tracking handled by DB triggers on trades table

  return {
    success: true,
    holder_count: result.holder_count,
    distributed_cents: result.distributed_cents,
    pbt_distributed_cents: result.pbt_distributed_cents,
    success_fee_cents: result.success_fee_cents,
    fee_per_dpc_cents: result.fee_per_dpc_cents,
    transfer_value_eur: result.transfer_value_eur,
  };
}

// ============================================
// Queries
// ============================================

export async function getLiquidationEvent(playerId: string): Promise<DbLiquidationEvent | null> {
  const { data } = await supabase
    .from('liquidation_events')
    .select('id, player_id, club_id, triggered_by, pbt_balance_cents, success_fee_cents, distributed_cents, holder_count, transfer_value_eur, fee_per_dpc_cents, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DbLiquidationEvent) || null;
}

export async function getLiquidationPayouts(liquidationId: string): Promise<(DbLiquidationPayout & { handle?: string })[]> {
  const { data } = await supabase
    .from('liquidation_payouts')
    .select('id, liquidation_id, user_id, dpc_quantity, payout_cents, pbt_payout_cents, success_fee_payout_cents, created_at')
    .eq('liquidation_id', liquidationId)
    .order('payout_cents', { ascending: false });
  if (!data) return [];

  // Enrich with profile handles
  const userIds = Array.from(new Set((data as DbLiquidationPayout[]).map(p => p.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, handle')
    .in('id', userIds);
  const handleMap = new Map((profiles || []).map(p => [p.id, p.handle as string]));

  return (data as DbLiquidationPayout[]).map(p => ({
    ...p,
    handle: handleMap.get(p.user_id),
  }));
}

// ============================================
// Cache Invalidation
// ============================================

export function invalidateLiquidationData(_playerId?: string): void {
  // No-op: React Query handles cache invalidation
}
