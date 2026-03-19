import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ──

export interface MarketPlayer {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  club: string;
  club_id: string;
  floor_price: number | null;
  last_price: number | null;
  reference_price: number | null;
  ipo_price: number | null;
  perf_l5: number | null;
  perf_l15: number | null;
  dpc_available: number;
  dpc_total: number;
  is_liquidated: boolean;
  volume_24h: number | null;
  price_change_24h: number | null;
}

export interface Holding {
  player_id: string;
  quantity: number;
  avg_buy_price: number;
  player: MarketPlayer;
}

export interface SellOrder {
  id: string;
  user_id: string;
  player_id: string;
  price: number;
  quantity: number;
  filled_qty: number;
  status: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  category: string;
  created_at: string;
  player_id: string | null;
  club_name: string | null;
}

// ── READ Actions ──

export async function getBalance(sb: SupabaseClient, userId: string) {
  const { data } = await sb.from('wallets').select('balance, locked_balance').eq('user_id', userId).single();
  return { balance: data?.balance ?? 0, locked: data?.locked_balance ?? 0 };
}

export async function getHoldings(sb: SupabaseClient, userId: string): Promise<Holding[]> {
  const { data } = await sb.from('holdings')
    .select(`player_id, quantity, avg_buy_price, players!inner(
      id, first_name, last_name, position, club, club_id,
      floor_price, last_price, reference_price, ipo_price,
      perf_l5, perf_l15, dpc_available, dpc_total, is_liquidated,
      volume_24h, price_change_24h
    )`)
    .eq('user_id', userId)
    .gt('quantity', 0);

  return (data ?? []).map((h: Record<string, unknown>) => ({
    player_id: h.player_id as string,
    quantity: h.quantity as number,
    avg_buy_price: h.avg_buy_price as number,
    player: h.players as unknown as MarketPlayer,
  }));
}

export async function getMarketPlayers(sb: SupabaseClient, limit = 50): Promise<MarketPlayer[]> {
  const { data } = await sb.from('players')
    .select(`id, first_name, last_name, position, club, club_id,
      floor_price, last_price, reference_price, ipo_price,
      perf_l5, perf_l15, dpc_available, dpc_total, is_liquidated,
      volume_24h, price_change_24h`)
    .eq('is_liquidated', false)
    .gt('dpc_total', 0)
    .order('volume_24h', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as MarketPlayer[];
}

export async function getOpenSellOrders(sb: SupabaseClient, playerId: string): Promise<SellOrder[]> {
  const { data } = await sb.from('orders')
    .select('id, user_id, player_id, price, quantity, filled_qty, status')
    .eq('player_id', playerId)
    .eq('side', 'sell')
    .in('status', ['open', 'partial'])
    .order('price', { ascending: true });
  return (data ?? []) as SellOrder[];
}

export async function getRecentPosts(sb: SupabaseClient, limit = 20): Promise<CommunityPost[]> {
  const { data } = await sb.from('posts')
    .select('id, user_id, content, category, created_at, player_id, club_name')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as CommunityPost[];
}

export async function getMarketStats(sb: SupabaseClient) {
  const { count: sellCount } = await sb.from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('side', 'sell')
    .in('status', ['open', 'partial']);

  const { count: buyCount } = await sb.from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('side', 'buy')
    .in('status', ['open', 'partial']);

  return {
    openSellOrders: sellCount ?? 0,
    openBuyOrders: buyCount ?? 0,
  };
}

// ── IPO Queries ──

export interface ActiveIpo {
  id: string;
  player_id: string;
  status: string;
  total_offered: number;
  sold: number;
  price: number;
  ends_at: string;
}

export async function getActiveIpos(sb: SupabaseClient): Promise<ActiveIpo[]> {
  const { data, error } = await sb.from('ipos')
    .select('id, player_id, status, total_offered, sold, price, ends_at')
    .in('status', ['open', 'early_access'])
    .gt('ends_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) console.error('[getActiveIpos]', error.message);
  return (data ?? []) as ActiveIpo[];
}

// ── WRITE Actions ──

export async function buyFromIpo(sb: SupabaseClient, userId: string, ipoId: string, quantity: number) {
  const { data, error } = await sb.rpc('buy_from_ipo', {
    p_user_id: userId,
    p_ipo_id: ipoId,
    p_quantity: quantity,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...(data as Record<string, unknown>) };
}

export async function buyFromMarket(sb: SupabaseClient, userId: string, playerId: string, quantity: number) {
  const { data, error } = await sb.rpc('buy_player_dpc', {
    p_user_id: userId,
    p_player_id: playerId,
    p_quantity: quantity,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...(data as Record<string, unknown>) };
}

export async function placeSellOrder(sb: SupabaseClient, userId: string, playerId: string, quantity: number, priceCents: number) {
  const { data, error } = await sb.rpc('place_sell_order', {
    p_user_id: userId,
    p_player_id: playerId,
    p_quantity: quantity,
    p_price: priceCents,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...(data as Record<string, unknown>) };
}

export async function buyFromOrder(sb: SupabaseClient, buyerId: string, orderId: string, quantity: number) {
  const { data, error } = await sb.rpc('buy_from_order', {
    p_buyer_id: buyerId,
    p_order_id: orderId,
    p_quantity: quantity,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...(data as Record<string, unknown>) };
}

export async function cancelOrder(sb: SupabaseClient, userId: string, orderId: string) {
  const { error } = await sb.rpc('cancel_order', {
    p_user_id: userId,
    p_order_id: orderId,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function createPost(
  sb: SupabaseClient, userId: string,
  content: string, playerId: string | null, clubName: string | null,
  tags: string[], category: string = 'Meinung'
) {
  const { data, error } = await sb.from('posts').insert({
    user_id: userId,
    player_id: playerId,
    club_name: clubName,
    content, tags, category,
    post_type: 'general',
  }).select('id').single();
  if (error) return { success: false, error: error.message };
  return { success: true, postId: data.id };
}

export async function votePost(sb: SupabaseClient, userId: string, postId: string, voteType: 1 | -1) {
  const { data, error } = await sb.rpc('vote_post', {
    p_user_id: userId,
    p_post_id: postId,
    p_vote_type: voteType,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...(data as Record<string, unknown>) };
}
