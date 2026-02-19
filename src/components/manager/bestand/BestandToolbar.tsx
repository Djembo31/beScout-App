'use client';

import React from 'react';
import { Filter, X, Layers, ArrowUpDown } from 'lucide-react';
import { SearchInput, PosFilter } from '@/components/ui';
import { SortPills } from '@/components/ui/SortPills';
import { cn } from '@/lib/utils';
import { LENS_OPTIONS, LENS_SORTS } from './bestandHelpers';
import type { BestandLens } from './bestandHelpers';
import type { Pos } from '@/types';
import { useTranslations } from 'next-intl';

interface BestandToolbarProps {
  lens: BestandLens;
  onLensChange: (lens: BestandLens) => void;
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
}

export default function BestandToolbar({
  lens, onLensChange,
  sortBy, onSortChange,
  query, onQueryChange,
  posFilter, onTogglePos,
  clubFilter, onClubFilterChange,
  availableClubs,
  groupByClub, onGroupByClubChange,
  showFilters, onShowFiltersChange,
}: BestandToolbarProps) {
  const t = useTranslations('market');

  const lensOptions = LENS_OPTIONS.map(opt => ({
    id: opt.id,
    label: t(opt.labelKey),
  }));

  const sortOptions = LENS_SORTS[lens].map(opt => ({
    id: opt.id,
    label: t(opt.labelKey),
  }));

  const hasActiveFilters = posFilter.size > 0 || !!clubFilter;

  return (
    <div className="space-y-2">
      {/* Lens Switcher */}
      <div className="overflow-x-auto -mx-1 px-1">
        <SortPills options={lensOptions} active={lens} onChange={(id) => onLensChange(id as BestandLens)} />
      </div>

      {/* Search + Sort + Group + Filter */}
      <div className="flex items-center gap-2">
        <SearchInput value={query} onChange={onQueryChange} placeholder={t('searchPlaceholder')} className="flex-1 min-w-0" />

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-2 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/60 focus:outline-none"
          >
            {sortOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onGroupByClubChange(!groupByClub)}
          className={cn(
            'p-2 rounded-xl border transition-all shrink-0',
            groupByClub
              ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
          )}
          title={t('bestandGroupByClub')}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onShowFiltersChange(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0',
            showFilters || hasActiveFilters
              ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
              : 'bg-white/5 border-white/10 text-white/50'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 bg-[#FFD700] text-black text-[10px] font-black rounded-full">
              {(posFilter.size > 0 ? 1 : 0) + (clubFilter ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap anim-dropdown">
          <PosFilter multi selected={posFilter} onChange={onTogglePos} />
          <select
            value={clubFilter}
            onChange={(e) => onClubFilterChange(e.target.value)}
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 focus:outline-none"
          >
            <option value="">{t('allClubs')}</option>
            {availableClubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { onClubFilterChange(''); }}
              className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 ml-auto"
            >
              <X className="w-3 h-3" />{t('resetFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
