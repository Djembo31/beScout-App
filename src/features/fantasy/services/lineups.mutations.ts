import { supabase } from '@/lib/supabaseClient';
import type { DbLineup } from '@/types';

// ============================================
// Lineup Mutations
// ============================================

/** Lineup erstellen oder aktualisieren — uses SECURITY DEFINER RPC to bypass RLS */
export async function submitLineup(params: {
  eventId: string;
  userId: string;
  formation: string;
  slots: Record<string, string | null>;
  captainSlot?: string | null;
  wildcardSlots?: string[];
}): Promise<DbLineup> {
  console.log('[Lineup] save_lineup calling RPC...', { eventId: params.eventId, userId: params.userId, formation: params.formation, filledSlots: Object.values(params.slots).filter(Boolean).length });

  const { data: rpcResult, error: rpcError } = await supabase.rpc('save_lineup', {
    p_event_id: params.eventId,
    p_formation: params.formation,
    p_captain_slot: params.captainSlot ?? null,
    p_wildcard_slots: params.wildcardSlots ?? [],
    p_slot_gk: params.slots['gk'] ?? null,
    p_slot_def1: params.slots['def1'] ?? null,
    p_slot_def2: params.slots['def2'] ?? null,
    p_slot_def3: params.slots['def3'] ?? null,
    p_slot_def4: params.slots['def4'] ?? null,
    p_slot_mid1: params.slots['mid1'] ?? null,
    p_slot_mid2: params.slots['mid2'] ?? null,
    p_slot_mid3: params.slots['mid3'] ?? null,
    p_slot_mid4: params.slots['mid4'] ?? null,
    p_slot_att: params.slots['att'] ?? null,
    p_slot_att2: params.slots['att2'] ?? null,
    p_slot_att3: params.slots['att3'] ?? null,
  });

  console.log('[Lineup] save_lineup RPC returned:', { rpcResult, rpcError });

  if (rpcError) {
    console.error('[Lineup] save_lineup RPC failed:', rpcError);
    throw new Error(rpcError.message);
  }

  const result = rpcResult as { ok: boolean; error?: string; lineup_id?: string };
  if (!result.ok) {
    console.error('[Lineup] save_lineup returned ok:false:', result);
    throw new Error(result.error ?? 'lineup_save_failed');
  }

  console.log('[Lineup] save_lineup SUCCESS:', result);

  // Activity log (fire-and-forget)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'lineup_submit', 'fantasy', { eventId: params.eventId, formation: params.formation });
  }).catch(err => console.error('[Lineup] Activity log failed:', err));

  return result as unknown as DbLineup;
}
