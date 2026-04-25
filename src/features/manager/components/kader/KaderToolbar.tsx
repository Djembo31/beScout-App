'use client';

import React from 'react';
import { Filter, X, Layers, ArrowUpDown } from 'lucide-react';
import { SearchInput, PosFilter } from '@/components/ui';
import { SortPills } from '@/components/ui/SortPills';
import { cn } from '@/lib/utils';
import { LENS_OPTIONS, LENS_SORTS } from './kaderHelpers';
import type { KaderLens } from './kaderHelpers';
import type { Pos } from '@/types';
import { useTranslations } from 'next-intl';
import { FORM_L5_VALUES, getFormL5Label, type FormL5Threshold } from '@/lib/filters/formL5Filter';

interface KaderToolbarProps {
  lens: KaderLens;
  onLensChange: (lens: KaderLens) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  posFilter: Set<Pos>;
  onTogglePos: (pos: Pos) => void;
  clubFilter: string;
  onClubFilterChange: (club: string) => void;
  availableClubs: string[];
  groupByClub: boolean;
  onGroupByClubChange: (v: boolean) => void;
  showFilters: boolean;
  onShowFiltersChange: (v: boolean) => void;
  /** Slice 197a — Form-L5 threshold (per-page state, see formL5Filter helper). */
  formL5: FormL5Threshold;
  onFormL5Change: (v: FormL5Threshold) => void;
}

export default function KaderToolbar({
  lens, onLensChange,
  sortBy, onSortChange,
  query, onQueryChange,
  posFilter, onTogglePos,
  clubFilter, onClubFilterChange,
  availableClubs,
  groupByClub, onGroupByClubChange,
  showFilters, onShowFiltersChange,
  formL5, onFormL5Change,
}: KaderToolbarProps) {
  const tCommon = useTranslations('common');
  const t = useTranslations('market');

  const lensOptions = LENS_OPTIONS.map(opt => ({
    id: opt.id,
    label: t(opt.labelKey),
  }));

  const sortOptions = LENS_SORTS[lens].map(opt => ({
    id: opt.id,
    label: t(opt.labelKey),
  }));

  const hasActiveFilters = posFilter.size > 0 || !!clubFilter || formL5 > 0;

  return (
    <div className="space-y-2">
      {/* Lens Switcher */}
      <div className="overflow-x-auto -mx-1 px-1">
        <SortPills options={lensOptions} active={lens} onChange={(id) => onLensChange(id as KaderLens)} />
      </div>

      {/* Search + Sort + Group + Filter */}
      <div className="flex items-center gap-2">
        <SearchInput value={query} onChange={onQueryChange} placeholder={t('searchPlaceholder')} className="flex-1 min-w-0" />

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label={t('bestandSortLabel')}
            className="px-2 py-2 bg-surface-base border border-white/10 rounded-xl text-[10px] text-white/60 focus:outline-none"
          >
            {sortOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onGroupByClubChange(!groupByClub)}
          className={cn(
            'p-2 rounded-xl border transition-colors shrink-0',
            groupByClub
              ? 'bg-gold/15 border-gold/30 text-gold'
              : 'bg-surface-base border-white/10 text-white/40 hover:text-white/60'
          )}
          aria-label={t('bestandGroupByClub')}
          aria-pressed={groupByClub}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <button
          onClick={() => onShowFiltersChange(!showFilters)}
          aria-label={t('bestandFilterLabel')}
          aria-expanded={showFilters}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0',
            showFilters || hasActiveFilters
              ? 'bg-gold/15 border-gold/30 text-gold'
              : 'bg-surface-base border-white/10 text-white/50'
          )}
        >
          <Filter className="w-3.5 h-3.5" aria-hidden="true" />
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 bg-gold text-black text-[10px] font-black rounded-full">
              {(posFilter.size > 0 ? 1 : 0) + (clubFilter ? 1 : 0) + (formL5 > 0 ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="space-y-2 anim-dropdown">
          <div className="flex items-center gap-2 flex-wrap">
            <PosFilter multi selected={posFilter} onChange={onTogglePos} />
            <select
              value={clubFilter}
              onChange={(e) => onClubFilterChange(e.target.value)}
              aria-label={t('clubFilterAria')}
              className="px-2.5 py-1.5 bg-surface-base border border-white/10 rounded-lg text-[10px] text-white/60 focus:outline-none"
            >
              <option value="">{t('allClubs')}</option>
              {availableClubs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { onClubFilterChange(''); onFormL5Change(0); }}
                className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 ml-auto"
              >
                <X className="w-3 h-3" />{t('resetFilters')}
              </button>
            )}
          </div>

          {/* Slice 197a — Form L5 pills (per-page state). */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-white/40 font-semibold shrink-0">{t('minPerformance')}</span>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-shrink-0">
              {FORM_L5_VALUES.map(val => {
                const label = getFormL5Label(val);
                const text = label === 'all' ? tCommon('all') : label;
                const active = formL5 === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onFormL5Change(val)}
                    aria-pressed={active}
                    aria-label={t('l5FilterLabel', { value: text })}
                    className={cn(
                      'px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-bold transition-colors flex-shrink-0 tabular-nums',
                      active
                        ? 'bg-gold text-black'
                        : 'bg-surface-base text-white/70 hover:bg-white/10',
                    )}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
