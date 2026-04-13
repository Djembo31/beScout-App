import { supabase } from '@/lib/supabaseClient';
import type { DbPbtTreasury, DbPbtTransaction, DbFeeConfig } from '@/types';

// ============================================
// PBT Treasury
// ============================================

export async function getPbtForPlayer(playerId: string): Promise<DbPbtTreasury | null> {
  const { data, error } = await supabase
    .from('pbt_treasury')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbPbtTreasury) || null;
}

export async function getPbtTransactions(playerId: string, limit = 20): Promise<DbPbtTransaction[]> {
  const { data, error } = await supabase
    .from('pbt_transactions')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as DbPbtTransaction[]) || [];
}

// ============================================
// Fee Config
// ============================================

export async function getFeeConfig(clubNameOrId?: string | null, opts?: { byId?: boolean }): Promise<DbFeeConfig | null> {
  // Try club-specific first, then global default
  if (clubNameOrId) {
    const col = opts?.byId ? 'club_id' : 'club_name';
    const { data, error } = await supabase
      .from('fee_config')
      .select('*')
      .eq(col, clubNameOrId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as DbFeeConfig;
  }
  // Global default
  const { data, error: globalError } = await supabase
    .from('fee_config')
    .select('*')
    .is('club_name', null)
    .maybeSingle();
  if (globalError) throw new Error(globalError.message);
  return (data as DbFeeConfig) || null;
}

export async function getAllFeeConfigs(): Promise<DbFeeConfig[]> {
  const { data, error } = await supabase
    .from('fee_config')
    .select('*')
    .order('club_name', { ascending: true, nullsFirst: true });
  if (error) throw new Error(error.message);
  return (data as DbFeeConfig[]) || [];
}

