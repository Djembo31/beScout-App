import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbLeague } from '@/types';

const FIVE_MIN = 5 * 60 * 1000;

/** Get all active leagues */
export async function getLeagues(): Promise<DbLeague[]> {
  return cached('leagues:all', async () => {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as DbLeague[];
  }, FIVE_MIN);
}

/** Get a single league by ID */
export async function getLeagueById(leagueId: string): Promise<DbLeague | null> {
  return cached(`league:${leagueId}`, async () => {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();
    if (error) return null;
    return data as DbLeague;
  }, FIVE_MIN);
}

/** Get the active gameweek for a league */
export async function getLeagueActiveGameweek(leagueId: string): Promise<number> {
  const league = await getLeagueById(leagueId);
  return league?.active_gameweek ?? 1;
}

/** Set the active gameweek for a league (admin only) */
export async function setLeagueActiveGameweek(leagueId: string, gw: number): Promise<void> {
  const { error } = await supabase
    .from('leagues')
    .update({ active_gameweek: gw, updated_at: new Date().toISOString() })
    .eq('id', leagueId);
  if (error) throw new Error(error.message);
  invalidate(`league:${leagueId}`);
  invalidate('leagues:');
}
