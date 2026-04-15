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

  // Realtime subscription — listens to BOTH INSERT (new notif) + UPDATE (multi-device read sync)
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Multi-device read-state sync: when another device marks notifs as read,
          // mirror the change locally so unreadCount stays correct.
          const updated = payload.new as DbNotification;
          const oldRow = payload.old as Partial<DbNotification> | undefined;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
          );
          // Only decrement if the read flag flipped false -> true
          if (updated.read && oldRow?.read === false) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markReadLocal = useCallback(async (notifId: string) => {
    if (!userId) return;
    // Capture previous state for rollback
    let prevRead = false;
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === notifId);
      prevRead = target?.read ?? false;
      return prev.map((n) => (n.id === notifId ? { ...n, read: true } : n));
    });
    if (!prevRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await markAsRead(notifId, userId);
    } catch (err) {
      console.error('[useNotificationRealtime] markAsRead failed — rolling back:', err);
      // Rollback optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: prevRead } : n)),
      );
      if (!prevRead) {
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [userId]);

  const markAllReadLocal = useCallback(async () => {
    if (!userId) return;
    // Snapshot for rollback
    let prevSnapshot: DbNotification[] = [];
    let prevUnread = 0;
    setNotifications((prev) => {
      prevSnapshot = prev;
      return prev.map((n) => ({ ...n, read: true }));
    });
    setUnreadCount((prev) => {
      prevUnread = prev;
      return 0;
    });

    try {
      await markAllAsRead(userId);
    } catch (err) {
      console.error('[useNotificationRealtime] markAllAsRead failed — rolling back:', err);
      setNotifications(prevSnapshot);
      setUnreadCount(prevUnread);
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
