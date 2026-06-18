import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockTable, resetMocks } from '@/test/mocks/supabase';
import { getCommunityPolls } from '../communityPolls';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getCommunityPolls — Slice 334 player-name resolution', () => {
  it('resolves player_name + position for polls with player_id; null when no anchor', async () => {
    mockTable('community_polls', [
      { id: 'poll-1', created_by: 'u1', player_id: 'pl-1', question: 'Q1', options: [] },
      { id: 'poll-2', created_by: 'u1', player_id: null, question: 'Q2', options: [] },
    ]);
    mockTable('profiles', [{ id: 'u1', handle: 'scout', display_name: 'Scout', avatar_url: null }]);
    mockTable('players', [{ id: 'pl-1', first_name: 'Lamine', last_name: 'Yamal', position: 'ATT' }]);

    const polls = await getCommunityPolls();
    expect(polls).toHaveLength(2);

    const p1 = polls.find(p => p.id === 'poll-1')!;
    expect(p1.player_name).toBe('Lamine Yamal');
    expect(p1.player_position).toBe('ATT');

    const p2 = polls.find(p => p.id === 'poll-2')!;
    expect(p2.player_name).toBeNull();
    expect(p2.player_position).toBeNull();
  });

  it('player_name null when player_id set but player not found (Edge #4)', async () => {
    mockTable('community_polls', [{ id: 'poll-3', created_by: 'u1', player_id: 'pl-x', question: 'Q', options: [] }]);
    mockTable('profiles', [{ id: 'u1', handle: 'scout', display_name: null, avatar_url: null }]);
    mockTable('players', []); // nicht gefunden

    const polls = await getCommunityPolls();
    expect(polls[0].player_name).toBeNull();
  });
});
