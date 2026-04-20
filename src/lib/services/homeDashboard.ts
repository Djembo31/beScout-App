import { supabase } from '@/lib/supabaseClient';
import type {
  DbUserStats,
  DbUserFoundingPass,
  DbUserTickets,
} from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';

/**
 * Aggregated payload from `get_home_dashboard_v1` RPC (Slice 109).
 * Collapses 4 per-user queries (holdings + user_stats + tickets + highest_pass)
 * into a single SECURITY DEFINER round-trip for /home.
 */
export type HomeDashboard = {
  holdings: HoldingWithPlayer[];
  user_stats: DbUserStats | null;
  tickets: DbUserTickets | null;
  highest_pass: DbUserFoundingPass | null;
};

/**
 * Fetch the consolidated /home dashboard for the authenticated user.
 * RPC enforces AR-44 auth.uid() guard — callers do not pass p_user_id.
 * Throws on Supabase error so React Query retries naturally.
 */
export async function getHomeDashboard(): Promise<HomeDashboard> {
  const { data, error } = await supabase.rpc('get_home_dashboard_v1');

  if (error) throw new Error(error.message);

  const row = (data ?? {}) as Partial<HomeDashboard>;

  return {
    holdings: (row.holdings ?? []) as HoldingWithPlayer[],
    user_stats: (row.user_stats ?? null) as DbUserStats | null,
    tickets: (row.tickets ?? null) as DbUserTickets | null,
    highest_pass: (row.highest_pass ?? null) as DbUserFoundingPass | null,
  };
}
