'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getAllClubsCached } from '@/lib/clubs';
import { countryToFlag, cn } from '@/lib/utils';

interface LeagueBarProps {
  selected: string;
  onSelect: (league: string) => void;
}

type LeagueInfo = {
  name: string;
  country: string;
  clubCount: number;
};

export default function LeagueBar({ selected, onSelect }: LeagueBarProps) {
  const t = useTranslations('market');

  const leagues = useMemo(() => {
    const allClubs = getAllClubsCached();
    const map = new Map<string, LeagueInfo>();
    for (const c of allClubs) {
      if (!c.league) continue;
      const existing = map.get(c.league);
      if (existing) {
        existing.clubCount++;
      } else {
        map.set(c.league, { name: c.league, country: c.country, clubCount: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.clubCount - a.clubCount);
  }, []);

  if (leagues.length <= 1) return null;

  const pillBase =
    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 min-h-[44px] border focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none';
  const pillActive = 'bg-white/[0.10] text-white border-white/[0.15]';
  const pillInactive =
    'text-white/40 border-transparent hover:text-white/60 hover:bg-surface-subtle';

  return (
    <nav
      aria-label={t('leagueNavLabel', { defaultMessage: 'Liga-Navigation' })}
      className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <button
        onClick={() => onSelect('')}
        className={cn(pillBase, selected === '' ? pillActive : pillInactive)}
        aria-pressed={selected === ''}
        aria-label={t('allLeagues', { defaultMessage: 'Alle Ligen' })}
      >
        {t('allLeagues', { defaultMessage: 'Alle' })}
      </button>
      {leagues.map((l) => (
        <button
          key={l.name}
          onClick={() => onSelect(l.name === selected ? '' : l.name)}
          className={cn(
            pillBase,
            selected === l.name ? pillActive : pillInactive,
          )}
          aria-pressed={selected === l.name}
          aria-label={l.name}
        >
          <span className="text-sm" aria-hidden="true">
            {countryToFlag(l.country)}
          </span>
          <span className="truncate max-w-[120px]">{l.name}</span>
        </button>
      ))}
    </nav>
  );
}
