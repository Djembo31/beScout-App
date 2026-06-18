import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';
import { fetchAllFollowerIds, notifyPollFollowers } from '../communityPolls';

// Slice 342: createNotificationsBatch + notifText werden dynamisch importiert → mocken.
const { mockBatch } = vi.hoisted(() => ({ mockBatch: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotificationsBatch: mockBatch }));
vi.mock('@/lib/notifText', () => ({ notifText: (key: string) => key }));

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

describe('notifyPollFollowers — Fan-out-Batching (Slice 342)', () => {
  beforeEach(() => { resetMocks(); mockBatch.mockReset(); mockBatch.mockResolvedValue(undefined); });

  it('AC-01: 250 Follower → 3 Batches (100 + 100 + 50)', async () => {
    mockTable('club_followers', clubPage(250));
    await notifyPollFollowers('club', 'c1', 'creator1', 'poll1', 'Welche Position verstärken?');
    expect(mockBatch).toHaveBeenCalledTimes(3);
    expect(mockBatch.mock.calls[0][0]).toHaveLength(100);
    expect(mockBatch.mock.calls[1][0]).toHaveLength(100);
    expect(mockBatch.mock.calls[2][0]).toHaveLength(50);
  });

  it('AC-03: ≤100 Follower → genau 1 Batch', async () => {
    mockTable('club_followers', clubPage(80));
    await notifyPollFollowers('club', 'c1', 'creator1', 'poll1', 'Q?');
    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch.mock.calls[0][0]).toHaveLength(80);
  });

  it('Edge: genau 100 → 1 Batch · 101 → 2 Batches', async () => {
    mockTable('club_followers', clubPage(100));
    await notifyPollFollowers('club', 'c1', 'u', 'p', 'Q');
    expect(mockBatch).toHaveBeenCalledTimes(1);
    mockBatch.mockClear();
    resetMocks();
    mockTable('club_followers', clubPage(101));
    await notifyPollFollowers('club', 'c1', 'u', 'p', 'Q');
    expect(mockBatch).toHaveBeenCalledTimes(2);
    expect(mockBatch.mock.calls[1][0]).toHaveLength(1);
  });

  it('AC-02: 0 Follower → kein Batch-Call', async () => {
    mockTable('club_followers', []);
    await notifyPollFollowers('club', 'c1', 'creator1', 'poll1', 'Q?');
    expect(mockBatch).not.toHaveBeenCalled();
  });

  it('AC-04: Batch-Item-Shape korrekt (type/reference/title)', async () => {
    mockTable('club_followers', clubPage(2));
    await notifyPollFollowers('club', 'c1', 'creator1', 'poll-xy', 'Sollte Gala X holen?');
    const item = mockBatch.mock.calls[0][0][0];
    expect(item).toEqual({
      userId: 'u0',
      type: 'poll_new',
      title: 'pollNewTitle',
      body: 'pollNewBody',
      referenceId: 'poll-xy',
      referenceType: 'poll',
    });
  });

  it('AC-05: best-effort — Batch-Fehler propagiert (IIFE-catch fängt extern)', async () => {
    mockTable('club_followers', clubPage(50));
    mockBatch.mockRejectedValueOnce(new Error('insert boom'));
    await expect(notifyPollFollowers('club', 'c1', 'u', 'p', 'Q')).rejects.toThrow('insert boom');
  });
});
