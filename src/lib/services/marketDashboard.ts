import { supabase } from '@/lib/supabaseClient';
import type { DbHolding, DbOffer } from '@/types';
import type { WatchlistEntry } from '@/lib/services/watchlist';

/**
 * Aggregated payload from `get_market_user_dashboard` RPC (Slice 122).
 * Collapses 4 per-user /market queries (holdings + watchlist +
 * incoming_offers + open_bids) into a single SECURITY DEFINER round-trip.
 *
 * Open bids are pre-filtered to players the user actually holds —
 * matches the `ownedByUserId` branch of `getOpenBids()` in offers.ts.
 *
 * Slice 192 type-fix: `holdings` is `DbHolding[]` (no nested `player`).
 * The RPC body (migration `20260420230000_slice_122_market_user_dashboard`)
 * does NOT join `players` — it only selects `id, user_id, player_id,
 * quantity, avg_buy_price, created_at, updated_at`. Previous code lied
 * with `as HoldingWithPlayer[]` cast, which crashed `dbHoldingToUserDpcHolding`
 * after Slice 192 mapper-throw. See `worklog/reviews/192-review.md` Finding #1.
 */
export type MarketUserDashboard = {
  holdings: DbHolding[];
  watchlist: WatchlistEntry[];
  incoming_offers: DbOffer[];
  open_bids: DbOffer[];
};

/**
 * Fetch the consolidated /market per-user payload for the given user.
 * RPC enforces AR-44 auth.uid() guard — caller MUST pass their own uid.
 * Throws on Supabase error so React Query retries naturally.
 */
export async function getMarketUserDashboard(userId: string): Promise<MarketUserDashboard> {
  const { data, error } = await supabase.rpc('get_market_user_dashboard', { p_user_id: userId });

  if (error) throw new Error(error.message);

  const row = (data ?? {}) as Partial<MarketUserDashboard>;

  return {
    holdings: (row.holdings ?? []) as DbHolding[],
    watchlist: (row.watchlist ?? []) as WatchlistEntry[],
    incoming_offers: (row.incoming_offers ?? []) as DbOffer[],
    open_bids: (row.open_bids ?? []) as DbOffer[],
  };
}
