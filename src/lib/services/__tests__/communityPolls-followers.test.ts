import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';
import { fetchAllFollowerIds } from '../communityPolls';

// Slice 339: Follower-Notify muss ALLE Follower (>1000) via Range-Loop laden —
// Mega-Club (polls.md §1: Galatasaray ~35 Mio) würde sonst still nur 1000 erreichen.

beforeEach(() => resetMocks());

const clubPage = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ user_id: `u${offset + i}` }));
const userPage = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ follower_id: `f${offset + i}` }));

describe('fetchAllFollowerIds — PostgREST-Cap-Härtung (Slice 339)', () => {
  it('AC-04: Club-Follower paginiert über >1000 (1000 + 200 = 1200)', async () => {
    mockTable('club_followers', clubPage(1000));
    mockTable('club_followers', clubPage(200, 1000));
    const ids = await fetchAllFollowerIds('club', 'c1');
    expect(ids).toHaveLength(1200);
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(ids[0]).toBe('u0');
    expect(ids[1199]).toBe('u1199');
  });

  it('AC-06: User-Follower paginiert (1000 + 50 = 1050)', async () => {
    mockTable('user_follows', userPage(1000));
    mockTable('user_follows', userPage(50, 1000));
    const ids = await fetchAllFollowerIds('user', undefined, 'creator1');
    expect(ids).toHaveLength(1050);
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(ids[1049]).toBe('f1049');
  });

  it('AC-05: Query-Fehler → throw (wird vom best-effort catch in createCommunityPoll gefangen)', async () => {
    mockTable('club_followers', null, { message: 'followers boom' });
    await expect(fetchAllFollowerIds('club', 'c1')).rejects.toThrow('followers boom');
  });

  it('Edge: source=club ohne clubId → leeres Array, keine Query', async () => {
    const ids = await fetchAllFollowerIds('club', undefined, 'u1');
    expect(ids).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('Edge: 0 Follower → leeres Array (1 Call, bricht sofort)', async () => {
    mockTable('club_followers', []);
    const ids = await fetchAllFollowerIds('club', 'c1');
    expect(ids).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });
});
