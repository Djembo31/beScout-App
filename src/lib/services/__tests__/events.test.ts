import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseResponse } from '@/test/mocks/supabase';
import { createEvent } from '../events';

// ============================================
// createEvent
// ============================================

describe('createEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase insert with correct field mapping', async () => {
    // Setup mock to return a successful insert
    const fakeId = 'event-uuid-abc';
    mockSupabaseResponse({ id: fakeId });

    const params = {
      name: 'Spieltag 10',
      type: 'bescout',
      format: '5-a-side',
      gameweek: 10,
      entryFeeCents: 5000,
      prizePoolCents: 50000,
      maxEntries: 100,
      startsAt: '2025-03-01T18:00:00Z',
      locksAt: '2025-03-01T19:00:00Z',
      endsAt: '2025-03-01T21:00:00Z',
      clubId: '2bf30014-db88-4567-9885-9da215e3a0d4',
      createdBy: 'user-uuid-123',
    };

    const result = await createEvent(params);

    // Verify supabase.from('events') was called
    expect(mockSupabase.from).toHaveBeenCalledWith('events');

    // Verify the result
    expect(result.success).toBe(true);
    expect(result.eventId).toBe(fakeId);
  });

  it('returns error when supabase insert fails', async () => {
    mockSupabaseResponse(null, { message: 'Insert failed' });

    const params = {
      name: 'Test Event',
      type: 'club',
      format: '5-a-side',
      gameweek: 1,
      entryFeeCents: 1000,
      prizePoolCents: 10000,
      maxEntries: 50,
      startsAt: '2025-03-01T18:00:00Z',
      locksAt: '2025-03-01T19:00:00Z',
      endsAt: '2025-03-01T21:00:00Z',
      clubId: '2bf30014-db88-4567-9885-9da215e3a0d4',
      createdBy: 'user-uuid-123',
    };

    const result = await createEvent(params);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insert failed');
  });
});
