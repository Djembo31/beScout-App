import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockRpc, resetMocks } from '@/test/mocks/supabase';
import { castCommunityPollVote } from '../communityPolls';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('castCommunityPollVote — Slice 356 Discriminated-Union (throw on !success)', () => {
  it('throws the RPC error key when success=false (exklusives Tor)', async () => {
    mockRpc('cast_community_poll_vote', { success: false, error: 'fan_rank_too_low' });
    await expect(castCommunityPollVote('u1', 'poll-1', 0)).rejects.toThrow('fan_rank_too_low');
  });

  it('throws for any failed vote (vorher silent false-success)', async () => {
    mockRpc('cast_community_poll_vote', { success: false, error: 'Nicht genug BSD' });
    await expect(castCommunityPollVote('u1', 'poll-1', 0)).rejects.toThrow('Nicht genug BSD');
  });
});
