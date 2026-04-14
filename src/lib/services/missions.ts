import { supabase } from '@/lib/supabaseClient';
import { notifText } from '@/lib/notifText';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { DbMissionDefinition, DbUserMission, UserMissionWithDef } from '@/types';

// ============================================
// CACHE HELPERS
// ============================================

/**
 * J7B-14 fix: actually invalidate React Query caches AND drop the in-process
 * service-level cache. Previously a no-op which left the 60s _missionsCache
 * pinned across claims, so the mission list looked stale until cooldown expired.
 *
 * Components should still call queryClient.invalidateQueries directly when
 * they have access to it; this helper ensures the SERVICE-LEVEL cache is
 * cleared for callers that don't (e.g. fire-and-forget paths).
 */
export function invalidateMissionData(userId: string) {
  _missionsCache.delete(userId);
}

// ============================================
// GET MISSION DEFINITIONS
// ============================================

async function getMissionDefinitions(userId: string): Promise<DbMissionDefinition[]> {
  const { data, error } = await supabase
    .from('mission_definitions')
    .select('*')
    .eq('active', true)
    .order('type')
    .order('key');
  if (error) {
    _missionsCache.delete(userId); // allow retry on error
    // Throw an i18n key (Caller resolves via t('errors.<key>')) — J7B-13
    throw new Error(mapErrorToKey(error.message));
  }
  return (data ?? []) as DbMissionDefinition[];
}

// ============================================
// GET USER MISSIONS (calls assign RPC — idempotent)
// ============================================

// Debounce: only call once per 60s per user (multiple pages fire this on navigation)
const _missionsCache = new Map<string, { promise: Promise<UserMissionWithDef[]>; ts: number }>();
const MISSIONS_COOLDOWN_MS = 60_000;

export function _resetCache() { _missionsCache.clear(); }

export async function getUserMissions(userId: string): Promise<UserMissionWithDef[]> {
  const now = Date.now();
  const cached = _missionsCache.get(userId);
  if (cached && now - cached.ts < MISSIONS_COOLDOWN_MS) {
    return cached.promise;
  }
  const promise = (async () => {
    // Call the assign RPC — it will create missions if needed, or just return existing ones
    const { data: userMissions, error } = await supabase
      .rpc('assign_user_missions', { p_user_id: userId });

    if (error) {
      _missionsCache.delete(userId); // allow retry on error
      // Convert raw RPC error → i18n key so Caller's setError(err.message) is translatable (J7B-13).
      throw new Error(mapErrorToKey(error.message));
    }

    // Fetch definitions for enrichment
    const defs = await getMissionDefinitions(userId);
    const defMap = new Map(defs.map(d => [d.id, d]));

    return ((userMissions ?? []) as DbUserMission[])
      .map(um => {
        const def = defMap.get(um.mission_id);
        if (!def) return null;
        return { ...um, definition: def } as UserMissionWithDef;
      })
      .filter((m): m is UserMissionWithDef => m !== null);
  })();
  _missionsCache.set(userId, { promise, ts: now });
  return promise;
}

// ============================================
// CLAIM MISSION REWARD
// ============================================

/**
 * Claim a mission reward.
 *
 * Returns `{success, error?, reward_cents?, new_balance?}`. On error, `error`
 * is an i18n KEY in the `errors` namespace (e.g. 'missionAlreadyClaimed'),
 * NOT a raw RPC string. Callers must resolve it via `t('errors.' + result.error)`
 * before showing to the user (J7B-06: previously raw 'auth_uid_mismatch: …'
 * leaked into the UI).
 */
export async function claimMissionReward(userId: string, missionId: string): Promise<{
  success: boolean;
  error?: string;
  reward_cents?: number;
  new_balance?: number;
}> {
  const { data, error } = await supabase
    .rpc('claim_mission_reward', { p_user_id: userId, p_mission_id: missionId });

  if (error) return { success: false, error: mapErrorToKey(normalizeError(error)) };

  const result = data as { success: boolean; error?: string; reward_cents?: number; new_balance?: number };

  if (!result.success && result.error) {
    // RPC body returned `{success: false, error: '<raw>'}` — map to i18n key.
    return { ...result, error: mapErrorToKey(result.error) };
  }

  if (result.success) {
    invalidateMissionData(userId);
    // Activity log
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(userId, 'mission_claim', 'engagement', { missionId, rewardCents: result.reward_cents });
    }).catch(err => console.error('[Missions] Activity log failed:', err));

    // Fire-and-forget: Credit mission tickets (10-50 based on reward)
    const ticketAmount = Math.min(Math.max(Math.floor((result.reward_cents ?? 0) / 1000), 10), 50);
    import('@/lib/services/tickets').then(({ creditTickets }) => {
      creditTickets(userId, ticketAmount, 'mission', missionId).catch(console.error);
    }).catch(err => console.error('[Missions] Ticket credit failed:', err));

    // Notify user about mission reward
    const bsd = ((result.reward_cents ?? 0) / 100).toFixed(0);
    import('@/lib/services/notifications').then(({ createNotification }) => {
      createNotification(
        userId,
        'mission_reward',
        notifText('missionRewardTitle'),
        notifText('missionRewardBody', { amount: bsd }),
        missionId,
        'mission',
      );
    }).catch(err => console.error('[Missions] Notification failed:', err));
  }

  return result;
}

// ============================================
// TRACK MISSION PROGRESS (fire-and-forget)
// ============================================

/**
 * Track mission progress for the currently authenticated user.
 *
 * NOTE (J7B-11): the `userId` param is kept ONLY for backwards-compatibility
 * with existing call-sites. The wrapper RPC `track_my_mission_progress` always
 * uses `auth.uid()` internally — passing a different user is silently ignored.
 * Pass an empty string `''` if you don't have the uid handy. Will be removed
 * once all call-sites are migrated.
 */
export async function trackMissionProgress(_userId: string, missionKey: string, increment = 1): Promise<void> {
  try {
    // Use wrapper RPC that calls auth.uid() internally (direct update_mission_progress is REVOKED)
    await supabase.rpc('track_my_mission_progress', {
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

/**
 * Fire-and-forget mission progress trigger. Call after relevant actions.
 *
 * `userId` is unused (server uses `auth.uid()` from the JWT). Kept for
 * backwards-compat — see `trackMissionProgress` JSDoc (J7B-11).
 */
export function triggerMissionProgress(_userId: string, missionKeys: string[]) {
  // Use dynamic import pattern to avoid circular dependencies
  (async () => {
    try {
      const { trackMissionProgress: track } = await import('@/lib/services/missions');
      await Promise.all(missionKeys.map(key => track('', key)));
    } catch (err) {
      console.error('[Missions] Trigger failed:', err);
    }
  })();
}
