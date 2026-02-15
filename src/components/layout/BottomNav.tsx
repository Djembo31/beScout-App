'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, TrendingUp, Users, User } from 'lucide-react';

const BOTTOM_TABS = [
  { label: 'Home', href: '/', icon: Home, tourId: undefined as string | undefined },
  { label: 'Fantasy', href: '/fantasy', icon: Trophy, tourId: 'bottomnav-fantasy' },
  { label: 'Markt', href: '/market', icon: TrendingUp, tourId: 'bottomnav-market' },
  { label: 'Community', href: '/community', icon: Users, tourId: undefined as string | undefined },
  { label: 'Profil', href: '/profile', icon: User, tourId: undefined as string | undefined },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden border-t border-white/10 safe-bottom"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-tour-id={tab.tourId}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-[#FFD700] bg-[#FFD700]/[0.06]'
                  : 'text-white/40 active:text-white/60 active:bg-white/5 active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute -top-[9px] w-8 h-0.5 bg-[#FFD700] rounded-full" />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_rgba(255,215,0,0.4)]' : ''}`} />
              <span className={`text-[10px] leading-none ${isActive ? 'font-black' : 'font-medium'}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
