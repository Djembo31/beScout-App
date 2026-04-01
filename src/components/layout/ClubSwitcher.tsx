'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronDown, Search, Compass } from 'lucide-react';
import { useClub } from '@/components/providers/ClubProvider';
import { cn } from '@/lib/utils';

export const ClubSwitcher = memo(function ClubSwitcher({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations('common');
  const { activeClub, followedClubs, setActiveClub, loading } = useClub();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (loading || !activeClub) {
    return (
      <div className={cn('p-3 border-b border-white/10', collapsed ? 'px-2' : '')}>
        <div className="h-10 rounded-xl bg-white/5 animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  const clubColor = activeClub.primary_color ?? '#FFD700';

  return (
    <div ref={ref} className={cn('relative border-b border-white/10', collapsed ? 'p-2' : 'p-3')}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={collapsed ? t('clubSwitcherLabel') : undefined}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-xl transition-colors min-h-[44px]',
          'bg-white/5 hover:bg-white/[0.08] active:scale-[0.97]',
          collapsed ? 'p-2 justify-center' : 'px-3 py-2.5'
        )}
        title={collapsed ? activeClub.name : undefined}
      >
        {/* Club Logo / Color Dot */}
        <div
          className="size-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black"
          style={{ backgroundColor: `${clubColor}20`, color: clubColor }}
        >
          {activeClub.logo_url ? (
            <Image src={activeClub.logo_url} alt="" width={20} height={20} className="size-5 object-contain" />
          ) : (
            activeClub.short?.slice(0, 3)
          )}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-white truncate">{activeClub.name}</div>
              <div className="text-[10px] text-white/40">{activeClub.league}</div>
            </div>
            <ChevronDown aria-hidden="true" className={cn('size-4 text-white/40 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && !collapsed && (
        <div role="listbox" aria-label={t('clubSwitcherLabel')} className="absolute left-3 right-3 top-full mt-1 z-50 bg-[#141414] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-[260px] overflow-y-auto">
            {followedClubs.map((club) => {
              const color = club.primary_color ?? '#FFD700';
              const isActive = club.id === activeClub.id;
              return (
                <button
                  key={club.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveClub(club);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] transition-colors',
                    isActive ? 'bg-white/[0.08]' : 'hover:bg-white/5'
                  )}
                >
                  <div
                    className="size-6 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {club.logo_url ? (
                      <Image src={club.logo_url} alt="" width={16} height={16} className="size-4 object-contain" />
                    ) : (
                      club.short?.slice(0, 3)
                    )}
                  </div>
                  <span className={cn('text-sm truncate', isActive ? 'text-white font-semibold' : 'text-white/70')}>
                    {club.name}
                  </span>
                  {isActive && (
                    <div className="ml-auto size-1.5 rounded-full" style={{ backgroundColor: color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Discover Link */}
          <Link
            href="/clubs"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] border-t border-white/10 text-gold/70 hover:text-gold hover:bg-gold/5 transition-colors"
          >
            <Compass className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">{t('discoverClubs')}</span>
          </Link>
        </div>
      )}
    </div>
  );
});
