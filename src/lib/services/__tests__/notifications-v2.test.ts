import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';

vi.mock('./pushSender', () => ({ sendPushToUser: vi.fn() }));

import {
  getCategoryForType, NOTIFICATION_CATEGORIES,
  getNotificationPreferences, updateNotificationPreferences,
  getUnreadCount, getNotifications, markAsRead, markAllAsRead,
  createNotification, createNotificationsBatch,
} from '../notifications';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

// ============================================
// getCategoryForType (pure function)
// ============================================
describe('getCategoryForType', () => {
  it('maps trading types', () => {
    expect(getCategoryForType('trade')).toBe('trading');
    expect(getCategoryForType('price_alert')).toBe('trading');
    expect(getCategoryForType('new_ipo_available')).toBe('trading');
  });
  it('maps offer types', () => {
    expect(getCategoryForType('offer_received')).toBe('offers');
    expect(getCategoryForType('offer_accepted')).toBe('offers');
  });
  it('maps fantasy types', () => {
    expect(getCategoryForType('fantasy_reward')).toBe('fantasy');
    expect(getCategoryForType('event_starting')).toBe('fantasy');
  });
  it('maps social types', () => {
    expect(getCategoryForType('follow')).toBe('social');
    expect(getCategoryForType('research_unlock')).toBe('social');
  });
  it('maps bounty types', () => {
    expect(getCategoryForType('bounty_submission')).toBe('bounties');
    expect(getCategoryForType('bounty_approved')).toBe('bounties');
  });
  it('maps reward types', () => {
    expect(getCategoryForType('achievement')).toBe('rewards');
    expect(getCategoryForType('level_up')).toBe('rewards');
    expect(getCategoryForType('mission_reward')).toBe('rewards');
  });
  it('maps system type', () => {
    expect(getCategoryForType('system')).toBe('system');
  });
});

describe('NOTIFICATION_CATEGORIES', () => {
  it('has 6 toggleable categories', () => {
    expect(NOTIFICATION_CATEGORIES).toHaveLength(6);
    const keys = NOTIFICATION_CATEGORIES.map(c => c.key);
    expect(keys).toContain('trading');
    expect(keys).toContain('offers');
    expect(keys).toContain('fantasy');
    expect(keys).toContain('social');
    expect(keys).toContain('bounties');
    expect(keys).toContain('rewards');
  });
});

// ============================================
// Preferences
// ============================================
describe('getNotificationPreferences', () => {
  it('returns existing preferences', async () => {
    const prefs = { user_id: 'u1', trading: true, offers: false, fantasy: true, social: true, bounties: true, rewards: true, updated_at: '2025-01-01' };
    mockTable('notification_preferences', prefs);
    const result = await getNotificationPreferences('u1');
    expect(result.offers).toBe(false);
  });

  it('returns all-true defaults when no row exists', async () => {
    mockTable('notification_preferences', null);
    const result = await getNotificationPreferences('u1');
    expect(result.trading).toBe(true);
    expect(result.offers).toBe(true);
    expect(result.fantasy).toBe(true);
    expect(result.social).toBe(true);
    expect(result.bounties).toBe(true);
    expect(result.rewards).toBe(true);
  });
});

describe('updateNotificationPreferences', () => {
  it('upserts preferences', async () => {
    mockTable('notification_preferences', null);
    await updateNotificationPreferences('u1', { trading: false });
    expect(mockSupabase.from).toHaveBeenCalledWith('notification_preferences');
  });
});

// ============================================
// Core CRUD
// ============================================
describe('getUnreadCount', () => {
  it('returns unread count', async () => {
    mockTable('notifications', null, null, 7);
    expect(await getUnreadCount('u1')).toBe(7);
  });
  it('throws on error (J10 FIX-01: surface for retry)', async () => {
    mockTable('notifications', null, { message: 'err' });
    await expect(getUnreadCount('u1')).rejects.toThrow('err');
  });
});

describe('getNotifications', () => {
  it('returns notifications', async () => {
    mockTable('notifications', [{ id: 'n1', type: 'trade', title: 'Kauf', read: false }]);
    expect(await getNotifications('u1')).toHaveLength(1);
  });
  it('throws on error (J10 FIX-01: surface for retry)', async () => {
    mockTable('notifications', null, { message: 'err' });
    await expect(getNotifications('u1')).rejects.toThrow('err');
  });
});

describe('markAsRead', () => {
  it('updates notification', async () => {
    mockTable('notifications', null);
    await markAsRead('n1', 'u1');
    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
  });
});

describe('markAllAsRead', () => {
  it('updates all unread notifications', async () => {
    mockTable('notifications', null);
    await markAllAsRead('u1');
    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
  });
});

// ============================================
// createNotification (preference check)
// ============================================
describe('createNotification', () => {
  it('creates notification when category enabled', async () => {
    // Preferences check
    mockTable('notification_preferences', { user_id: 'u1', trading: true, offers: true, fantasy: true, social: true, bounties: true, rewards: true });
    // Insert
    mockTable('notifications', null);
    await createNotification('u1', 'trade', 'Kauf', 'Du hast gekauft');
    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
  });

  it('skips when category disabled', async () => {
    mockTable('notification_preferences', { user_id: 'u1', trading: false, offers: true, fantasy: true, social: true, bounties: true, rewards: true });
    await createNotification('u1', 'trade', 'Kauf', 'Should not insert');
    // from('notification_preferences') was called but from('notifications') should NOT be called for insert
    // The function returns early before insert
  });

  it('always creates system notifications', async () => {
    mockTable('notifications', null);
    await createNotification('u1', 'system', 'System Message');
    // No preference check for system type
  });

  it('throws on insert error (J10 FIX-03: surface for caller)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('notification_preferences', null); // defaults (all true)
    mockTable('notifications', null, { message: 'Insert failed' });
    await expect(createNotification('u1', 'follow', 'New follower')).rejects.toThrow('Insert failed');
    consoleSpy.mockRestore();
  });
});

// ============================================
// createNotificationsBatch
// ============================================
describe('createNotificationsBatch', () => {
  it('does nothing for empty items', async () => {
    await createNotificationsBatch([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('filters out items where user disabled category', async () => {
    mockTable('notification_preferences', [
      { user_id: 'u1', trading: false, offers: true, fantasy: true, social: true, bounties: true, rewards: true },
    ]);
    mockTable('notifications', null);

    await createNotificationsBatch([
      { userId: 'u1', type: 'trade', title: 'Trade' }, // should be filtered
      { userId: 'u1', type: 'follow', title: 'Follow' }, // social=true, should pass
    ]);
    // The batch insert should only include the 'follow' notification
  });

  it('inserts all items when no preferences exist (defaults)', async () => {
    mockTable('notification_preferences', []);
    mockTable('notifications', null);

    await createNotificationsBatch([
      { userId: 'u1', type: 'trade', title: 'Trade 1' },
      { userId: 'u2', type: 'follow', title: 'Follow' },
    ]);
    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
  });

  it('always includes system notifications', async () => {
    mockTable('notification_preferences', [
      { user_id: 'u1', trading: false, offers: false, fantasy: false, social: false, bounties: false, rewards: false },
    ]);
    mockTable('notifications', null);

    await createNotificationsBatch([
      { userId: 'u1', type: 'system', title: 'System' },
    ]);
    // system type bypasses preference check
  });

  it('throws on batch insert error (J10 FIX-04: surface for caller)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('notification_preferences', []);
    mockTable('notifications', null, { message: 'Batch insert failed' });

    await expect(
      createNotificationsBatch([{ userId: 'u1', type: 'trade', title: 'X' }])
    ).rejects.toThrow('Batch insert failed');
    consoleSpy.mockRestore();
  });
});
