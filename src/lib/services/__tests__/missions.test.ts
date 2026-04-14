import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/services/tickets', () => ({ creditTickets: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));

import {
  invalidateMissionData,
  getUserMissions,
  claimMissionReward,
  trackMissionProgress,
  triggerMissionProgress,
  _resetCache,
} from '../missions';

beforeEach(() => {
  _resetCache();
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// invalidateMissionData
// ============================================
describe('invalidateMissionData', () => {
  it('is a no-op that does not throw', () => {
    expect(() => invalidateMissionData('u1')).not.toThrow();
  });
});

// ============================================
// getUserMissions
// ============================================
describe('getUserMissions', () => {
  it('returns missions enriched with definitions', async () => {
    // RPC assigns missions (idempotent)
    mockRpc('assign_user_missions', [
      { id: 'um1', user_id: 'u1', mission_id: 'def-1', progress: 3, completed: false, claimed: false },
    ]);
    // Fetch mission definitions
    mockTable('mission_definitions', [
      { id: 'def-1', key: 'trade_5', type: 'daily', title: 'Trade 5x', target: 5, reward_cents: 1000, active: true },
    ]);

    const result = await getUserMissions('u1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('um1');
    expect(result[0].definition.key).toBe('trade_5');
  });

  it('filters out missions without matching definition', async () => {
    mockRpc('assign_user_missions', [
      { id: 'um1', user_id: 'u1', mission_id: 'def-1', progress: 0, completed: false, claimed: false },
      { id: 'um2', user_id: 'u1', mission_id: 'def-orphan', progress: 0, completed: false, claimed: false },
    ]);
    mockTable('mission_definitions', [
      { id: 'def-1', key: 'trade_5', type: 'daily', title: 'Trade 5x', target: 5, reward_cents: 1000, active: true },
    ]);

    const result = await getUserMissions('u1');
    expect(result).toHaveLength(1); // def-orphan filtered out
  });

  it('throws on RPC error', async () => {
    mockRpc('assign_user_missions', null, { message: 'RPC error' });
    await expect(getUserMissions('u1')).rejects.toThrow();
  });

  it('throws an i18n key (mapErrorToKey) when mission_definitions query errors', async () => {
    // J7B-13: errors are now mapped to i18n keys before being thrown so that
    // Caller's setError(err.message) shows a translatable string instead of
    // the raw RPC text (which leaked DE-only into TR users' UI).
    mockRpc('assign_user_missions', [
      { id: 'um1', user_id: 'u1', mission_id: 'def-1', progress: 0, completed: false, claimed: false },
    ]);
    mockTable('mission_definitions', null, { message: 'definitions query failed' });
    // 'definitions query failed' has no specific regex match → falls through to 'generic'.
    await expect(getUserMissions('u1')).rejects.toThrow('generic');
  });

  it('returns empty when no missions assigned', async () => {
    mockRpc('assign_user_missions', []);
    mockTable('mission_definitions', []);
    const result = await getUserMissions('u1');
    expect(result).toEqual([]);
  });

  it('handles null RPC data', async () => {
    mockRpc('assign_user_missions', null);
    mockTable('mission_definitions', []);
    const result = await getUserMissions('u1');
    expect(result).toEqual([]);
  });
});

// ============================================
// claimMissionReward
// ============================================
describe('claimMissionReward', () => {
  it('claims reward via RPC on success', async () => {
    mockRpc('claim_mission_reward', {
      success: true, reward_cents: 5000, new_balance: 105000,
    });
    const result = await claimMissionReward('u1', 'mission-1');
    expect(result.success).toBe(true);
    expect(result.reward_cents).toBe(5000);
    expect(result.new_balance).toBe(105000);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('claim_mission_reward', {
      p_user_id: 'u1', p_mission_id: 'mission-1',
    });
  });

  it('returns an i18n-key error on RPC failure', async () => {
    // J7B-06: error is mapped via mapErrorToKey → 'generic' for unknown messages.
    mockRpc('claim_mission_reward', null, { message: 'Claim failed' });
    const result = await claimMissionReward('u1', 'mission-1');
    expect(result).toEqual({ success: false, error: 'generic' });
  });

  it('maps known RPC error messages to i18n keys when RPC returns success=false', async () => {
    // J7B-06: "Already claimed" matches the missionAlreadyClaimed regex
    // → resolved to a known i18n key in `errors` namespace.
    mockRpc('claim_mission_reward', { success: false, error: 'Already claimed' });
    const result = await claimMissionReward('u1', 'mission-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('missionAlreadyClaimed');
  });

  it('calculates ticket amount from reward (min 10, max 50)', async () => {
    // reward_cents: 50000 → Math.floor(50000/1000) = 50 → min(max(50,10),50) = 50
    mockRpc('claim_mission_reward', { success: true, reward_cents: 50000, new_balance: 200000 });
    const result = await claimMissionReward('u1', 'mission-1');
    expect(result.success).toBe(true);
  });

  it('handles zero reward_cents for ticket calculation', async () => {
    // reward_cents: 0 → Math.floor(0/1000) = 0 → max(0,10) = 10 → min(10,50) = 10
    mockRpc('claim_mission_reward', { success: true, reward_cents: 0, new_balance: 100000 });
    const result = await claimMissionReward('u1', 'mission-1');
    expect(result.success).toBe(true);
  });

  it('handles null reward_cents', async () => {
    mockRpc('claim_mission_reward', { success: true, new_balance: 100000 });
    const result = await claimMissionReward('u1', 'mission-1');
    expect(result.success).toBe(true);
  });
});

// ============================================
// trackMissionProgress
// ============================================
describe('trackMissionProgress', () => {
  it('calls track_my_mission_progress RPC', async () => {
    mockRpc('track_my_mission_progress', null);
    await trackMissionProgress('u1', 'trade_5');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('track_my_mission_progress', {
      p_mission_key: 'trade_5', p_increment: 1,
    });
  });

  it('passes custom increment', async () => {
    mockRpc('track_my_mission_progress', null);
    await trackMissionProgress('u1', 'earn_scout', 5);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('track_my_mission_progress', {
      p_mission_key: 'earn_scout', p_increment: 5,
    });
  });

  it('catches errors silently', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('track_my_mission_progress', null, { message: 'RPC error' });
    // Should not throw
    await trackMissionProgress('u1', 'trade_5');
    consoleSpy.mockRestore();
  });
});

// ============================================
// triggerMissionProgress
// ============================================
describe('triggerMissionProgress', () => {
  it('is a fire-and-forget function that does not throw', () => {
    // triggerMissionProgress fires async IIFE internally
    expect(() => triggerMissionProgress('u1', ['trade_5', 'earn_scout'])).not.toThrow();
  });

  it('works with empty mission keys', () => {
    expect(() => triggerMissionProgress('u1', [])).not.toThrow();
  });
});
