import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';
import {
  getClubBySlug, getClubById, getAllClubs, getClubAdminFor,
  getClubPrestige, getClubFollowerCount, isUserFollowingClub,
  followClubsBatch, getUserFollowedClubs, getUserPrimaryClub,
  getClubsWithStats, getClubTradingFees, getClubRecentTrades,
  getClubDashboardStats, isClubAdmin, getClubAdmins, addClubAdmin,
  removeClubAdmin, getActiveGameweek, getLeagueActiveGameweek, getLeagueMaxGameweeks,
  setActiveGameweek, updateCommunityGuidelines, getClubFantasySettings,
  updateClubFantasySettings, getClubBalance, getClubWithdrawals,
  requestClubWithdrawal, getClubStanding,
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
  it('throws on error (Slice 143 — no more silent return 0)', async () => {
    mockTable('club_followers', null, { message: 'transient network' });
    await expect(getClubFollowerCount('c1')).rejects.toThrow('transient network');
  });
});

// Slice 149: League Standings
describe('getClubStanding', () => {
  it('returns current standing', async () => {
    mockTable('league_standings', {
      rank: 1, played: 29, won: 21, drawn: 5, lost: 3,
      goals_for: 67, goals_against: 22, goals_diff: 45,
      points: 68, form: 'DWLWW', season: 2025,
    });
    const result = await getClubStanding('c1');
    expect(result).toEqual({
      rank: 1, played: 29, won: 21, drawn: 5, lost: 3,
      goalsFor: 67, goalsAgainst: 22, goalsDiff: 45,
      points: 68, form: 'DWLWW', season: 2025,
    });
  });
  it('returns null when no standing exists', async () => {
    mockTable('league_standings', null);
    expect(await getClubStanding('c1')).toBeNull();
  });
  it('handles null form gracefully', async () => {
    mockTable('league_standings', {
      rank: 5, played: 10, won: 4, drawn: 2, lost: 4,
      goals_for: 15, goals_against: 14, goals_diff: 1,
      points: 14, form: null, season: 2025,
    });
    const result = await getClubStanding('c1');
    expect(result?.form).toBeNull();
  });
  it('throws on DB error', async () => {
    mockTable('league_standings', null, { message: 'db err' });
    await expect(getClubStanding('c1')).rejects.toThrow('db err');
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
  it('chunks players via .range() when payload exceeds one page (Slice 133)', async () => {
    // Root cause this test guards: PostgREST capped responses at ~1000 rows
    // even with `.limit(10000)` → /clubs showed fractional player counts
    // (Beşiktaş 2 instead of 20, Alanyaspor 7 instead of 33).
    const chunk1 = Array.from({ length: 1000 }, () => ({ club_id: 'c1' }));
    const chunk2 = Array.from({ length: 234 }, () => ({ club_id: 'c1' }));
    mockTable('clubs', [{ id: 'c1', name: 'FC Big' }]);
    mockTable('club_followers', []);
    mockTable('players', chunk1);
    mockTable('players', chunk2);
    const result = await getClubsWithStats({ activeOnly: true });
    expect(result[0].player_count).toBe(1234);
  });
  it('throws when a player chunk returns an error', async () => {
    mockTable('clubs', [{ id: 'c1' }]);
    mockTable('club_followers', []);
    mockTable('players', null, { message: 'chunk-boom' });
    await expect(getClubsWithStats({ activeOnly: true })).rejects.toThrow('chunk-boom');
  });
});

describe('getClubTradingFees', () => {
  it('returns aggregated fees (Slice 095 Phase 2: via RPC)', async () => {
    mockRpc('rpc_get_club_trading_fees', {
      totalClubFee: 300, totalPlatformFee: 1050, totalPbtFee: 450, tradeCount: 2,
    });
    const result = await getClubTradingFees('c1');
    expect(result.totalClubFee).toBe(300);
    expect(result.totalPlatformFee).toBe(1050);
    expect(result.tradeCount).toBe(2);
  });
  it('returns zeros on RPC error', async () => {
    mockRpc('rpc_get_club_trading_fees', null, { message: 'not_club_admin' });
    const result = await getClubTradingFees('c1');
    expect(result).toEqual({ totalClubFee: 0, totalPlatformFee: 0, totalPbtFee: 0, tradeCount: 0 });
  });
});

describe('getClubRecentTrades', () => {
  it('returns trades mapped to player-join shape (Slice 095 Phase 2: via RPC)', async () => {
    mockRpc('rpc_get_club_recent_trades', [{
      id: 't1',
      player_id: 'p1',
      player_first_name: 'John',
      player_last_name: 'Doe',
      player_position: 'MID',
      price: 5000,
      quantity: 1,
      executed_at: new Date().toISOString(),
    }]);
    const result = await getClubRecentTrades('c1');
    expect(result).toHaveLength(1);
    expect(result[0].player.first_name).toBe('John');
    expect(result[0].player.last_name).toBe('Doe');
  });
  it('returns [] on RPC error', async () => {
    mockRpc('rpc_get_club_recent_trades', null, { message: 'not_club_admin' });
    await expect(getClubRecentTrades('c1')).rejects.toThrow('not_club_admin');
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

describe('getLeagueActiveGameweek (Slice 251 Wave 1)', () => {
  it('reads from leagues table with leagueId', async () => {
    mockTable('leagues', { active_gameweek: 10 });
    expect(await getLeagueActiveGameweek('league-bl')).toBe(10);
  });
  it('returns 1 fallback when leagueId is null', async () => {
    expect(await getLeagueActiveGameweek(null)).toBe(1);
  });
  it('returns 1 fallback when leagues row not found', async () => {
    mockTable('leagues', null);
    expect(await getLeagueActiveGameweek('unknown-id')).toBe(1);
  });
  it('returns 1 fallback when active_gameweek is NULL', async () => {
    mockTable('leagues', { active_gameweek: null });
    expect(await getLeagueActiveGameweek('league-bl')).toBe(1);
  });
  it('throws when supabase errors', async () => {
    mockTable('leagues', null, { message: 'rls_reject' });
    await expect(getLeagueActiveGameweek('league-bl')).rejects.toThrow('rls_reject');
  });
});

describe('getLeagueMaxGameweeks (Slice 251 Wave 1)', () => {
  it('reads max_gameweeks from leagues with leagueId', async () => {
    mockTable('leagues', { max_gameweeks: 34 });
    expect(await getLeagueMaxGameweeks('league-tff1')).toBe(34);
  });
  it('returns 38 fallback when leagueId is null', async () => {
    expect(await getLeagueMaxGameweeks(null)).toBe(38);
  });
  it('returns 38 fallback when leagues row not found', async () => {
    mockTable('leagues', null);
    expect(await getLeagueMaxGameweeks('unknown-id')).toBe(38);
  });
  it('returns 38 fallback when max_gameweeks is NULL', async () => {
    mockTable('leagues', { max_gameweeks: null });
    expect(await getLeagueMaxGameweeks('league-bl')).toBe(38);
  });
  it('returns 38 fallback when value is undefined', async () => {
    mockTable('leagues', {});
    expect(await getLeagueMaxGameweeks('league-bl')).toBe(38);
  });
  it('throws when supabase errors', async () => {
    mockTable('leagues', null, { message: 'rls_reject' });
    await expect(getLeagueMaxGameweeks('league-bl')).rejects.toThrow('rls_reject');
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
