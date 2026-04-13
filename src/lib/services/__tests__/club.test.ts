import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  getClubBySlug, getClubById, getAllClubs, getClubAdminFor,
  getClubPrestige, getClubFollowerCount, isUserFollowingClub,
  followClubsBatch, getUserFollowedClubs, getUserPrimaryClub,
  getClubsWithStats, getClubTradingFees, getClubRecentTrades,
  getClubDashboardStats, isClubAdmin, getClubAdmins, addClubAdmin,
  removeClubAdmin, getActiveGameweek, getLeagueActiveGameweek,
  setActiveGameweek, updateCommunityGuidelines, getClubFantasySettings,
  updateClubFantasySettings, getClubBalance, getClubWithdrawals,
  requestClubWithdrawal,
} from '../club';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// Club Queries
// ============================================
describe('getClubBySlug', () => {
  it('returns club via RPC', async () => {
    mockRpc('get_club_by_slug', { id: 'c1', name: 'Sakaryaspor' });
    const result = await getClubBySlug('sakaryaspor', 'u1');
    expect(result?.name).toBe('Sakaryaspor');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_club_by_slug', { p_slug: 'sakaryaspor', p_user_id: 'u1' });
  });
  it('passes null userId when not provided', async () => {
    mockRpc('get_club_by_slug', null);
    await getClubBySlug('test');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_club_by_slug', { p_slug: 'test', p_user_id: null });
  });
  it('returns null when no data', async () => {
    mockRpc('get_club_by_slug', null);
    expect(await getClubBySlug('x')).toBeNull();
  });
  it('throws on error', async () => {
    mockRpc('get_club_by_slug', null, { message: 'err' });
    await expect(getClubBySlug('x')).rejects.toThrow('err');
  });
});

describe('getClubById', () => {
  it('returns club', async () => {
    mockTable('clubs', { id: 'c1', name: 'Test' });
    expect((await getClubById('c1'))?.name).toBe('Test');
  });
  it('throws on DB error', async () => {
    mockTable('clubs', null, { message: 'err' });
    await expect(getClubById('c1')).rejects.toThrow('err');
  });
});

describe('getAllClubs', () => {
  it('returns clubs', async () => {
    mockTable('clubs', [{ id: 'c1' }, { id: 'c2' }]);
    expect(await getAllClubs()).toHaveLength(2);
  });
  it('throws on error', async () => {
    mockTable('clubs', null, { message: 'err' });
    await expect(getAllClubs()).rejects.toThrow('err');
  });
});

describe('getClubAdminFor', () => {
  it('returns admin info with slug', async () => {
    mockTable('club_admins', { club_id: 'c1', role: 'owner', clubs: { slug: 'fc-test' } });
    const result = await getClubAdminFor('u1');
    expect(result).toEqual({ clubId: 'c1', slug: 'fc-test', role: 'owner' });
  });
  it('handles array clubs join', async () => {
    mockTable('club_admins', { club_id: 'c1', role: 'admin', clubs: [{ slug: 'fc-test' }] });
    expect((await getClubAdminFor('u1'))?.slug).toBe('fc-test');
  });
  it('returns null on error', async () => {
    mockTable('club_admins', null, { message: 'err' });
    expect(await getClubAdminFor('u1')).toBeNull();
  });
  it('returns null when no data', async () => {
    mockTable('club_admins', null);
    expect(await getClubAdminFor('u1')).toBeNull();
  });
});

// ============================================
// Club Prestige
// ============================================
describe('getClubPrestige', () => {
  it('calculates prestige score and tier', async () => {
    mockTable('bounties', null, null, 10);
    mockTable('bounty_submissions', null, null, 5);
    mockTable('club_votes', null, null, 3);
    mockTable('posts', null, null, 2);
    mockTable('club_followers', null, null, 100);
    const result = await getClubPrestige('c1');
    // score = 10*15 + 5*25 + 3*10 + 2*5 + 100*1 = 150+125+30+10+100 = 415
    expect(result.score).toBe(415);
    expect(result.tier).toBe('vorbildlich'); // >= 300
  });

  it('returns starter tier for low score', async () => {
    mockTable('bounties', null, null, 0);
    mockTable('bounty_submissions', null, null, 0);
    mockTable('club_votes', null, null, 0);
    mockTable('posts', null, null, 0);
    mockTable('club_followers', null, null, 10);
    const result = await getClubPrestige('c1');
    expect(result.score).toBe(10);
    expect(result.tier).toBe('starter'); // < 50
  });
});

// ============================================
// Follower Operations
// ============================================
describe('getClubFollowerCount', () => {
  it('returns count', async () => {
    mockTable('club_followers', null, null, 42);
    expect(await getClubFollowerCount('c1')).toBe(42);
  });
  it('returns 0 on error', async () => {
    mockTable('club_followers', null, { message: 'err' });
    expect(await getClubFollowerCount('c1')).toBe(0);
  });
});

describe('isUserFollowingClub', () => {
  it('returns true when following', async () => {
    mockTable('club_followers', null, null, 1);
    expect(await isUserFollowingClub('u1', 'c1')).toBe(true);
  });
  it('returns false when not following', async () => {
    mockTable('club_followers', null, null, 0);
    expect(await isUserFollowingClub('u1', 'c1')).toBe(false);
  });
  it('returns false on error', async () => {
    mockTable('club_followers', null, { message: 'err' });
    expect(await isUserFollowingClub('u1', 'c1')).toBe(false);
  });
});

describe('followClubsBatch', () => {
  it('does nothing for empty array', async () => {
    await followClubsBatch('u1', []);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
  it('upserts club followers', async () => {
    mockTable('club_followers', null);
    await followClubsBatch('u1', ['c1', 'c2']);
    expect(mockSupabase.from).toHaveBeenCalledWith('club_followers');
  });
  it('retries once on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('club_followers', null, { message: 'fail' }); // first try
    mockTable('club_followers', null); // retry
    await followClubsBatch('u1', ['c1']);
    consoleSpy.mockRestore();
  });
});

describe('getUserFollowedClubs', () => {
  it('returns clubs', async () => {
    mockTable('club_followers', [{ club_id: 'c1', is_primary: true, clubs: { id: 'c1', name: 'Test' } }]);
    const result = await getUserFollowedClubs('u1');
    expect(result).toHaveLength(1);
  });
  it('throws on DB error', async () => {
    mockTable('club_followers', null, { message: 'err' });
    await expect(getUserFollowedClubs('u1')).rejects.toThrow('err');
  });
});

describe('getUserPrimaryClub', () => {
  it('returns primary club', async () => {
    mockTable('club_followers', { clubs: { id: 'c1', name: 'Primary' } });
    const result = await getUserPrimaryClub('u1');
    expect(result?.name).toBe('Primary');
  });
  it('returns null when no primary', async () => {
    mockTable('club_followers', null);
    expect(await getUserPrimaryClub('u1')).toBeNull();
  });
});

// ============================================
// Club Stats
// ============================================
describe('getClubsWithStats', () => {
  it('enriches clubs with follower and player counts', async () => {
    mockTable('clubs', [{ id: 'c1', name: 'FC Test' }]);
    mockTable('club_followers', [{ club_id: 'c1' }, { club_id: 'c1' }]);
    mockTable('players', [{ club_id: 'c1' }, { club_id: 'c1' }, { club_id: 'c1' }]);
    const result = await getClubsWithStats();
    expect(result[0].follower_count).toBe(2);
    expect(result[0].player_count).toBe(3);
  });
  it('throws on DB error', async () => {
    mockTable('clubs', null, { message: 'err' });
    await expect(getClubsWithStats()).rejects.toThrow('err');
  });
});

describe('getClubTradingFees', () => {
  it('returns aggregated fees', async () => {
    mockTable('players', [{ id: 'p1' }]);
    mockTable('trades', [
      { club_fee: 100, platform_fee: 350, pbt_fee: 150 },
      { club_fee: 200, platform_fee: 700, pbt_fee: 300 },
    ]);
    const result = await getClubTradingFees('c1');
    expect(result.totalClubFee).toBe(300);
    expect(result.totalPlatformFee).toBe(1050);
    expect(result.tradeCount).toBe(2);
  });
  it('returns zeros when no players', async () => {
    mockTable('players', []);
    const result = await getClubTradingFees('c1');
    expect(result).toEqual({ totalClubFee: 0, totalPlatformFee: 0, totalPbtFee: 0, tradeCount: 0 });
  });
});

describe('getClubRecentTrades', () => {
  it('returns trades with player info', async () => {
    mockTable('players', [{ id: 'p1' }]);
    mockTable('trades', [{ id: 't1', player_id: 'p1', price: 5000, player: { first_name: 'John', last_name: 'Doe', position: 'MID' } }]);
    const result = await getClubRecentTrades('c1');
    expect(result).toHaveLength(1);
  });
  it('returns [] when no players', async () => {
    mockTable('players', []);
    expect(await getClubRecentTrades('c1')).toEqual([]);
  });
});

// ============================================
// Dashboard & Admin
// ============================================
describe('getClubDashboardStats', () => {
  it('returns stats via RPC', async () => {
    mockRpc('get_club_dashboard_stats_v2', { total_fans: 30, ipo_revenue_cents: 500000, top_fans: [] });
    const result = await getClubDashboardStats('c1');
    expect(result.total_fans).toBe(30);
  });
  it('throws on error', async () => {
    mockRpc('get_club_dashboard_stats_v2', null, { message: 'err' });
    await expect(getClubDashboardStats('c1')).rejects.toThrow('err');
  });
});

describe('isClubAdmin', () => {
  it('returns true', async () => {
    mockRpc('is_club_admin', true);
    expect(await isClubAdmin('u1', 'c1')).toBe(true);
  });
  it('returns false on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('is_club_admin', null, { message: 'err' });
    expect(await isClubAdmin('u1', 'c1')).toBe(false);
    consoleSpy.mockRestore();
  });
});

describe('getClubAdmins', () => {
  it('returns admins with profiles', async () => {
    mockTable('club_admins', [{ user_id: 'u1', club_id: 'c1', role: 'owner', profiles: { handle: 'alice', display_name: 'Alice' } }]);
    const result = await getClubAdmins('c1');
    expect(result[0].handle).toBe('alice');
  });
  it('throws on DB error', async () => {
    mockTable('club_admins', null, { message: 'err' });
    await expect(getClubAdmins('c1')).rejects.toThrow('err');
  });
});

describe('addClubAdmin', () => {
  it('adds admin via RPC', async () => {
    mockRpc('add_club_admin', { success: true });
    expect(await addClubAdmin('c1', 'u1')).toEqual({ success: true });
  });
  it('throws on error', async () => {
    mockRpc('add_club_admin', null, { message: 'err' });
    await expect(addClubAdmin('c1', 'u1')).rejects.toThrow('err');
  });
});

describe('removeClubAdmin', () => {
  it('removes admin via RPC', async () => {
    mockRpc('remove_club_admin', { success: true });
    expect(await removeClubAdmin('c1', 'u1')).toEqual({ success: true });
  });
});

// ============================================
// Gameweek
// ============================================
describe('getActiveGameweek', () => {
  it('returns active gameweek', async () => {
    mockTable('clubs', { active_gameweek: 15 });
    expect(await getActiveGameweek('c1')).toBe(15);
  });
  it('returns 1 on error', async () => {
    mockTable('clubs', null, { message: 'err' });
    expect(await getActiveGameweek('c1')).toBe(1);
  });
  it('returns 1 when null', async () => {
    mockTable('clubs', { active_gameweek: null });
    expect(await getActiveGameweek('c1')).toBe(1);
  });
});

describe('getLeagueActiveGameweek', () => {
  it('returns min gameweek across clubs', async () => {
    mockTable('clubs', { active_gameweek: 12 });
    expect(await getLeagueActiveGameweek()).toBe(12);
  });
  it('returns 1 on error', async () => {
    mockTable('clubs', null, { message: 'err' });
    expect(await getLeagueActiveGameweek()).toBe(1);
  });
});

describe('setActiveGameweek', () => {
  it('sets via RPC', async () => {
    mockRpc('set_active_gameweek', null);
    await setActiveGameweek('c1', 15);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('set_active_gameweek', { p_club_id: 'c1', p_gameweek: 15 });
  });
  it('throws on error', async () => {
    mockRpc('set_active_gameweek', null, { message: 'err' });
    await expect(setActiveGameweek('c1', 99)).rejects.toThrow('err');
  });
});

describe('updateCommunityGuidelines', () => {
  it('updates via RPC', async () => {
    mockRpc('update_community_guidelines', { success: true });
    expect(await updateCommunityGuidelines('admin-1', 'c1', 'Be nice')).toEqual({ success: true });
  });
});

// ============================================
// Fantasy Settings
// ============================================
describe('getClubFantasySettings', () => {
  it('returns settings', async () => {
    mockTable('clubs', { fantasy_entry_fee_cents: 5000, fantasy_jurisdiction_preset: 'DE', fantasy_allow_entry_fees: true });
    const result = await getClubFantasySettings('c1');
    expect(result.fantasy_entry_fee_cents).toBe(5000);
  });
  it('returns defaults on error', async () => {
    mockTable('clubs', null, { message: 'err' });
    expect(await getClubFantasySettings('c1')).toEqual({
      fantasy_entry_fee_cents: 0, fantasy_jurisdiction_preset: 'TR', fantasy_allow_entry_fees: false,
    });
  });
});

describe('updateClubFantasySettings', () => {
  it('updates via RPC', async () => {
    mockRpc('update_club_fantasy_settings', null);
    await updateClubFantasySettings('c1', { fantasy_allow_entry_fees: true });
  });
  it('throws on error', async () => {
    mockRpc('update_club_fantasy_settings', null, { message: 'err' });
    await expect(updateClubFantasySettings('c1', {})).rejects.toThrow('err');
  });
});

// ============================================
// Balance & Withdrawals
// ============================================
describe('getClubBalance', () => {
  it('returns balance via RPC', async () => {
    mockRpc('get_club_balance', { earned: 500000, withdrawn: 100000, available: 400000 });
    expect((await getClubBalance('c1')).available).toBe(400000);
  });
  it('throws on error', async () => {
    mockRpc('get_club_balance', null, { message: 'err' });
    await expect(getClubBalance('c1')).rejects.toThrow('err');
  });
});

describe('getClubWithdrawals', () => {
  it('returns withdrawals with requester handle', async () => {
    mockTable('club_withdrawals', [{
      id: 'w1', amount_cents: 50000, status: 'pending',
      profiles: { handle: 'admin' },
    }]);
    const result = await getClubWithdrawals('c1');
    expect(result[0].requester_handle).toBe('admin');
  });
  it('throws on DB error', async () => {
    mockTable('club_withdrawals', null, { message: 'err' });
    await expect(getClubWithdrawals('c1')).rejects.toThrow('err');
  });
});

describe('requestClubWithdrawal', () => {
  it('requests via RPC', async () => {
    mockRpc('request_club_withdrawal', { success: true });
    expect(await requestClubWithdrawal('c1', 50000, 'Monthly')).toEqual({ success: true });
  });
  it('throws on error', async () => {
    mockRpc('request_club_withdrawal', null, { message: 'err' });
    await expect(requestClubWithdrawal('c1', 50000)).rejects.toThrow('err');
  });
});
