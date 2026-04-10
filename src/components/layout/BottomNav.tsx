'use client';

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, ClipboardList, TrendingUp, Compass, Target, Package, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const BOTTOM_TABS = [
  { labelKey: 'navHome', href: '/', icon: Home, tourId: undefined as string | undefined },
  { labelKey: 'navSpieltag', href: '/fantasy', icon: Trophy, tourId: 'bottomnav-fantasy' },
  { labelKey: 'navManager', href: '/manager', icon: ClipboardList, tourId: undefined as string | undefined },
  { labelKey: 'navMarkt', href: '/market', icon: TrendingUp, tourId: 'bottomnav-market' },
  { labelKey: 'navRankings', href: '/rankings', icon: BarChart3, tourId: undefined as string | undefined },
  { labelKey: 'navMissionen', href: '/missions', icon: Target, tourId: undefined as string | undefined },
  { labelKey: 'navInventar', href: '/inventory', icon: Package, tourId: undefined as string | undefined },
  { labelKey: 'navCommunity', href: '/community', icon: Compass, tourId: undefined as string | undefined },
];

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
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
      <div
        className="flex items-center gap-1 h-16 px-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const href = tab.href;
          const isActive = mounted && (tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={href}
              data-tour-id={tab.tourId}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 flex-shrink-0 w-[72px] min-h-[44px] py-1.5 rounded-xl snap-center transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
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
