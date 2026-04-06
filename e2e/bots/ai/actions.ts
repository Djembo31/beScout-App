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

// ── Fantasy Types ──

export interface FantasyEvent {
  id: string;
  name: string;
  type: string;
  status: string;
  format: string;
  gameweek: number | null;
  entry_fee: number;
  lineup_size: number;
  current_entries: number;
  max_entries: number | null;
  locks_at: string;
  scope: string;
  club_id: string | null;
}

export interface Lineup {
  id: string;
  event_id: string;
  user_id: string;
  total_score: number | null;
  rank: number | null;
}

export interface UserTickets {
  balance: number;
  earned_total: number;
  spent_total: number;
}

export interface UserMission {
  id: string;
  mission_id: string;
  progress: number;
  target_value: number;
  status: string;
  definition: { key: string; title: string; type: string; reward_cents: number } | null;
}

// ── Fantasy READ ──

export async function getActiveEvents(sb: SupabaseClient): Promise<FantasyEvent[]> {
  const { data } = await sb.from('events')
    .select('id, name, type, status, format, gameweek, entry_fee, lineup_size, current_entries, max_entries, locks_at, scope, club_id')
    .in('status', ['upcoming', 'registering', 'late-reg', 'running'])
    .order('starts_at', { ascending: true });
  return (data ?? []) as FantasyEvent[];
}

export async function getUserLineups(sb: SupabaseClient, userId: string): Promise<Lineup[]> {
  const { data } = await sb.from('lineups')
    .select('id, event_id, user_id, total_score, rank')
    .eq('user_id', userId);
  return (data ?? []) as Lineup[];
}

// ── Ticket READ ──

export async function getUserTickets(sb: SupabaseClient): Promise<UserTickets | null> {
  const { data, error } = await sb.rpc('get_user_tickets');
  if (error) { console.error('[getUserTickets]', error.message); return null; }
  return data as UserTickets | null;
}

// ── Mission READ ──

export async function getUserMissions(sb: SupabaseClient, userId: string): Promise<UserMission[]> {
  const { data, error } = await sb.rpc('assign_user_missions', { p_user_id: userId });
  if (error) { console.error('[getUserMissions]', error.message); return []; }
  if (!data || !Array.isArray(data)) return [];
  return data as UserMission[];
}

// ── Fantasy WRITE ──

export async function submitLineup(
  sb: SupabaseClient, userId: string, eventId: string,
  slots: Record<string, string | null>, captainSlot: string, formation: string
) {
  const { data, error } = await sb.from('lineups')
    .upsert({
      event_id: eventId,
      user_id: userId,
      formation,
      captain_slot: captainSlot,
      ...slots,
    }, { onConflict: 'event_id,user_id' })
    .select('id')
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, lineupId: data.id };
}

// ── Mystery Box WRITE ──

export async function openMysteryBox(sb: SupabaseClient, free = false) {
  const { data, error } = await sb.rpc('open_mystery_box_v2', { p_free: free });
  if (error) return { success: false, error: error.message };
  const result = data as Record<string, unknown>;
  return {
    success: (result.ok as boolean) ?? false,
    rarity: result.rarity as string | undefined,
    rewardType: result.reward_type as string | undefined,
    ticketsAmount: result.tickets_amount as number | undefined,
    cosmeticName: result.cosmetic_name as string | undefined,
    error: result.error as string | undefined,
  };
}

// ── Mission WRITE ──

export async function claimMissionReward(sb: SupabaseClient, missionId: string) {
  const { data, error } = await sb.rpc('claim_mission_reward', {
    p_mission_id: missionId,
  });
  if (error) return { success: false, error: error.message };
  const result = data as Record<string, unknown>;
  return { success: (result.success as boolean) ?? false, reward: result.reward_cents as number | undefined };
}

// ══════════════════════════════════════════════
// COMPREHENSIVE QA — All remaining endpoints
// ══════════════════════════════════════════════

// ── Buy Orders (Kaufgebote) ──

export async function placeBuyOrder(sb: SupabaseClient, userId: string, playerId: string, quantity: number, maxPriceCents: number) {
  // BUG FOUND: place_buy_order RPC referenced in trading.ts:500 but migration never created
  // Service code calls it, DB doesn't have it — Buy Orders are broken platform-wide
  const { data, error } = await sb.rpc('place_buy_order', {
    p_user_id: userId, p_player_id: playerId, p_quantity: quantity, p_max_price: maxPriceCents,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...(data as Record<string, unknown>) };
}

export async function cancelBuyOrder(sb: SupabaseClient, userId: string, orderId: string) {
  const { data, error } = await sb.rpc('cancel_buy_order', { p_user_id: userId, p_order_id: orderId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Social (Follow, Unfollow, Stats) ──

export async function followUser(sb: SupabaseClient, followerId: string, followingId: string) {
  const { error } = await sb.rpc('follow_user', { p_follower_id: followerId, p_following_id: followingId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function unfollowUser(sb: SupabaseClient, followerId: string, followingId: string) {
  const { error } = await sb.rpc('unfollow_user', { p_follower_id: followerId, p_following_id: followingId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getUserStats(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('user_stats').select('*').eq('user_id', userId).single();
  if (error) return null;
  return data;
}

export async function getLeaderboard(sb: SupabaseClient, limit = 20) {
  const { data, error } = await sb.from('user_stats')
    .select('user_id, total_score, rank, tier, trades_count, trading_volume_cents')
    .order('total_score', { ascending: false }).limit(limit);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

// ── Notifications ──

export async function getNotifications(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('notifications')
    .select('id, type, title, body, read, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

export async function markNotificationsRead(sb: SupabaseClient, userId: string) {
  const { error } = await sb.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Watchlist ──

export async function getWatchlist(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('watchlist')
    .select('player_id, alert_threshold_pct, alert_direction, created_at')
    .eq('user_id', userId);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

export async function addToWatchlist(sb: SupabaseClient, userId: string, playerId: string) {
  const { error } = await sb.from('watchlist').upsert(
    { user_id: userId, player_id: playerId }, { onConflict: 'user_id,player_id' }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeFromWatchlist(sb: SupabaseClient, userId: string, playerId: string) {
  const { error } = await sb.from('watchlist').delete().eq('user_id', userId).eq('player_id', playerId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── P2P Offers ──

export async function createOffer(sb: SupabaseClient, userId: string, playerId: string, side: 'buy' | 'sell', priceCents: number, quantity: number, message?: string) {
  const { data, error } = await sb.from('offers').insert({
    sender_id: userId, player_id: playerId, side, price: priceCents, quantity, message: message ?? null, status: 'pending',
  }).select('id').single();
  if (error) return { success: false, error: error.message };
  return { success: true, offerId: data.id };
}

export async function getIncomingOffers(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('offers')
    .select('id, sender_id, player_id, side, price, quantity, status, message, created_at')
    .eq('status', 'pending')
    .limit(10);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

// ── Achievements ──

export async function getUserAchievements(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('user_achievements')
    .select('achievement_key, unlocked_at')
    .eq('user_id', userId);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

// ── Profile ──

export async function getProfile(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('profiles')
    .select('id, handle, display_name, bio, top_role, language, created_at')
    .eq('id', userId).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// ── Player Detail (full) ──

export async function getPlayerDetail(sb: SupabaseClient, playerId: string) {
  const { data, error } = await sb.from('players')
    .select('*')
    .eq('id', playerId).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getPlayerTrades(sb: SupabaseClient, playerId: string) {
  const { data, error } = await sb.from('trades')
    .select('id, buyer_id, seller_id, price, quantity, executed_at')
    .eq('player_id', playerId)
    .order('executed_at', { ascending: false }).limit(20);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

// ── Transactions ──

export async function getTransactions(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('transactions')
    .select('id, amount, type, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(20);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

// ── Club Page ──

export async function getClubPlayers(sb: SupabaseClient, clubId: string) {
  const { data, error } = await sb.from('players')
    .select('id, first_name, last_name, position, perf_l5, floor_price, dpc_total')
    .eq('club_id', clubId).eq('is_liquidated', false)
    .order('position');
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data ?? [] };
}

// ── Daily Challenge ──

export async function getDailyChallenge(sb: SupabaseClient) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb.from('daily_challenges')
    .select('id, question_de, options, reward_correct, reward_wrong, active')
    .eq('challenge_date', today).eq('active', true).single();
  if (error) return null;
  return data;
}

export async function submitDailyChallenge(sb: SupabaseClient, challengeId: string, option: number) {
  const { data, error } = await sb.rpc('submit_daily_challenge', {
    p_challenge_id: challengeId, p_selected_option: option,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...(data as Record<string, unknown>) };
}

// ── Airdrop ──

export async function getAirdropScore(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from('airdrop_scores')
    .select('user_id, total_score, rank, tier')
    .eq('user_id', userId).single();
  if (error) return null;
  return data;
}
