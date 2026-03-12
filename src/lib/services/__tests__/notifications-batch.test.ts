import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabaseClient', () => {
  const insertMock = vi.fn(() => ({ error: null }));
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({ data: [], error: null })),
            })),
          };
        }
        // notifications table
        return { insert: insertMock };
      }),
    },
    __insertMock: insertMock,
  };
});

import { supabase } from '@/lib/supabaseClient';
import { createNotificationsBatch } from '@/lib/services/notifications';

describe('createNotificationsBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing for empty batch', async () => {
    await createNotificationsBatch([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('inserts multiple notifications in a single call', async () => {
    await createNotificationsBatch([
      { userId: 'u1', type: 'event_scored', title: 'T1', body: 'B1', referenceId: 'e1', referenceType: 'event' },
      { userId: 'u2', type: 'event_scored', title: 'T2', body: 'B2', referenceId: 'e1', referenceType: 'event' },
    ]);

    // Should call from('notification_preferences') for preference check
    // Then from('notifications') for the insert
    expect(supabase.from).toHaveBeenCalledWith('notification_preferences');
    expect(supabase.from).toHaveBeenCalledWith('notifications');
  });

  it('filters out users who disabled the notification category', async () => {
    // Override the from mock for this test to return a preference row where u2 has fantasy=false
    const insertMock = vi.fn(() => ({ error: null }));
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'notification_preferences') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [{ user_id: 'u2', trading: true, offers: true, fantasy: false, social: true, bounties: true, rewards: true }],
              error: null,
            })),
          })),
        } as never;
      }
      return { insert: insertMock } as never;
    });

    await createNotificationsBatch([
      { userId: 'u1', type: 'event_scored', title: 'T1' },
      { userId: 'u2', type: 'event_scored', title: 'T2' }, // u2 disabled fantasy
    ]);

    // Insert should only contain u1 (u2 filtered out because fantasy=false and event_scored maps to fantasy category)
    expect(insertMock).toHaveBeenCalledTimes(1);
    const rows = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe('u1');
  });
});
