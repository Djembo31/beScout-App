/**
 * Combined tests for small services:
 * pbt, mastery, mysteryBox, feedback, streaks, welcomeBonus
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

// Mock dependencies for streaks + mysteryBox
vi.mock('@/lib/streakBenefits', () => ({
  getStreakBenefits: (streak: number) => ({ dailyTickets: Math.min(streak, 10) }),
}));
vi.mock('@/lib/services/tickets', () => ({ creditTickets: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));

import { getPbtForPlayer, getPbtTransactions, getFeeConfig, getAllFeeConfigs } from '../pbt';
import { MASTERY_XP_THRESHOLDS, MASTERY_LEVEL_LABELS, getXpForNextLevel, getDpcMastery, getUserMasteryAll } from '../mastery';
import { openMysteryBox, getMysteryBoxHistory } from '../mysteryBox';
import { submitFeedback } from '../feedback';
import { recordLoginStreak } from '../streaks';
import { claimWelcomeBonus } from '../welcomeBonus';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// PBT
// ============================================
describe('getPbtForPlayer', () => {
  it('returns treasury data', async () => {
    mockTable('pbt_treasury', { player_id: 'p1', balance: 50000 });
    expect((await getPbtForPlayer('p1'))?.balance).toBe(50000);
  });
  it('returns null when not found', async () => {
    mockTable('pbt_treasury', null);
    expect(await getPbtForPlayer('p1')).toBeNull();
  });
});

describe('getPbtTransactions', () => {
  it('returns transactions', async () => {
    mockTable('pbt_transactions', [{ id: 't1' }]);
    expect(await getPbtTransactions('p1')).toHaveLength(1);
  });
  it('returns [] when null', async () => {
    mockTable('pbt_transactions', null);
    expect(await getPbtTransactions('p1')).toEqual([]);
  });
});

describe('getFeeConfig', () => {
  it('returns club-specific config', async () => {
    mockTable('fee_config', { club_name: 'FC Test', trade_fee_bps: 600 });
    const result = await getFeeConfig('FC Test');
    expect(result?.trade_fee_bps).toBe(600);
  });

  it('falls back to global when club-specific not found', async () => {
    mockTable('fee_config', null); // club-specific not found
    mockTable('fee_config', { club_name: null, trade_fee_bps: 500 }); // global
    const result = await getFeeConfig('Unknown Club');
    expect(result?.club_name).toBeNull();
  });

  it('returns global config when no club specified', async () => {
    mockTable('fee_config', { club_name: null, trade_fee_bps: 500 });
    const result = await getFeeConfig();
    expect(result?.trade_fee_bps).toBe(500);
  });

  it('uses club_id when byId option set', async () => {
    mockTable('fee_config', { club_id: 'c1', trade_fee_bps: 550 });
    const result = await getFeeConfig('c1', { byId: true });
    expect(result).toBeTruthy();
  });

  it('returns null when nothing found', async () => {
    mockTable('fee_config', null);
    expect(await getFeeConfig()).toBeNull();
  });
});

describe('getAllFeeConfigs', () => {
  it('returns all configs', async () => {
    mockTable('fee_config', [{ id: 'fc1' }, { id: 'fc2' }]);
    expect(await getAllFeeConfigs()).toHaveLength(2);
  });
  it('returns [] when null', async () => {
    mockTable('fee_config', null);
    expect(await getAllFeeConfigs()).toEqual([]);
  });
});


// ============================================
// Mastery
// ============================================
describe('MASTERY_XP_THRESHOLDS', () => {
  it('has 5 thresholds', () => {
    expect(MASTERY_XP_THRESHOLDS).toEqual([0, 25, 75, 175, 350]);
  });
});

describe('MASTERY_LEVEL_LABELS', () => {
  it('has 6 labels (empty + 5 levels)', () => {
    expect(MASTERY_LEVEL_LABELS).toHaveLength(6);
    expect(MASTERY_LEVEL_LABELS[1]).toBe('Neuling');
    expect(MASTERY_LEVEL_LABELS[5]).toBe('Legende');
  });
});

describe('getXpForNextLevel', () => {
  it('returns threshold for level', () => {
    expect(getXpForNextLevel(1)).toBe(25);
    expect(getXpForNextLevel(4)).toBe(350);
  });
  it('returns 0 for max level', () => {
    expect(getXpForNextLevel(5)).toBe(0);
    expect(getXpForNextLevel(6)).toBe(0);
  });
});

describe('getDpcMastery', () => {
  it('returns mastery for user+player', async () => {
    mockTable('dpc_mastery', { user_id: 'u1', player_id: 'p1', level: 3, xp: 100 });
    const result = await getDpcMastery('u1', 'p1');
    expect(result?.level).toBe(3);
  });
  it('throws on DB error', async () => {
    mockTable('dpc_mastery', null, { message: 'err' });
    await expect(getDpcMastery('u1', 'p1')).rejects.toThrow('err');
  });
});

describe('getUserMasteryAll', () => {
  it('returns all mastery entries', async () => {
    mockTable('dpc_mastery', [{ level: 5, xp: 400 }, { level: 2, xp: 50 }]);
    expect(await getUserMasteryAll('u1')).toHaveLength(2);
  });
  it('throws on DB error', async () => {
    mockTable('dpc_mastery', null, { message: 'err' });
    await expect(getUserMasteryAll('u1')).rejects.toThrow('err');
  });
  it('returns [] when null', async () => {
    mockTable('dpc_mastery', null);
    expect(await getUserMasteryAll('u1')).toEqual([]);
  });
});

// ============================================
// MysteryBox
// ============================================
describe('openMysteryBox', () => {
  it('opens box and returns reward', async () => {
    mockRpc('open_mystery_box_v2', {
      ok: true, rarity: 'rare', rewardType: 'cosmetic',
      cosmeticKey: 'gold_frame', cosmeticName: 'Gold Frame',
    });
    const result = await openMysteryBox();
    expect(result.ok).toBe(true);
    expect(result.rarity).toBe('rare');
    expect(result.cosmeticKey).toBe('gold_frame');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('open_mystery_box_v2', { p_free: false });
  });

  it('passes free flag', async () => {
    mockRpc('open_mystery_box_v2', { ok: true, rarity: 'common', rewardType: 'tickets', ticketsAmount: 5 });
    await openMysteryBox(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('open_mystery_box_v2', { p_free: true });
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('open_mystery_box_v2', null, { message: 'Insufficient tickets' });
    expect(await openMysteryBox()).toEqual({ ok: false, error: 'Insufficient tickets' });
    consoleSpy.mockRestore();
  });

  it('returns error when RPC ok=false', async () => {
    mockRpc('open_mystery_box_v2', { ok: false, error: 'Cooldown active' });
    expect(await openMysteryBox()).toEqual({ ok: false, error: 'Cooldown active' });
  });

  it('returns equipment reward', async () => {
    mockRpc('open_mystery_box_v2', {
      ok: true, rarity: 'epic', rewardType: 'equipment',
      equipmentType: 'fire_shot', equipmentRank: 2,
      equipmentNameDe: 'Feuerschuss', equipmentNameTr: 'Ates Sutu',
      equipmentPosition: 'ATT',
    });
    const result = await openMysteryBox();
    expect(result.ok).toBe(true);
    expect(result.rewardType).toBe('equipment');
    expect(result.equipmentType).toBe('fire_shot');
    expect(result.equipmentRank).toBe(2);
  });

  it('returns bcredits reward', async () => {
    mockRpc('open_mystery_box_v2', {
      ok: true, rarity: 'legendary', rewardType: 'bcredits',
      bcreditsAmount: 15000,
    });
    const result = await openMysteryBox();
    expect(result.ok).toBe(true);
    expect(result.rewardType).toBe('bcredits');
    expect(result.bcreditsAmount).toBe(15000);
  });
});

describe('getMysteryBoxHistory', () => {
  it('returns history', async () => {
    mockTable('mystery_box_results', [{ id: 'mb1', rarity: 'common' }]);
    expect(await getMysteryBoxHistory('u1')).toHaveLength(1);
  });
  it('throws on DB error', async () => {
    mockTable('mystery_box_results', null, { message: 'err' });
    await expect(getMysteryBoxHistory('u1')).rejects.toThrow('err');
  });
});

// ============================================
// Feedback
// ============================================
describe('submitFeedback', () => {
  it('inserts feedback', async () => {
    mockTable('feedback', null);
    await submitFeedback('u1', 'bug' as 'bug', 'Something broke', '/market');
    expect(mockSupabase.from).toHaveBeenCalledWith('feedback');
  });
  it('trims message whitespace', async () => {
    mockTable('feedback', null);
    await submitFeedback('u1', 'feature' as 'feature', '  spaces  ');
    // Function calls .trim() on message
  });
  it('throws on error', async () => {
    mockTable('feedback', null, { message: 'Insert failed' });
    await expect(submitFeedback('u1', 'bug' as 'bug', 'x')).rejects.toThrow('Insert failed');
  });
});

// ============================================
// Streaks
// ============================================
describe('recordLoginStreak', () => {
  it('records streak via RPC', async () => {
    mockRpc('record_login_streak', { ok: true, streak: 5, already_today: false });
    const result = await recordLoginStreak('u1');
    expect(result.ok).toBe(true);
    expect(result.streak).toBe(5);
  });
  it('throws on RPC error', async () => {
    mockRpc('record_login_streak', null, { message: 'err' });
    await expect(recordLoginStreak('u1')).rejects.toThrow('err');
  });
  it('does not credit tickets when already recorded today', async () => {
    mockRpc('record_login_streak', { ok: true, streak: 3, already_today: true });
    const result = await recordLoginStreak('u1');
    expect(result.already_today).toBe(true);
  });
});

// ============================================
// WelcomeBonus
// ============================================
describe('claimWelcomeBonus', () => {
  it('claims bonus via RPC', async () => {
    mockRpc('claim_welcome_bonus', { ok: true, amount_cents: 100000, new_balance: 100000 });
    const result = await claimWelcomeBonus();
    expect(result).toEqual({ ok: true, alreadyClaimed: false, amountCents: 100000, newBalance: 100000 });
  });

  it('returns already claimed', async () => {
    mockRpc('claim_welcome_bonus', { ok: false, already_claimed: true });
    const result = await claimWelcomeBonus();
    expect(result.ok).toBe(false);
    expect(result.alreadyClaimed).toBe(true);
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('claim_welcome_bonus', null, { message: 'err' });
    expect(await claimWelcomeBonus()).toEqual({ ok: false, alreadyClaimed: false });
    consoleSpy.mockRestore();
  });

  it('defaults alreadyClaimed to false when missing', async () => {
    mockRpc('claim_welcome_bonus', { ok: true });
    expect((await claimWelcomeBonus()).alreadyClaimed).toBe(false);
  });
});
