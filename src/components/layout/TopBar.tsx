'use client';

import React, { memo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, BellOff, BellRing, Search, User, Menu, DollarSign, MessageSquarePlus, Ticket, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNumTick } from '@/lib/hooks/useNumTick';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { formatScout } from '@/lib/services/wallet';
import { FeedbackModal } from '@/components/layout/FeedbackModal';
import { Glossary } from '@/components/help/Glossary';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
import SearchOverlay from '@/components/layout/SearchOverlay';
import AchievementListener from '@/components/providers/AchievementListener';
import { useNotificationRealtime } from '@/lib/hooks/useNotificationRealtime';
import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';
import { useUserTickets } from '@/lib/queries/tickets';

interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

export const TopBar = memo(function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const { user, profile, loading } = useUser();
  const { balanceCents } = useWallet();
  const { data: ticketData } = useUserTickets(user?.id);
  const ticketBalance = ticketData?.balance ?? null;
  const { addToast } = useToast();
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const balanceTick = useNumTick(balanceCents);
  const t = useTranslations('nav');
  const name = profile?.display_name || displayName(user);
  const initial = name.charAt(0).toUpperCase();
  const level = profile?.level ?? 1;
  const plan = profile?.plan ?? 'Free';

  // Realtime notification subscription (replaces 60s polling)
  const {
    notifications: realtimeNotifs,
    unreadCount,
    loading: notifsLoading,
    markReadLocal,
    markAllReadLocal,
    onNewNotifRef,
    refetch: refetchNotifs,
  } = useNotificationRealtime(user?.id);

  // Toast on new notification (only when dropdown is closed)
  useEffect(() => {
    onNewNotifRef.current = (n) => {
      if (!notifOpen) addToast(n.title, 'info');
    };
  }, [notifOpen, addToast, onNewNotifRef]);

  // Check push subscription state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('@/lib/services/pushSubscription').then(({ isPushEnabled }) => {
      setPushEnabled(isPushEnabled());
    }).catch(err => console.error('[TopBar] Push service import:', err));
  }, []);

  const togglePush = useCallback(async () => {
    if (!user) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const { unsubscribeFromPush } = await import('@/lib/services/pushSubscription');
        await unsubscribeFromPush(user.id);
        setPushEnabled(false);
        addToast(t('pushDisabled'), 'success');
      } else {
        const { subscribeToPush } = await import('@/lib/services/pushSubscription');
        const ok = await subscribeToPush(user.id);
        setPushEnabled(ok);
        if (ok) {
          addToast(t('pushEnabled'), 'success');
        } else {
          addToast(t('pushBlocked'), 'error');
        }
      }
    } catch (err) {
      console.error('[TopBar] togglePush:', err);
      addToast(t('pushError'), 'error');
    }
    finally { setPushLoading(false); }
  }, [user, pushEnabled, addToast]);

  // Close spotlight on route change
  useEffect(() => {
    setSpotlightOpen(false);
  }, [pathname]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSpotlightOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-bg-main/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Left side */}
        <div className="flex items-center gap-3 flex-1">
          {/* Mobile: Logo */}
          <Link href="/" className="lg:hidden flex items-center">
            <div className="relative size-8 shrink-0">
              <Image src="/logo.svg" alt="BeScout" fill className="object-contain" priority />
            </div>
          </Link>

          {/* Hamburger — mobile only, opens SideNav drawer */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-white/10 active:scale-90 transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
            aria-label={t('openMenu')}
          >
            <Menu className="size-5 text-white/70" />
          </button>

          {/* Search trigger — desktop only */}
          <button
            data-tour-id="topbar-search"
            onClick={() => setSpotlightOpen(true)}
            className="hidden lg:flex items-center gap-2 w-full max-w-[280px] px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/40 hover:bg-white/[0.08] hover:border-white/15 transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 text-left truncate">{t('searchPlaceholder')}</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-white/25 bg-white/5 border border-white/10 rounded-md">
              <span className="text-[11px]">&#8984;</span>K
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* $SCOUT Balance pill — compact on mobile */}
          <div data-tour-id="topbar-balance" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-gold/10 border border-gold/20 rounded-xl">
            <DollarSign className="size-3 sm:size-3.5 text-gold" />
            {balanceCents === null ? (
              <span className="inline-block w-10 sm:w-12 h-3.5 rounded bg-gold/20 animate-pulse motion-reduce:animate-none" />
            ) : (
              <span className={cn('font-mono font-bold text-gold text-[10px] sm:text-xs tabular-nums', balanceTick)}>{formatScout(balanceCents)}</span>
            )}
          </div>

          {/* Ticket Balance pill */}
          {ticketBalance !== null && (
            <div className="flex items-center gap-1 px-2 py-1 sm:py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl" title={t('ticketTooltip')}>
              <Ticket className="size-3 sm:size-3.5 text-amber-400" />
              <span className="font-mono font-bold text-amber-400 text-[10px] sm:text-xs tabular-nums">{ticketBalance}</span>
            </div>
          )}

          {/* Search icon — mobile only */}
          <button
            onClick={() => setSpotlightOpen(true)}
            className="lg:hidden p-2.5 bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
            aria-label={t('searchPlaceholder')}
          >
            <Search className="size-4 text-white/70" />
          </button>

          {/* Push Toggle — hidden on mobile to save space */}
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className={cn(
              'hidden sm:flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] border rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
              pushEnabled
                ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            )}
            aria-label={pushEnabled ? t('pushDisable') : t('pushEnable')}
            title={pushEnabled ? t('pushActive') : t('pushActivate')}
          >
            {pushEnabled
              ? <BellRing className="size-4 md:size-5 text-green-500" />
              : <BellOff className="size-4 md:size-5 text-white/40" />
            }
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              data-tour-id="topbar-notifications"
              onClick={() => { setNotifOpen(o => { if (!o) refetchNotifs(); return !o; }); }}
              className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
              aria-label={t('notifications')}
            >
              <Bell className="size-4 md:size-5 text-white/70" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-gold text-black text-[10px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {user && (
              <NotificationDropdown
                userId={user.id}
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                notifications={realtimeNotifs}
                loading={notifsLoading}
                onMarkRead={markReadLocal}
                onMarkAllRead={markAllReadLocal}
              />
            )}
          </div>

          {/* Feedback */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="hidden sm:flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
            aria-label={t('feedback')}
          >
            <MessageSquarePlus className="size-4 md:size-5 text-white/70" />
          </button>

          {/* Glossary — desktop only */}
          <button
            onClick={() => setGlossaryOpen(true)}
            className="hidden sm:flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
            aria-label={t('glossary')}
          >
            <HelpCircle className="size-4 md:size-5 text-white/70" />
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-3 pl-2 md:pl-3 border-l border-white/10">
            <div className="text-right hidden lg:block">
              <div className="font-semibold text-sm">{loading ? '...' : name}</div>
              <div className="text-[10px] text-white/50">{t('levelPlan', { level, plan })}</div>
            </div>
            <Link href="/profile" className="group">
              <div className={cn('relative size-8 md:size-10 rounded-xl bg-gold/10 border flex items-center justify-center overflow-hidden transition-colors group-hover:border-gold/40', pathname.startsWith('/profile') ? 'border-gold/60 ring-2 ring-gold/20' : 'border-white/10')}>
                {loading ? (
                  <User className="size-4 md:size-5 text-white/70" />
                ) : profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" fill sizes="40px" className="object-cover" />
                ) : (
                  <span className="font-black text-xs md:text-sm text-white/70">{initial}</span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      <SearchOverlay open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} pageUrl={pathname} />
      <Glossary open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <AchievementListener notifications={realtimeNotifs} />
    </header>
  );
});
