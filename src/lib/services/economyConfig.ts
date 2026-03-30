import { supabase } from '@/lib/supabaseClient';
import type {
  DbEloConfig,
  DbRangThreshold,
  DbScoreRoadConfig,
  DbManagerPointsConfig,
  DbStreakConfig,
} from '@/types';

// ============================================
// Economy Config Service
// Admin-facing CRUD for gamification config tables
// ============================================

// ── Reads ──

export async function getEloConfig(): Promise<DbEloConfig[]> {
  const { data, error } = await supabase
    .from('elo_config')
    .select('*')
    .order('dimension')
    .order('event_type');
  if (error) {
    console.error('[EconomyConfig] getEloConfig:', error);
    return [];
  }
  return (data ?? []) as DbEloConfig[];
}

export async function getRangThresholds(): Promise<DbRangThreshold[]> {
  const { data, error } = await supabase
    .from('rang_thresholds')
    .select('*')
    .order('tier_number');
  if (error) {
    console.error('[EconomyConfig] getRangThresholds:', error);
    return [];
  }
  return (data ?? []) as DbRangThreshold[];
}

export async function getScoreRoadConfig(): Promise<DbScoreRoadConfig[]> {
  const { data, error } = await supabase
    .from('score_road_config')
    .select('*')
    .order('sort_order');
  if (error) {
    console.error('[EconomyConfig] getScoreRoadConfig:', error);
    return [];
  }
  return (data ?? []) as DbScoreRoadConfig[];
}

export async function getManagerPointsConfig(): Promise<DbManagerPointsConfig[]> {
  const { data, error } = await supabase
    .from('manager_points_config')
    .select('*')
    .order('small_event')
    .order('max_percentile', { ascending: true, nullsFirst: false })
    .order('max_rank', { ascending: true, nullsFirst: false });
  if (error) {
    console.error('[EconomyConfig] getManagerPointsConfig:', error);
    return [];
  }
  return (data ?? []) as DbManagerPointsConfig[];
}

export async function getStreakConfig(): Promise<DbStreakConfig[]> {
  const { data, error } = await supabase
    .from('streak_config')
    .select('*')
    .order('min_days', { ascending: false });
  if (error) {
    console.error('[EconomyConfig] getStreakConfig:', error);
    return [];
  }
  return (data ?? []) as DbStreakConfig[];
}

// ── Updates (Admin only — RLS enforces platform_admins check) ──

export async function updateEloConfig(
  adminId: string,
  id: string,
  fields: Partial<Pick<DbEloConfig, 'delta' | 'description' | 'active'>>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('elo_config')
    .update({ ...fields, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateRangThreshold(
  adminId: string,
  id: number,
  fields: Partial<Pick<DbRangThreshold, 'min_score' | 'max_score'>>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('rang_thresholds')
    .update({ ...fields, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateScoreRoadConfig(
  adminId: string,
  id: number,
  fields: Partial<Pick<DbScoreRoadConfig, 'reward_cents' | 'reward_label' | 'reward_type'>>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('score_road_config')
    .update({ ...fields, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateManagerPointsConfig(
  adminId: string,
  id: number,
  fields: Partial<Pick<DbManagerPointsConfig, 'points'>>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('manager_points_config')
    .update({ ...fields, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateStreakConfig(
  adminId: string,
  id: number,
  fields: Partial<
    Pick<
      DbStreakConfig,
      | 'daily_tickets'
      | 'fantasy_bonus_pct'
      | 'elo_boost_pct'
      | 'free_mystery_boxes_per_week'
      | 'mystery_box_ticket_discount'
    >
  >,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('streak_config')
    .update({ ...fields, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Mission CRUD (uses existing mission_definitions table) ──

export async function createMission(
  _adminId: string,
  mission: {
    key: string;
    type: string;
    title: string;
    description: string;
    icon: string;
    target_value: number;
    reward_cents: number;
    tracking_type: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('mission_definitions').insert({
    ...mission,
    tracking_config: {},
    active: true,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateMission(
  _adminId: string,
  id: string,
  fields: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('mission_definitions')
    .update(fields)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getMissionDefinitions(): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('mission_definitions')
    .select('*')
    .order('type')
    .order('key');
  if (error) {
    console.error('[EconomyConfig] getMissions:', error);
    return [];
  }
  return data ?? [];
}
