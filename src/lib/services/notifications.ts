import { supabase } from '@/lib/supabaseClient';
import type { NotificationType, NotificationCategory, NotificationPreferences, DbNotification } from '@/types';

// ============================================
// NOTIFICATION CATEGORIES
// ============================================

/** Maps each NotificationType to one of 6 toggleable categories (or 'system' which is always on) */
const TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory | 'system'> = {
  // Trading & Market
  trade: 'trading',
  price_alert: 'trading',
  new_ipo_available: 'trading',
  dpc_of_week: 'trading',
  pbt_liquidation: 'trading',
  // Offers
  offer_received: 'offers',
  offer_accepted: 'offers',
  offer_rejected: 'offers',
  offer_countered: 'offers',
  // Fantasy & Spieltag
  fantasy_reward: 'fantasy',
  event_starting: 'fantasy',
  event_closing_soon: 'fantasy',
  event_scored: 'fantasy',
  prediction_resolved: 'fantasy',
  // Social & Community
  follow: 'social',
  reply: 'social',
  poll_vote: 'social',
  research_unlock: 'social',
  research_rating: 'social',
  // Bounties
  bounty_submission: 'bounties',
  bounty_approved: 'bounties',
  bounty_rejected: 'bounties',
  bounty_expiring: 'bounties',
  // Rewards & Progress
  achievement: 'rewards',
  level_up: 'rewards',
  rang_up: 'rewards',
  rang_down: 'rewards',
  mastery_level_up: 'rewards',
  mission_reward: 'rewards',
  referral_reward: 'rewards',
  tip_received: 'rewards',
  subscription_new: 'rewards',
  creator_fund_payout: 'rewards',
  ad_revenue_payout: 'rewards',
  tier_promotion: 'rewards',
  // System (always on)
  system: 'system',
};

/** Get the category for a notification type */
export function getCategoryForType(type: NotificationType): NotificationCategory | 'system' {
  return TYPE_TO_CATEGORY[type] ?? 'system';
}

/** All 6 toggleable categories with their metadata (for UI) */
export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; icon: string }[] = [
  { key: 'trading', icon: 'ArrowLeftRight' },
  { key: 'offers', icon: 'Send' },
  { key: 'fantasy', icon: 'Trophy' },
  { key: 'social', icon: 'UserPlus' },
  { key: 'bounties', icon: 'Target' },
  { key: 'rewards', icon: 'Gift' },
];

// ============================================
// PREFERENCES CRUD
// ============================================

/** Get notification preferences for a user. Returns defaults (all true) if no row exists. */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('user_id, trading, offers, fantasy, social, bounties, rewards, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data as NotificationPreferences;

  // No row = all defaults enabled
  return {
    user_id: userId,
    trading: true,
    offers: true,
    fantasy: true,
    social: true,
    bounties: true,
    rewards: true,
    updated_at: new Date().toISOString(),
  };
}

/** Upsert notification preferences */
export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<Pick<NotificationPreferences, NotificationCategory>>,
): Promise<void> {
  await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...prefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

// ============================================
// CORE NOTIFICATION FUNCTIONS
// ============================================

/** Get unread notification count */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}

/** Get notifications (paginated) */
export async function getNotifications(userId: string, limit = 20, offset = 0): Promise<DbNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, reference_id, reference_type, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return (data ?? []) as DbNotification[];
}

/** Mark a single notification as read */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);
}

/** Mark all notifications as read */
export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

// ============================================
// PUSH NOTIFICATION DELIVERY
// ============================================

/** Resolve a deep-link URL from reference metadata */
function resolveDeepLink(referenceType?: string, referenceId?: string): string {
  if (!referenceType) return '/';
  switch (referenceType) {
    case 'event': return '/fantasy';
    case 'player': return `/player/${referenceId}`;
    case 'offer': return '/market?tab=angebote';
    case 'research': return '/community?tab=research';
    case 'bounty': case 'poll': return '/community?tab=aktionen';
    case 'prediction': return '/fantasy';
    case 'mission': return '/missions';
    case 'achievement': return '/profile';
    case 'profile': return referenceId ? `/profile/${referenceId}` : '/profile';
    case 'post': return '/community';
    default: return '/';
  }
}

/**
 * Send a web push notification — works from BOTH client and server.
 * Server-side: calls sendPushToUser directly (web-push needs Node).
 * Client-side: hits POST /api/push which calls sendPushToUser server-side.
 */
function firePush(userId: string, title: string, body?: string, url?: string, tag?: string): void {
  if (typeof window === 'undefined') {
    // Server-side: direct import
    import('./pushSender').then(({ sendPushToUser }) => {
      sendPushToUser(userId, { title, body, url, tag });
    }).catch((err) => console.error('[Push] Server-side import failed:', err));
  } else {
    // Client-side: proxy via API route
    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, url, tag }),
    }).catch((err) => console.error('[Push] Client-side API call failed:', err));
  }
}

/** Create a notification — respects user preferences (skips if category disabled) */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  referenceId?: string,
  referenceType?: string,
): Promise<void> {
  // Check if user has disabled this category
  const category = getCategoryForType(type);
  if (category !== 'system') {
    const prefs = await getNotificationPreferences(userId);
    if (!prefs[category]) return; // User disabled this category
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    reference_id: referenceId ?? null,
    reference_type: referenceType ?? null,
  });

  if (error) {
    console.error(`[Notifications] Failed to create notification (type=${type}, user=${userId}):`, error.message);
    return;
  }

  // Fire-and-forget push notification (works from client AND server)
  const url = resolveDeepLink(referenceType, referenceId);
  firePush(userId, title, body ?? undefined, url, type);
}

// ============================================
// BATCHED / DEDUPLICATED NOTIFICATIONS
// ============================================

/**
 * Create a batched notification that deduplicates within a time window.
 * If a matching unread notification exists for the same user+type+reference,
 * it is UPDATED (count incremented, bumped to top) instead of creating a new row.
 * This prevents notification spam from rapid repeated actions (poll votes, ratings).
 */
export async function createBatchedNotification(
  userId: string,
  type: NotificationType,
  referenceId: string,
  referenceType: string,
  titleTemplate: (count: number) => string,
  bodyTemplate: (count: number) => string,
  batchWindowMinutes: number = 30,
): Promise<void> {
  // Check if user has disabled this category
  const category = getCategoryForType(type);
  if (category !== 'system') {
    const prefs = await getNotificationPreferences(userId);
    if (!prefs[category]) return;
  }

  // Look for an existing unread notification within the batch window
  const windowStart = new Date(Date.now() - batchWindowMinutes * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('notifications')
    .select('id, title')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
    .eq('read', false)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Extract count from existing title (pattern: "N neue ...")
    const countMatch = existing.title.match(/^(\d+)\s/);
    const newCount = countMatch ? parseInt(countMatch[1], 10) + 1 : 2;

    const newTitle = titleTemplate(newCount);
    const newBody = bodyTemplate(newCount);

    const { error } = await supabase
      .from('notifications')
      .update({
        title: newTitle,
        body: newBody,
        read: false,
        created_at: new Date().toISOString(), // bump to top of list
      })
      .eq('id', existing.id);

    if (error) {
      console.error(`[Notifications] Batched update failed (type=${type}, user=${userId}):`, error.message);
    }
    // No push for batched updates — the original push already drew attention
  } else {
    // First notification in this batch window — create normally + fire push
    const title = titleTemplate(1);
    const body = bodyTemplate(1);
    await createNotification(userId, type, title, body, referenceId, referenceType);
  }
}

// ============================================
// BATCH NOTIFICATION INSERT
// ============================================

export type BatchNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  referenceId?: string;
  referenceType?: string;
};

/** Create multiple notifications in a single INSERT, with batch preference filtering */
export async function createNotificationsBatch(items: BatchNotificationInput[]): Promise<void> {
  if (items.length === 0) return;

  // Single-query preference check for ALL users in this batch
  const userIds = Array.from(new Set(items.map((i) => i.userId)));
  const { data: prefRows } = await supabase
    .from('notification_preferences')
    .select('user_id, trading, offers, fantasy, social, bounties, rewards')
    .in('user_id', userIds);

  const prefMap = new Map(
    (prefRows ?? []).map((p) => [p.user_id as string, p as Record<string, unknown>])
  );

  // Filter items: remove users who have disabled the category
  const filtered = items.filter((item) => {
    const category = getCategoryForType(item.type);
    if (category === 'system') return true;
    const pref = prefMap.get(item.userId);
    if (!pref) return true; // No preferences row = all defaults enabled
    return pref[category] !== false;
  });

  if (filtered.length === 0) return;

  // Single bulk INSERT
  const rows = filtered.map((item) => ({
    user_id: item.userId,
    type: item.type,
    title: item.title,
    body: item.body ?? null,
    reference_id: item.referenceId ?? null,
    reference_type: item.referenceType ?? null,
  }));

  const { error } = await supabase.from('notifications').insert(rows);

  if (error) {
    console.error(`[Notifications] Batch insert failed (${rows.length} items):`, error.message);
  }

  // Fire-and-forget push notifications (works from client AND server)
  for (const item of filtered) {
    const url = resolveDeepLink(item.referenceType, item.referenceId);
    firePush(item.userId, item.title, item.body ?? undefined, url, item.type);
  }
}
