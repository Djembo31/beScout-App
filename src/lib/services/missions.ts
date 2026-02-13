import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbMissionDefinition, DbUserMission, UserMissionWithDef } from '@/types';

// ============================================
// CACHE HELPERS
// ============================================

export function invalidateMissionData(userId: string) {
  invalidate(`missions:${userId}`);
  invalidate(`mission-defs`);
  // Also invalidate wallet since rewards affect balance
  invalidate(`wallet:${userId}`);
  invalidate(`transactions:${userId}`);
}

// ============================================
// GET MISSION DEFINITIONS
// ============================================

async function getMissionDefinitions(): Promise<DbMissionDefinition[]> {
  return cached('mission-defs', async () => {
    const { data } = await supabase
      .from('mission_definitions')
      .select('*')
      .eq('active', true)
      .order('type')
      .order('key');
    return (data ?? []) as DbMissionDefinition[];
  }, 300000); // 5min
}

// ============================================
// GET USER MISSIONS (calls assign RPC — idempotent)
// ============================================

export async function getUserMissions(userId: string): Promise<UserMissionWithDef[]> {
  return cached(`missions:${userId}`, async () => {
    // Call the assign RPC — it will create missions if needed, or just return existing ones
    const { data: userMissions, error } = await supabase
      .rpc('assign_user_missions', { p_user_id: userId });

    if (error) throw error;

    // Fetch definitions for enrichment
    const defs = await getMissionDefinitions();
    const defMap = new Map(defs.map(d => [d.id, d]));

    return ((userMissions ?? []) as DbUserMission[])
      .map(um => {
        const def = defMap.get(um.mission_id);
        if (!def) return null;
        return { ...um, definition: def } as UserMissionWithDef;
      })
      .filter((m): m is UserMissionWithDef => m !== null);
  }, 60000); // 1min cache
}

// ============================================
// CLAIM MISSION REWARD
// ============================================

export async function claimMissionReward(userId: string, missionId: string): Promise<{
  success: boolean;
  error?: string;
  reward_cents?: number;
  new_balance?: number;
}> {
  const { data, error } = await supabase
    .rpc('claim_mission_reward', { p_user_id: userId, p_mission_id: missionId });

  if (error) return { success: false, error: error.message };

  const result = data as { success: boolean; error?: string; reward_cents?: number; new_balance?: number };

  if (result.success) {
    invalidateMissionData(userId);
  }

  return result;
}

// ============================================
// TRACK MISSION PROGRESS (fire-and-forget)
// ============================================

export async function trackMissionProgress(userId: string, missionKey: string, increment = 1): Promise<void> {
  try {
    await supabase.rpc('update_mission_progress', {
      p_user_id: userId,
      p_mission_key: missionKey,
      p_increment: increment,
    });
    // Invalidate cache so next fetch reflects new progress
    invalidate(`missions:${userId}`);
  } catch {
    // Fire-and-forget — don't break the main flow
  }
}

// ============================================
// TRIGGER MISSION PROGRESS (dynamic import to avoid circular deps)
// ============================================

/** Fire-and-forget mission progress trigger. Call after relevant actions. */
export function triggerMissionProgress(userId: string, missionKeys: string[]) {
  // Use dynamic import pattern to avoid circular dependencies
  (async () => {
    try {
      const { trackMissionProgress: track } = await import('@/lib/services/missions');
      await Promise.all(missionKeys.map(key => track(userId, key)));
    } catch {
      // Silent — mission tracking should never break main flow
    }
  })();
}
