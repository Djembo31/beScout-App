import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockRpc, resetMocks } from '@/test/mocks/supabase';
import { createCommunityPoll } from '../communityPolls';

// activityLog ist fire-and-forget (dynamic import) — stubben damit kein Realmodul lädt.
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('createCommunityPoll', () => {
  it('maps params to create_community_poll RPC (club source)', async () => {
    mockRpc('create_community_poll', { success: true, poll_id: 'p1' });
    const id = await createCommunityPoll({
      userId: 'u1', question: 'Frage?', options: ['A', 'B'],
      costBsd: 500, durationDays: 7, source: 'club', clubId: 'c1',
    });
    expect(id).toBe('p1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_community_poll', {
      p_user_id: 'u1', p_question: 'Frage?', p_options: ['A', 'B'],
      p_cost_bsd: 500, p_duration_days: 7, p_source: 'club',
      p_club_id: 'c1', p_description: null,
    });
  });

  it('defaults clubId + description to null (user source)', async () => {
    mockRpc('create_community_poll', { success: true, poll_id: 'p2' });
    await createCommunityPoll({
      userId: 'u2', question: 'Q?', options: ['X', 'Y'],
      costBsd: 0, durationDays: 3, source: 'user',
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_community_poll', expect.objectContaining({
      p_source: 'user', p_club_id: null, p_description: null,
    }));
  });

  it('throws the RPC error key when success=false (discriminated union)', async () => {
    mockRpc('create_community_poll', { success: false, error: 'follower_threshold' });
    await expect(createCommunityPoll({
      userId: 'u3', question: 'Q?', options: ['A', 'B'],
      costBsd: 100, durationDays: 5, source: 'user',
    })).rejects.toThrow('follower_threshold');
  });

  it('throws when success=true but poll_id missing (defensive)', async () => {
    mockRpc('create_community_poll', { success: true });
    await expect(createCommunityPoll({
      userId: 'u4', question: 'Q?', options: ['A', 'B'],
      costBsd: 0, durationDays: 7, source: 'user',
    })).rejects.toThrow();
  });

  it('throws on transport error', async () => {
    mockRpc('create_community_poll', null, { message: 'network' });
    await expect(createCommunityPoll({
      userId: 'u5', question: 'Q?', options: ['A', 'B'],
      costBsd: 0, durationDays: 7, source: 'user',
    })).rejects.toThrow('network');
  });
});
