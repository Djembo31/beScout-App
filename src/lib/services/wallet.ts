import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbWallet, DbHolding, DbTransaction } from '@/types';

export type HoldingWithPlayer = DbHolding & {
  player: {
    first_name: string; last_name: string; position: string; club: string;
    floor_price: number; price_change_24h: number;
    perf_l5: number; perf_l15: number;
    matches: number; goals: number; assists: number; status: string;
    shirt_number: number; age: number;
  };
};

const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Wallet Queries
// ============================================

/** Wallet des Users laden */
export async function getWallet(userId: string): Promise<DbWallet | null> {
  return cached(`wallet:${userId}`, async () => {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data as DbWallet;
  }, TWO_MIN);
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
        position,
        club,
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
    .single();

  if (error) return 0;
  return data?.quantity ?? 0;
}

/** Distinct holder count for a player */
export async function getPlayerHolderCount(playerId: string): Promise<number> {
  return cached(`holderCount:${playerId}`, async () => {
    const { count, error } = await supabase
      .from('holdings')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .gt('quantity', 0);
    if (error) return 0;
    return count ?? 0;
  }, FIVE_MIN);
}

/** Bulk holder counts for multiple players */
export async function getBulkHolderCounts(playerIds: string[]): Promise<Record<string, number>> {
  if (playerIds.length === 0) return {};
  return cached(`holderCounts:${playerIds.slice(0, 5).join(',')}:${playerIds.length}`, async () => {
    const { data, error } = await supabase
      .from('holdings')
      .select('player_id, quantity')
      .in('player_id', playerIds)
      .gt('quantity', 0);
    if (error) return {};
    const counts: Record<string, number> = {};
    (data ?? []).forEach(h => {
      counts[h.player_id] = (counts[h.player_id] ?? 0) + 1;
    });
    return counts;
  }, FIVE_MIN);
}

// ============================================
// Transactions Queries
// ============================================

/** Letzte Transaktionen eines Users (mit Offset-Pagination) */
export async function getTransactions(userId: string, limit = 20, offset = 0): Promise<DbTransaction[]> {
  return cached(`transactions:${userId}:${offset}:${limit}`, async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return (data ?? []) as DbTransaction[];
  }, TWO_MIN);
}

// ============================================
// Balance Operations (atomare RPCs)
// ============================================

type WalletRpcResult = { success: boolean; error?: string; new_balance?: number };

/** Entry Fee vom Wallet abziehen (atomar, mit TX-Log) */
export async function deductEntryFee(userId: string, amountCents: number, eventName?: string, eventId?: string): Promise<number> {
  const { data, error } = await supabase.rpc('deduct_wallet_balance', {
    p_user_id: userId,
    p_amount: amountCents,
    p_type: 'entry_fee',
    p_description: eventName ? `Event-Eintritt: ${eventName}` : 'Event-Eintritt',
    p_reference_id: eventId ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as WalletRpcResult;
  if (!result.success) throw new Error(result.error ?? 'Wallet-Fehler');
  invalidate(`wallet:${userId}`);
  invalidate(`transactions:${userId}`);
  return result.new_balance!;
}

/** Entry Fee zurück auf Wallet gutschreiben (atomar, mit TX-Log) */
export async function refundEntryFee(userId: string, amountCents: number, eventName?: string, eventId?: string): Promise<number> {
  const { data, error } = await supabase.rpc('refund_wallet_balance', {
    p_user_id: userId,
    p_amount: amountCents,
    p_type: 'entry_refund',
    p_description: eventName ? `Event-Erstattung: ${eventName}` : 'Event-Erstattung',
    p_reference_id: eventId ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as WalletRpcResult;
  if (!result.success) throw new Error(result.error ?? 'Wallet-Fehler');
  invalidate(`wallet:${userId}`);
  invalidate(`transactions:${userId}`);
  return result.new_balance!;
}

// ============================================
// Helpers
// ============================================

/** Cents → BSD Display (z.B. 1000000 → "10.000") */
export function formatBsd(cents: number): string {
  const bsd = Math.round(cents) / 100;
  return bsd.toLocaleString('de-DE', { maximumFractionDigits: 0 });
}

