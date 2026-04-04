'use client';

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Briefcase, Building2, Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClub } from '@/components/providers/ClubProvider';
import { cn } from '@/lib/utils';

const BOTTOM_TABS = [
  { labelKey: 'navHome', href: '/', icon: Home, tourId: undefined as string | undefined },
  { labelKey: 'navSpieltag', href: '/fantasy', icon: Trophy, tourId: 'bottomnav-fantasy' },
  { labelKey: 'navMarkt', href: '/market', icon: Briefcase, tourId: 'bottomnav-market' },
  { labelKey: 'navClub', href: '/club', icon: Building2, tourId: undefined as string | undefined },
  { labelKey: 'navCommunity', href: '/community', icon: Compass, tourId: undefined as string | undefined },
];

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const { activeClub } = useClub();
  const tc = useTranslations('common');
  const tn = useTranslations('nav');

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <nav
      aria-label={tn('mainNavLabel')}
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
          // Club tab: if already on a club page, go to /clubs (escape the trap)
          // Otherwise, go to active club or /clubs discovery
          const href = tab.href === '/club'
            ? (pathname.startsWith('/club/') ? '/clubs' : (activeClub?.slug ? `/club/${activeClub.slug}` : '/clubs'))
            : tab.href;
          const isActive = mounted && (tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={href}
              data-tour-id={tab.tourId}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
                isActive
                  ? 'text-gold bg-gold/[0.12]'
                  : 'text-white/50 active:text-white/70 active:bg-surface-elevated active:scale-95'
              )}
            >
              {isActive && (
                <div aria-hidden="true" className="absolute -top-[1px] w-10 h-[3px] bg-gold rounded-full shadow-glow-gold" />
              )}
              <Icon className={cn('size-5', isActive && 'drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]')} />
              <span className={cn('text-[10px] leading-none truncate max-w-full px-0.5', isActive ? 'font-black' : 'font-medium')}>{tc(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
