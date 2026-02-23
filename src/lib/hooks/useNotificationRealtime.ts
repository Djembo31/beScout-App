'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/services/notifications';
import type { DbNotification } from '@/types';

/**
 * Realtime notification hook — subscribes to Supabase Realtime INSERT events
 * on the notifications table for the given userId.
 * Replaces the old 60s polling approach with instant WebSocket delivery.
 */
export function useNotificationRealtime(userId: string | undefined) {
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Callback ref for toast/sound when a new notification arrives
  const onNewNotifRef = useRef<((n: DbNotification) => void) | null>(null);
  const fetchIdRef = useRef(0);

  // Fetch function (reusable for initial + refetch)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const id = ++fetchIdRef.current;
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId, 20),
        getUnreadCount(userId),
      ]);
      if (fetchIdRef.current !== id) return; // stale guard
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('[useNotificationRealtime] fetch failed:', err);
    } finally {
      if (fetchIdRef.current === id) setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    fetchNotifications();
  }, [userId, fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as DbNotification;
          // Deduplicate before prepend
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev].slice(0, 50); // keep max 50
          });
          setUnreadCount((prev) => prev + 1);

          // Fire external callback (toast etc.)
          onNewNotifRef.current?.(newNotif);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markReadLocal = useCallback(async (notifId: string) => {
    if (!userId) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markAsRead(notifId, userId);
    } catch (err) {
      console.error('[useNotificationRealtime] markAsRead failed:', err);
    }
  }, [userId]);

  const markAllReadLocal = useCallback(async () => {
    if (!userId) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllAsRead(userId);
    } catch (err) {
      console.error('[useNotificationRealtime] markAllAsRead failed:', err);
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    markReadLocal,
    markAllReadLocal,
    onNewNotifRef,
    refetch: fetchNotifications,
  };
}
