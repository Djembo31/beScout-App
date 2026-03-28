import { supabase } from '@/lib/supabaseClient';
import type { DbWallet, DbHolding, DbHoldingLock, DbTransaction } from '@/types';
import { mapRpcError } from '@/lib/services/trading';

export type HoldingWithPlayer = DbHolding & {
  player: {
    first_name: string; last_name: string; position: string; club: string;
    club_id: string | null;
    floor_price: number; price_change_24h: number;
    perf_l5: number; perf_l15: number;
    matches: number; goals: number; assists: number; status: string;
    shirt_number: number; age: number;
    image_url: string | null;
  };
};


// ============================================
// Wallet Queries
// ============================================

/** Wallet des Users laden — no cache to prevent RLS race condition (null cached before session ready) */
export async function getWallet(userId: string): Promise<DbWallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('user_id, balance, locked_balance, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DbWallet;
}

// ============================================
// Holdings Queries
// ============================================

/** Alle Holdings eines Users (mit Player-Daten) */
export async function getHoldings(userId: string): Promise<HoldingWithPlayer[]> {
  // No caching — prevents auth race condition where empty results get cached
  // before Supabase session is fully initialized (RLS blocks query → cached empty)
  const { data, error } = await supabase
    .from('holdings')
    .select(`
      *,
      player:players (
        first_name,
        last_name,
        image_url,
        position,
        club,
        club_id,
        floor_price,
        price_change_24h,
        perf_l5,
        perf_l15,
        matches,
        goals,
        assists,
        status,
        shirt_number,
        age
      )
    `)
    .eq('user_id', userId)
    .gt('quantity', 0)
    .order('quantity', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as HoldingWithPlayer[];
}

/** Anzahl DPCs die ein User von einem Spieler hat */
export async function getHoldingQty(userId: string, playerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('holdings')
    .select('quantity')
    .eq('user_id', userId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    console.error(`[Wallet] getHoldingQty failed (user=${userId}, player=${playerId}):`, error.message);
    return 0;
  }
  return data?.quantity ?? 0;
}

/** Get available (unlocked) SC quantity for a user+player */
export async function getAvailableSc(userId: string, playerId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_available_sc', {
    p_user_id: userId,
    p_player_id: playerId,
  });
  if (error) { console.error('[Wallet] getAvailableSc error:', error); return 0; }
  return (data as number) ?? 0;
}

/** Get all holding locks for a user (across all active events) */
export async function getUserHoldingLocks(userId: string): Promise<DbHoldingLock[]> {
  const { data, error } = await supabase
    .from('holding_locks')
    .select('*')
    .eq('user_id', userId);
  if (error) { console.error('[Wallet] getUserHoldingLocks error:', error); return []; }
  return (data ?? []) as DbHoldingLock[];
}

/** Distinct holder count for a player */
export async function getPlayerHolderCount(playerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('holdings')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .gt('quantity', 0);
  if (error) {
    console.error(`[Wallet] getPlayerHolderCount failed (player=${playerId}):`, error.message);
    return 0;
  }
  return count ?? 0;
}

// ============================================
// Transactions Queries
// ============================================

/** Letzte Transaktionen eines Users (mit Offset-Pagination) */
export async function getTransactions(userId: string, limit = 20, offset = 0): Promise<DbTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount, balance_after, reference_id, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return (data ?? []) as DbTransaction[];
}

// ============================================
// Balance Operations (atomare RPCs)
// ============================================

type WalletRpcResult = { success: boolean; error?: string; new_balance?: number };

// ============================================
// Helpers
// ============================================

/** Cents → $SCOUT Display (z.B. 1000000 → "10.000") */
export function formatScout(cents: number): string {
  const bsd = Math.round(cents) / 100;
  return bsd.toLocaleString('de-DE', { maximumFractionDigits: 0 });
}

