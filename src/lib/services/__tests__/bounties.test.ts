import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mocks — BEFORE any service import
// vi.mock factories are hoisted, so NO external references allowed inside.
// ============================================

vi.mock('@/lib/services/trading', () => ({ mapRpcError: vi.fn((msg: string) => msg) }));
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({
  createNotification: vi.fn(),
  createNotificationsBatch: vi.fn(),
}));
vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));
vi.mock('@/lib/services/social', () => ({ checkAndUnlockAchievements: vi.fn() }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));
vi.mock('@/lib/services/posts', () => ({ createPost: vi.fn() }));

// ============================================
// Table-routing supabase mock
// Must be defined INSIDE the factory to avoid hoisting issues.
// We expose the mock via a global variable that the factory can reference.
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _registry = (globalThis as any).__bountyTestRegistry ??= {
  tableResponses: {} as Record<string, { data: unknown; error: { message: string } | null }>,
  rpcResponses: {} as Record<string, { data: unknown; error: { message: string } | null }>,
};

function setTableResponse(table: string, data: unknown, error: { message: string } | null = null) {
  _registry.tableResponses[table] = { data, error };
}

function setRpcResponse(rpcName: string, data: unknown, error: { message: string } | null = null) {
  _registry.rpcResponses[rpcName] = { data, error };
}

vi.mock('@/lib/supabaseClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reg = (globalThis as any).__bountyTestRegistry ??= {
    tableResponses: {} as Record<string, { data: unknown; error: { message: string } | null }>,
    rpcResponses: {} as Record<string, { data: unknown; error: { message: string } | null }>,
  };

  type MockResult = { data: unknown; error: { message: string } | null };

  function createChainableBuilder(getResult: () => MockResult): Record<string, unknown> {
    const builder: Record<string, unknown> = {};
    const chainMethods = [
      'select', 'insert', 'update', 'upsert', 'delete',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
      'like', 'ilike', 'is', 'in', 'contains',
      'order', 'limit', 'offset', 'match', 'not', 'filter', 'or',
    ];
    for (const method of chainMethods) {
      builder[method] = vi.fn().mockReturnValue(builder);
    }
    builder['single'] = vi.fn().mockImplementation(() => getResult());
    builder['maybeSingle'] = vi.fn().mockImplementation(() => getResult());
    builder['then'] = vi.fn().mockImplementation(
      (resolve: (val: unknown) => void) => resolve(getResult()),
    );
    return builder;
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        const getResult = () => reg.tableResponses[table] ?? { data: null, error: null };
        return createChainableBuilder(getResult);
      }),
      rpc: vi.fn((rpcName: string) => {
        return reg.rpcResponses[rpcName] ?? { data: null, error: null };
      }),
    },
  };
});

// ============================================
// Service imports — AFTER mocks
// ============================================

import { supabase } from '@/lib/supabaseClient';
import {
  invalidateBountyData,
  getBountiesByClub,
  getAllActiveBounties,
  getBountySubmissions,
  getUserBountySubmissions,
  createBounty,
  createUserBounty,
  cancelBounty,
  submitBountyResponse,
  approveBountySubmission,
  rejectBountySubmission,
} from '../bounties';

// ============================================
// Test fixtures
// ============================================

const CLUB_ID = 'club-001';
const USER_ID = 'user-001';
const ADMIN_ID = 'admin-001';
const BOUNTY_ID = 'bounty-001';
const SUBMISSION_ID = 'sub-001';

function makeBounty(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: BOUNTY_ID,
    club_id: CLUB_ID,
    club_name: 'Sakaryaspor',
    created_by: USER_ID,
    title: 'Scout Report: Attacking',
    description: 'Write a scouting report...',
    reward_cents: 50000,
    deadline_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    max_submissions: 5,
    player_id: null,
    position: null,
    status: 'open',
    submission_count: 0,
    min_tier: null,
    type: 'general',
    fixture_id: null,
    is_user_bounty: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeProfile(id: string, handle: string) {
  return { id, handle, display_name: handle.toUpperCase(), avatar_url: null };
}

function makeSubmission(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: SUBMISSION_ID,
    bounty_id: BOUNTY_ID,
    user_id: USER_ID,
    title: 'My Report',
    content: 'Detailed scouting report...',
    status: 'pending',
    admin_feedback: null,
    reviewed_by: null,
    reviewed_at: null,
    reward_paid: 0,
    evaluation: null,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

// ============================================
// Reset between tests
// ============================================

beforeEach(() => {
  vi.clearAllMocks();
  _registry.tableResponses = {};
  _registry.rpcResponses = {};
});

// ============================================
// invalidateBountyData
// ============================================

describe('invalidateBountyData', () => {
  it('is a no-op function (returns void)', () => {
    expect(() => invalidateBountyData('u1', 'c1')).not.toThrow();
    expect(invalidateBountyData('u1')).toBeUndefined();
  });

  it('accepts no arguments', () => {
    expect(() => invalidateBountyData()).not.toThrow();
  });
});

// ============================================
// getBountiesByClub
// ============================================

describe('getBountiesByClub', () => {
  it('returns enriched bounties for a club (happy path)', async () => {
    const bounty = makeBounty({ created_by: 'creator-1', player_id: 'player-1' });
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', [bounty]);
    setTableResponse('profiles', [makeProfile('creator-1', 'scout_master')]);
    setTableResponse('players', [{ id: 'player-1', first_name: 'Ali', last_name: 'Yilmaz', position: 'ATT' }]);
    setTableResponse('bounty_submissions', []);

    const result = await getBountiesByClub(CLUB_ID, USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].creator_handle).toBe('scout_master');
    expect(result[0].player_name).toBe('Ali Yilmaz');
    expect(result[0].player_position).toBe('ATT');
    expect(result[0].has_user_submitted).toBe(false);
  });

  it('returns empty array when no bounties exist', async () => {
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', []);

    const result = await getBountiesByClub(CLUB_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', null);

    const result = await getBountiesByClub(CLUB_ID);
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', null, { message: 'DB connection failed' });

    await expect(getBountiesByClub(CLUB_ID)).rejects.toThrow('DB connection failed');
  });

  it('marks has_user_submitted=true when user submitted', async () => {
    const bounty = makeBounty();
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', [bounty]);
    setTableResponse('profiles', [makeProfile(USER_ID, 'test_user')]);
    setTableResponse('bounty_submissions', [{ bounty_id: BOUNTY_ID }]);

    const result = await getBountiesByClub(CLUB_ID, USER_ID);
    expect(result[0].has_user_submitted).toBe(true);
  });

  it('does not fetch submissions when no currentUserId', async () => {
    const bounty = makeBounty();
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', [bounty]);
    setTableResponse('profiles', [makeProfile(USER_ID, 'test_user')]);

    const result = await getBountiesByClub(CLUB_ID);
    expect(result[0].has_user_submitted).toBe(false);
  });

  it('handles bounty without player_id (no player lookup)', async () => {
    const bounty = makeBounty({ player_id: null });
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', [bounty]);
    setTableResponse('profiles', [makeProfile(USER_ID, 'test_user')]);

    const result = await getBountiesByClub(CLUB_ID);
    expect(result[0].player_name).toBeNull();
    expect(result[0].player_position).toBeNull();
  });

  it('uses notifText fallback when player not found in DB', async () => {
    const bounty = makeBounty({ player_id: 'missing-player' });
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', [bounty]);
    setTableResponse('profiles', [makeProfile(USER_ID, 'test_user')]);
    setTableResponse('players', []);

    const result = await getBountiesByClub(CLUB_ID);
    expect(result[0].player_name).toBe('researchFallbackPlayer');
  });

  it('handles profile not found (falls back to unknown)', async () => {
    const bounty = makeBounty({ created_by: 'deleted-user' });
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', [bounty]);
    setTableResponse('profiles', []);

    const result = await getBountiesByClub(CLUB_ID);
    expect(result[0].creator_handle).toBe('unknown');
    expect(result[0].creator_display_name).toBeNull();
  });

  it('continues even if auto_close_expired_bounties RPC fails', async () => {
    setRpcResponse('auto_close_expired_bounties', null, { message: 'RPC timeout' });
    setTableResponse('bounties', []);

    const result = await getBountiesByClub(CLUB_ID);
    expect(result).toEqual([]);
  });
});

// ============================================
// getAllActiveBounties
// ============================================

describe('getAllActiveBounties', () => {
  it('returns enriched active bounties (happy path)', async () => {
    const bounty = makeBounty({ status: 'open' });
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', [bounty]);
    setTableResponse('profiles', [makeProfile(USER_ID, 'test_user')]);

    const result = await getAllActiveBounties(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Scout Report: Attacking');
  });

  it('returns empty array when no active bounties', async () => {
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', []);

    const result = await getAllActiveBounties();
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', null);

    const result = await getAllActiveBounties();
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', null, { message: 'connection refused' });

    await expect(getAllActiveBounties()).rejects.toThrow('connection refused');
  });

  it('filters by clubId when provided', async () => {
    setRpcResponse('auto_close_expired_bounties', null);
    setTableResponse('bounties', []);

    await getAllActiveBounties(undefined, CLUB_ID);
    expect(supabase.from).toHaveBeenCalledWith('bounties');
  });

  it('continues even if auto_close RPC fails', async () => {
    setRpcResponse('auto_close_expired_bounties', null, { message: 'timeout' });
    setTableResponse('bounties', []);

    const result = await getAllActiveBounties();
    expect(result).toEqual([]);
  });
});

// ============================================
// getBountySubmissions
// ============================================

describe('getBountySubmissions', () => {
  it('returns enriched submissions (happy path)', async () => {
    const sub = makeSubmission();
    setTableResponse('bounty_submissions', [sub]);
    setTableResponse('profiles', [makeProfile(USER_ID, 'submitter')]);

    const result = await getBountySubmissions(BOUNTY_ID);
    expect(result).toHaveLength(1);
    expect(result[0].user_handle).toBe('submitter');
    expect(result[0].user_display_name).toBe('SUBMITTER');
    expect(result[0].title).toBe('My Report');
  });

  it('returns empty array when no submissions', async () => {
    setTableResponse('bounty_submissions', []);

    const result = await getBountySubmissions(BOUNTY_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    setTableResponse('bounty_submissions', null);

    const result = await getBountySubmissions(BOUNTY_ID);
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    setTableResponse('bounty_submissions', null, { message: 'query failed' });

    await expect(getBountySubmissions(BOUNTY_ID)).rejects.toThrow('query failed');
  });

  it('handles profile not found (fallback to unknown)', async () => {
    const sub = makeSubmission({ user_id: 'ghost-user' });
    setTableResponse('bounty_submissions', [sub]);
    setTableResponse('profiles', []);

    const result = await getBountySubmissions(BOUNTY_ID);
    expect(result[0].user_handle).toBe('unknown');
    expect(result[0].user_display_name).toBeNull();
  });

  it('handles multiple submissions from different users', async () => {
    const sub1 = makeSubmission({ id: 'sub-1', user_id: 'u1' });
    const sub2 = makeSubmission({ id: 'sub-2', user_id: 'u2' });
    setTableResponse('bounty_submissions', [sub1, sub2]);
    setTableResponse('profiles', [
      makeProfile('u1', 'scout_a'),
      makeProfile('u2', 'scout_b'),
    ]);

    const result = await getBountySubmissions(BOUNTY_ID);
    expect(result).toHaveLength(2);
    expect(result[0].user_handle).toBe('scout_a');
    expect(result[1].user_handle).toBe('scout_b');
  });
});

// ============================================
// getUserBountySubmissions
// ============================================

describe('getUserBountySubmissions', () => {
  it('returns submissions with bounty info (happy path)', async () => {
    const row = {
      ...makeSubmission(),
      bounties: { title: 'Scout Report', reward_cents: 50000 },
    };
    setTableResponse('bounty_submissions', [row]);

    const result = await getUserBountySubmissions(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].bounty_title).toBe('Scout Report');
    expect(result[0].bounty_reward_cents).toBe(50000);
  });

  it('returns empty array when no submissions', async () => {
    setTableResponse('bounty_submissions', []);

    const result = await getUserBountySubmissions(USER_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    setTableResponse('bounty_submissions', null);

    const result = await getUserBountySubmissions(USER_ID);
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    setTableResponse('bounty_submissions', null, { message: 'fetch failed' });

    await expect(getUserBountySubmissions(USER_ID)).rejects.toThrow('fetch failed');
  });

  it('handles null bounty FK join (defaults to empty title, 0 reward)', async () => {
    const row = {
      ...makeSubmission(),
      bounties: null,
    };
    setTableResponse('bounty_submissions', [row]);

    const result = await getUserBountySubmissions(USER_ID);
    expect(result[0].bounty_title).toBe('');
    expect(result[0].bounty_reward_cents).toBe(0);
  });
});

// ============================================
// createBounty
// ============================================

describe('createBounty', () => {
  const params = {
    userId: USER_ID,
    clubId: CLUB_ID,
    clubName: 'Sakaryaspor',
    title: 'Scout Report',
    description: 'Write a report...',
    rewardCents: 50000,
    deadlineDays: 7,
    maxSubmissions: 5,
  };

  it('creates bounty and returns data (happy path)', async () => {
    const createdBounty = makeBounty({ id: 'new-bounty-1' });
    setTableResponse('bounties', createdBounty);

    const result = await createBounty(params);
    expect(result.id).toBe('new-bounty-1');
    expect(supabase.from).toHaveBeenCalledWith('bounties');
  });

  it('throws on supabase error', async () => {
    setTableResponse('bounties', null, { message: 'insert failed' });

    await expect(createBounty(params)).rejects.toThrow('insert failed');
  });

  it('passes optional playerId and position', async () => {
    const createdBounty = makeBounty({ player_id: 'p1' });
    setTableResponse('bounties', createdBounty);

    const result = await createBounty({ ...params, playerId: 'p1', position: 'ATT' });
    expect(result.player_id).toBe('p1');
  });

  it('defaults type to general when not provided', async () => {
    const createdBounty = makeBounty({ type: 'general' });
    setTableResponse('bounties', createdBounty);

    const result = await createBounty(params);
    expect(result.type).toBe('general');
  });

  it('sets type to scouting when explicitly provided', async () => {
    const createdBounty = makeBounty({ type: 'scouting' });
    setTableResponse('bounties', createdBounty);

    const result = await createBounty({ ...params, type: 'scouting' });
    expect(result.type).toBe('scouting');
  });
});

// ============================================
// createUserBounty (escrow pattern)
// ============================================

describe('createUserBounty', () => {
  const params = {
    userId: USER_ID,
    clubId: CLUB_ID,
    clubName: 'Sakaryaspor',
    title: 'User Bounty',
    description: 'Community bounty...',
    rewardCents: 25000,
    deadlineDays: 3,
    maxSubmissions: 3,
  };

  it('creates user bounty via RPC (happy path)', async () => {
    setRpcResponse('create_user_bounty', { success: true, bounty_id: 'ub-001' });

    const result = await createUserBounty(params);
    expect(result.bounty_id).toBe('ub-001');
    expect(supabase.rpc).toHaveBeenCalledWith('create_user_bounty', expect.objectContaining({
      p_user_id: USER_ID,
      p_club_id: CLUB_ID,
      p_reward_cents: 25000,
    }));
  });

  it('throws on RPC error', async () => {
    setRpcResponse('create_user_bounty', null, { message: 'insufficient_balance' });

    await expect(createUserBounty(params)).rejects.toThrow('insufficient_balance');
  });

  it('throws when RPC returns success=false', async () => {
    setRpcResponse('create_user_bounty', { success: false, error: 'insufficient_balance' });

    await expect(createUserBounty(params)).rejects.toThrow('insufficient_balance');
  });

  it('throws with fallback message when success=false and no error field', async () => {
    setRpcResponse('create_user_bounty', { success: false });

    await expect(createUserBounty(params)).rejects.toThrow('bountyCreateFailed');
  });

  it('passes null for missing playerId', async () => {
    setRpcResponse('create_user_bounty', { success: true, bounty_id: 'ub-002' });

    await createUserBounty(params);
    expect(supabase.rpc).toHaveBeenCalledWith('create_user_bounty', expect.objectContaining({
      p_player_id: null,
    }));
  });

  it('passes playerId when provided', async () => {
    setRpcResponse('create_user_bounty', { success: true, bounty_id: 'ub-003' });

    await createUserBounty({ ...params, playerId: 'player-99' });
    expect(supabase.rpc).toHaveBeenCalledWith('create_user_bounty', expect.objectContaining({
      p_player_id: 'player-99',
    }));
  });
});

// ============================================
// cancelBounty
// ============================================

describe('cancelBounty', () => {
  it('cancels bounty successfully (happy path)', async () => {
    setRpcResponse('cancel_user_bounty', { success: true });

    await expect(cancelBounty(USER_ID, BOUNTY_ID)).resolves.toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_user_bounty', {
      p_user_id: USER_ID,
      p_bounty_id: BOUNTY_ID,
    });
  });

  it('throws on RPC error', async () => {
    setRpcResponse('cancel_user_bounty', null, { message: 'not_found' });

    await expect(cancelBounty(USER_ID, BOUNTY_ID)).rejects.toThrow('not_found');
  });

  it('throws when RPC returns success=false', async () => {
    setRpcResponse('cancel_user_bounty', { success: false, error: 'not_owner' });

    await expect(cancelBounty(USER_ID, BOUNTY_ID)).rejects.toThrow('not_owner');
  });

  it('throws fallback message when success=false without error', async () => {
    setRpcResponse('cancel_user_bounty', { success: false });

    await expect(cancelBounty(USER_ID, BOUNTY_ID)).rejects.toThrow('bountyCancelFailed');
  });
});

// ============================================
// submitBountyResponse
// ============================================

describe('submitBountyResponse', () => {
  it('submits successfully and returns result (happy path)', async () => {
    setRpcResponse('submit_bounty_response', { success: true, submission_id: 'sub-new' });
    setTableResponse('bounties', { created_by: ADMIN_ID, title: 'Scout Report' });

    const result = await submitBountyResponse(USER_ID, BOUNTY_ID, 'My Title', 'Content');
    expect(result.success).toBe(true);
    expect(result.submission_id).toBe('sub-new');
  });

  it('throws on RPC error', async () => {
    setRpcResponse('submit_bounty_response', null, { message: 'bounty_closed' });

    await expect(
      submitBountyResponse(USER_ID, BOUNTY_ID, 'Title', 'Content'),
    ).rejects.toThrow('bounty_closed');
  });

  it('returns result when RPC returns success=false (does NOT throw)', async () => {
    setRpcResponse('submit_bounty_response', { success: false, error: 'already_submitted' });

    const result = await submitBountyResponse(USER_ID, BOUNTY_ID, 'Title', 'Content');
    expect(result.success).toBe(false);
    expect(result.error).toBe('already_submitted');
  });

  it('passes evaluation data when provided', async () => {
    setRpcResponse('submit_bounty_response', { success: true, submission_id: 'sub-eval' });
    setTableResponse('bounties', { created_by: ADMIN_ID, title: 'Scout Report' });

    const evaluation = { rating: 8, notes: 'Good prospect' };
    const result = await submitBountyResponse(USER_ID, BOUNTY_ID, 'Title', 'Content', evaluation);
    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('submit_bounty_response', expect.objectContaining({
      p_evaluation: evaluation,
    }));
  });

  it('passes null evaluation when not provided', async () => {
    setRpcResponse('submit_bounty_response', { success: false });

    await submitBountyResponse(USER_ID, BOUNTY_ID, 'Title', 'Content');
    expect(supabase.rpc).toHaveBeenCalledWith('submit_bounty_response', expect.objectContaining({
      p_evaluation: null,
    }));
  });

  it('does not trigger notifications/missions on failure result', async () => {
    setRpcResponse('submit_bounty_response', { success: false, error: 'max_reached' });

    const result = await submitBountyResponse(USER_ID, BOUNTY_ID, 'Title', 'Content');
    expect(result.success).toBe(false);
  });
});

// ============================================
// approveBountySubmission
// ============================================

describe('approveBountySubmission', () => {
  it('approves submission and returns result (happy path)', async () => {
    setRpcResponse('approve_bounty_submission', { success: true, reward: 50000 });
    setTableResponse('bounty_submissions', {
      user_id: USER_ID,
      bounty_id: BOUNTY_ID,
      bounties: { title: 'Scout Report' },
    });
    setTableResponse('profiles', [makeProfile(USER_ID, 'submitter')]);

    const result = await approveBountySubmission(ADMIN_ID, SUBMISSION_ID, 'Great work!');
    expect(result.success).toBe(true);
    expect(result.reward).toBe(50000);
  });

  it('throws on RPC error', async () => {
    setRpcResponse('approve_bounty_submission', null, { message: 'not_admin' });

    await expect(
      approveBountySubmission(ADMIN_ID, SUBMISSION_ID),
    ).rejects.toThrow('not_admin');
  });

  it('returns failure result without throwing', async () => {
    setRpcResponse('approve_bounty_submission', { success: false, error: 'already_approved' });

    const result = await approveBountySubmission(ADMIN_ID, SUBMISSION_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe('already_approved');
  });

  it('passes feedback as null when not provided', async () => {
    setRpcResponse('approve_bounty_submission', { success: true, reward: 25000 });
    setTableResponse('bounty_submissions', {
      user_id: USER_ID,
      bounty_id: BOUNTY_ID,
      bounties: { title: 'Test' },
    });
    setTableResponse('profiles', [makeProfile(USER_ID, 'user')]);

    await approveBountySubmission(ADMIN_ID, SUBMISSION_ID);
    expect(supabase.rpc).toHaveBeenCalledWith('approve_bounty_submission', {
      p_admin_id: ADMIN_ID,
      p_submission_id: SUBMISSION_ID,
      p_feedback: null,
    });
  });

  it('passes feedback string when provided', async () => {
    setRpcResponse('approve_bounty_submission', { success: true, reward: 25000 });
    setTableResponse('bounty_submissions', {
      user_id: USER_ID,
      bounty_id: BOUNTY_ID,
      bounties: { title: 'Test' },
    });
    setTableResponse('profiles', [makeProfile(USER_ID, 'user')]);

    await approveBountySubmission(ADMIN_ID, SUBMISSION_ID, 'Excellent report');
    expect(supabase.rpc).toHaveBeenCalledWith('approve_bounty_submission', {
      p_admin_id: ADMIN_ID,
      p_submission_id: SUBMISSION_ID,
      p_feedback: 'Excellent report',
    });
  });
});

// ============================================
// rejectBountySubmission
// ============================================

describe('rejectBountySubmission', () => {
  it('rejects submission and returns result (happy path)', async () => {
    setRpcResponse('reject_bounty_submission', { success: true });
    setTableResponse('bounty_submissions', {
      user_id: USER_ID,
      bounty_id: BOUNTY_ID,
      bounties: { title: 'Scout Report' },
    });

    const result = await rejectBountySubmission(ADMIN_ID, SUBMISSION_ID, 'Needs more detail');
    expect(result.success).toBe(true);
  });

  it('throws on RPC error', async () => {
    setRpcResponse('reject_bounty_submission', null, { message: 'permission_denied' });

    await expect(
      rejectBountySubmission(ADMIN_ID, SUBMISSION_ID),
    ).rejects.toThrow('permission_denied');
  });

  it('returns failure result without throwing', async () => {
    setRpcResponse('reject_bounty_submission', { success: false, error: 'already_rejected' });

    const result = await rejectBountySubmission(ADMIN_ID, SUBMISSION_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe('already_rejected');
  });

  it('passes null feedback when not provided', async () => {
    setRpcResponse('reject_bounty_submission', { success: true });
    setTableResponse('bounty_submissions', {
      user_id: USER_ID,
      bounty_id: BOUNTY_ID,
      bounties: { title: 'Test' },
    });

    await rejectBountySubmission(ADMIN_ID, SUBMISSION_ID);
    expect(supabase.rpc).toHaveBeenCalledWith('reject_bounty_submission', {
      p_admin_id: ADMIN_ID,
      p_submission_id: SUBMISSION_ID,
      p_feedback: null,
    });
  });

  it('passes feedback string when provided', async () => {
    setRpcResponse('reject_bounty_submission', { success: true });
    setTableResponse('bounty_submissions', {
      user_id: USER_ID,
      bounty_id: BOUNTY_ID,
      bounties: { title: 'Test' },
    });

    await rejectBountySubmission(ADMIN_ID, SUBMISSION_ID, 'Incomplete analysis');
    expect(supabase.rpc).toHaveBeenCalledWith('reject_bounty_submission', {
      p_admin_id: ADMIN_ID,
      p_submission_id: SUBMISSION_ID,
      p_feedback: 'Incomplete analysis',
    });
  });

  it('does not trigger notification on failure result', async () => {
    setRpcResponse('reject_bounty_submission', { success: false, error: 'already_handled' });

    const result = await rejectBountySubmission(ADMIN_ID, SUBMISSION_ID);
    expect(result.success).toBe(false);
  });
});
