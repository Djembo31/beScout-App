'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Briefcase, Building2, Compass } from 'lucide-react';
import { useClub } from '@/components/providers/ClubProvider';
import { cn } from '@/lib/utils';

const BOTTOM_TABS = [
  { label: 'Home', href: '/', icon: Home, tourId: undefined as string | undefined },
  { label: 'Spieltag', href: '/fantasy', icon: Trophy, tourId: 'bottomnav-fantasy' },
  { label: 'Markt', href: '/market', icon: Briefcase, tourId: 'bottomnav-market' },
  { label: 'Club', href: '/club', icon: Building2, tourId: undefined as string | undefined },
  { label: 'Community', href: '/community', icon: Compass, tourId: undefined as string | undefined },
];

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const { activeClub } = useClub();

  return (
    <nav
      className="lg:hidden border-t border-white/10 safe-bottom"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          // Club tab: resolve to active club slug or /clubs
          const href = tab.href === '/club'
            ? activeClub?.slug ? `/club/${activeClub.slug}` : '/clubs'
            : tab.href;
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={href}
              data-tour-id={tab.tourId}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-colors',
                isActive
                  ? 'text-gold bg-gold/[0.12]'
                  : 'text-white/50 active:text-white/70 active:bg-white/[0.08] active:scale-95'
              )}
            >
              {isActive && (
                <div className="absolute -top-[1px] w-10 h-[3px] bg-gold rounded-full shadow-glow-gold" />
              )}
              <Icon className={cn('size-5', isActive && 'drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]')} />
              <span className={cn('text-[10px] leading-none', isActive ? 'font-black' : 'font-medium')}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
