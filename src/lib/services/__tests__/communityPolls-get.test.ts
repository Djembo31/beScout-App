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

describe('getCommunityPolls — Slice 356 exklusive Treue-Umfragen (viewer_locked)', () => {
  beforeEach(() => {
    mockTable('profiles', [
      { id: 'u1', handle: 'admin', display_name: null, avatar_url: null },
      { id: 'viewer', handle: 'fan', display_name: null, avatar_url: null },
    ]);
    mockTable('players', []);
  });

  it('locks exclusive poll when viewer rank below min tier', async () => {
    mockTable('community_polls', [
      { id: 'p-ex', created_by: 'u1', club_id: 'c1', min_fan_rank_tier: 'ultra', question: 'Q', options: [] },
    ]);
    mockTable('fan_rankings', [{ club_id: 'c1', rank_tier: 'stammgast' }]); // stammgast(1) < ultra(2)
    const polls = await getCommunityPolls(undefined, 'viewer');
    expect(polls[0].viewer_locked).toBe(true);
  });

  it('unlocks exclusive poll when viewer rank meets min tier', async () => {
    mockTable('community_polls', [
      { id: 'p-ex', created_by: 'u1', club_id: 'c1', min_fan_rank_tier: 'ultra', question: 'Q', options: [] },
    ]);
    mockTable('fan_rankings', [{ club_id: 'c1', rank_tier: 'vereinsikone' }]); // 5 >= 2
    const polls = await getCommunityPolls(undefined, 'viewer');
    expect(polls[0].viewer_locked).toBe(false);
  });

  it('locks exclusive poll when viewer has no fan ranking (fail-closed)', async () => {
    mockTable('community_polls', [
      { id: 'p-ex', created_by: 'u1', club_id: 'c1', min_fan_rank_tier: 'stammgast', question: 'Q', options: [] },
    ]);
    mockTable('fan_rankings', []); // kein Rang → gesperrt
    const polls = await getCommunityPolls(undefined, 'viewer');
    expect(polls[0].viewer_locked).toBe(true);
  });

  it('never locks the creator on their own exclusive poll', async () => {
    mockTable('community_polls', [
      { id: 'p-own', created_by: 'viewer', club_id: 'c1', min_fan_rank_tier: 'vereinsikone', question: 'Q', options: [] },
    ]);
    mockTable('fan_rankings', []); // creator hat niedrigen/keinen Rang, trotzdem nie gesperrt
    const polls = await getCommunityPolls(undefined, 'viewer');
    expect(polls[0].viewer_locked).toBe(false);
  });

  it('open poll (min null) is never locked', async () => {
    mockTable('community_polls', [
      { id: 'p-open', created_by: 'u1', club_id: 'c1', min_fan_rank_tier: null, question: 'Q', options: [] },
    ]);
    const polls = await getCommunityPolls(undefined, 'viewer');
    expect(polls[0].viewer_locked).toBe(false);
  });
});
