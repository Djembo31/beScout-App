'use client';

import React, { useMemo } from 'react';
import { Check, Lock, ChevronDown } from 'lucide-react';
import type { Pos } from '@/types';
import { cn } from '@/lib/utils';
import { PlayerPhoto, getL5Color } from '@/components/player/index';

// ============================================
// TYPES
// ============================================

interface SquadStripPlayer {
  id: string;
  first_name: string;
  last_name: string;
  position: Pos;
  perf_l5: number | null;
  floor_price_scout: number;
  status?: string; // 'injured' | 'doubtful' | 'fit'
  isLocked?: boolean;
  isOnPitch?: boolean;
}

interface SquadStripProps {
  players: SquadStripPlayer[];
  selectedPlayerId: string | null;
  onPlayerSelect: (playerId: string) => void;
  sort: 'l5' | 'value' | 'fitness' | 'alpha';
  onSortChange: (s: 'l5' | 'value' | 'fitness' | 'alpha') => void;
  filterPos: Pos | 'all';
  onFilterPosChange: (p: Pos | 'all') => void;
}

// ============================================
// CONSTANTS
// ============================================

const POSITIONS: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];

const POS_FILTER_ACTIVE_CLASSES: Record<Pos, string> = {
  GK: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/25',
  DEF: 'bg-amber-500/20 text-amber-200 border-amber-400/25',
  MID: 'bg-sky-500/20 text-sky-200 border-sky-400/25',
  ATT: 'bg-rose-500/20 text-rose-200 border-rose-400/25',
};

const FITNESS_ORDER: Record<string, number> = {
  fit: 0,
  doubtful: 1,
  injured: 2,
};

const SORT_LABELS: Record<SquadStripProps['sort'], string> = {
  l5: 'Form',
  value: 'Wert',
  fitness: 'Fitness',
  alpha: 'A-Z',
};

// ============================================
// SORTING
// ============================================

function sortPlayers(
  players: SquadStripPlayer[],
  sort: SquadStripProps['sort'],
): SquadStripPlayer[] {
  const sorted = [...players];

  switch (sort) {
    case 'l5':
      sorted.sort((a, b) => {
        // null last
        if (a.perf_l5 == null && b.perf_l5 == null) return 0;
        if (a.perf_l5 == null) return 1;
        if (b.perf_l5 == null) return -1;
        return b.perf_l5 - a.perf_l5;
      });
      break;
    case 'value':
      sorted.sort((a, b) => b.floor_price_scout - a.floor_price_scout);
      break;
    case 'fitness':
      sorted.sort((a, b) => {
        const aOrder = FITNESS_ORDER[a.status ?? 'fit'] ?? 0;
        const bOrder = FITNESS_ORDER[b.status ?? 'fit'] ?? 0;
        return aOrder - bOrder;
      });
      break;
    case 'alpha':
      sorted.sort((a, b) => a.last_name.localeCompare(b.last_name));
      break;
  }

  return sorted;
}

// ============================================
// GROUP BY POSITION (with dividers)
// ============================================

type GroupItem =
  | { type: 'divider'; pos: Pos }
  | { type: 'player'; player: SquadStripPlayer };

function groupByPosition(players: SquadStripPlayer[]): GroupItem[] {
  const items: GroupItem[] = [];
  let lastPos: Pos | null = null;

  // Sort by position order first, then maintain existing sort within each group
  const posOrder: Record<Pos, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
  const positionalSorted = [...players].sort(
    (a, b) => posOrder[a.position] - posOrder[b.position],
  );

  for (const player of positionalSorted) {
    if (player.position !== lastPos) {
      items.push({ type: 'divider', pos: player.position });
      lastPos = player.position;
    }
    items.push({ type: 'player', player });
  }

  return items;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function SortSelect({
  sort,
  onSortChange,
}: {
  sort: SquadStripProps['sort'];
  onSortChange: SquadStripProps['onSortChange'];
}) {
  return (
    <div className="relative flex-shrink-0">
      <select
        value={sort}
        onChange={(e) =>
          onSortChange(e.target.value as SquadStripProps['sort'])
        }
        aria-label="Sortierung"
        className={cn(
          'appearance-none bg-white/5 border border-white/10 rounded-lg',
          'pl-2 pr-6 py-1 text-xs text-white/70',
          'focus-visible:ring-2 focus-visible:ring-gold/50 outline-none',
          'cursor-pointer min-h-[32px]',
        )}
      >
        {(Object.keys(SORT_LABELS) as Array<SquadStripProps['sort']>).map(
          (key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ),
        )}
      </select>
      <ChevronDown
        className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-white/40 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

function PosFilterPills({
  filterPos,
  onFilterPosChange,
}: {
  filterPos: SquadStripProps['filterPos'];
  onFilterPosChange: SquadStripProps['onFilterPosChange'];
}) {
  const options: Array<Pos | 'all'> = ['all', ...POSITIONS];

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {options.map((p) => {
        const isActive = filterPos === p;
        const label = p === 'all' ? 'Alle' : p;

        let activeClass = 'bg-white/10 text-white border-white/20';
        if (isActive && p !== 'all') {
          activeClass = POS_FILTER_ACTIVE_CLASSES[p as Pos];
        }

        return (
          <button
            key={p}
            type="button"
            onClick={() => onFilterPosChange(p)}
            aria-label={p === 'all' ? 'Alle Positionen' : `Position ${p}`}
            aria-pressed={isActive}
            className={cn(
              'px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors min-h-[28px]',
              isActive
                ? activeClass
                : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PositionDivider({ pos }: { pos: Pos }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mx-1">
      <span className="text-[9px] text-white/30 font-bold">{pos}</span>
      <div className="w-px h-16 bg-white/10" />
    </div>
  );
}

function PlayerMiniCard({
  player,
  isSelected,
  onSelect,
}: {
  player: SquadStripPlayer;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const l5 = player.perf_l5;
  const l5Class = l5 != null ? getL5Color(l5) : 'text-white/50';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${player.first_name} ${player.last_name}`}
      className={cn(
        'w-16 flex-shrink-0 flex flex-col items-center gap-0.5',
        'bg-white/[0.03] border rounded-xl p-1.5',
        'transition-colors cursor-pointer relative',
        'focus-visible:ring-2 focus-visible:ring-gold/50 outline-none',
        'active:scale-[0.97]',
        isSelected
          ? 'border-gold/50'
          : 'border-white/[0.06] hover:border-white/20',
      )}
    >
      {/* Injured overlay */}
      {player.status === 'injured' && (
        <div className="absolute inset-0 bg-red-500/10 rounded-xl pointer-events-none" />
      )}

      {/* On-pitch badge (top-right) */}
      {player.isOnPitch && (
        <span className="absolute -top-1 -right-1 size-3.5 bg-gold rounded-full flex items-center justify-center">
          <Check className="size-2 text-black" aria-hidden="true" />
        </span>
      )}

      {/* Locked badge (top-left) */}
      {player.isLocked && (
        <span className="absolute -top-1 -left-1 size-3.5 bg-amber-500/80 rounded-full flex items-center justify-center">
          <Lock className="size-2 text-black" aria-hidden="true" />
        </span>
      )}

      {/* Photo */}
      <PlayerPhoto
        first={player.first_name}
        last={player.last_name}
        pos={player.position}
        size={32}
        className="size-8"
      />

      {/* Name */}
      <span className="text-[10px] text-white/70 font-medium truncate w-full text-center">
        {player.last_name}
      </span>

      {/* L5 Score */}
      <span
        className={cn(
          'text-[10px] font-mono tabular-nums text-center',
          l5Class,
        )}
      >
        {l5 != null ? l5.toFixed(0) : '-'}
      </span>
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SquadStrip({
  players,
  selectedPlayerId,
  onPlayerSelect,
  sort,
  onSortChange,
  filterPos,
  onFilterPosChange,
}: SquadStripProps) {
  // Filter
  const filtered = useMemo(() => {
    if (filterPos === 'all') return players;
    return players.filter((p) => p.position === filterPos);
  }, [players, filterPos]);

  // Sort
  const sorted = useMemo(() => sortPlayers(filtered, sort), [filtered, sort]);

  // Group by position (with dividers) — only when not filtering to a single position
  const items = useMemo(() => {
    if (filterPos !== 'all') {
      // Single position — no dividers needed
      return sorted.map(
        (player): GroupItem => ({ type: 'player', player }),
      );
    }
    return groupByPosition(sorted);
  }, [sorted, filterPos]);

  return (
    <div className="h-28 w-full bg-white/[0.02] border-t border-white/10">
      <div className="flex items-center h-full overflow-x-auto scrollbar-hide">
        {/* Sticky controls */}
        <div className="sticky left-0 z-10 bg-[#0a0a0a] flex items-center gap-2 px-3 pr-3 h-full flex-shrink-0">
          <SortSelect sort={sort} onSortChange={onSortChange} />
          <PosFilterPills
            filterPos={filterPos}
            onFilterPosChange={onFilterPosChange}
          />
        </div>

        {/* Player cards with position dividers */}
        <div className="flex items-center gap-2 px-3 h-full">
          {items.map((item) => {
            if (item.type === 'divider') {
              return <PositionDivider key={`div-${item.pos}`} pos={item.pos} />;
            }

            const player = item.player;
            return (
              <PlayerMiniCard
                key={player.id}
                player={player}
                isSelected={player.id === selectedPlayerId}
                onSelect={() => onPlayerSelect(player.id)}
              />
            );
          })}

          {items.length === 0 && (
            <span className="text-xs text-white/30 px-4 flex-shrink-0">
              Keine Spieler
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
