import { supabase } from '@/lib/supabaseClient';
import type { DbFeeConfig } from '@/types';

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
  const [usersRes, walletsRes, tradesRes, eventsRes, offersRes] = await Promise.allSettled([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('wallets').select('balance'),
    supabase.from('trades').select('price, quantity').gte('executed_at', since),
    supabase.from('events').select('*', { count: 'exact', head: true }).in('status', ['upcoming', 'registering', 'late-reg', 'running']),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const totalUsers = usersRes.status === 'fulfilled' ? (usersRes.value.count ?? 0) : 0;
  const wallets = walletsRes.status === 'fulfilled' ? (walletsRes.value.data ?? []) : [];
  const totalBsdCirculation = wallets.reduce((sum, w) => sum + ((w.balance as number) || 0), 0);
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
};

export async function getAllUsers(limit = 50, offset = 0, search?: string): Promise<AdminUser[]> {
  let query = supabase
    .from('profiles')
    .select('id, handle, display_name, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    // Sanitize search input to prevent PostgREST filter injection
    const sanitized = search.replace(/[,()]/g, '').trim();
    if (sanitized) {
      query = query.or(`handle.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`);
    }
  }

  const { data: profiles, error } = await query;
  if (error || !profiles) return [];

  const userIds = profiles.map(p => p.id);
  if (userIds.length === 0) return [];

  // Fetch balances
  const { data: wallets } = await supabase
    .from('wallets')
    .select('user_id, balance')
    .in('user_id', userIds);
  const balanceMap = new Map((wallets ?? []).map(w => [w.user_id, w.balance as number]));

  // Fetch holdings count
  const { data: holdings } = await supabase
    .from('holdings')
    .select('user_id, quantity')
    .in('user_id', userIds)
    .gt('quantity', 0);
  const holdingsCountMap = new Map<string, number>();
  (holdings ?? []).forEach(h => {
    holdingsCountMap.set(h.user_id, (holdingsCountMap.get(h.user_id) ?? 0) + 1);
  });

  // Fetch trade count (approximate from user_stats)
  const { data: stats } = await supabase
    .from('user_stats')
    .select('user_id, trades_count')
    .in('user_id', userIds);
  const tradesMap = new Map((stats ?? []).map(s => [s.user_id, s.trades_count as number]));

  return profiles.map(p => ({
    id: p.id,
    handle: p.handle,
    displayName: p.display_name,
    balance: balanceMap.get(p.id) ?? 0,
    holdingsCount: holdingsCountMap.get(p.id) ?? 0,
    tradesCount: tradesMap.get(p.id) ?? 0,
    createdAt: p.created_at,
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
    .select('*')
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
  return data as { success: boolean; error?: string };
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
