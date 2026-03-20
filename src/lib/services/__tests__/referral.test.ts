import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  getUserReferralCode, getUserReferralCount, getProfileByReferralCode,
  applyReferralCode, triggerReferralReward, getClubByReferralCode, applyClubReferral,
} from '../referral';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getUserReferralCode', () => {
  it('returns referral code', async () => {
    mockTable('profiles', { referral_code: 'ABC123' });
    expect(await getUserReferralCode('u1')).toBe('ABC123');
  });
  it('returns null on error', async () => {
    mockTable('profiles', null, { message: 'err' });
    expect(await getUserReferralCode('u1')).toBeNull();
  });
  it('returns null when no data', async () => {
    mockTable('profiles', null);
    expect(await getUserReferralCode('u1')).toBeNull();
  });
});

describe('getUserReferralCount', () => {
  it('returns count of referred users', async () => {
    mockTable('profiles', null, null, 5);
    expect(await getUserReferralCount('u1')).toBe(5);
  });
  it('returns 0 on error', async () => {
    mockTable('profiles', null, { message: 'err' });
    expect(await getUserReferralCount('u1')).toBe(0);
  });
  it('returns 0 when count is null', async () => {
    mockTable('profiles', null, null, null);
    expect(await getUserReferralCount('u1')).toBe(0);
  });
});

describe('getProfileByReferralCode', () => {
  it('returns profile matching code (uppercased)', async () => {
    mockTable('profiles', { id: 'u-ref', handle: 'alice', display_name: 'Alice' });
    const result = await getProfileByReferralCode('abc123');
    expect(result).toEqual({ id: 'u-ref', handle: 'alice', display_name: 'Alice' });
  });
  it('returns null on error', async () => {
    mockTable('profiles', null, { message: 'err' });
    expect(await getProfileByReferralCode('XYZ')).toBeNull();
  });
  it('returns null when not found', async () => {
    mockTable('profiles', null);
    expect(await getProfileByReferralCode('INVALID')).toBeNull();
  });
});

describe('applyReferralCode', () => {
  it('applies referral code successfully', async () => {
    // Step 1: look up referrer
    mockTable('profiles', { id: 'referrer-1', handle: 'alice', display_name: null });
    // Step 2: check if already invited
    mockTable('profiles', { invited_by: null });
    // Step 3: update invited_by
    mockTable('profiles', null);
    const result = await applyReferralCode('u1', 'ABC123');
    expect(result).toEqual({ success: true });
  });

  it('returns invalidCode when referrer not found', async () => {
    mockTable('profiles', null); // referrer lookup fails
    const result = await applyReferralCode('u1', 'INVALID');
    expect(result).toEqual({ success: false, error: 'invalidCode' });
  });

  it('returns selfInvite when user tries own code', async () => {
    mockTable('profiles', { id: 'u1', handle: 'self', display_name: null });
    const result = await applyReferralCode('u1', 'MYCODE');
    expect(result).toEqual({ success: false, error: 'selfInvite' });
  });

  it('returns alreadyInvited when user already has referrer', async () => {
    mockTable('profiles', { id: 'referrer-1', handle: 'alice', display_name: null });
    mockTable('profiles', { invited_by: 'other-referrer' });
    const result = await applyReferralCode('u1', 'ABC123');
    expect(result).toEqual({ success: false, error: 'alreadyInvited' });
  });

  it('returns error on update failure', async () => {
    mockTable('profiles', { id: 'referrer-1', handle: 'alice', display_name: null });
    mockTable('profiles', { invited_by: null });
    mockTable('profiles', null, { message: 'Update failed' });
    const result = await applyReferralCode('u1', 'ABC123');
    expect(result).toEqual({ success: false, error: 'Update failed' });
  });
});

describe('triggerReferralReward', () => {
  it('calls reward_referral RPC', async () => {
    mockRpc('reward_referral', { success: true, referrer_id: 'ref-1' });
    await triggerReferralReward('u1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('reward_referral', { p_referee_id: 'u1' });
  });

  it('handles RPC error silently', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('reward_referral', null, { message: 'err' });
    await triggerReferralReward('u1'); // should not throw
    consoleSpy.mockRestore();
  });

  it('handles already-rewarded result silently', async () => {
    mockRpc('reward_referral', { success: false, reason: 'already_rewarded' });
    await triggerReferralReward('u1'); // should not throw
  });
});

describe('getClubByReferralCode', () => {
  it('returns club by referral code (uppercased)', async () => {
    mockTable('clubs', { id: 'c1', name: 'FC Test', slug: 'fc-test', logo_url: '/logo.png' });
    const result = await getClubByReferralCode('abc');
    expect(result).toEqual({ id: 'c1', name: 'FC Test', slug: 'fc-test', logo_url: '/logo.png' });
  });
  it('returns null when not found', async () => {
    mockTable('clubs', null);
    expect(await getClubByReferralCode('INVALID')).toBeNull();
  });
  it('returns null on error', async () => {
    mockTable('clubs', null, { message: 'err' });
    expect(await getClubByReferralCode('X')).toBeNull();
  });
});

describe('applyClubReferral', () => {
  it('upserts club follower', async () => {
    mockTable('club_followers', null);
    await applyClubReferral('u1', 'c1');
    expect(mockSupabase.from).toHaveBeenCalledWith('club_followers');
  });
  it('logs error but does not throw on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('club_followers', null, { message: 'upsert failed' });
    await applyClubReferral('u1', 'c1'); // should not throw
    consoleSpy.mockRestore();
  });
});
