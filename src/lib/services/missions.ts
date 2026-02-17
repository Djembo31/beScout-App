import { supabase } from '@/lib/supabaseClient';
import type { DbMissionDefinition, DbUserMission, UserMissionWithDef } from '@/types';

// ============================================
// CACHE HELPERS (no-op, React Query handles this)
// ============================================

export function invalidateMissionData(_userId: string) {
  // React Query handles cache invalidation from components
}

// ============================================
// GET MISSION DEFINITIONS
// ============================================

async function getMissionDefinitions(): Promise<DbMissionDefinition[]> {
  const { data } = await supabase
    .from('mission_definitions')
    .select('*')
    .eq('active', true)
    .order('type')
    .order('key');
  return (data ?? []) as DbMissionDefinition[];
}

// ============================================
// GET USER MISSIONS (calls assign RPC — idempotent)
// ============================================

export async function getUserMissions(userId: string): Promise<UserMissionWithDef[]> {
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
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'mission_claim', 'engagement', { missionId, rewardCents: result.reward_cents });
    }).catch(err => console.error('[Missions] Activity log failed:', err));
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
  } catch (err) {
    console.error('[Missions] Progress tracking failed:', err);
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
    } catch (err) {
      console.error('[Missions] Trigger failed:', err);
    }
  })();
}
