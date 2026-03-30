'use client';

import React, { memo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LogOut,
  Settings,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { NAV_MAIN, NAV_MORE, NAV_ADMIN } from '@/lib/nav';
import { supabase } from '@/lib/supabaseClient';
import { useUser, useRoles } from '@/components/providers/AuthProvider';
import { formatScout } from '@/lib/services/wallet';
import { useWallet } from '@/components/providers/WalletProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { ClubSwitcher } from './ClubSwitcher';
import { useUserTickets } from '@/lib/queries/tickets';
import { FanWishModal } from '@/components/fan-wishes/FanWishModal';

interface SideNavProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const SideNav = memo(function SideNav({ mobileOpen, onMobileClose }: SideNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { isPlatformAdmin, clubAdmin } = useRoles();
  const { activeClub } = useClub();
  const [collapsed, setCollapsed] = useState(false);
  const { balanceCents } = useWallet();

  // Hydration fix: useEffect-deferred pathname check. During SSR and first client
  // render, mounted=false → all nav items render as inactive → className matches.
  // After mount, useEffect sets mounted=true → correct active highlighting appears.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMounted(true); }, []);
  const { data: ticketData } = useUserTickets(user?.id);
  const ticketBalance = ticketData?.balance ?? null;
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  const handleNavClick = () => {
    // Close mobile drawer on navigation
    onMobileClose?.();
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3" onClick={handleNavClick}>
          <div className="relative size-10 flex-shrink-0">
            <Image
              src="/logo.svg"
              alt="BeScout"
              fill
              className="object-contain"
              priority
            />
          </div>
          {!collapsed && (
            <div className="relative h-10 w-28">
              <Image
                src="/schrift.svg"
                alt="BeScout"
                fill
                className="object-contain object-left"
              />
            </div>
          )}
        </Link>
      </div>

      {/* Wallet */}
      <div className={cn('p-4 border-b border-white/10', collapsed && 'px-3')}>
        <div data-tour-id="sidebar-wallet" className={cn('bg-gold/[0.06] rounded-xl p-3 border border-gold/[0.18] shadow-card-sm', collapsed && 'px-2')}>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gold/25 flex items-center justify-center flex-shrink-0 shadow-glow-gold">
              <DollarSign className="size-4 text-gold" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-[11px] text-white/50">{tc('balance')}</div>
                <div className="font-mono font-black text-gold text-sm tabular-nums">
                  {balanceCents === null ? (
                    <span className="inline-block w-16 h-4 rounded bg-gold/20 animate-pulse motion-reduce:animate-none" />
                  ) : (
                    <>{formatScout(balanceCents)} CR</>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Balance */}
        {ticketBalance !== null && !collapsed && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/[0.15]" title={tc('ticketTooltip')}>
            <Ticket className="size-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-mono font-bold text-amber-400 text-xs tabular-nums">{ticketBalance}</span>
            <span className="text-[10px] text-white/40">Tickets</span>
          </div>
        )}
        {ticketBalance !== null && collapsed && (
          <div className="mt-2 flex items-center justify-center" title={tc('ticketTooltip')}>
            <Ticket className="size-3.5 text-amber-400" />
          </div>
        )}
      </div>

      {/* Club Switcher */}
      <ClubSwitcher collapsed={collapsed} />

      {/* Main Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {NAV_MAIN.map((item) => {
            const Icon = item.icon;
            // Dynamic href: /club → if on club detail, go to /clubs (escape trap)
            const href = item.href === '/club'
              ? (pathname.startsWith('/club/') ? '/clubs' : (activeClub ? `/club/${activeClub.slug}` : '/clubs'))
              : item.href;
            const isActive = mounted && (item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href));
            const tourId = item.href === '/market' ? 'nav-market' : item.href === '/fantasy' ? 'nav-fantasy' : undefined;
            return (
              <Link
                key={item.href}
                href={href}
                onClick={handleNavClick}
                data-tour-id={tourId}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors active:scale-[0.97] min-h-[44px]',
                  'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
                  isActive
                    ? 'bg-gold/[0.15] text-gold border border-gold/30 shadow-[0_0_16px_rgba(255,215,0,0.15)]'
                    : 'text-white/60 hover:bg-white/[0.08] hover:text-white border border-transparent',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? t(item.label) : undefined}
              >
                <Icon className="size-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-semibold">{t(item.label)}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                        {t(item.badge)}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {!collapsed && (
          <>
            <div className="my-4 border-t border-white/10" />
            <div className="text-[10px] text-white/30 uppercase px-3 mb-2">
              {t('more')}
            </div>
          </>
        )}

        <div className="space-y-1">
          {NAV_MORE.map((item) => {
            const Icon = item.icon;
            // Dynamic href: /club → if on club detail, go to /clubs (escape trap)
            const href = item.href === '/club'
              ? (pathname.startsWith('/club/') ? '/clubs' : (activeClub ? `/club/${activeClub.slug}` : '/clubs'))
              : item.href;
            const isActive = mounted && pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                  isActive
                    ? 'bg-white/5 text-white'
                    : 'text-white/40 hover:bg-white/5 hover:text-white/60',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? t(item.label) : undefined}
              >
                <Icon className="size-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{t(item.label)}</span>}
              </Link>
            );
          })}

          {/* Club Admin Link */}
          {clubAdmin && (
            <Link
              href={`/club/${clubAdmin.slug}/admin`}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                mounted && pathname.startsWith(`/club/${clubAdmin.slug}/admin`)
                  ? 'bg-white/5 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/60',
                collapsed && 'justify-center'
              )}
              title={collapsed ? t('clubAdmin') : undefined}
            >
              <Building2 className="size-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{t('clubAdmin')}</span>}
            </Link>
          )}

          {/* Platform Admin Link */}
          {isPlatformAdmin && (() => {
            const AdminIcon = NAV_ADMIN.icon;
            const isAdminActive = mounted && pathname.startsWith(NAV_ADMIN.href);
            return (
              <Link
                href={NAV_ADMIN.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                  isAdminActive
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-gold/60 hover:bg-gold/5 hover:text-gold/80',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? t(NAV_ADMIN.label) : undefined}
              >
                <AdminIcon className="size-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium">{t(NAV_ADMIN.label)}</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold/60">
                      {NAV_ADMIN.badge ? t(NAV_ADMIN.badge) : ''}
                    </span>
                  </>
                )}
              </Link>
            );
          })()}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <button
          onClick={() => setWishOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-gold transition-colors min-h-[44px] w-full',
            collapsed && 'justify-center'
          )}
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          {!collapsed && <span>Wunsch einreichen</span>}
        </button>
        <FanWishModal open={wishOpen} onClose={() => setWishOpen(false)} />
        <Link
          href="/profile/settings"
          onClick={handleNavClick}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl min-h-[44px]',
            'text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <Settings className="size-5" />
          {!collapsed && <span className="font-medium">{t('settings')}</span>}
        </Link>
        {logoutConfirm ? (
          <div className={cn('flex gap-1.5 px-1', collapsed && 'flex-col items-center')}>
            <button
              onClick={handleLogout}
              className="flex-1 px-3 py-2 rounded-xl min-h-[44px] text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none transition-colors"
            >
              {collapsed ? <LogOut className="size-4" /> : t('logoutConfirm')}
            </button>
            <button
              onClick={() => setLogoutConfirm(false)}
              className="flex-1 px-3 py-2 rounded-xl min-h-[44px] text-xs font-bold bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none transition-colors"
            >
              {collapsed ? <X className="size-4" /> : tc('cancel')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setLogoutConfirm(true)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl min-h-[44px]',
              'text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="size-5" />
            {!collapsed && <span className="font-medium">{t('logout')}</span>}
          </button>
        )}
      </div>

      {/* Collapse Toggle — desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        className="absolute -right-3 top-20 size-6 bg-bg-main border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 hover:scale-110 active:scale-90 transition-colors hidden lg:flex"
      >
        {collapsed ? <ChevronRight aria-hidden="true" className="size-3" /> : <ChevronLeft aria-hidden="true" className="size-3" />}
      </button>
    </>
  );

  return (
    <>
      {/* Desktop SideNav */}
      <aside
        className={cn(
          'hidden lg:flex fixed left-0 top-0 h-dvh z-40 flex-col',
          'bg-[#111114] backdrop-blur-xl border-r border-white/[0.08]',
          'transition-[width] duration-300',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="relative w-[min(280px,85vw)] h-full flex flex-col bg-bg-main border-r border-white/10 shadow-2xl anim-slide-left">
            {/* Close button */}
            <button
              onClick={onMobileClose}
              aria-label={t('closeMenu')}
              className="absolute top-3 right-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X aria-hidden="true" className="size-5 text-white/50" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
});
