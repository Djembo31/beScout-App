'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui';
import { useMarketStore } from '@/lib/stores/marketStore';
import type { Pos, Player } from '@/types';
import type { SortOption } from '@/lib/stores/marketStore';

const POSITIONS: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];

const L5_VALUES = [0, 45, 55, 65] as const;
const L5_LABELS = ['sortAll', '45+', '55+', '65+'] as const;

const SORT_KEYS: { value: SortOption; labelKey: string; fallback: string }[] = [
  { value: 'l5', labelKey: 'literal', fallback: 'L5 Score' },
  { value: 'floor_asc', labelKey: 'sortPriceAsc', fallback: 'Preis ↑' },
  { value: 'floor_desc', labelKey: 'sortPriceDesc', fallback: 'Preis ↓' },
  { value: 'goals', labelKey: 'sortGoals', fallback: 'Tore' },
  { value: 'assists', labelKey: 'sortAssists', fallback: 'Assists' },
  { value: 'matches', labelKey: 'sortMatches', fallback: 'Spiele' },
  { value: 'contract', labelKey: 'sortContract', fallback: 'Vertrag' },
];

const CONTRACT_VALUES = [0, 6, 12] as const;
const CONTRACT_LABELS = ['sortAll', '< 6M', '< 12M'] as const;

// Shared filter logic
export function applyFilters(players: Player[], store: ReturnType<typeof useMarketStore.getState>): Player[] {
  return players.filter(p => {
    if (store.filterPos.size > 0 && !store.filterPos.has(p.pos)) return false;
    if (store.filterMinL5 > 0 && p.perf.l5 < store.filterMinL5) return false;
    if (store.filterMinGoals > 0 && p.stats.goals < store.filterMinGoals) return false;
    if (store.filterMinAssists > 0 && p.stats.assists < store.filterMinAssists) return false;
    if (store.filterMinMatches > 0 && p.stats.matches < store.filterMinMatches) return false;
    if (store.filterContractMax > 0 && p.contractMonthsLeft > store.filterContractMax) return false;
    if (store.filterOnlyFit && p.status !== 'fit') return false;
    return true;
  });
}

export function applySorting(players: Player[], sortBy: SortOption, getFloor?: (p: Player) => number): Player[] {
  return [...players].sort((a, b) => {
    switch (sortBy) {
      case 'l5': return b.perf.l5 - a.perf.l5;
      case 'floor_asc': return (getFloor?.(a) ?? 0) - (getFloor?.(b) ?? 0);
      case 'floor_desc': return (getFloor?.(b) ?? 0) - (getFloor?.(a) ?? 0);
      case 'goals': return b.stats.goals - a.stats.goals;
      case 'assists': return b.stats.assists - a.stats.assists;
      case 'matches': return b.stats.matches - a.stats.matches;
      case 'contract': return a.contractMonthsLeft - b.contractMonthsLeft;
      default: return 0;
    }
  });
}

export function getActiveFilterCount(store: ReturnType<typeof useMarketStore.getState>): number {
  let count = 0;
  if (store.filterPos.size > 0) count++;
  if (store.filterMinL5 > 0) count++;
  if (store.filterMinGoals > 0) count++;
  if (store.filterMinAssists > 0) count++;
  if (store.filterMinMatches > 0) count++;
  if (store.filterContractMax > 0) count++;
  if (store.filterOnlyFit) count++;
  if (store.filterPriceMin > 0) count++;
  if (store.filterPriceMax > 0) count++;
  if (store.filterMinSellers > 0) count++;
  if (store.filterBestDeals) count++;
  return count;
}

interface MarketFiltersProps {
  showTransferFilters?: boolean;
}

export default function MarketFilters({ showTransferFilters }: MarketFiltersProps) {
  const t = useTranslations('market');
  const {
    filterPos, toggleFilterPos,
    filterMinL5, setFilterMinL5,
    filterMinGoals, setFilterMinGoals,
    filterMinAssists, setFilterMinAssists,
    filterMinMatches, setFilterMinMatches,
    filterContractMax, setFilterContractMax,
    filterOnlyFit, setFilterOnlyFit,
    filterPriceMin, setFilterPriceMin,
    filterPriceMax, setFilterPriceMax,
    filterBestDeals, setFilterBestDeals,
    marketSortBy, setMarketSortBy,
    resetMarketFilters,
  } = useMarketStore();

  const [expanded, setExpanded] = React.useState(false);

  const activeCount = getActiveFilterCount(useMarketStore.getState());

  return (
    <div className="space-y-3 mb-4">
      {/* Top row: Sort + Filter toggle */}
      <div className="flex items-center gap-2">
        {/* Sort dropdown */}
        <select
          value={marketSortBy}
          onChange={(e) => setMarketSortBy(e.target.value as SortOption)}
          className="bg-white/[0.06] border border-white/[0.10] rounded-lg px-2.5 py-1.5 text-xs text-white/70 min-h-[36px] outline-none focus:border-white/20"
          aria-label={t('sortBy', { defaultMessage: 'Sortieren' })}
        >
          {SORT_KEYS.map(o => (
            <option key={o.value} value={o.value} className="bg-[#1a1a1a]">
              {o.labelKey === 'literal' ? o.fallback : t(o.labelKey, { defaultMessage: o.fallback })}
            </option>
          ))}
        </select>

        {/* Position pills */}
        <div className="flex gap-1">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => toggleFilterPos(pos)}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-bold transition-colors min-h-[32px]',
                filterPos.has(pos)
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-white/40 border border-transparent hover:text-white/60'
              )}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Filter expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px]',
            expanded || activeCount > 0
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/40 border border-white/[0.08] hover:text-white/60'
          )}
          aria-expanded={expanded}
          aria-label={t('filterLabel', { defaultMessage: 'Filter' })}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          {t('filterLabel', { defaultMessage: 'Filter' })}
          {activeCount > 0 && (
            <span className="size-4 rounded-full bg-gold text-black text-[9px] font-black flex items-center justify-center">{activeCount}</span>
          )}
        </button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 space-y-3 anim-fade">
          {/* L5 */}
          <div>
            <div className="text-[10px] text-white/40 font-semibold mb-1.5">{t('l5Performance', { defaultMessage: 'L5 Performance' })}</div>
            <div className="flex gap-1.5">
              {L5_VALUES.map((v, i) => (
                <button
                  key={v}
                  onClick={() => setFilterMinL5(v)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors min-h-[32px]',
                    filterMinL5 === v
                      ? 'bg-white/15 text-white'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {i === 0 ? t('sortAll', { defaultMessage: 'Alle' }) : L5_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-white/40 font-semibold mb-1">{t('goalsMin', { defaultMessage: 'Tore min.' })}</div>
              <select
                value={filterMinGoals}
                onChange={(e) => setFilterMinGoals(Number(e.target.value))}
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none min-h-[32px]"
                aria-label={t('goalsMinAria', { defaultMessage: 'Tore minimum' })}
              >
                <option value={0} className="bg-[#1a1a1a]">{t('sortAll', { defaultMessage: 'Alle' })}</option>
                <option value={3} className="bg-[#1a1a1a]">3+</option>
                <option value={5} className="bg-[#1a1a1a]">5+</option>
                <option value={10} className="bg-[#1a1a1a]">10+</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-white/40 font-semibold mb-1">{t('assistsMin', { defaultMessage: 'Assists min.' })}</div>
              <select
                value={filterMinAssists}
                onChange={(e) => setFilterMinAssists(Number(e.target.value))}
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none min-h-[32px]"
                aria-label={t('assistsMinAria', { defaultMessage: 'Assists minimum' })}
              >
                <option value={0} className="bg-[#1a1a1a]">{t('sortAll', { defaultMessage: 'Alle' })}</option>
                <option value={2} className="bg-[#1a1a1a]">2+</option>
                <option value={4} className="bg-[#1a1a1a]">4+</option>
                <option value={8} className="bg-[#1a1a1a]">8+</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-white/40 font-semibold mb-1">{t('matchesMin', { defaultMessage: 'Spiele min.' })}</div>
              <select
                value={filterMinMatches}
                onChange={(e) => setFilterMinMatches(Number(e.target.value))}
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none min-h-[32px]"
                aria-label={t('matchesMinAria', { defaultMessage: 'Spiele minimum' })}
              >
                <option value={0} className="bg-[#1a1a1a]">{t('sortAll', { defaultMessage: 'Alle' })}</option>
                <option value={10} className="bg-[#1a1a1a]">10+</option>
                <option value={20} className="bg-[#1a1a1a]">20+</option>
                <option value={30} className="bg-[#1a1a1a]">30+</option>
              </select>
            </div>
          </div>

          {/* Contract + Fit */}
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[10px] text-white/40 font-semibold mb-1 flex items-center gap-1">
                {t('contractDuration', { defaultMessage: 'Vertragslaufzeit' })}
                <InfoTooltip text={t('contractTooltip')} />
              </div>
              <div className="flex gap-1.5">
                {CONTRACT_VALUES.map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setFilterContractMax(v)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors min-h-[32px]',
                      filterContractMax === v
                        ? 'bg-white/15 text-white'
                        : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    {i === 0 ? t('sortAll', { defaultMessage: 'Alle' }) : CONTRACT_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={filterOnlyFit}
                onChange={(e) => setFilterOnlyFit(e.target.checked)}
                className="accent-gold size-3.5"
              />
              <span className="text-[10px] text-white/50 font-semibold">{t('onlyFit', { defaultMessage: 'Nur Fit' })}</span>
            </label>
          </div>

          {/* Transferliste-only filters */}
          {showTransferFilters && (
            <div className="border-t border-white/[0.06] pt-3 space-y-2">
              <div className="text-[10px] text-white/40 font-semibold">{t('transferFiltersLabel', { defaultMessage: 'Transferliste Filter' })}</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-white/40 mb-1">{t('priceMin', { defaultMessage: 'Preis min. ($SCOUT)' })}</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={filterPriceMin || ''}
                    onChange={(e) => setFilterPriceMin(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none min-h-[32px] tabular-nums"
                    aria-label={t('priceMinAria', { defaultMessage: 'Preis minimum' })}
                  />
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-1">{t('priceMax', { defaultMessage: 'Preis max. ($SCOUT)' })}</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={filterPriceMax || ''}
                    onChange={(e) => setFilterPriceMax(Number(e.target.value) || 0)}
                    placeholder="Max"
                    className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none min-h-[32px] tabular-nums"
                    aria-label={t('priceMaxAria', { defaultMessage: 'Preis maximum' })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterBestDeals}
                  onChange={(e) => setFilterBestDeals(e.target.checked)}
                  className="accent-gold size-3.5"
                />
                <span className="text-[10px] text-white/50 font-semibold">{t('bestDealsLabel', { defaultMessage: 'Beste Deals (hoher L5, niedriger Preis)' })}</span>
              </label>
            </div>
          )}

          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={resetMarketFilters}
              className="flex items-center gap-1.5 text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
            >
              <X className="size-3" aria-hidden="true" />
              {t('resetFiltersLabel', { defaultMessage: 'Filter zurücksetzen' })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
