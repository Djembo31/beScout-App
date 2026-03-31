import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({
  createNotification: vi.fn(),
  createBatchedNotification: vi.fn(),
}));
vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));
vi.mock('@/lib/services/tickets', () => ({ creditTickets: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));

import {
  getPlayerSentimentCounts,
  getResearchPosts,
  getUserUnlockedIds,
  createResearchPost,
  deleteResearchPost,
  unlockResearch,
  rateResearch,
  resolveExpiredResearch,
  _resetResolveCache,
  getAuthorTrackRecord,
} from '../research';

beforeEach(() => {
  _resetResolveCache();
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// getPlayerSentimentCounts
// ============================================
describe('getPlayerSentimentCounts', () => {
  it('counts sentiment calls', async () => {
    mockTable('research_posts', [
      { call: 'Bullish' },
      { call: 'Bullish' },
      { call: 'Bearish' },
      { call: 'Neutral' },
    ]);
    const result = await getPlayerSentimentCounts('p1');
    expect(result).toEqual({ bullish: 2, bearish: 1, neutral: 1, total: 4 });
  });

  it('returns zeros when no data', async () => {
    mockTable('research_posts', null);
    const result = await getPlayerSentimentCounts('p1');
    expect(result).toEqual({ bullish: 0, bearish: 0, neutral: 0, total: 0 });
  });

  it('returns zeros for empty results', async () => {
    mockTable('research_posts', []);
    const result = await getPlayerSentimentCounts('p1');
    expect(result.total).toBe(0);
  });
});

// ============================================
// getResearchPosts
// ============================================
describe('getResearchPosts', () => {
  const samplePost = {
    id: 'r1', user_id: 'u1', player_id: 'p1', club_name: 'FC Test',
    club_id: 'club-1', title: 'Test Post', preview: 'Preview text',
    content: 'Full content', tags: ['tag1'], category: 'analysis',
    call: 'Bullish', horizon: '30d', price: 500, unlock_count: 0,
    total_earned: 0, ratings_count: 0, avg_rating: 0,
    price_at_creation: 5000, price_at_resolution: null,
    outcome: null, price_change_pct: null, resolved_at: null,
    evaluation: null, fixture_id: null,
    created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z',
  };

  it('returns enriched posts', async () => {
    mockTable('research_posts', [samplePost]);
    mockTable('profiles', [{ id: 'u1', handle: 'alice', display_name: 'Alice', avatar_url: null, level: 5, verified: false, top_role: null }]);
    mockTable('players', [{ id: 'p1', first_name: 'John', last_name: 'Doe', position: 'MID' }]);
    mockRpc('rpc_get_author_track_records', [{ user_id: 'u1', total_calls: 10, correct_calls: 7, hit_rate: 0.7 }]);

    const result = await getResearchPosts({ limit: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].author_handle).toBe('alice');
    expect(result[0].player_name).toBe('John Doe');
    expect(result[0].author_track_record).toEqual({ hitRate: 70, totalCalls: 10 });
    expect(result[0].is_unlocked).toBe(false);
    expect(result[0].is_own).toBe(false);
    expect(result[0].user_rating).toBeNull();
  });

  it('enriches with user-specific data when currentUserId provided', async () => {
    mockTable('research_posts', [samplePost]);
    mockTable('profiles', [{ id: 'u1', handle: 'alice', display_name: null, avatar_url: null, level: 1, verified: false, top_role: null }]);
    mockTable('players', [{ id: 'p1', first_name: 'John', last_name: 'Doe', position: 'MID' }]);
    mockRpc('rpc_get_author_track_records', []);
    mockTable('research_unlocks', [{ research_id: 'r1' }]);
    mockTable('research_ratings', [{ research_id: 'r1', rating: 4.5 }]);

    const result = await getResearchPosts({ limit: 10, currentUserId: 'u2' });
    expect(result[0].is_unlocked).toBe(true);
    expect(result[0].user_rating).toBe(4.5);
    expect(result[0].is_own).toBe(false);
  });

  it('marks own posts', async () => {
    mockTable('research_posts', [samplePost]);
    mockTable('profiles', [{ id: 'u1', handle: 'alice', display_name: null, avatar_url: null, level: 1, verified: false, top_role: null }]);
    mockTable('players', [{ id: 'p1', first_name: 'John', last_name: 'Doe', position: 'MID' }]);
    mockRpc('rpc_get_author_track_records', []);
    mockTable('research_unlocks', []);
    mockTable('research_ratings', []);

    const result = await getResearchPosts({ limit: 10, currentUserId: 'u1' });
    expect(result[0].is_own).toBe(true);
  });

  it('returns [] for empty results', async () => {
    mockTable('research_posts', []);
    expect(await getResearchPosts({ limit: 10 })).toEqual([]);
  });

  it('throws on main query error', async () => {
    mockTable('research_posts', null, { message: 'Query failed' });
    await expect(getResearchPosts({ limit: 10 })).rejects.toThrow('Query failed');
  });

  it('handles enrichment failures gracefully via Promise.allSettled', async () => {
    mockTable('research_posts', [samplePost]);
    // All enrichment queries fail
    mockTable('profiles', null, { message: 'profiles fail' });
    mockTable('players', null, { message: 'players fail' });
    mockRpc('rpc_get_author_track_records', null, { message: 'rpc fail' });

    const result = await getResearchPosts({ limit: 10 });
    expect(result).toHaveLength(1);
    // Fallback values when enrichment fails
    expect(result[0].author_handle).toBe('unknown');
    expect(result[0].author_track_record).toBeNull();
  });

  it('handles post without player_id', async () => {
    const postNoPlayer = { ...samplePost, player_id: null };
    mockTable('research_posts', [postNoPlayer]);
    mockTable('profiles', [{ id: 'u1', handle: 'bob', display_name: null, avatar_url: null, level: 1, verified: false, top_role: null }]);
    mockTable('players', []); // no players to fetch
    mockRpc('rpc_get_author_track_records', []);

    const result = await getResearchPosts({ limit: 10 });
    expect(result[0].player_name).toBeUndefined();
    expect(result[0].player_position).toBeUndefined();
  });

  it('applies playerId filter', async () => {
    mockTable('research_posts', []);
    const result = await getResearchPosts({ limit: 10, playerId: 'p1' });
    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledWith('research_posts');
  });

  it('applies clubId filter over clubName', async () => {
    mockTable('research_posts', []);
    const result = await getResearchPosts({ limit: 10, clubId: 'club-1', clubName: 'FC Test' });
    expect(result).toEqual([]);
  });
});

// ============================================
// getUserUnlockedIds
// ============================================
describe('getUserUnlockedIds', () => {
  it('returns Set of unlocked research IDs', async () => {
    mockTable('research_unlocks', [{ research_id: 'r1' }, { research_id: 'r2' }]);
    const result = await getUserUnlockedIds('u1');
    expect(result).toBeInstanceOf(Set);
    expect(result.has('r1')).toBe(true);
    expect(result.has('r2')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('returns empty Set when no unlocks', async () => {
    mockTable('research_unlocks', []);
    const result = await getUserUnlockedIds('u1');
    expect(result.size).toBe(0);
  });

  it('returns empty Set when data is null', async () => {
    mockTable('research_unlocks', null);
    const result = await getUserUnlockedIds('u1');
    expect(result.size).toBe(0);
  });

  it('throws on error', async () => {
    mockTable('research_unlocks', null, { message: 'Access denied' });
    await expect(getUserUnlockedIds('u1')).rejects.toThrow('Access denied');
  });
});

// ============================================
// createResearchPost
// ============================================
describe('createResearchPost', () => {
  const baseParams = {
    userId: 'u1',
    playerId: 'p1' as string | null,
    clubName: 'FC Test',
    clubId: 'club-1',
    title: 'My Analysis',
    preview: 'Preview text',
    content: 'Full analysis content',
    tags: ['analysis'],
    category: 'technical',
    call: 'Bullish',
    horizon: '30d',
    price: 500,
  };

  it('creates post with player price snapshot', async () => {
    // Player price lookup
    mockTable('players', { floor_price: 5000, ipo_price: 3000 });
    // Insert
    mockTable('research_posts', { id: 'r-new', ...baseParams });

    const result = await createResearchPost(baseParams);
    expect(result.id).toBe('r-new');
    expect(mockSupabase.from).toHaveBeenCalledWith('players');
    expect(mockSupabase.from).toHaveBeenCalledWith('research_posts');
  });

  it('uses ipo_price when floor_price is 0', async () => {
    mockTable('players', { floor_price: 0, ipo_price: 3000 });
    mockTable('research_posts', { id: 'r-2', ...baseParams });
    const result = await createResearchPost(baseParams);
    expect(result.id).toBe('r-2');
  });

  it('skips player lookup when no playerId', async () => {
    mockTable('research_posts', { id: 'r-3', ...baseParams, playerId: null });
    const result = await createResearchPost({ ...baseParams, playerId: null });
    expect(result.id).toBe('r-3');
  });

  it('throws on insert error', async () => {
    mockTable('players', { floor_price: 1000, ipo_price: 500 });
    mockTable('research_posts', null, { message: 'Insert failed' });
    await expect(createResearchPost(baseParams)).rejects.toThrow('Insert failed');
  });

  it('passes optional evaluation and fixtureId', async () => {
    mockTable('players', { floor_price: 1000, ipo_price: 500 });
    mockTable('research_posts', { id: 'r-4', ...baseParams });
    const result = await createResearchPost({
      ...baseParams,
      evaluation: { technical: 8 },
      fixtureId: 'fix-1',
    });
    expect(result.id).toBe('r-4');
  });

  it('handles null player data', async () => {
    mockTable('players', null);
    mockTable('research_posts', { id: 'r-5', ...baseParams });
    const result = await createResearchPost(baseParams);
    expect(result.id).toBe('r-5');
    // priceAtCreation defaults to 0
  });
});

// ============================================
// deleteResearchPost
// ============================================
describe('deleteResearchPost', () => {
  it('deletes successfully', async () => {
    mockTable('research_posts', null);
    await expect(deleteResearchPost('u1', 'r1')).resolves.toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('research_posts');
  });

  it('throws on error', async () => {
    mockTable('research_posts', null, { message: 'Delete failed' });
    await expect(deleteResearchPost('u1', 'r1')).rejects.toThrow('Delete failed');
  });
});

// ============================================
// unlockResearch
// ============================================
describe('unlockResearch', () => {
  it('unlocks via RPC on success', async () => {
    mockRpc('unlock_research', { success: true, amount_paid: 500, author_earned: 400, platform_fee: 100 });
    // Fire-and-forget notification query
    mockTable('research_posts', { user_id: 'u2', title: 'Test Post' });
    const result = await unlockResearch('u1', 'r1');
    expect(result.success).toBe(true);
    expect(result.amount_paid).toBe(500);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('unlock_research', {
      p_user_id: 'u1', p_research_id: 'r1',
    });
  });

  it('throws on RPC error', async () => {
    mockRpc('unlock_research', null, { message: 'Insufficient balance' });
    await expect(unlockResearch('u1', 'r1')).rejects.toThrow('Insufficient balance');
  });

  it('returns failure result without triggering side effects', async () => {
    mockRpc('unlock_research', { success: false, error: 'Already unlocked' });
    const result = await unlockResearch('u1', 'r1');
    expect(result.success).toBe(false);
  });
});

// ============================================
// rateResearch
// ============================================
describe('rateResearch', () => {
  it('rates via RPC on success', async () => {
    mockRpc('rate_research', { success: true, avg_rating: 4.2, ratings_count: 5, user_rating: 4 });
    // Fire-and-forget notification
    mockTable('research_posts', { user_id: 'u2', title: 'Test Post' });
    const result = await rateResearch('u1', 'r1', 4);
    expect(result.success).toBe(true);
    expect(result.avg_rating).toBe(4.2);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('rate_research', {
      p_user_id: 'u1', p_research_id: 'r1', p_rating: 4,
    });
  });

  it('throws on RPC error', async () => {
    mockRpc('rate_research', null, { message: 'RPC error' });
    await expect(rateResearch('u1', 'r1', 4)).rejects.toThrow('RPC error');
  });

  it('returns failure without side effects', async () => {
    mockRpc('rate_research', { success: false, error: 'Cannot rate own post' });
    const result = await rateResearch('u1', 'r1', 4);
    expect(result.success).toBe(false);
  });
});

// ============================================
// resolveExpiredResearch
// ============================================
describe('resolveExpiredResearch', () => {
  it('returns resolved count', async () => {
    mockRpc('resolve_expired_research', { resolved: 5 });
    expect(await resolveExpiredResearch()).toBe(5);
  });

  it('returns 0 on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('resolve_expired_research', null, { message: 'RPC failed' });
    expect(await resolveExpiredResearch()).toBe(0);
    consoleSpy.mockRestore();
  });

  it('returns 0 when data is null', async () => {
    mockRpc('resolve_expired_research', null);
    expect(await resolveExpiredResearch()).toBe(0);
  });

  it('returns 0 when resolved field is missing', async () => {
    mockRpc('resolve_expired_research', {});
    expect(await resolveExpiredResearch()).toBe(0);
  });
});

// ============================================
// getAuthorTrackRecord
// ============================================
describe('getAuthorTrackRecord', () => {
  it('calculates track record from outcomes', async () => {
    mockTable('research_posts', [
      { outcome: 'correct' },
      { outcome: 'correct' },
      { outcome: 'incorrect' },
      { outcome: null }, // pending
    ]);
    const result = await getAuthorTrackRecord('u1');
    expect(result.totalCalls).toBe(3); // correctCalls + incorrectCalls
    expect(result.correctCalls).toBe(2);
    expect(result.incorrectCalls).toBe(1);
    expect(result.pendingCalls).toBe(1);
    expect(result.hitRate).toBe(67); // Math.round(2/3 * 100)
  });

  it('returns zeros for no data', async () => {
    mockTable('research_posts', null);
    const result = await getAuthorTrackRecord('u1');
    expect(result).toEqual({
      totalCalls: 0, correctCalls: 0, incorrectCalls: 0, pendingCalls: 0, hitRate: 0,
    });
  });

  it('returns zeros on error', async () => {
    mockTable('research_posts', null, { message: 'err' });
    const result = await getAuthorTrackRecord('u1');
    expect(result.totalCalls).toBe(0);
  });

  it('returns zeros for empty results', async () => {
    mockTable('research_posts', []);
    const result = await getAuthorTrackRecord('u1');
    expect(result.totalCalls).toBe(0);
    expect(result.hitRate).toBe(0);
  });

  it('handles all correct outcomes', async () => {
    mockTable('research_posts', [
      { outcome: 'correct' },
      { outcome: 'correct' },
    ]);
    const result = await getAuthorTrackRecord('u1');
    expect(result.hitRate).toBe(100);
  });

  it('handles all pending outcomes', async () => {
    mockTable('research_posts', [
      { outcome: null },
      { outcome: null },
    ]);
    const result = await getAuthorTrackRecord('u1');
    expect(result.totalCalls).toBe(0);
    expect(result.pendingCalls).toBe(2);
    expect(result.hitRate).toBe(0);
  });
});
