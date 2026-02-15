import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';

const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Types
// ============================================

export type DpcOfTheWeek = {
  id: string;
  playerId: string;
  playerFirstName: string;
  playerLastName: string;
  playerPosition: string;
  playerClub: string;
  playerPerfL5: number;
  gameweek: number;
  score: number;
  holderCount: number;
  createdAt: string;
};

// ============================================
// Queries
// ============================================

/** Get the latest DPC of the Week (cached 5 min) */
export async function getDpcOfTheWeek(): Promise<DpcOfTheWeek | null> {
  return cached('dpc-of-week:latest', async () => {
    const { data, error } = await supabase
      .from('dpc_of_the_week')
      .select('*, players(first_name, last_name, position, club, perf_l5)')
      .order('gameweek', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const player = Array.isArray(data.players) ? data.players[0] : data.players;

    return {
      id: data.id,
      playerId: data.player_id,
      playerFirstName: player?.first_name ?? '',
      playerLastName: player?.last_name ?? '',
      playerPosition: player?.position ?? 'MID',
      playerClub: player?.club ?? '',
      playerPerfL5: player?.perf_l5 ?? 0,
      gameweek: data.gameweek,
      score: data.score,
      holderCount: data.holder_count,
      createdAt: data.created_at,
    };
  }, FIVE_MIN);
}

/** Calculate DPC of the Week for a given gameweek (fire-and-forget after scoring) */
export async function calculateDpcOfWeek(gameweek: number): Promise<{ success: boolean; playerId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('calculate_dpc_of_week', {
    p_gameweek: gameweek,
  });

  if (error) return { success: false, error: error.message };

  invalidate('dpc-of-week:');

  const result = data as { success: boolean; player_id?: string; score?: number; holder_count?: number; error?: string };

  // Fire-and-forget: notify all holders of this player
  if (result.success && result.player_id) {
    notifyHolders(result.player_id, gameweek, result.score ?? 0).catch(err =>
      console.error('[DpcOfWeek] Holder notification failed:', err)
    );
  }

  return { success: result.success, playerId: result.player_id, error: result.error };
}

/** Notify all holders of the DPC of the Week player */
async function notifyHolders(playerId: string, gameweek: number, score: number): Promise<void> {
  // Get player name
  const { data: player } = await supabase
    .from('players')
    .select('first_name, last_name')
    .eq('id', playerId)
    .single();

  const playerName = player ? `${player.first_name} ${player.last_name}` : 'Unbekannt';

  // Get all holders
  const { data: holders } = await supabase
    .from('holdings')
    .select('user_id')
    .eq('player_id', playerId)
    .gt('quantity', 0);

  if (!holders || holders.length === 0) return;

  const { createNotification } = await import('@/lib/services/notifications');

  for (const h of holders) {
    createNotification(
      h.user_id,
      'dpc_of_week',
      `DPC der Woche: ${playerName}`,
      `${playerName} ist der DPC der Woche (GW ${gameweek}, Score: ${score})! Du besitzt seine DPC.`,
      playerId,
      'player'
    );
  }
}
