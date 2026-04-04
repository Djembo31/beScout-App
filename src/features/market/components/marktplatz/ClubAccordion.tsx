'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal, Heart, X } from 'lucide-react';
import { InfoTooltip } from '@/components/ui';
import { useMarketStore } from '@/lib/stores/marketStore';
import { useRecentScores } from '@/lib/queries/managerData';
import { applySorting, getActiveFilterCount } from '../shared/MarketFilters';
import { centsToBsd } from '@/lib/services/players';
import { cn } from '@/lib/utils';
import PlayerIPOCard from './PlayerIPOCard';
import type { Player, DbIpo, Pos } from '@/types';
import type { SortOption } from '@/lib/stores/marketStore';

const POSITIONS: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];
const POS_LABELS: Record<Pos, string> = { GK: 'TW', DEF: 'DEF', MID: 'MID', ATT: 'STU' };
const L5_PRESETS = [45, 55, 65] as const;

const POS_ORDER: { pos: Pos; label: string }[] = [
  { pos: 'GK', label: 'TW' },
  { pos: 'DEF', label: 'DEF' },
  { pos: 'MID', label: 'MID' },
  { pos: 'ATT', label: 'STU' },
];

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: 'l5', labelKey: 'sort_l5' },
  { value: 'floor_asc', labelKey: 'sort_price_asc' },
  { value: 'floor_desc', labelKey: 'sort_price_desc' },
  { value: 'goals', labelKey: 'sort_goals' },
  { value: 'assists', labelKey: 'sort_assists' },
];

interface ClubAccordionProps {
  clubName: string;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  onBuy?: (playerId: string) => void;
  buyingId: string | null;
  onClose: () => void;
}

export default function ClubAccordion({ clubName, players, ipoMap, onBuy, buyingId }: ClubAccordionProps) {
  const t = useTranslations('market');
  const store = useMarketStore();
  const {
    marketSortBy, setMarketSortBy,
    filterPos, toggleFilterPos,
    filterMinL5, setFilterMinL5,
    filterOnlyFit, setFilterOnlyFit,
    showAdvancedFilters, setShowAdvancedFilters,
    resetMarketFilters,
  } = store;
  const { data: recentScores } = useRecentScores();
  const activeFilterCount = getActiveFilterCount(store);

  const getFloor = useMemo(() => {
    return (p: Player) => {
      const ipo = ipoMap.get(p.id);
      return ipo ? centsToBsd(ipo.price) : 0;
    };
  }, [ipoMap]);

  const groups = useMemo(() => {
    return POS_ORDER.map(({ pos, label }) => {
      const posPlayers = players.filter(p => p.pos === pos);
      const sorted = applySorting(posPlayers, marketSortBy, getFloor);
      return { pos, label, players: sorted };
    }).filter(g => g.players.length > 0);
  }, [players, marketSortBy, getFloor]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Controls: sort + filter toggle */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-colors min-h-[44px] border',
            'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
            showAdvancedFilters || activeFilterCount > 0
              ? 'bg-white/10 text-white border-white/15'
              : 'text-white/40 border-white/[0.08] hover:text-white/60 hover:bg-surface-subtle'
          )}
          aria-expanded={showAdvancedFilters}
          aria-label={t('filterLabel', { defaultMessage: 'Filter' })}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          {t('filterLabel', { defaultMessage: 'Filter' })}
          {activeFilterCount > 0 && (
            <span className="size-4 rounded-full bg-gold text-black text-[9px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 font-semibold">
            {players.length} {t('players', { defaultMessage: 'Spieler' })}
          </span>
          <select
            value={marketSortBy}
            onChange={(e) => setMarketSortBy(e.target.value as SortOption)}
            className="bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-[10px] font-bold text-white/70 outline-none min-h-[44px] hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main transition-colors"
            aria-label={t('sortByClub', { club: clubName, defaultMessage: '{club} sortieren' })}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-surface-popover">{t(o.labelKey)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expandable filters */}
      {showAdvancedFilters && (
        <fieldset className="bg-surface-subtle border border-white/[0.08] rounded-xl p-3 space-y-3 anim-fade">
          <legend className="sr-only">{t('advancedFilters', { defaultMessage: 'Erweiterte Filter' })}</legend>

          {/* Position pills */}
          <div>
            <div className="text-[10px] text-white/40 font-semibold mb-1.5">{t('position', { defaultMessage: 'Position' })}</div>
            <div className="flex gap-1.5">
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  onClick={() => toggleFilterPos(pos)}
                  aria-pressed={filterPos.has(pos)}
                  aria-label={t('posFilterLabel', { pos: POS_LABELS[pos], defaultMessage: 'Position {pos} filtern' })}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] min-w-[44px]',
                    'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
                    filterPos.has(pos)
                      ? 'bg-white/15 text-white border-white/20'
                      : 'bg-surface-subtle border-divider text-white/40'
                  )}
                >
                  {POS_LABELS[pos]}
                </button>
              ))}
            </div>
          </div>

          {/* L5 + Fit */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[10px] text-white/40 font-semibold mr-1 inline-flex items-center gap-0.5">{t('minPerformance', { defaultMessage: 'Min. L5' })} <InfoTooltip text={t('l5Tooltip')} /></div>
            {L5_PRESETS.map(threshold => (
              <button
                key={threshold}
                onClick={() => setFilterMinL5(filterMinL5 === threshold ? 0 : threshold)}
                aria-pressed={filterMinL5 === threshold}
                aria-label={t('l5FilterLabel', { value: threshold, defaultMessage: 'Minimum L5 Score {value}' })}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] min-w-[44px]',
                  'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
                  filterMinL5 === threshold
                    ? 'bg-gold/10 border-gold/20 text-gold'
                    : 'bg-surface-subtle border-divider text-white/40'
                )}
              >
                {threshold}+
              </button>
            ))}
            <button
              onClick={() => setFilterOnlyFit(!filterOnlyFit)}
              aria-pressed={filterOnlyFit}
              aria-label={t('fitFilterLabel', { defaultMessage: 'Nur fitte Spieler anzeigen' })}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] flex items-center gap-1',
                'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
                filterOnlyFit
                  ? 'bg-green-500/15 border-green-500/30 text-green-500'
                  : 'bg-surface-subtle border-divider text-white/40'
              )}
            >
              <Heart className="size-3" aria-hidden="true" />
              {t('discoveryOnlyFit', { defaultMessage: 'Fit' })}
            </button>
          </div>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetMarketFilters}
              className="flex items-center gap-1.5 text-[10px] text-red-400/70 hover:text-red-400 transition-colors min-h-[44px]"
            >
              <X className="size-3" aria-hidden="true" />
              {t('resetFiltersLabel', { defaultMessage: 'Filter zurücksetzen' })}
            </button>
          )}
        </fieldset>
      )}

      {/* Position groups */}
      <div className="divide-y divide-white/[0.04]">
        {groups.map(({ pos, label, players: posPlayers }) => (
          <div key={pos} role="group" aria-label={`${label} — ${posPlayers.length} ${t('players', { defaultMessage: 'Spieler' })}`}>
            <div className="px-1 py-2">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
                {label} <span className="tabular-nums">({posPlayers.length})</span>
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2">
              {posPlayers.map(p => {
                const ipo = ipoMap.get(p.id);
                if (!ipo) return null;
                return (
                  <PlayerIPOCard
                    key={p.id}
                    player={p}
                    ipo={ipo}
                    onBuy={onBuy}
                    buying={buyingId === p.id}
                    recentScores={recentScores?.get(p.id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
