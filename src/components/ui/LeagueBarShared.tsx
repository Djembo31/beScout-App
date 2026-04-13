'use client';

import React, { useMemo, memo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getAllLeaguesCached } from '@/lib/leagues';
import type { League } from '@/types';

interface LeagueBarProps {
  selected: string;
  onSelect: (league: string) => void;
  /** Only show leagues for this country (2-letter code). If omitted, shows all leagues. */
  country?: string;
  size?: 'sm' | 'md';
  showAll?: boolean;
  className?: string;
}

/**
 * Horizontal scrollable league pills with official league LOGO + name.
 * Shared version — replaces the market-only LeagueBar.
 *
 * Smart collapse: returns null if filtered list has <= 1 league
 * (e.g. England only has Premier League → no need to show selector).
 */
function LeagueBarInner({ selected, onSelect, country, size = 'md', showAll = true, className }: LeagueBarProps) {
  const t = useTranslations('common');

  const leagues: League[] = useMemo(() => {
    const all = getAllLeaguesCached();
    const filtered = country ? all.filter((l) => l.country === country) : all;
    return filtered;
  }, [country]);

  // Smart collapse: hide if <= 1 league for the country
  if (leagues.length <= 1) return null;

  const logoSize = size === 'sm' ? 14 : 16;
  const pillBase = cn(
    'flex items-center gap-1.5 rounded-xl font-bold transition-colors whitespace-nowrap shrink-0 border',
    'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
    size === 'sm'
      ? 'px-2.5 py-1.5 text-[11px] min-h-[36px]'
      : 'px-3 py-2 text-xs min-h-[44px]',
  );
  const pillActive = 'bg-white/[0.10] text-white border-white/[0.15]';
  const pillInactive = 'text-white/40 border-transparent hover:text-white/60 hover:bg-surface-subtle';

  return (
    <nav
      aria-label={t('leagueNavLabel', { defaultMessage: 'Liga-Auswahl' })}
      className={cn('flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5', className)}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {showAll && (
        <button
          onClick={() => onSelect('')}
          className={cn(pillBase, selected === '' ? pillActive : pillInactive)}
          aria-pressed={selected === ''}
        >
          {t('allLeagues', { defaultMessage: 'Alle' })}
        </button>
      )}
      {leagues.map((l) => (
        <button
          key={l.short}
          onClick={() => onSelect(l.name === selected ? '' : l.name)}
          className={cn(pillBase, selected === l.name ? pillActive : pillInactive)}
          aria-pressed={selected === l.name}
          aria-label={l.name}
        >
          {l.logoUrl ? (
            <Image
              src={l.logoUrl}
              alt=""
              width={logoSize}
              height={logoSize}
              className="rounded-sm object-contain shrink-0"
              unoptimized
              aria-hidden="true"
            />
          ) : (
            <span
              className="rounded-sm bg-white/10 shrink-0 flex items-center justify-center font-mono text-white/40"
              style={{ width: logoSize, height: logoSize, fontSize: logoSize * 0.55 }}
              aria-hidden="true"
            >
              {l.short.charAt(0)}
            </span>
          )}
          <span className="truncate max-w-[120px]">{l.name}</span>
        </button>
      ))}
    </nav>
  );
}

export const LeagueBar = memo(LeagueBarInner);
export default LeagueBar;
