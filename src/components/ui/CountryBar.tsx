'use client';

import React, { memo } from 'react';
import { useTranslations } from 'next-intl';
import { countryToFlag, cn } from '@/lib/utils';
import type { CountryInfo } from '@/lib/leagues';

interface CountryBarProps {
  countries: CountryInfo[];
  selected: string;
  onSelect: (code: string) => void;
  className?: string;
}

/**
 * Horizontal scrollable country pills with flag emoji + name.
 * First item = "Alle" to clear filter.
 */
function CountryBarInner({ countries, selected, onSelect, className }: CountryBarProps) {
  const t = useTranslations('common');

  if (countries.length <= 1) return null;

  const pillBase =
    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 min-h-[44px] border focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none';
  const pillActive = 'bg-white/[0.10] text-white border-white/[0.15]';
  const pillInactive = 'text-white/40 border-transparent hover:text-white/60 hover:bg-surface-subtle';

  return (
    <nav
      aria-label={t('countryNavLabel', { defaultMessage: 'Länderwahl' })}
      className={cn('flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5', className)}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <button
        onClick={() => onSelect('')}
        className={cn(pillBase, selected === '' ? pillActive : pillInactive)}
        aria-pressed={selected === ''}
      >
        {t('all', { defaultMessage: 'Alle' })}
      </button>
      {countries.map((c) => (
        <button
          key={c.code}
          onClick={() => onSelect(c.code === selected ? '' : c.code)}
          className={cn(pillBase, selected === c.code ? pillActive : pillInactive)}
          aria-pressed={selected === c.code}
          aria-label={c.name}
        >
          <span className="text-sm" aria-hidden="true">
            {countryToFlag(c.code)}
          </span>
          <span className="truncate max-w-[120px]">{c.name}</span>
        </button>
      ))}
    </nav>
  );
}

export const CountryBar = memo(CountryBarInner);
export default CountryBar;
