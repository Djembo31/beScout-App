'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, UserPlus, Trophy, Vote, Info, MessageCircle, Check, Loader2, Target, CheckCircle, XCircle, Banknote, ArrowLeftRight, Send, RotateCcw, Crown, TrendingUp, Star, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from '@/lib/services/notifications';
import type { DbNotification, NotificationType } from '@/types';

function getNotifIcon(type: NotificationType) {
  switch (type) {
    case 'research_unlock': return <FileText className="w-4 h-4" />;
    case 'follow': return <UserPlus className="w-4 h-4" />;
    case 'fantasy_reward': return <Trophy className="w-4 h-4" />;
    case 'poll_vote': return <Vote className="w-4 h-4" />;
    case 'reply': return <MessageCircle className="w-4 h-4" />;
    case 'bounty_submission': return <Target className="w-4 h-4" />;
    case 'bounty_approved': return <CheckCircle className="w-4 h-4" />;
    case 'bounty_rejected': return <XCircle className="w-4 h-4" />;
    case 'pbt_liquidation': return <Banknote className="w-4 h-4" />;
    case 'trade': return <ArrowLeftRight className="w-4 h-4" />;
    case 'offer_received': return <Send className="w-4 h-4" />;
    case 'offer_accepted': return <CheckCircle className="w-4 h-4" />;
    case 'offer_rejected': return <XCircle className="w-4 h-4" />;
    case 'offer_countered': return <RotateCcw className="w-4 h-4" />;
    case 'dpc_of_week': return <Crown className="w-4 h-4" />;
    case 'tier_promotion': return <Star className="w-4 h-4" />;
    case 'price_alert': return <TrendingUp className="w-4 h-4" />;
    case 'mission_reward': return <Crosshair className="w-4 h-4" />;
    case 'system': return <Info className="w-4 h-4" />;
  }
}

function getNotifColor(type: NotificationType): string {
  switch (type) {
    case 'research_unlock': return 'text-purple-400 bg-purple-400/10';
    case 'follow': return 'text-[#22C55E] bg-[#22C55E]/10';
    case 'fantasy_reward': return 'text-[#FFD700] bg-[#FFD700]/10';
    case 'poll_vote': return 'text-amber-400 bg-amber-400/10';
    case 'reply': return 'text-sky-400 bg-sky-400/10';
    case 'trade': return 'text-[#FFD700] bg-[#FFD700]/10';
    case 'bounty_submission': return 'text-amber-400 bg-amber-400/10';
    case 'bounty_approved': return 'text-[#22C55E] bg-[#22C55E]/10';
    case 'bounty_rejected': return 'text-red-400 bg-red-400/10';
    case 'pbt_liquidation': return 'text-[#FFD700] bg-[#FFD700]/10';
    case 'offer_received': return 'text-amber-400 bg-amber-400/10';
    case 'offer_accepted': return 'text-[#22C55E] bg-[#22C55E]/10';
    case 'offer_rejected': return 'text-red-400 bg-red-400/10';
    case 'offer_countered': return 'text-blue-400 bg-blue-400/10';
    case 'dpc_of_week': return 'text-[#FFD700] bg-[#FFD700]/10';
    case 'tier_promotion': return 'text-purple-400 bg-purple-400/10';
    case 'price_alert': return 'text-amber-400 bg-amber-400/10';
    case 'mission_reward': return 'text-sky-400 bg-sky-400/10';
    case 'system': return 'text-sky-400 bg-sky-400/10';
  }
}

function getNotifHref(notif: DbNotification): string | null {
  if (!notif.reference_id || !notif.reference_type) return null;
  switch (notif.reference_type) {
    case 'research': return `/community`;
    case 'event': return `/fantasy`;
    case 'profile': return `/profile`;
    case 'poll': return `/community`;
    case 'post': return `/community`;
    case 'bounty': return `/community`;
    case 'player': return `/player/${notif.reference_id}`;
    case 'liquidation': return `/player/${notif.reference_id}`;
    case 'offer': return `/market?tab=offers`;
    default: return null;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Jetzt';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('de-DE');
}

interface NotificationDropdownProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export default function NotificationDropdown({ userId, open, onClose, onUnreadCountChange }: NotificationDropdownProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications(userId, 20).then(data => {
      setNotifications(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, userId]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleClick = useCallback(async (notif: DbNotification) => {
    if (!notif.read) {
      await markAsRead(notif.id, userId);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      const count = await getUnreadCount(userId);
      onUnreadCountChange(count);
    }
    const href = getNotifHref(notif);
    if (href) router.push(href);
    onClose();
  }, [userId, router, onClose, onUnreadCountChange]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadCountChange(0);
  }, [userId, onUnreadCountChange]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden anim-dropdown">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="font-bold text-sm">Benachrichtigungen</span>
        <button onClick={handleMarkAllRead} className="text-xs text-[#FFD700] hover:underline flex items-center gap-1">
          <Check className="w-3 h-3" />
          Alle gelesen
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-white/30">
            Keine neuen Benachrichtigungen
          </div>
        ) : (
          notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={cn(
                'w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04]',
                !notif.read && 'bg-white/[0.02]'
              )}
            >
              <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5', getNotifColor(notif.type))}>
                {getNotifIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-medium leading-snug', !notif.read && 'text-white')}>
                  {notif.title}
                </div>
                {notif.body && (
                  <div className="text-xs text-white/40 mt-0.5 line-clamp-2">{notif.body}</div>
                )}
                <div className="text-[10px] text-white/25 mt-1">{timeAgo(notif.created_at)}</div>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-[#FFD700] shrink-0 mt-2" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
