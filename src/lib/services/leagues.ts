import { supabase } from '@/lib/supabaseClient';
import type { DbLeague } from '@/types';

/** Get all active leagues */
export async function getLeagues(): Promise<DbLeague[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as DbLeague[];
}

/** Get a single league by ID */
export async function getLeagueById(leagueId: string): Promise<DbLeague | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();
  if (error) return null;
  return data as DbLeague;
}

/** Get the active gameweek for a league */
export async function getLeagueActiveGameweek(leagueId: string): Promise<number> {
  const league = await getLeagueById(leagueId);
  return league?.active_gameweek ?? 1;
}

/** Set the active gameweek for a league (admin only).
 *  Uses SECURITY DEFINER RPC to bypass RLS — guaranteed execution. */
export async function setLeagueActiveGameweek(leagueId: string, gw: number): Promise<void> {
  const { error } = await supabase.rpc('set_league_active_gameweek', {
    p_league_id: leagueId,
    p_gameweek: gw,
  });
  if (error) throw new Error(error.message);
}
