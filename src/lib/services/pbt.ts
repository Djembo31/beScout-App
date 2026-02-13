import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbPbtTreasury, DbPbtTransaction, DbFeeConfig } from '@/types';

// ============================================
// PBT Treasury
// ============================================

export async function getPbtForPlayer(playerId: string): Promise<DbPbtTreasury | null> {
  return cached(`pbt:${playerId}`, async () => {
    const { data } = await supabase
      .from('pbt_treasury')
      .select('*')
      .eq('player_id', playerId)
      .single();
    return (data as DbPbtTreasury) || null;
  }, 5 * 60 * 1000);
}

export async function getPbtTransactions(playerId: string, limit = 20): Promise<DbPbtTransaction[]> {
  return cached(`pbtTx:${playerId}:${limit}`, async () => {
    const { data } = await supabase
      .from('pbt_transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as DbPbtTransaction[]) || [];
  }, 2 * 60 * 1000);
}

// ============================================
// Fee Config
// ============================================

export async function getFeeConfig(clubNameOrId?: string | null, opts?: { byId?: boolean }): Promise<DbFeeConfig | null> {
  const key = `feeConfig:${clubNameOrId || 'global'}`;
  return cached(key, async () => {
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
  }, 5 * 60 * 1000);
}

export async function getAllFeeConfigs(): Promise<DbFeeConfig[]> {
  return cached('feeConfig:all', async () => {
    const { data } = await supabase
      .from('fee_config')
      .select('*')
      .order('club_name', { ascending: true, nullsFirst: true });
    return (data as DbFeeConfig[]) || [];
  }, 5 * 60 * 1000);
}

// ============================================
// Cache Invalidation
// ============================================

export function invalidatePbtData(playerId?: string): void {
  if (playerId) {
    invalidate(`pbt:${playerId}`);
    invalidate(`pbtTx:${playerId}`);
  } else {
    invalidate('pbt:');
    invalidate('pbtTx:');
  }
}
