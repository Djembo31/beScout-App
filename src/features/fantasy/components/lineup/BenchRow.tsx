'use client';

/**
 * BenchRow — 4-Slot-Reihe (1 GK + 3 Outfield) unter dem Pitch.
 *
 * Slice 195d (Fantasy Bench + Auto-Sub):
 *  - Klick auf leeren Slot oeffnet PlayerPicker mit slotKind-Filter
 *  - Klick auf gefuellten Slot entfernt Spieler
 *  - Outfield-Slots haben Sub-Order-Badge (1/2/3) + Up/Down-Buttons fuer Reihenfolge
 *  - Mobile-First: 4 size-9 Slots, gap-2, passen in 393px
 */

import React from 'react';
import { ChevronUp, ChevronDown, Plus, X as XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PlayerPhoto } from '@/components/player';
import { cn } from '@/lib/utils';
import type { Pos } from '@/types';
import type { UserDpcHolding } from '@/components/fantasy/types';
import type { BenchSlotKey } from '../../store/lineupStore';
import { getPosAccentColor } from '@/features/fantasy/helpers';

export interface BenchRowProps {
  /** Read-only mode — kein Click/Edit. */
  isReadOnly: boolean;
  /** Bench-Slot-Lookup. */
  getBenchPlayer: (kind: BenchSlotKey) => UserDpcHolding | null;
  /** 1-basierte Sub-Order ueber 3 Outfield-Slots. */
  benchOrder: number[];
  /** User klickt leeren Slot → Picker oeffnen. */
  onSelectBenchSlot: (kind: BenchSlotKey) => void;
  /** User klickt gefuellten Slot → Spieler entfernen. */
  onRemoveBenchSlot: (kind: BenchSlotKey) => void;
  /** Bench-Order Reihenfolge umordnen. */
  onMoveBenchOrder: (fromIdx: number, toIdx: number) => void;
}

const OUTFIELD_KINDS: BenchSlotKey[] = ['bench_o1', 'bench_o2', 'bench_o3'];

export function BenchRow({
  isReadOnly,
  getBenchPlayer,
  benchOrder,
  onSelectBenchSlot,
  onRemoveBenchSlot,
  onMoveBenchOrder,
}: BenchRowProps) {
  const t = useTranslations('fantasy');

  // bench_gk wird separat gerendert (links). bench_o1..3 als Sub-Order-Reihe.
  const gkPlayer = getBenchPlayer('bench_gk');

  return (
    <div className="bg-white/[0.02] border-t border-white/10 px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
          {t('benchTitle')}
        </span>
        <span className="text-[10px] text-white/30">{t('benchSubTitle')}</span>
      </div>

      <div className="flex items-end gap-2 justify-center">
        {/* GK-Bench-Slot (links, separater Akzent) */}
        <BenchSlot
          kind="bench_gk"
          player={gkPlayer}
          isReadOnly={isReadOnly}
          accentColor={getPosAccentColor('GK')}
          subOrder={null}
          label={t('benchGkLabel')}
          onSelect={onSelectBenchSlot}
          onRemove={onRemoveBenchSlot}
        />

        {/* Visual-Separator zwischen GK + Outfield-Bench */}
        <div className="w-px h-9 bg-white/10 mx-1" aria-hidden="true" />

        {/* 3 Outfield-Bench-Slots in Sub-Order-Reihenfolge */}
        {OUTFIELD_KINDS.map((kind, idx) => {
          const player = getBenchPlayer(kind);
          // Sub-Order: bench_order[idx] = 1-basierte Position in der Sub-Reihenfolge
          const subPriority = benchOrder[idx] ?? idx + 1;

          return (
            <div key={kind} className="flex flex-col items-center gap-0.5">
              <BenchSlot
                kind={kind}
                player={player}
                isReadOnly={isReadOnly}
                accentColor={player ? getPosAccentColor(player.pos as Pos) : '#94a3b8'}
                subOrder={subPriority}
                label={t('benchOutfieldLabel', { n: idx + 1 })}
                onSelect={onSelectBenchSlot}
                onRemove={onRemoveBenchSlot}
              />
              {/* Up/Down Move-Buttons (nur wenn nicht read-only und mehr als 1 Slot) */}
              {!isReadOnly && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onMoveBenchOrder(idx, idx - 1)}
                    disabled={idx === 0}
                    aria-label={t('benchMoveUp')}
                    className={cn(
                      'p-1.5 rounded min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors',
                      idx === 0
                        ? 'opacity-20 cursor-not-allowed'
                        : 'hover:bg-white/10 text-white/50 hover:text-white/80',
                    )}
                  >
                    <ChevronUp aria-hidden="true" className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveBenchOrder(idx, idx + 1)}
                    disabled={idx === OUTFIELD_KINDS.length - 1}
                    aria-label={t('benchMoveDown')}
                    className={cn(
                      'p-1.5 rounded min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors',
                      idx === OUTFIELD_KINDS.length - 1
                        ? 'opacity-20 cursor-not-allowed'
                        : 'hover:bg-white/10 text-white/50 hover:text-white/80',
                    )}
                  >
                    <ChevronDown aria-hidden="true" className="size-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface BenchSlotProps {
  kind: BenchSlotKey;
  player: UserDpcHolding | null;
  isReadOnly: boolean;
  accentColor: string;
  /** 1-basierte Sub-Order (nur fuer Outfield), null fuer GK-Bench. */
  subOrder: number | null;
  label: string;
  onSelect: (kind: BenchSlotKey) => void;
  onRemove: (kind: BenchSlotKey) => void;
}

function BenchSlot({ kind, player, isReadOnly, accentColor, subOrder, label, onSelect, onRemove }: BenchSlotProps) {
  const t = useTranslations('fantasy');

  const handleClick = () => {
    if (isReadOnly) return;
    if (player) {
      onRemove(kind);
    } else {
      onSelect(kind);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Sub-Order Badge (nur Outfield) */}
      {subOrder !== null && (
        <div
          className="absolute -top-1.5 -left-1.5 z-30 size-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[9px] font-mono font-black text-white/70"
          aria-label={t('benchSubOrderLabel', { order: subOrder })}
        >
          {subOrder}
        </div>
      )}
      {/* Remove icon (nur wenn Spieler + nicht read-only) — top-right */}
      {player && !isReadOnly && (
        <div className="absolute -top-1.5 -right-1.5 z-30 size-4 rounded-full bg-red-500/80 flex items-center justify-center pointer-events-none">
          <XIcon aria-hidden="true" className="size-2.5 text-white" />
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isReadOnly}
        aria-label={player ? t('benchRemoveSlot', { label }) : t('benchEmptySlot', { label })}
        className={cn(
          'flex flex-col items-center transition-colors',
          isReadOnly ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <div
          className={cn(
            'size-9 rounded-full flex items-center justify-center border-2 overflow-hidden',
            player ? 'bg-black/30' : 'bg-surface-base border-dashed hover:brightness-125',
          )}
          style={{ borderColor: player ? accentColor : `${accentColor}60` }}
        >
          {player ? (
            <PlayerPhoto
              imageUrl={player.imageUrl}
              first={player.first}
              last={player.last}
              pos={player.pos as Pos}
              size={32}
            />
          ) : (
            <Plus aria-hidden="true" className="size-3.5 text-white/30" />
          )}
        </div>
        <div
          className="text-[9px] mt-0.5 font-medium truncate max-w-[60px]"
          style={{ color: player ? `${accentColor}cc` : `${accentColor}70` }}
        >
          {player ? player.last.slice(0, 7) : label}
        </div>
      </button>
    </div>
  );
}
