import { supabase } from '@/lib/supabaseClient';
import type { DbEquipmentDefinition, DbEquipmentRank, DbUserEquipment } from '@/types';

// ============================================
// Equipment Service
// ============================================

/** Fetch all active equipment definitions */
export async function getEquipmentDefinitions(): Promise<DbEquipmentDefinition[]> {
  const { data, error } = await supabase
    .from('equipment_definitions')
    .select('id, key, name_de, name_tr, description_de, description_tr, position, icon, active, created_at')
    .eq('active', true)
    .order('position');

  if (error) {
    console.error('[Equipment] getEquipmentDefinitions error:', error);
    return [];
  }
  return (data ?? []) as DbEquipmentDefinition[];
}

/** Fetch all equipment ranks (sorted by rank) */
export async function getEquipmentRanks(): Promise<DbEquipmentRank[]> {
  const { data, error } = await supabase
    .from('equipment_ranks')
    .select('id, rank, multiplier, label')
    .order('rank');

  if (error) {
    console.error('[Equipment] getEquipmentRanks error:', error);
    return [];
  }
  return (data ?? []) as DbEquipmentRank[];
}

/**
 * Fetch user's equipment.
 * @param userId target user
 * @param includeConsumed — when true, returns consumed items as well (needed for the
 *        "Verbraucht" view on the Equipment Inventar Screen). Default false keeps the
 *        legacy lineup-picker behavior (active items only).
 */
export async function getUserEquipment(
  userId: string,
  includeConsumed = false,
): Promise<DbUserEquipment[]> {
  let query = supabase
    .from('user_equipment')
    .select('id, user_id, equipment_key, rank, source, equipped_player_id, equipped_event_id, acquired_at, consumed_at')
    .eq('user_id', userId);

  if (!includeConsumed) {
    query = query.is('consumed_at', null);
  }

  const { data, error } = await query.order('acquired_at', { ascending: false });

  if (error) {
    console.error('[Equipment] getUserEquipment error:', error);
    return [];
  }
  return (data ?? []) as DbUserEquipment[];
}

/** Equip an equipment item to a lineup slot */
export async function equipToSlot(
  eventId: string,
  equipmentId: string,
  slotKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('equip_to_slot', {
    p_event_id: eventId,
    p_equipment_id: equipmentId,
    p_slot_key: slotKey,
  });

  if (error) {
    console.error('[Equipment] equipToSlot error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; error?: string };
  return { ok: result.ok, error: result.error };
}

/** Remove equipment from a lineup slot */
export async function unequipFromSlot(
  eventId: string,
  slotKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('unequip_from_slot', {
    p_event_id: eventId,
    p_slot_key: slotKey,
  });

  if (error) {
    console.error('[Equipment] unequipFromSlot error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; error?: string };
  return { ok: result.ok, error: result.error };
}
