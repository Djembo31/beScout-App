'use client';

import React, { memo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, BellOff, BellRing, Search, User, Menu, DollarSign, MessageSquarePlus, X } from 'lucide-react';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { formatBsd } from '@/lib/services/wallet';
import { FeedbackModal } from '@/components/layout/FeedbackModal';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
import SearchDropdown from '@/components/layout/SearchDropdown';
import { getUnreadCount } from '@/lib/services/notifications';
import { useToast } from '@/components/providers/ToastProvider';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

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
        addToast('Push-Benachrichtigungen deaktiviert', 'success');
      } else {
        const { subscribeToPush } = await import('@/lib/services/pushSubscription');
        const ok = await subscribeToPush(user.id);
        setPushEnabled(ok);
        if (ok) {
          addToast('Push-Benachrichtigungen aktiviert', 'success');
        } else {
          addToast('Benachrichtigungen sind im Browser blockiert. Bitte in den Browser-Einstellungen aktivieren.', 'error');
        }
      }
    } catch (err) {
      console.error('[TopBar] togglePush:', err);
      addToast('Push-Einstellung konnte nicht geändert werden', 'error');
    }
    finally { setPushLoading(false); }
  }, [user, pushEnabled, addToast]);

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery('');
  }, [pathname]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchOpen(val.length >= 2);
  }, []);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleMobileSearchClose = useCallback(() => {
    setMobileSearchOpen(false);
    setSearchQuery('');
    setSearchOpen(false);
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

          {/* Search — desktop only */}
          <div data-tour-id="topbar-search" className="relative w-full max-w-[320px] hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Spieler, Research, Nutzer suchen..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => { if (searchQuery.length >= 2) setSearchOpen(true); }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/50"
            />
            <SearchDropdown query={searchQuery} open={searchOpen} onClose={handleSearchClose} />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* BSD Balance pill */}
          <div data-tour-id="topbar-balance" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl">
            <DollarSign className="w-3.5 h-3.5 text-[#FFD700]" />
            {balanceCents === null ? (
              <span className="inline-block w-12 h-3.5 rounded bg-[#FFD700]/20 animate-pulse" />
            ) : (
              <span className="font-mono font-bold text-[#FFD700] text-xs">{formatBsd(balanceCents)}</span>
            )}
          </div>

          {/* Search icon — mobile only */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="lg:hidden p-2.5 bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Suche"
          >
            <Search className="w-4 h-4 text-white/70" />
          </button>

          {/* Push Toggle */}
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className={`hidden sm:flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] border rounded-xl transition-all ${
              pushEnabled
                ? 'bg-[#22C55E]/10 border-[#22C55E]/20 hover:bg-[#22C55E]/20'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            aria-label={pushEnabled ? 'Push deaktivieren' : 'Push aktivieren'}
            title={pushEnabled ? 'Push-Benachrichtigungen aktiv' : 'Push-Benachrichtigungen aktivieren'}
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
              aria-label="Benachrichtigungen"
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
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            aria-label="Feedback senden"
          >
            <MessageSquarePlus className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-3 pl-2 md:pl-3 border-l border-white/10">
            <div className="text-right hidden lg:block">
              <div className="font-semibold text-sm">{loading ? '...' : name}</div>
              <div className="text-[10px] text-white/50">Lv {level} · {plan}</div>
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

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="lg:hidden px-4 pb-3 border-b border-white/10 anim-fade">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Spieler, Research, Nutzer suchen..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => { if (searchQuery.length >= 2) setSearchOpen(true); }}
              autoFocus
              className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/50"
            />
            <button
              onClick={handleMobileSearchClose}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Suche schließen"
            >
              <X className="w-4 h-4 text-white/30" />
            </button>
            <SearchDropdown query={searchQuery} open={searchOpen} onClose={handleSearchClose} />
          </div>
        </div>
      )}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} pageUrl={pathname} />
    </header>
  );
});
