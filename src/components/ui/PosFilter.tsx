'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Pos } from '@/types';

const POS_COLORS: Record<Pos, { bg: string; border: string; text: string }> = {
  GK: { bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-300' },
  DEF: { bg: 'bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-300' },
  MID: { bg: 'bg-sky-500/20', border: 'border-sky-400', text: 'text-sky-300' },
  ATT: { bg: 'bg-rose-500/20', border: 'border-rose-400', text: 'text-rose-300' },
};

const POSITIONS: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];

// ── Multi-select mode ──

interface PosFilterMultiProps {
  multi: true;
  selected: Set<Pos>;
  onChange: (pos: Pos) => void;
  counts?: Partial<Record<Pos, number>>;
  className?: string;
}

// ── Single-select mode ──

interface PosFilterSingleProps {
  multi?: false;
  selected: Pos | 'ALL';
  onChange: (pos: Pos | 'ALL') => void;
  counts?: Partial<Record<string, number>>;
  showAll?: boolean;
  allCount?: number;
  className?: string;
}

export type PosFilterProps = PosFilterMultiProps | PosFilterSingleProps;

export function PosFilter(props: PosFilterProps) {
  const { counts, className = '' } = props;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* "Alle" button for single-select mode */}
      {!props.multi && props.showAll && (
        <button
          onClick={() => (props as PosFilterSingleProps).onChange('ALL')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-black border transition-all',
            props.selected === 'ALL'
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
          )}
        >
          Alle
          {props.allCount != null && <span className="ml-1 text-white/30">{props.allCount}</span>}
        </button>
      )}
      {POSITIONS.map(pos => {
        const c = POS_COLORS[pos];
        const active = props.multi
          ? props.selected.has(pos)
          : props.selected === pos;
        const count = counts?.[pos];

        return (
          <button
            key={pos}
            onClick={() => props.onChange(pos)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-black border transition-all',
              active
                ? `${c.bg} ${c.border} ${c.text}`
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
            )}
          >
            {pos}
            {count != null && <span className="ml-1 text-white/30">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
