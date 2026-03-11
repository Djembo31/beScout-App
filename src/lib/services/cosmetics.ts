import { supabase } from '@/lib/supabaseClient';
import type { DbCosmeticDefinition, UserCosmeticWithDef } from '@/types';

// ============================================
// Cosmetics Service
// ============================================

/** Fetch all cosmetics owned by a user (with definitions) */
export async function getUserCosmetics(userId: string): Promise<UserCosmeticWithDef[]> {
  const { data, error } = await supabase
    .from('user_cosmetics')
    .select('id, user_id, cosmetic_id, source, equipped, acquired_at, cosmetic_definitions!inner(id, key, type, name, description, rarity, css_class, metadata, active, created_at)')
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false });

  if (error) {
    console.error('[Cosmetics] getUserCosmetics error:', error);
    return [];
  }

  // Map PostgREST join to our expected shape
  return ((data ?? []) as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    user_id: row.user_id as string,
    cosmetic_id: row.cosmetic_id as string,
    source: row.source as UserCosmeticWithDef['source'],
    equipped: row.equipped as boolean,
    acquired_at: row.acquired_at as string,
    cosmetic: row.cosmetic_definitions as unknown as UserCosmeticWithDef['cosmetic'],
  }));
}

/** Fetch only equipped cosmetics for a user */
export async function getEquippedCosmetics(userId: string): Promise<UserCosmeticWithDef[]> {
  const { data, error } = await supabase
    .from('user_cosmetics')
    .select('id, user_id, cosmetic_id, source, equipped, acquired_at, cosmetic_definitions!inner(id, key, type, name, description, rarity, css_class, metadata, active, created_at)')
    .eq('user_id', userId)
    .eq('equipped', true);

  if (error) {
    console.error('[Cosmetics] getEquippedCosmetics error:', error);
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    user_id: row.user_id as string,
    cosmetic_id: row.cosmetic_id as string,
    source: row.source as UserCosmeticWithDef['source'],
    equipped: row.equipped as boolean,
    acquired_at: row.acquired_at as string,
    cosmetic: row.cosmetic_definitions as unknown as UserCosmeticWithDef['cosmetic'],
  }));
}

/** Equip/unequip a cosmetic (toggles via RPC, auto-unequips same type) */
export async function equipCosmetic(cosmeticId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('equip_cosmetic', {
    p_cosmetic_id: cosmeticId,
  });

  if (error) {
    console.error('[Cosmetics] equipCosmetic error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; error?: string };

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Unknown error' };
  }

  return { ok: true };
}

/** Fetch all active cosmetic definitions (for catalog/shop) */
export async function getAllCosmetics(): Promise<DbCosmeticDefinition[]> {
  const { data, error } = await supabase
    .from('cosmetic_definitions')
    .select('id, key, type, name, description, rarity, css_class, metadata, active, created_at')
    .eq('active', true)
    .order('rarity')
    .order('type');

  if (error) {
    console.error('[Cosmetics] getAllCosmetics error:', error);
    return [];
  }
  return (data ?? []) as DbCosmeticDefinition[];
}
