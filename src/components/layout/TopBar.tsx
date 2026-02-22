'use client';

import React, { memo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, BellOff, BellRing, Search, User, Menu, DollarSign, MessageSquarePlus } from 'lucide-react';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { formatScout } from '@/lib/services/wallet';
import { FeedbackModal } from '@/components/layout/FeedbackModal';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
import SearchOverlay from '@/components/layout/SearchOverlay';
import { getUnreadCount } from '@/lib/services/notifications';
import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';

interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

export const TopBar = memo(function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const { user, profile, loading } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const t = useTranslations('nav');
  const name = profile?.display_name || displayName(user);
  const initial = name.charAt(0).toUpperCase();
  const level = profile?.level ?? 1;
  const plan = profile?.plan ?? 'Free';

  // Poll unread count every 60s
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const count = await getUnreadCount(uid);
        if (!cancelled) setUnreadCount(count);
      } catch (err) { console.error('[TopBar] Notification count failed:', err); }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  // Check push subscription state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { isPushEnabled } = require('@/lib/services/pushSubscription');
    setPushEnabled(isPushEnabled());
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
    <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Left side */}
        <div className="flex items-center gap-3 flex-1">
          {/* Mobile: Logo */}
          <Link href="/" className="lg:hidden flex items-center">
            <div className="relative w-8 h-8 shrink-0">
              <Image src="/logo.png" alt="BeScout" fill className="object-contain" priority />
            </div>
          </Link>

          {/* Hamburger — mobile only, opens SideNav drawer */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-white/10 active:scale-90 transition-all"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-white/70" />
          </button>

          {/* Search trigger — desktop only */}
          <button
            data-tour-id="topbar-search"
            onClick={() => setSpotlightOpen(true)}
            className="hidden lg:flex items-center gap-2 w-full max-w-[280px] px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/40 hover:bg-white/[0.08] hover:border-white/15 transition-all"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left truncate">{t('searchPlaceholder')}</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-white/25 bg-white/5 border border-white/10 rounded-md">
              <span className="text-[11px]">&#8984;</span>K
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* $SCOUT Balance pill */}
          <div data-tour-id="topbar-balance" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl">
            <DollarSign className="w-3.5 h-3.5 text-[#FFD700]" />
            {balanceCents === null ? (
              <span className="inline-block w-12 h-3.5 rounded bg-[#FFD700]/20 animate-pulse" />
            ) : (
              <span className="font-mono font-bold text-[#FFD700] text-xs">{formatScout(balanceCents)}</span>
            )}
          </div>

          {/* Search icon — mobile only */}
          <button
            onClick={() => setSpotlightOpen(true)}
            className="lg:hidden p-2.5 bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('searchPlaceholder')}
          >
            <Search className="w-4 h-4 text-white/70" />
          </button>

          {/* Push Toggle */}
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className={`flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] border rounded-xl transition-all ${
              pushEnabled
                ? 'bg-[#22C55E]/10 border-[#22C55E]/20 hover:bg-[#22C55E]/20'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            aria-label={pushEnabled ? t('pushDisable') : t('pushEnable')}
            title={pushEnabled ? t('pushActive') : t('pushActivate')}
          >
            {pushEnabled
              ? <BellRing className="w-4 h-4 md:w-5 md:h-5 text-[#22C55E]" />
              : <BellOff className="w-4 h-4 md:w-5 md:h-5 text-white/40" />
            }
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              data-tour-id="topbar-notifications"
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              aria-label={t('notifications')}
            >
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD700] text-black text-[10px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {user && (
              <NotificationDropdown
                userId={user.id}
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                onUnreadCountChange={setUnreadCount}
              />
            )}
          </div>

          {/* Feedback */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="hidden sm:flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            aria-label={t('feedback')}
          >
            <MessageSquarePlus className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-3 pl-2 md:pl-3 border-l border-white/10">
            <div className="text-right hidden lg:block">
              <div className="font-semibold text-sm">{loading ? '...' : name}</div>
              <div className="text-[10px] text-white/50">{t('levelPlan', { level, plan })}</div>
            </div>
            <Link href="/profile" className="lg:pointer-events-none">
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#22C55E]/20 border border-white/10 flex items-center justify-center overflow-hidden">
                {loading ? (
                  <User className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
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
    </header>
  );
});
