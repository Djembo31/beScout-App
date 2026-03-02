'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, FileText, UserPlus, Trophy, Vote, Info, MessageCircle, Check, Loader2, Target, CheckCircle, XCircle, Banknote, ArrowLeftRight, Send, RotateCcw, Crown, TrendingUp, Star, Crosshair, Play, Clock, Zap, Gift, Coins, UserCheck, Sparkles, Megaphone, Award, BarChart3 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import type { DbNotification, NotificationType } from '@/types';

function getNotifIcon(type: NotificationType) {
  switch (type) {
    case 'research_unlock': return <FileText className="size-4" />;
    case 'research_rating': return <Star className="size-4" />;
    case 'follow': return <UserPlus className="size-4" />;
    case 'fantasy_reward': return <Trophy className="size-4" />;
    case 'poll_vote': return <Vote className="size-4" />;
    case 'reply': return <MessageCircle className="size-4" />;
    case 'bounty_submission': return <Target className="size-4" />;
    case 'bounty_approved': return <CheckCircle className="size-4" />;
    case 'bounty_rejected': return <XCircle className="size-4" />;
    case 'pbt_liquidation': return <Banknote className="size-4" />;
    case 'trade': return <ArrowLeftRight className="size-4" />;
    case 'offer_received': return <Send className="size-4" />;
    case 'offer_accepted': return <CheckCircle className="size-4" />;
    case 'offer_rejected': return <XCircle className="size-4" />;
    case 'offer_countered': return <RotateCcw className="size-4" />;
    case 'dpc_of_week': return <Crown className="size-4" />;
    case 'tier_promotion': return <Star className="size-4" />;
    case 'price_alert': return <TrendingUp className="size-4" />;
    case 'mission_reward': return <Crosshair className="size-4" />;
    case 'event_starting': return <Play className="size-4" />;
    case 'event_closing_soon': return <Clock className="size-4" />;
    case 'event_scored': return <BarChart3 className="size-4" />;
    case 'bounty_expiring': return <Clock className="size-4" />;
    case 'new_ipo_available': return <Zap className="size-4" />;
    case 'referral_reward': return <Gift className="size-4" />;
    case 'tip_received': return <Coins className="size-4" />;
    case 'subscription_new': return <UserCheck className="size-4" />;
    case 'creator_fund_payout': return <Sparkles className="size-4" />;
    case 'ad_revenue_payout': return <Megaphone className="size-4" />;
    case 'achievement': return <Award className="size-4" />;
    case 'level_up': return <Zap className="size-4" />;
    case 'rang_up': return <TrendingUp className="size-4" />;
    case 'rang_down': return <TrendingUp className="size-4 rotate-180" />;
    case 'mastery_level_up': return <Star className="size-4" />;
    case 'prediction_resolved': return <Target className="size-4" />;
    case 'system': return <Info className="size-4" />;
  }
}

function getNotifColor(type: NotificationType): string {
  switch (type) {
    case 'research_unlock': return 'text-purple-400 bg-purple-400/10';
    case 'research_rating': return 'text-amber-400 bg-amber-400/10';
    case 'follow': return 'text-green-500 bg-green-500/10';
    case 'fantasy_reward': return 'text-gold bg-gold/10';
    case 'poll_vote': return 'text-amber-400 bg-amber-400/10';
    case 'reply': return 'text-sky-400 bg-sky-400/10';
    case 'trade': return 'text-gold bg-gold/10';
    case 'bounty_submission': return 'text-amber-400 bg-amber-400/10';
    case 'bounty_approved': return 'text-green-500 bg-green-500/10';
    case 'bounty_rejected': return 'text-red-400 bg-red-400/10';
    case 'pbt_liquidation': return 'text-gold bg-gold/10';
    case 'offer_received': return 'text-amber-400 bg-amber-400/10';
    case 'offer_accepted': return 'text-green-500 bg-green-500/10';
    case 'offer_rejected': return 'text-red-400 bg-red-400/10';
    case 'offer_countered': return 'text-blue-400 bg-blue-400/10';
    case 'dpc_of_week': return 'text-gold bg-gold/10';
    case 'tier_promotion': return 'text-purple-400 bg-purple-400/10';
    case 'price_alert': return 'text-amber-400 bg-amber-400/10';
    case 'mission_reward': return 'text-sky-400 bg-sky-400/10';
    case 'event_starting': return 'text-green-500 bg-green-500/10';
    case 'event_closing_soon': return 'text-amber-400 bg-amber-400/10';
    case 'event_scored': return 'text-sky-400 bg-sky-400/10';
    case 'bounty_expiring': return 'text-orange-400 bg-orange-400/10';
    case 'new_ipo_available': return 'text-gold bg-gold/10';
    case 'referral_reward': return 'text-green-500 bg-green-500/10';
    case 'tip_received': return 'text-pink-400 bg-pink-400/10';
    case 'subscription_new': return 'text-indigo-400 bg-indigo-400/10';
    case 'creator_fund_payout': return 'text-cyan-400 bg-cyan-400/10';
    case 'ad_revenue_payout': return 'text-lime-400 bg-lime-400/10';
    case 'achievement': return 'text-gold bg-gold/10';
    case 'level_up': return 'text-purple-400 bg-purple-400/10';
    case 'rang_up': return 'text-green-500 bg-green-500/10';
    case 'rang_down': return 'text-red-400 bg-red-400/10';
    case 'mastery_level_up': return 'text-gold bg-gold/10';
    case 'prediction_resolved': return 'text-purple-400 bg-purple-400/10';
    case 'system': return 'text-sky-400 bg-sky-400/10';
  }
}

function getNotifHref(notif: DbNotification): string | null {
  if (!notif.reference_id || !notif.reference_type) return null;
  switch (notif.reference_type) {
    case 'research': return `/community?tab=research`;
    case 'event': return `/fantasy`;
    case 'profile': return null; // resolved async in handleClick
    case 'poll': return `/community?tab=aktionen`;
    case 'post': return `/community`;
    case 'bounty': return `/community?tab=aktionen`;
    case 'player': return `/player/${notif.reference_id}`;
    case 'liquidation': return `/player/${notif.reference_id}`;
    case 'offer': return `/market?tab=angebote`;
    default: return null;
  }
}

function timeAgo(dateStr: string, nowLabel = 'just now', dateLocale = 'de-DE'): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return nowLabel;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(dateLocale);
}

interface NotificationDropdownProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  notifications: DbNotification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const EXIT_MS = 200;

export default function NotificationDropdown({ userId, open, onClose, notifications, loading, onMarkRead, onMarkAllRead }: NotificationDropdownProps) {
  const tn = useTranslations('notifications');
  const tc = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const router = useRouter();
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Keep mounted during exit animation
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      closingRef.current = false;
    } else if (mounted && !closingRef.current) {
      // Start exit animation
      closingRef.current = true;
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
        closingRef.current = false;
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  // Close on click outside
  useEffect(() => {
    if (!mounted || closing) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (desktopRef.current?.contains(target) || mobileRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mounted, closing, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!mounted || closing) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mounted, closing, onClose]);

  const handleClick = useCallback(async (notif: DbNotification) => {
    if (!notif.read) {
      onMarkRead(notif.id);
    }
    let href = getNotifHref(notif);
    if (notif.reference_type === 'profile' && notif.reference_id) {
      try {
        const { getProfile } = await import('@/lib/services/profiles');
        const profile = await getProfile(notif.reference_id);
        if (profile?.handle) href = `/profile/${profile.handle}`;
      } catch { /* fallback to null */ }
    }
    if (href) router.push(href);
    onClose();
  }, [router, onClose, onMarkRead]);

  const handleMarkAllRead = useCallback(() => {
    onMarkAllRead();
  }, [onMarkAllRead]);

  // Portal target (SSR-safe)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalTarget(document.body); }, []);

  if (!mounted || !portalTarget) return null;

  const notifContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="font-bold text-sm">{tn('title')}</span>
        <button onClick={handleMarkAllRead} className="text-xs text-gold hover:underline flex items-center gap-1 min-h-[44px] md:min-h-0">
          <Check className="size-3" />
          {tn('markAllRead')}
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[60vh] md:max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-white/30">
            {tn('noNew')}
          </div>
        ) : (
          notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={cn(
                'w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] min-h-[44px]',
                !notif.read && 'bg-white/[0.02]'
              )}
            >
              <div className={cn('flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5', getNotifColor(notif.type))}>
                {getNotifIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-medium leading-snug', !notif.read && 'text-white')}>
                  {notif.title}
                </div>
                {notif.body && (
                  <div className="text-xs text-white/40 mt-0.5 line-clamp-2">{notif.body}</div>
                )}
                <div className="text-xs text-white/25 mt-1">{timeAgo(notif.created_at, tc('timeNow'), dateLocale)}</div>
              </div>
              {!notif.read && (
                <div className="size-2 rounded-full bg-gold shrink-0 mt-2" />
              )}
            </button>
          ))
        )}
      </div>
    </>
  );

  return createPortal(
    <>
      {/* Desktop: fixed dropdown — slide down/up */}
      <div
        ref={desktopRef}
        className={cn(
          'hidden md:block fixed top-[60px] right-4 lg:right-6 w-96 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden transition-all',
          closing ? 'notif-exit-desktop' : 'notif-enter-desktop',
        )}
      >
        {notifContent}
      </div>

      {/* Mobile: bottom sheet — slide up/down */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-[100] transition-opacity',
          closing ? 'opacity-0' : 'opacity-100 bg-black/70 backdrop-blur-sm',
        )}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
        onClick={onClose}
      >
        <div
          ref={mobileRef}
          className={cn(
            'fixed inset-x-0 bottom-0 bg-[#111] border-t border-white/10 rounded-t-3xl shadow-2xl overflow-hidden transition-transform',
            closing ? 'translate-y-full' : 'translate-y-0',
          )}
          style={{ transitionDuration: `${EXIT_MS}ms`, transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>
          {notifContent}
        </div>
      </div>
    </>,
    portalTarget,
  );
}
