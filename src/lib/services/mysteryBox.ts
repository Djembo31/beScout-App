import { supabase } from '@/lib/supabaseClient';
import type { CosmeticRarity, MysteryBoxResult } from '@/types';

// ============================================
// Mystery Box Service
// ============================================

/** Open a mystery box (costs 15 tickets, or free if p_free = true) */
export async function openMysteryBox(free = false): Promise<{
  ok: boolean;
  rarity?: CosmeticRarity;
  rewardType?: 'tickets' | 'cosmetic';
  ticketsAmount?: number;
  cosmeticKey?: string;
  cosmeticName?: string;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('open_mystery_box', {
    p_free: free,
  });

  if (error) {
    console.error('[MysteryBox] openMysteryBox error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as {
    ok: boolean;
    rarity?: CosmeticRarity;
    reward_type?: 'tickets' | 'cosmetic';
    tickets_amount?: number;
    cosmetic_key?: string;
    cosmetic_name?: string;
    error?: string;
  };

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Unknown error' };
  }

  // Mission tracking (fire-and-forget, auth.uid() used internally by RPC)
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress('', ['open_mystery_box', 'daily_activity']);
  }).catch(err => console.error('[MysteryBox] Mission tracking failed:', err));

  return {
    ok: true,
    rarity: result.rarity,
    rewardType: result.reward_type,
    ticketsAmount: result.tickets_amount,
    cosmeticKey: result.cosmetic_key,
    cosmeticName: result.cosmetic_name,
  };
}

/** Fetch mystery box opening history (newest first) */
export async function getMysteryBoxHistory(userId: string, limit = 20): Promise<MysteryBoxResult[]> {
  const { data, error } = await supabase
    .from('mystery_box_results')
    .select('id, rarity, reward_type, tickets_amount, cosmetic_id, ticket_cost, opened_at')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[MysteryBox] getMysteryBoxHistory error:', error);
    return [];
  }
  return (data ?? []) as MysteryBoxResult[];
}
