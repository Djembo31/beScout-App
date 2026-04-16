import { supabase } from '@/lib/supabaseClient';
import type { MysteryBoxRarity, MysteryBoxRewardType, MysteryBoxResult } from '@/types';

// ============================================
// Mystery Box Service (v2 — Equipment + bCredits)
// ============================================

/**
 * Drop-Rate-Entry fuer eine Rarity — returned von `get_mystery_box_drop_rates`.
 * snake_case weil der RPC-Body snake_case keys benutzt
 * (`{rates: [{rarity, drop_weight, drop_percent}], total_weight}`).
 */
export interface MysteryBoxDropRate {
  rarity: MysteryBoxRarity;
  drop_weight: number;
  drop_percent: number;
}

export interface MysteryBoxDropRatesResponse {
  rates: MysteryBoxDropRate[];
  total_weight: number;
}

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

/**
 * Fetch current drop-rates from the DB-side config (AR-48 Drop-Rate-Transparenz).
 * RPC is authenticated-only — `mystery_box_config` is RLS-gelocked, UI must NOT read directly.
 * Response keys are snake_case (`drop_weight`, `drop_percent`) — matches the `jsonb_build_object`
 * in `get_mystery_box_drop_rates()`. If you change RPC-keys, update this cast.
 */
export async function getDropRates(): Promise<MysteryBoxDropRatesResponse> {
  const { data, error } = await supabase.rpc('get_mystery_box_drop_rates');
  if (error) throw new Error(error.message);
  const result = data as MysteryBoxDropRatesResponse;
  return {
    rates: result.rates ?? [],
    total_weight: result.total_weight ?? 0,
  };
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
