import { supabase } from '@/lib/supabaseClient';
import { logSilentRejects } from '@/lib/observability/silentRejects';
import { getLeagueById } from '@/lib/leagues';
import type { DbFeeConfig, DbEventFeeConfig, OperationResult, DbPlatformLedgerEntry, PlatformTreasuryBalance } from '@/types';

// ============================================
// Admin Role Check
// ============================================

export type PlatformAdminRole = 'superadmin' | 'admin' | 'viewer';

export async function getPlatformAdminRole(userId: string): Promise<PlatformAdminRole | null> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as PlatformAdminRole;
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const role = await getPlatformAdminRole(userId);
  return role !== null;
}

// ============================================
// System Stats
// ============================================

export type SystemStats = {
  totalUsers: number;
  totalBsdCirculation: number; // cents
  volume24h: number; // cents
  activeEvents: number;
  pendingOffers: number;
};

export async function getSystemStats(): Promise<SystemStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const results = await Promise.allSettled([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    // D-08: total credits in circulation via the canonical treasury RPC (server-side
    // SUM(wallets.balance), uncapped). Replaces `wallets.select('balance').limit(5000)`
    // client-SUM — PostgREST silently caps at ~1000 rows regardless of `.limit(5000)`
    // (common-errors PostgREST-1000-cap = MONEY-CRITICAL), so the old path undercounts
    // "Scout Total" once wallets > 1000. Semantic parity verified: total_circulating_cents
    // = COALESCE(SUM(balance) FROM wallets, 0). Caller is platform-admin-only
    // (BescoutAdminContent, middleware-gated) so the platform_admins-gated RPC authorizes.
    supabase.rpc('get_treasury_stats'),
    supabase.from('trades').select('price, quantity').gte('executed_at', since).limit(5000),
    supabase.from('events').select('*', { count: 'exact', head: true }).in('status', ['upcoming', 'registering', 'late-reg', 'running']),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  logSilentRejects('platformAdmin.getSystemStats', results);
  const [usersRes, treasuryRes, tradesRes, eventsRes, offersRes] = results;

  const totalUsers = usersRes.status === 'fulfilled' ? (usersRes.value.count ?? 0) : 0;
  const treasury = treasuryRes.status === 'fulfilled'
    ? (treasuryRes.value.data as { total_circulating_cents?: number | string } | null)
    : null;
  const totalBsdCirculation = Number(treasury?.total_circulating_cents ?? 0);
  const trades = tradesRes.status === 'fulfilled' ? (tradesRes.value.data ?? []) : [];
  const volume24h = trades.reduce((sum, t) => sum + ((t.price as number) * (t.quantity as number)), 0);
  const activeEvents = eventsRes.status === 'fulfilled' ? (eventsRes.value.count ?? 0) : 0;
  const pendingOffers = offersRes.status === 'fulfilled' ? (offersRes.value.count ?? 0) : 0;

  return { totalUsers, totalBsdCirculation, volume24h, activeEvents, pendingOffers };
}

// ============================================
// User Management
// ============================================

export type AdminUser = {
  id: string;
  handle: string;
  displayName: string | null;
  balance: number; // cents
  holdingsCount: number;
  tradesCount: number;
  createdAt: string;
  region: string | null;
};

export async function getAllUsers(limit = 50, offset = 0, search?: string): Promise<AdminUser[]> {
  let query = supabase
    .from('profiles')
    .select('id, handle, display_name, created_at, region')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    // Sanitize search input to prevent PostgREST filter injection
    const sanitized = search.replace(/[^a-zA-Z0-9\s\-_.@üöäÜÖÄşçğıİŞÇĞ]/g, '').trim();
    if (sanitized) {
      query = query.or(`handle.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`);
    }
  }

  const { data: profiles, error } = await query;
  if (error || !profiles) return [];

  const userIds = profiles.map(p => p.id);
  if (userIds.length === 0) return [];

  // Slice 362: Input-Chunking — `limit` ist caller-kontrolliert, große Page → .in()-Liste über
  // PostgREST-URL-Limit (~400 UUIDs) → silent undefined. CHUNK hält jede .in()-Liste sicher.
  // Graceful-degrade beibehalten (Caller AdminUsersTab hat kein try/catch → kein throw hier).
  const CHUNK = 100;
  const balanceMap = new Map<string, number>();
  const holdingsCountMap = new Map<string, number>();
  const tradesMap = new Map<string, number>();
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const idSlice = userIds.slice(i, i + CHUNK);

    const { data: wallets } = await supabase
      .from('wallets')
      .select('user_id, balance')
      .in('user_id', idSlice);
    (wallets ?? []).forEach(w => balanceMap.set(w.user_id, w.balance as number));

    // idSlice ist CHUNK-bounded (≤100) → .in()-Liste URL-safe.
    const { data: holdings } = await supabase
      .from('holdings')
      .select('user_id, quantity')
      .in('user_id', idSlice)
      .gt('quantity', 0);
    (holdings ?? []).forEach(h => holdingsCountMap.set(h.user_id, (holdingsCountMap.get(h.user_id) ?? 0) + 1));

    // idSlice ist CHUNK-bounded (≤100) → .in()-Liste URL-safe.
    const { data: stats } = await supabase
      .from('user_stats')
      .select('user_id, trades_count')
      .in('user_id', idSlice);
    (stats ?? []).forEach(s => tradesMap.set(s.user_id, s.trades_count as number));
  }

  return profiles.map(p => ({
    id: p.id,
    handle: p.handle,
    displayName: p.display_name,
    balance: balanceMap.get(p.id) ?? 0,
    holdingsCount: holdingsCountMap.get(p.id) ?? 0,
    tradesCount: tradesMap.get(p.id) ?? 0,
    createdAt: p.created_at,
    region: p.region ?? null,
  }));
}

// ============================================
// Wallet Adjustment
// ============================================

type AdjustResult = { success: boolean; error?: string; new_balance?: number };

export async function adjustWallet(
  adminId: string,
  targetUserId: string,
  amountCents: number,
  reason: string,
): Promise<AdjustResult> {
  const { data, error } = await supabase.rpc('adjust_user_wallet', {
    p_admin_id: adminId,
    p_target_user_id: targetUserId,
    p_amount_cents: amountCents,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as AdjustResult;
}

// ============================================
// Fee Config Management
// ============================================

export async function getAllFeeConfigs(): Promise<DbFeeConfig[]> {
  const { data, error } = await supabase
    .from('fee_config')
    .select('id, club_id, club_name, trade_fee_bps, trade_platform_bps, trade_pbt_bps, trade_club_bps, ipo_club_bps, ipo_platform_bps, ipo_pbt_bps, updated_by, created_at, updated_at')
    .order('club_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbFeeConfig[];
}

export async function updateFeeConfig(
  adminId: string,
  configId: string,
  feeData: Partial<{
    trade_fee_bps: number;
    trade_platform_bps: number;
    trade_pbt_bps: number;
    trade_club_bps: number;
    ipo_club_bps: number;
    ipo_platform_bps: number;
    ipo_pbt_bps: number;
  }>,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('update_fee_config_rpc', {
    p_admin_id: adminId,
    p_config_id: configId,
    p_trade_fee_bps: feeData.trade_fee_bps ?? null,
    p_trade_platform_bps: feeData.trade_platform_bps ?? null,
    p_trade_pbt_bps: feeData.trade_pbt_bps ?? null,
    p_trade_club_bps: feeData.trade_club_bps ?? null,
    p_ipo_club_bps: feeData.ipo_club_bps ?? null,
    p_ipo_platform_bps: feeData.ipo_platform_bps ?? null,
    p_ipo_pbt_bps: feeData.ipo_pbt_bps ?? null,
  });
  if (error) throw new Error(error.message);
  return data as OperationResult;
}

// ============================================
// Event Fee Config
// ============================================

export async function getEventFeeConfigs(): Promise<DbEventFeeConfig[]> {
  const { data, error } = await supabase
    .from('event_fee_config')
    .select('*')
    .order('event_type');
  if (error) throw new Error(error.message);
  return (data ?? []) as DbEventFeeConfig[];
}

export async function updateEventFeeConfig(
  adminId: string,
  eventType: string,
  updates: { platform_pct?: number; beneficiary_pct?: number },
): Promise<void> {
  const { error } = await supabase
    .from('event_fee_config')
    .update({ ...updates, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('event_type', eventType);
  if (error) throw new Error(error.message);
}

// ============================================
// Club Management
// ============================================

export type AdminClub = {
  id: string;
  name: string;
  slug: string;
  short: string;
  league: string;
  league_id: string | null;
  country: string;
  city: string | null;
  plan: string;
  is_verified: boolean;
  created_at: string;
  follower_count: number;
  player_count: number;
};

export async function getAllClubs(): Promise<AdminClub[]> {
  const { data: clubs, error } = await supabase
    .from('clubs')
    .select('id, name, slug, short, league_id, country, city, plan, is_verified, created_at')
    .order('name', { ascending: true });
  if (error || !clubs) return [];

  const clubIds = clubs.map(c => c.id);
  // Slice 326 Wave B: league (Display-Name) aus league_id ableiten (clubs.league gedroppt).
  if (clubIds.length === 0) return clubs.map(c => ({ ...c, league: getLeagueById(c.league_id)?.name ?? '', follower_count: 0, player_count: 0 }));

  // Slice 362: chunked Result-Read (PostgREST 1000-row hard cap) + explizite Fehler-Propagation.
  // players_with_club ~4.5k > 1000 → vorher silent undercount in player_count. Mirror club.ts:getClubsWithStats.
  const PAGE = 1000;

  // Fetch follower counts
  const followerMap = new Map<string, number>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error: fErr } = await supabase
      .from('club_followers')
      .select('club_id')
      .in('club_id', clubIds)
      .range(offset, offset + PAGE - 1);
    if (fErr) throw new Error(`getAllClubs followers: ${fErr.message}`);
    const rows = data ?? [];
    for (const f of rows) followerMap.set(f.club_id, (followerMap.get(f.club_id) ?? 0) + 1);
    if (rows.length < PAGE) break;
  }

  // Fetch player counts
  const playerMap = new Map<string, number>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error: pErr } = await supabase
      .from('players')
      .select('club_id')
      .in('club_id', clubIds)
      .range(offset, offset + PAGE - 1);
    if (pErr) throw new Error(`getAllClubs players: ${pErr.message}`);
    const rows = data ?? [];
    for (const p of rows) if (p.club_id) playerMap.set(p.club_id, (playerMap.get(p.club_id) ?? 0) + 1);
    if (rows.length < PAGE) break;
  }

  return clubs.map(c => ({
    ...c,
    league: getLeagueById(c.league_id)?.name ?? '',
    follower_count: followerMap.get(c.id) ?? 0,
    player_count: playerMap.get(c.id) ?? 0,
  }));
}

export async function createClub(
  adminId: string,
  clubData: { name: string; slug: string; short: string; leagueId: string; country: string; city?: string; plan?: string },
): Promise<{ success: boolean; error?: string; club_id?: string; slug?: string }> {
  const { data, error } = await supabase.rpc('create_club_by_platform_admin', {
    p_admin_id: adminId,
    p_name: clubData.name,
    p_slug: clubData.slug,
    p_short: clubData.short,
    p_league_id: clubData.leagueId,
    p_country: clubData.country,
    p_city: clubData.city ?? null,
    p_plan: clubData.plan ?? 'baslangic',
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; error?: string; club_id?: string; slug?: string };
}

// ============================================
// IPO Overview
// ============================================

export async function getAllIposAcrossClubs() {
  const { data, error } = await supabase
    .from('ipos')
    .select('*, player:players!ipos_player_id_fkey(first_name, last_name, club)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================
// Recent Activity (Debug)
// ============================================

export async function getRecentActivityLogs(limit = 50) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

// ============================================
// Treasury Stats
// ============================================

export type TreasuryStats = {
  circulatingCents: number;
  lockedCents: number;
  walletsWithBalance: number;
  platformFees: number;
  pbtFees: number;
  clubFees: number;
  totalFeesBurned: number;
  totalTrades: number;
  pbtBalance: number;
  pbtTradingInflow: number;
  passBcredits: number;
  passesSold: number;
  welcomeBonusesClaimed: number;
  welcomeBonusMinted: number;
  ticketsCirculating: number;
  ticketsEarned: number;
  ticketsSpent: number;
};

function cents(v: string | number): number {
  return typeof v === 'string' ? parseInt(v, 10) || 0 : v;
}

export async function getTreasuryStats(): Promise<TreasuryStats> {
  // Try RPC first (faster, single call)
  const { data, error } = await supabase.rpc('get_treasury_stats');

  if (!error && data) {
    const d = data as Record<string, string | number>;
    const wbc = cents(d.welcome_bonuses_claimed);
    return {
      circulatingCents: cents(d.total_circulating_cents),
      lockedCents: cents(d.total_locked_cents),
      walletsWithBalance: cents(d.wallets_with_balance),
      platformFees: cents(d.total_platform_fees),
      pbtFees: cents(d.total_pbt_fees),
      clubFees: cents(d.total_club_fees),
      totalFeesBurned: cents(d.total_platform_fees),
      totalTrades: cents(d.total_trades),
      pbtBalance: cents(d.pbt_total_balance),
      pbtTradingInflow: cents(d.pbt_trading_inflow),
      passBcredits: cents(d.total_pass_bcredits),
      passesSold: cents(d.total_passes_sold),
      welcomeBonusesClaimed: wbc,
      welcomeBonusMinted: wbc * 100_000,
      ticketsCirculating: cents(d.total_tickets_circulating),
      ticketsEarned: cents(d.total_tickets_earned),
      ticketsSpent: cents(d.total_tickets_spent),
    };
  }

  // Fallback: direct queries
  const [wallets, trades, pbt, passes, bonuses, tickets] = await Promise.all([
    supabase.from('wallets').select('balance, locked_balance').limit(5000),
    supabase.from('trades').select('platform_fee, pbt_fee, club_fee').limit(5000),
    supabase.from('pbt_treasury').select('balance, trading_inflow').limit(1000),
    supabase.from('user_founding_passes').select('bcredits_granted').limit(1000),
    supabase.from('welcome_bonus_claims').select('id', { count: 'exact', head: true }),
    supabase.from('user_tickets').select('balance, earned_total, spent_total').limit(5000),
  ]);

  const wRows = wallets.data ?? [];
  const tRows = trades.data ?? [];
  const pRows = pbt.data ?? [];
  const fpRows = passes.data ?? [];
  const tkRows = tickets.data ?? [];

  const circulatingCents = wRows.reduce((s, w) => s + cents(w.balance), 0);
  const lockedCents = wRows.reduce((s, w) => s + cents(w.locked_balance), 0);
  const platformFees = tRows.reduce((s, t) => s + cents(t.platform_fee), 0);
  const pbtFees = tRows.reduce((s, t) => s + cents(t.pbt_fee), 0);
  const clubFees = tRows.reduce((s, t) => s + cents(t.club_fee), 0);
  const welcomeBonusesClaimed = bonuses.count ?? 0;

  return {
    circulatingCents,
    lockedCents,
    walletsWithBalance: wRows.filter(w => cents(w.balance) > 0).length,
    platformFees,
    pbtFees,
    clubFees,
    totalFeesBurned: platformFees,
    totalTrades: tRows.length,
    pbtBalance: pRows.reduce((s, p) => s + cents(p.balance), 0),
    pbtTradingInflow: pRows.reduce((s, p) => s + cents(p.trading_inflow), 0),
    passBcredits: fpRows.reduce((s, p) => s + cents(p.bcredits_granted), 0),
    passesSold: fpRows.length,
    welcomeBonusesClaimed,
    welcomeBonusMinted: welcomeBonusesClaimed * 100_000,
    ticketsCirculating: tkRows.reduce((s, t) => s + cents(t.balance), 0),
    ticketsEarned: tkRows.reduce((s, t) => s + cents(t.earned_total), 0),
    ticketsSpent: tkRows.reduce((s, t) => s + cents(t.spent_total), 0),
  };
}

// ============================================
// Platform Treasury (BeScout-Topf) — Slice 357 (E3-1, D96)
// ============================================

/** Saldo des Plattform-Treasury (Topf). Platform-Admin-guarded RPC (get_platform_balance). */
export async function getPlatformTreasuryBalance(): Promise<PlatformTreasuryBalance> {
  const { data, error } = await supabase.rpc('get_platform_balance');
  if (error) throw new Error(error.message);
  const result = data as { success?: boolean; error?: string; balance?: number; total_in?: number; total_out?: number };
  if (!result?.success) throw new Error(result?.error ?? 'platform_balance_failed');
  return {
    balance: result.balance ?? 0,
    totalIn: result.total_in ?? 0,
    totalOut: result.total_out ?? 0,
  };
}

/** Kontoauszug des Plattform-Treasury (Topf). Platform-Admin-guarded RPC (get_platform_treasury_ledger). */
export async function getPlatformTreasuryLedger(limit = 50): Promise<DbPlatformLedgerEntry[]> {
  const { data, error } = await supabase.rpc('get_platform_treasury_ledger', { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbPlatformLedgerEntry[];
}
