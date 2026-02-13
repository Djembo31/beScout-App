import { supabase } from '@/lib/supabaseClient';
import { cached, invalidateNotifications } from '@/lib/cache';
import type { NotificationType, DbNotification } from '@/types';

const ONE_MIN = 60 * 1000;

/** Get unread notification count */
export async function getUnreadCount(userId: string): Promise<number> {
  return cached(`unreadCount:${userId}`, async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return 0;
    return count ?? 0;
  }, ONE_MIN);
}

/** Get notifications (paginated) */
export async function getNotifications(userId: string, limit = 20, offset = 0): Promise<DbNotification[]> {
  return cached(`notifications:${userId}:${offset}:${limit}`, async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return (data ?? []) as DbNotification[];
  }, ONE_MIN);
}

/** Mark a single notification as read */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);
  invalidateNotifications(userId);
}

/** Mark all notifications as read */
export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  invalidateNotifications(userId);
}

/** Create a notification (fire-and-forget) */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  referenceId?: string,
  referenceType?: string,
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    reference_id: referenceId ?? null,
    reference_type: referenceType ?? null,
  });
  invalidateNotifications(userId);
}
