import { supabase } from '@/lib/supabaseClient';
import type { DbPbtTreasury, DbPbtTransaction, DbFeeConfig } from '@/types';

// ============================================
// PBT Treasury
// ============================================

export async function getPbtForPlayer(playerId: string): Promise<DbPbtTreasury | null> {
  const { data } = await supabase
    .from('pbt_treasury')
    .select('*')
    .eq('player_id', playerId)
    .single();
  return (data as DbPbtTreasury) || null;
}

export async function getPbtTransactions(playerId: string, limit = 20): Promise<DbPbtTransaction[]> {
  const { data } = await supabase
    .from('pbt_transactions')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as DbPbtTransaction[]) || [];
}

// ============================================
// Fee Config
// ============================================

export async function getFeeConfig(clubNameOrId?: string | null, opts?: { byId?: boolean }): Promise<DbFeeConfig | null> {
  // Try club-specific first, then global default
  if (clubNameOrId) {
    const col = opts?.byId ? 'club_id' : 'club_name';
    const { data } = await supabase
      .from('fee_config')
      .select('*')
      .eq(col, clubNameOrId)
      .single();
    if (data) return data as DbFeeConfig;
  }
  // Global default
  const { data } = await supabase
    .from('fee_config')
    .select('*')
    .is('club_name', null)
    .single();
  return (data as DbFeeConfig) || null;
}

export async function getAllFeeConfigs(): Promise<DbFeeConfig[]> {
  const { data } = await supabase
    .from('fee_config')
    .select('*')
    .order('club_name', { ascending: true, nullsFirst: true });
  return (data as DbFeeConfig[]) || [];
}

// ============================================
// Cache Invalidation
// ============================================

export function invalidatePbtData(_playerId?: string): void {
  // No-op: React Query handles cache invalidation
}
