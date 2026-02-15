import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate, invalidateTradeData, invalidateNotifications } from '@/lib/cache';
import { invalidatePbtData } from '@/lib/services/pbt';
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
  if (error) return { success: false, error: error.message };
  invalidate('players:');
  invalidate(`player:${playerId}`);
  return { success: true };
}

// ============================================
// Liquidate Player
// ============================================

export async function liquidatePlayer(
  adminId: string,
  playerId: string,
): Promise<{ success: boolean; holder_count?: number; distributed_cents?: number; success_fee_cents?: number; error?: string }> {
  const { data, error } = await supabase.rpc('liquidate_player', {
    p_admin_id: adminId,
    p_player_id: playerId,
  });
  if (error) return { success: false, error: error.message };

  const result = data as { success: boolean; holder_count: number; distributed_cents: number; success_fee_cents: number; liquidation_id: string };

  // Invalidate all related caches
  invalidateTradeData(playerId);
  invalidatePbtData(playerId);
  invalidateLiquidationData(playerId);

  // Fire-and-forget: notify all holders
  (async () => {
    try {
      const { createNotification } = await import('@/lib/services/notifications');
      const { data: payouts } = await supabase
        .from('liquidation_payouts')
        .select('user_id, payout_cents')
        .eq('liquidation_id', result.liquidation_id);
      if (payouts) {
        for (const p of payouts) {
          const payoutBsd = (Math.round(p.payout_cents ?? 0) / 100).toFixed(2);
          await createNotification(
            p.user_id,
            'pbt_liquidation',
            'DPC liquidiert',
            `Du hast ${payoutBsd} BSD aus der PBT-Ausschüttung erhalten.`,
            playerId,
            'player',
          );
          invalidateNotifications(p.user_id);
        }
      }
    } catch (err) { console.error('[Liquidation] Holder notification failed:', err); }
  })();

  // Fire-and-forget: mission tracking
  (async () => {
    try {
      const { triggerMissionProgress } = await import('@/lib/services/missions');
      triggerMissionProgress(adminId, ['weekly_trade_5']);
    } catch (err) { console.error('[Liquidation] Mission tracking failed:', err); }
  })();

  return {
    success: true,
    holder_count: result.holder_count,
    distributed_cents: result.distributed_cents,
    success_fee_cents: result.success_fee_cents,
  };
}

// ============================================
// Queries
// ============================================

export async function getLiquidationEvent(playerId: string): Promise<DbLiquidationEvent | null> {
  return cached(`liquidation:${playerId}`, async () => {
    const { data } = await supabase
      .from('liquidation_events')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return (data as DbLiquidationEvent) || null;
  }, 5 * 60 * 1000);
}

export async function getLiquidationPayouts(liquidationId: string): Promise<(DbLiquidationPayout & { handle?: string })[]> {
  return cached(`liquidationPayouts:${liquidationId}`, async () => {
    const { data } = await supabase
      .from('liquidation_payouts')
      .select('*')
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
  }, 5 * 60 * 1000);
}

// ============================================
// Cache Invalidation
// ============================================

export function invalidateLiquidationData(playerId?: string): void {
  if (playerId) {
    invalidate(`liquidation:${playerId}`);
    invalidate(`player:${playerId}`);
  }
  invalidate('players:');
  invalidate('liquidationPayouts:');
}
