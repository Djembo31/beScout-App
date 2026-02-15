import { supabase } from '@/lib/supabaseClient';
import { cached, invalidateTradeData } from '@/lib/cache';
import type { DbIpo } from '@/types';

const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Types
// ============================================

type CreateIpoResult = {
  success: boolean;
  error?: string;
  ipo_id?: string;
  status?: string;
  starts_at?: string;
  ends_at?: string;
};

type UpdateIpoStatusResult = {
  success: boolean;
  error?: string;
  ipo_id?: string;
  new_status?: string;
};

type IpoBuyResult = {
  success: boolean;
  error?: string;
  trade_id?: string;
  total_cost?: number;
  new_balance?: number;
  quantity?: number;
  price_per_dpc?: number;
  source?: 'ipo';
  user_total_purchased?: number;
  ipo_remaining?: number;
};

// ============================================
// IPO Queries
// ============================================

/** All active IPOs (open or early_access) */
export async function getActiveIpos(): Promise<DbIpo[]> {
  return cached('ipos:active', async () => {
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .in('status', ['open', 'early_access'])
      .order('starts_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as DbIpo[];
  }, FIVE_MIN);
}

/** Active IPO for a specific player */
export async function getIpoForPlayer(playerId: string): Promise<DbIpo | null> {
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('player_id', playerId)
    .in('status', ['open', 'early_access', 'announced'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DbIpo | null;
}

/** How many DPCs a user already bought in a specific IPO */
export async function getUserIpoPurchases(userId: string, ipoId: string): Promise<number> {
  const { data, error } = await supabase
    .from('ipo_purchases')
    .select('quantity')
    .eq('ipo_id', ipoId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0);
}

/** Buy from IPO via RPC */
export async function buyFromIpo(
  userId: string,
  ipoId: string,
  quantity: number,
  playerId?: string
): Promise<IpoBuyResult> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Ungültige Menge.');
  const { data, error } = await supabase.rpc('buy_from_ipo', {
    p_user_id: userId,
    p_ipo_id: ipoId,
    p_quantity: quantity,
  });

  if (error) throw new Error(error.message);
  invalidateTradeData(playerId ?? '', userId);
  // Mission tracking
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(userId, ['daily_buy_1', 'daily_trade_2', 'weekly_trade_5']);
  }).catch(err => console.error('[IPO] Mission tracking failed:', err));
  return data as IpoBuyResult;
}

// ============================================
// IPO Management (Admin)
// ============================================

/** Create a new IPO via RPC */
export async function createIpo(params: {
  userId: string;
  playerId: string;
  priceCents: number;
  totalOffered: number;
  maxPerUser?: number;
  durationDays?: number;
  startImmediately?: boolean;
}): Promise<CreateIpoResult> {
  const { data, error } = await supabase.rpc('create_ipo', {
    p_user_id: params.userId,
    p_player_id: params.playerId,
    p_price: params.priceCents,
    p_total_offered: params.totalOffered,
    p_max_per_user: params.maxPerUser ?? 50,
    p_duration_days: params.durationDays ?? 14,
    p_start_immediately: params.startImmediately ?? false,
  });

  if (error) throw new Error(error.message);
  invalidateTradeData('', '');
  return data as CreateIpoResult;
}

/** Update IPO status via RPC */
export async function updateIpoStatus(
  userId: string,
  ipoId: string,
  newStatus: string
): Promise<UpdateIpoStatusResult> {
  const { data, error } = await supabase.rpc('update_ipo_status', {
    p_user_id: userId,
    p_ipo_id: ipoId,
    p_new_status: newStatus,
  });

  if (error) throw new Error(error.message);
  invalidateTradeData('', '');
  return data as UpdateIpoStatusResult;
}

/** Get all IPOs for a club's players (by club name — legacy) */
export async function getIposByClub(clubName: string): Promise<DbIpo[]> {
  const { data: clubPlayers, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('club', clubName);

  if (playersError) throw new Error(playersError.message);
  if (!clubPlayers || clubPlayers.length === 0) return [];

  const playerIds = clubPlayers.map(p => p.id);

  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .in('player_id', playerIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIpo[];
}

/** Get all IPOs for a club's players (by club_id) */
export async function getIposByClubId(clubId: string): Promise<DbIpo[]> {
  const { data: clubPlayers, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('club_id', clubId);

  if (playersError) throw new Error(playersError.message);
  if (!clubPlayers || clubPlayers.length === 0) return [];

  const playerIds = clubPlayers.map(p => p.id);

  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .in('player_id', playerIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIpo[];
}
