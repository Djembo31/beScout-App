'use client';

import React, { useState } from 'react';
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
  X,
} from 'lucide-react';
import { NAV_MAIN, NAV_MORE, NAV_ADMIN } from '@/lib/nav';
import { supabase } from '@/lib/supabaseClient';
import { useUser, useRoles } from '@/components/providers/AuthProvider';
import { formatBsd } from '@/lib/services/wallet';
import { useWallet } from '@/components/providers/WalletProvider';

interface SideNavProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function SideNav({ mobileOpen, onMobileClose }: SideNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { isPlatformAdmin, clubAdmin } = useRoles();
  const [collapsed, setCollapsed] = useState(false);
  const { balanceCents } = useWallet();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleNavClick = () => {
    // Close mobile drawer on navigation
    onMobileClose?.();
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3" onClick={handleNavClick}>
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="BeScout"
              fill
              className="object-contain"
              priority
            />
          </div>
          {!collapsed && (
            <div className="relative h-10 w-28">
              <Image
                src="/schrift.png"
                alt="BeScout"
                fill
                className="object-contain object-left"
              />
            </div>
          )}
        </Link>
      </div>

      {/* Wallet */}
      <div className={`p-4 border-b border-white/10 ${collapsed ? 'px-3' : ''}`}>
        <div data-tour-id="sidebar-wallet" className={`bg-white/5 rounded-xl p-3 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-[#FFD700]" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-[10px] text-white/50">Guthaben</div>
                <div className="font-mono font-black text-[#FFD700]">
                  {balanceCents === null ? (
                    <span className="inline-block w-16 h-4 rounded bg-[#FFD700]/20 animate-pulse" />
                  ) : (
                    <>{formatBsd(balanceCents)} BSD</>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {NAV_MAIN.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const tourId = item.href === '/market' ? 'nav-market' : item.href === '/fantasy' ? 'nav-fantasy' : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                data-tour-id={tourId}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.97]
                  ${isActive
                    ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                    : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-semibold">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                        {item.badge}
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
            <div className="text-[10px] text-white/30 uppercase tracking-wider px-3 mb-2">
              Mehr
            </div>
          </>
        )}

        <div className="space-y-1">
          {NAV_MORE.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive
                    ? 'bg-white/5 text-white'
                    : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}

          {/* Club Admin Link */}
          {clubAdmin && (
            <Link
              href={`/club/${clubAdmin.slug}/admin`}
              onClick={handleNavClick}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                ${pathname.startsWith(`/club/${clubAdmin.slug}/admin`)
                  ? 'bg-white/5 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? 'Club Admin' : undefined}
            >
              <Building2 className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">Club Admin</span>}
            </Link>
          )}

          {/* Platform Admin Link */}
          {isPlatformAdmin && (() => {
            const AdminIcon = NAV_ADMIN.icon;
            const isAdminActive = pathname.startsWith(NAV_ADMIN.href);
            return (
              <Link
                href={NAV_ADMIN.href}
                onClick={handleNavClick}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isAdminActive
                    ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                    : 'text-[#FFD700]/60 hover:bg-[#FFD700]/5 hover:text-[#FFD700]/80'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? NAV_ADMIN.label : undefined}
              >
                <AdminIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium">{NAV_ADMIN.label}</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#FFD700]/10 text-[#FFD700]/60">
                      {NAV_ADMIN.badge}
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
        <Link
          href="/profile"
          onClick={handleNavClick}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-white/40 hover:bg-white/5 hover:text-white/60 transition-all
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Einstellungen</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Abmelden</span>}
        </button>
      </div>

      {/* Collapse Toggle — desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 hover:scale-110 active:scale-90 transition-all hidden lg:flex"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </>
  );

  return (
    <>
      {/* Desktop SideNav */}
      <aside
        className={`
          hidden lg:flex fixed left-0 top-0 h-screen z-40 flex-col
          bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/10
          transition-all duration-300
          ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="relative w-[280px] h-full flex flex-col bg-[#0a0a0a] border-r border-white/10 shadow-2xl anim-slide-left">
            {/* Close button */}
            <button
              onClick={onMobileClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
