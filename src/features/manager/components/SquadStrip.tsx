'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlayerPhoto, getL5Color } from '@/components/player';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';
import type { Player, Pos } from '@/types';

// ============================================
// TYPES
// ============================================

interface SquadStripProps {
  players: Player[];
  assignedIds: Set<string>;
  eventLocks: Set<string>;
  selectedPlayerId: string | null;
  sort: 'l5' | 'value' | 'fitness' | 'alpha';
  filterPos: Pos | 'all';
  onSort: (s: 'l5' | 'value' | 'fitness' | 'alpha') => void;
  onFilterPos: (p: Pos | 'all') => void;
  onSelectPlayer: (id: string) => void;
  getFloor: (p: Player) => number;
  getScores: (playerId: string) => (number | null)[] | undefined;
}

// ============================================
// CONSTANTS
// ============================================

const POS_ORDER: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];

const POS_HEX: Record<Pos, string> = {
  GK: '#10b981',
  DEF: '#f59e0b',
  MID: '#0ea5e9',
  ATT: '#f43f5e',
};

const SORT_OPTIONS = [
  { key: 'l5', label: 'Form' },
  { key: 'value', label: 'Wert' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'alpha', label: 'A-Z' },
] as const;

const FILTER_OPTIONS: { key: Pos | 'all'; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'GK', label: 'GK' },
  { key: 'DEF', label: 'DEF' },
  { key: 'MID', label: 'MID' },
  { key: 'ATT', label: 'ATT' },
];

const FITNESS_ORDER: Record<string, number> = {
  fit: 0,
  doubtful: 1,
  injured: 2,
  suspended: 3,
};

// ============================================
// PILL BUTTON
// ============================================

function Pill({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border rounded-lg px-2 py-1 text-xs font-medium flex-shrink-0 min-h-[32px] transition-colors',
        active
          ? 'bg-gold/20 text-gold border-gold/30'
          : 'bg-white/[0.04] text-white/50 border-white/10',
      )}
      style={active && color ? { borderColor: color, color } : undefined}
    >
      {children}
    </button>
  );
}

// ============================================
// MINI PLAYER CARD
// ============================================

function MiniPlayerCard({
  player,
  isAssigned,
  isEventLocked,
  isSelected,
  onSelect,
}: {
  player: Player;
  isAssigned: boolean;
  isEventLocked: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isUnavailable = player.status === 'injured' || player.status === 'suspended';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-16 flex-shrink-0 flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors min-h-[44px]',
        isSelected && 'ring-2 ring-gold',
        !isSelected && 'hover:bg-white/[0.04]',
      )}
    >
      {/* Injury/suspension overlay */}
      {isUnavailable && (
        <div className="absolute inset-0 rounded-lg bg-red-500/20 pointer-events-none" />
      )}

      {/* Assigned indicator (top-right) */}
      {isAssigned && (
        <span className="absolute top-0 right-0 bg-green-500 size-3 rounded-full flex items-center justify-center">
          <Check className="size-2 text-white" aria-hidden="true" />
        </span>
      )}

      {/* Event-locked indicator (top-left) */}
      {isEventLocked && (
        <span className="absolute top-0 left-0 bg-amber-500 size-3 rounded-full flex items-center justify-center">
          <Lock className="size-1.5 text-white" aria-hidden="true" />
        </span>
      )}

      {/* Photo */}
      <PlayerPhoto
        imageUrl={player.imageUrl}
        first={player.first}
        last={player.last}
        pos={player.pos}
        size={32}
      />

      {/* Name */}
      <span className="text-[10px] text-white/70 truncate w-full text-center">
        {player.last}
      </span>

      {/* L5 badge */}
      <span
        className={cn('text-[9px] font-mono font-black tabular-nums', getL5Color(player.perf.l5))}
      >
        {player.perf.l5 > 0 ? player.perf.l5.toFixed(0) : '-'}
      </span>
    </button>
  );
}

// ============================================
// SQUAD STRIP
// ============================================

export default function SquadStrip({
  players,
  assignedIds,
  eventLocks,
  selectedPlayerId,
  sort,
  filterPos,
  onSort,
  onFilterPos,
  onSelectPlayer,
  getFloor,
}: SquadStripProps) {
  const t = useTranslations('manager');

  // Sort + filter
  const sorted = useMemo(() => {
    const list = filterPos === 'all' ? players : players.filter(p => p.pos === filterPos);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'l5':
          return b.perf.l5 - a.perf.l5;
        case 'value':
          return getFloor(b) - getFloor(a);
        case 'fitness': {
          const orderA = FITNESS_ORDER[a.status] ?? 2;
          const orderB = FITNESS_ORDER[b.status] ?? 2;
          return orderA - orderB || b.perf.l5 - a.perf.l5;
        }
        case 'alpha':
          return a.last.localeCompare(b.last);
        default:
          return 0;
      }
    });
  }, [players, sort, filterPos, getFloor]);

  // Group by position
  const groups = useMemo(() => {
    const map = new Map<Pos, Player[]>();
    for (const pos of POS_ORDER) {
      map.set(pos, []);
    }
    for (const p of sorted) {
      const group = map.get(p.pos);
      if (group) group.push(p);
    }
    // Remove empty groups
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [sorted]);

  // Empty state
  if (players.length === 0) {
    return (
      <div className="bg-white/[0.02] border-t border-white/10 p-4 text-center">
        <p className="text-white/50 text-sm mb-2">{t('noPlayers')}</p>
        <Link
          href="/market"
          className="text-gold text-sm font-medium hover:underline"
        >
          {t('goToMarket')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border-t border-white/10 p-2 space-y-2">
      {/* Header Row: Sort + Filter */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {/* Sort pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {SORT_OPTIONS.map(opt => (
            <Pill
              key={opt.key}
              active={sort === opt.key}
              onClick={() => onSort(opt.key)}
            >
              {opt.label}
            </Pill>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 flex-shrink-0" />

        {/* Position filter pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {FILTER_OPTIONS.map(opt => (
            <Pill
              key={opt.key}
              active={filterPos === opt.key}
              onClick={() => onFilterPos(opt.key)}
              color={opt.key !== 'all' ? POS_HEX[opt.key] : undefined}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Player Strip */}
      <div className="overflow-x-auto scrollbar-hide flex gap-1.5 pb-2">
        {groups.map(([pos, groupPlayers], groupIdx) => (
          <div key={pos} className="flex items-center gap-1.5 flex-shrink-0">
            {/* Divider between groups (not before first) */}
            {groupIdx > 0 && (
              <div className="w-px h-10 bg-white/10 flex-shrink-0 self-center" />
            )}

            {/* Position group label */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded border flex-shrink-0"
                style={{
                  color: POS_HEX[pos],
                  borderColor: POS_HEX[pos],
                  backgroundColor: `${POS_HEX[pos]}15`,
                }}
              >
                {pos}
              </span>
            </div>

            {/* Players in this group */}
            {groupPlayers.map(player => (
              <MiniPlayerCard
                key={player.id}
                player={player}
                isAssigned={assignedIds.has(player.id)}
                isEventLocked={eventLocks.has(player.id)}
                isSelected={selectedPlayerId === player.id}
                onSelect={() => onSelectPlayer(player.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
