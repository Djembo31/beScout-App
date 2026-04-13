import { supabase } from '@/lib/supabaseClient';
import type { MysteryBoxRarity, MysteryBoxRewardType, MysteryBoxResult } from '@/types';

// ============================================
// Mystery Box Service (v2 — Equipment + bCredits)
// ============================================

/** Open a mystery box (costs 15 tickets, or free if p_free = true) */
export async function openMysteryBox(free = false): Promise<{
  ok: boolean;
  rarity?: MysteryBoxRarity;
  rewardType?: MysteryBoxRewardType;
  ticketsAmount?: number;
  equipmentType?: string;
  equipmentRank?: number;
  equipmentNameDe?: string;
  equipmentNameTr?: string;
  equipmentPosition?: string;
  bcreditsAmount?: number;
  cosmeticKey?: string;
  cosmeticName?: string;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('open_mystery_box_v2', {
    p_free: free,
  });

  if (error) {
    console.error('[MysteryBox] openMysteryBox error:', error);
    return { ok: false, error: error.message };
  }

  // RPC `open_mystery_box_v2` returns camelCase keys (rewardType, ticketsAmount,
  // equipmentType, cosmeticKey, …) — see `jsonb_build_object` call in the
  // migration. The legacy v1 RPC used snake_case; do NOT "fix" this to
  // snake_case without also updating the migration.
  const result = data as {
    ok: boolean;
    rarity?: MysteryBoxRarity;
    rewardType?: MysteryBoxRewardType;
    ticketsAmount?: number;
    equipmentType?: string;
    equipmentRank?: number;
    equipmentNameDe?: string;
    equipmentNameTr?: string;
    equipmentPosition?: string;
    bcreditsAmount?: number;
    cosmeticKey?: string;
    cosmeticName?: string;
    error?: string;
  };

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Unknown error' };
  }

  // Mission tracking (fire-and-forget)
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress('', ['open_mystery_box', 'daily_activity']);
  }).catch(err => console.error('[MysteryBox] Mission tracking failed:', err));

  return {
    ok: true,
    rarity: result.rarity,
    rewardType: result.rewardType,
    ticketsAmount: result.ticketsAmount ?? undefined,
    equipmentType: result.equipmentType ?? undefined,
    equipmentRank: result.equipmentRank ?? undefined,
    equipmentNameDe: result.equipmentNameDe ?? undefined,
    equipmentNameTr: result.equipmentNameTr ?? undefined,
    equipmentPosition: result.equipmentPosition ?? undefined,
    bcreditsAmount: result.bcreditsAmount ?? undefined,
    cosmeticKey: result.cosmeticKey ?? undefined,
    cosmeticName: result.cosmeticName ?? undefined,
  };
}

/**
 * Count free mystery boxes the user has already opened today (UTC day).
 * Used as the server-authoritative gate for the daily free-box slot.
 * Returns 0 on RLS/fetch errors so the UI fails open — the RPC enforces the real cap.
 */
export async function countFreeMysteryBoxesToday(userId: string): Promise<number> {
  const startOfUtcDay = new Date();
  startOfUtcDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('mystery_box_results')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ticket_cost', 0)
    .gte('opened_at', startOfUtcDay.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Fetch mystery box opening history (newest first) */
export async function getMysteryBoxHistory(userId: string, limit = 20): Promise<MysteryBoxResult[]> {
  const { data, error } = await supabase
    .from('mystery_box_results')
    .select('id, rarity, reward_type, tickets_amount, cosmetic_id, equipment_type, equipment_rank, bcredits_amount, ticket_cost, opened_at')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as MysteryBoxResult[];
}
