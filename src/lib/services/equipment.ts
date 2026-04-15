import { supabase } from '@/lib/supabaseClient';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { DbEquipmentDefinition, DbEquipmentRank, DbUserEquipment } from '@/types';

// ============================================
// Equipment Service
//
// Error-Handling (J11 Healer — FIX-05):
// - Writes (`equipToSlot`, `unequipFromSlot`) werfen `Error(i18n-key)` analog
//   zum J3/J4-Throw-Pattern statt `return {ok:false, error:...}`. Consumer
//   resolven via `te(mapErrorToKey(normalizeError(err)))`. Zuvor schluckten
//   Fehler in `console.error`, der UI-Pfad rief nur einen Log auf — User sah
//   kein Feedback, Equipment wurde scheinbar "gespeichert".
// ============================================

/** Fetch all active equipment definitions */
export async function getEquipmentDefinitions(): Promise<DbEquipmentDefinition[]> {
  const { data, error } = await supabase
    .from('equipment_definitions')
    .select('id, key, name_de, name_tr, description_de, description_tr, position, icon, active, created_at')
    .eq('active', true)
    .order('position');

  if (error) throw new Error(error.message);
  return (data ?? []) as DbEquipmentDefinition[];
}

/** Fetch all equipment ranks (sorted by rank) */
export async function getEquipmentRanks(): Promise<DbEquipmentRank[]> {
  const { data, error } = await supabase
    .from('equipment_ranks')
    .select('id, rank, multiplier, label')
    .order('rank');

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  return (data ?? []) as DbUserEquipment[];
}

/**
 * Equip an equipment item to a lineup slot.
 *
 * Wirft `Error(<i18n-key>)` bei Supabase- oder RPC-Fehler — Caller resolved via
 * `te(mapErrorToKey(normalizeError(err)))`. Success-Return ist immer `{ok:true}`.
 *
 * RPC kann `{ok:false, error:'Equipment not available'|'No lineup found'|
 * 'Slot is empty'|'Position mismatch'|'Lineup is locked'}` zurueckgeben — dies
 * wird ebenfalls in einen Throw konvertiert.
 */
export async function equipToSlot(
  eventId: string,
  equipmentId: string,
  slotKey: string,
): Promise<{ ok: true }> {
  const { data, error } = await supabase.rpc('equip_to_slot', {
    p_event_id: eventId,
    p_equipment_id: equipmentId,
    p_slot_key: slotKey,
  });

  if (error) {
    throw new Error(mapErrorToKey(normalizeError(error)));
  }

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) {
    throw new Error(mapErrorToKey(result.error ?? 'generic'));
  }
  return { ok: true };
}

/**
 * Remove equipment from a lineup slot.
 *
 * Wirft `Error(<i18n-key>)` bei Fehler. Success-Return ist `{ok:true}`.
 * RPC kann `{ok:false, error:'No lineup found'|'No equipment on this slot'}`
 * zurueckgeben — wird in Throw konvertiert.
 */
export async function unequipFromSlot(
  eventId: string,
  slotKey: string,
): Promise<{ ok: true }> {
  const { data, error } = await supabase.rpc('unequip_from_slot', {
    p_event_id: eventId,
    p_slot_key: slotKey,
  });

  if (error) {
    throw new Error(mapErrorToKey(normalizeError(error)));
  }

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) {
    throw new Error(mapErrorToKey(result.error ?? 'generic'));
  }
  return { ok: true };
}
