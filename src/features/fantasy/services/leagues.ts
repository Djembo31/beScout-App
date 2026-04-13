import { supabase } from '@/lib/supabaseClient';
import type { DbFantasyLeague, LeagueLeaderboardEntry } from '@/types';

// ============================================
// Fantasy Leagues Service
// ============================================

/** Get leagues the user is a member of */
export async function getMyLeagues(userId: string): Promise<DbFantasyLeague[]> {
  const { data: memberships, error: memError } = await supabase
    .from('fantasy_league_members')
    .select('league_id')
    .eq('user_id', userId);

  if (memError) throw new Error(memError.message);
  if (!memberships || memberships.length === 0) return [];

  const leagueIds = memberships.map(m => m.league_id);
  const { data: leagues, error: leaguesError } = await supabase
    .from('fantasy_leagues')
    .select('*')
    .in('id', leagueIds)
    .order('created_at', { ascending: false });

  if (leaguesError) throw new Error(leaguesError.message);
  if (!leagues) return [];

  // Get member counts
  const counts = await Promise.all(
    leagues.map(async (l) => {
      const { count } = await supabase
        .from('fantasy_league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', l.id);
      return { id: l.id, count: count ?? 0 };
    })
  );

  const countMap = new Map(counts.map(c => [c.id, c.count]));
  return leagues.map(l => ({ ...l, member_count: countMap.get(l.id) ?? 0 })) as DbFantasyLeague[];
}

/** Create a new league */
export async function createLeague(name: string, maxMembers: number = 20): Promise<{ success: boolean; leagueId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('create_league', { p_name: name, p_max: maxMembers });
  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; league_id?: string; error?: string };
  return { success: result.success, leagueId: result.league_id, error: result.error };
}

/** Join a league by invite code */
export async function joinLeague(inviteCode: string): Promise<{ success: boolean; leagueId?: string; leagueName?: string; error?: string }> {
  const { data, error } = await supabase.rpc('join_league', { p_invite_code: inviteCode.trim() });
  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; league_id?: string; league_name?: string; error?: string };
  return { success: result.success, leagueId: result.league_id, leagueName: result.league_name, error: result.error };
}

/** Leave a league */
export async function leaveLeague(leagueId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('leave_league', { p_league_id: leagueId });
  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string };
  return result;
}

/** Get leaderboard for a league */
export async function getLeagueLeaderboard(leagueId: string): Promise<LeagueLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_league_leaderboard', { p_league_id: leagueId });
  if (error) throw new Error(error.message);
  if (!data) return [];
  return (data as LeagueLeaderboardEntry[]) ?? [];
}
