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

/** Fetch user's equipment inventory */
export async function getUserEquipment(userId: string): Promise<DbUserEquipment[]> {
  const { data, error } = await supabase
    .from('user_equipment')
    .select('id, user_id, equipment_key, rank, source, equipped_player_id, equipped_event_id, acquired_at')
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false });

  if (error) {
    console.error('[Equipment] getUserEquipment error:', error);
    return [];
  }
  return (data ?? []) as DbUserEquipment[];
}
