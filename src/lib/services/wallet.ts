import { supabase } from '@/lib/supabaseClient';
import type { DbWallet, DbHolding, DbHoldingLock, DbTransaction } from '@/types';
import { mapRpcError } from '@/lib/services/trading';
import { logSilentCatch } from '@/lib/observability/silentRejects';

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

  // Slice 192 defensive guard: PostgREST nested-select can silently return
  // player=null when auth-token isn't fully hydrated (race-condition with
  // AuthProvider load-fallback). Without this filter, the UI rendered
  // "ghost rows" with #0/empty-name/MID-default — the visible bug Anil saw
  // 2026-04-24. Filter ghost-rows out + Sentry-breadcrumb via logSilentCatch
  // (consistent with observability stack — see memory/pattern_observability_stack.md).
  //
  // All-ghost-edge-case: if EVERY holding has null-player (rows.length > 0),
  // throw instead of returning empty. Empty-array rendering looks identical
  // to a New-User-State which is wrong + traps the user. Throwing triggers
  // React-Query retry — auth-race usually resolves within 1-2s.
  const rows = (data ?? []) as HoldingWithPlayer[];
  const ghosts = rows.filter((h) => h.player == null);
  if (ghosts.length > 0) {
    const ghostIds = ghosts.map((g) => g.player_id).join(',');
    logSilentCatch(
      'getHoldings.ghostRows',
      new Error(`${ghosts.length}/${rows.length} holdings have NULL player`),
      { userId, ghostPlayerIds: ghostIds, totalRows: rows.length },
    );
    if (rows.length > 0 && ghosts.length === rows.length) {
      // Every row is a ghost — throw to trigger React-Query retry instead of
      // showing user a misleading empty kader.
      throw new Error('holdings_ghost_all');
    }
    return rows.filter((h) => h.player != null);
  }
  return rows;
}

/** Anzahl DPCs die ein User von einem Spieler hat */
export async function getHoldingQty(userId: string, playerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('holdings')
    .select('quantity')
    .eq('user_id', userId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.quantity ?? 0;
}

/** Get available (unlocked) SC quantity for a user+player */
export async function getAvailableSc(userId: string, playerId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_available_sc', {
    p_user_id: userId,
    p_player_id: playerId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

/** Get all holding locks for a user (across all active events) */
export async function getUserHoldingLocks(userId: string): Promise<DbHoldingLock[]> {
  const { data, error } = await supabase
    .from('holding_locks')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as DbHoldingLock[];
}

/**
 * Distinct holder count for a player.
 *
 * Slice 014 (2026-04-17): since the `holdings` SELECT policy is now scoped
 * to (own | club_admin | platform_admin), a direct count query from a
 * non-admin user would only see their own row. The `get_player_holder_count`
 * SECURITY DEFINER RPC bypasses RLS and returns the true distinct-holder
 * count.
 */
export async function getPlayerHolderCount(playerId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_player_holder_count', {
    p_player_id: playerId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
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

/**
 * Slice 201b (FM-4.3): Holders-Distribution-Aggregate.
 * Top-10-Holders-Concentration per player. Anonymized output via SECURITY
 * DEFINER RPC `get_player_holders_concentration`. Sorare-Standard fuer
 * Liquid/Iliquid-Erkennung (Floor-Price kann taeuschen wenn 1 Holder 80% haelt).
 */
export type PlayerHoldersConcentration = {
  total_holders: number;
  total_supply: number;
  top_10_supply: number;
  top_10_pct: number;
};

export async function getPlayerHoldersConcentration(
  playerId: string,
): Promise<PlayerHoldersConcentration> {
  const { data, error } = await supabase.rpc('get_player_holders_concentration', {
    p_player_id: playerId,
  });
  if (error) {
    logSilentCatch('wallet.getPlayerHoldersConcentration', error);
    throw new Error(error.message);
  }
  // Discriminated-Union check (Slice 165 pattern)
  const result = data as {
    success?: boolean;
    error?: string;
    total_holders?: number;
    total_supply?: number;
    top_10_supply?: number;
    top_10_pct?: number;
  };
  if (!result || result.success !== true) {
    throw new Error(result?.error ?? 'rpc_failed');
  }
  return {
    total_holders: result.total_holders ?? 0,
    total_supply: Number(result.total_supply ?? 0),
    top_10_supply: Number(result.top_10_supply ?? 0),
    top_10_pct: Number(result.top_10_pct ?? 0),
  };
}

/**
 * Slice 201a (FM-6.1): Per-Trade-Player-Link enrichment.
 * Fuer eine Liste von trade-IDs (aus transactions.reference_id bei type='trade_buy'/'trade_sell')
 * wird die zugehoerige Player-Info geholt. Returnt Map<trade_id, PlayerInfo>.
 *
 * Wird im Frontend genutzt um Player-Name in Transaction-Row klickbar zu machen
 * (Link zu /player/[id]). Read-only enrichment, kein Money-Path.
 */
export type TradePlayerInfo = {
  player_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

export async function getTradePlayersByIds(
  tradeIds: string[],
): Promise<Map<string, TradePlayerInfo>> {
  if (tradeIds.length === 0) return new Map();

  // Chunking via .in() — 100er Splits, errors-db.md PostgREST Pattern
  const CHUNK = 100;
  const result = new Map<string, TradePlayerInfo>();

  for (let i = 0; i < tradeIds.length; i += CHUNK) {
    const slice = tradeIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('trades')
      .select('id, player_id, players!inner(first_name, last_name, image_url)')
      .in('id', slice);

    if (error) {
      logSilentCatch('wallet.getTradePlayersByIds', error);
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      // PostgREST FK-Join: players ist single object via !inner
      const r = row as unknown as {
        id: string;
        player_id: string;
        players: { first_name: string | null; last_name: string | null; image_url: string | null } | null;
      };
      if (!r.players) continue;
      result.set(r.id, {
        player_id: r.player_id,
        first_name: r.players.first_name,
        last_name: r.players.last_name,
        image_url: r.players.image_url,
      });
    }
  }

  return result;
}

// ============================================
// Balance Operations (atomare RPCs)
// ============================================

type WalletRpcResult = { success: boolean; error?: string; new_balance?: number };

// ============================================
// Helpers
// ============================================

/** Cents → Credits-Anzeige (z.B. 1000000 → "10.000"; 1 Credit = 100 cents, D99). Funktionsname bleibt (Code-intern). */
export function formatScout(cents: number): string {
  const bsd = Math.round(cents) / 100;
  return bsd.toLocaleString('de-DE', { maximumFractionDigits: 0 });
}

