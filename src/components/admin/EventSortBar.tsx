'use client';

import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SORT_LABELS, INTERACTIVE } from './hooks/types';
import type { SortField } from './hooks/types';

interface EventSortBarProps {
  sortField: SortField;
  sortAsc: boolean;
  onToggle: (field: SortField) => void;
  eventCount: number;
}

export function EventSortBar({ sortField, sortAsc, onToggle, eventCount }: EventSortBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/30 mr-1">Sortierung:</span>
      {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([field, label]) => (
        <button
          key={field}
          onClick={() => onToggle(field)}
          aria-label={`Sortieren nach ${label}`}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium min-h-[44px]',
            INTERACTIVE,
            sortField === field
              ? 'bg-gold/10 text-gold border border-gold/20'
              : 'text-white/40 bg-surface-minimal border border-white/[0.06]',
          )}
        >
          {label}
          <ArrowUpDown className="size-3" aria-hidden="true" />
          {sortField === field && (
            <span className="text-[10px]">{sortAsc ? '\u2191' : '\u2193'}</span>
          )}
        </button>
      ))}
      <span className="ml-auto text-xs text-white/30 font-mono tabular-nums">{eventCount} Events</span>
    </div>
  );
}
