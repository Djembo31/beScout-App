import { supabase } from '@/lib/supabaseClient';
import type { DbFanWish, OperationResult } from '@/types';

export async function submitFanWish(params: {
  wishType: 'player' | 'club';
  playerName?: string;
  clubName?: string;
  leagueName?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('submit_fan_wish', {
    p_wish_type: params.wishType,
    p_player_name: params.playerName ?? null,
    p_club_name: params.clubName ?? null,
    p_league_name: params.leagueName ?? null,
    p_note: params.note ?? null,
  });
  if (error) return { success: false, error: error.message };
  return data as OperationResult;
}

export async function getMyWishes(): Promise<DbFanWish[]> {
  const { data, error } = await supabase
    .from('fan_wishes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbFanWish[];
}

export async function getAllWishes(): Promise<DbFanWish[]> {
  const { data, error } = await supabase
    .from('fan_wishes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as DbFanWish[];
}

export async function updateWishStatus(wishId: string, status: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('update_fan_wish_status', {
    p_wish_id: wishId,
    p_status: status,
  });
  if (error) return { success: false, error: error.message };
  return data as OperationResult;
}
