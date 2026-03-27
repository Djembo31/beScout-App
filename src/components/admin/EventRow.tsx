'use client';

import { Pencil } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { EventStatusBadge } from './EventStatusBadge';
import { INTERACTIVE } from './hooks/types';
import type { AdminEvent } from './hooks/types';

interface EventRowProps {
  event: AdminEvent;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  statusLabel: string;
  selectEventLabel?: string;
  editEventLabel?: string;
}

export function EventRow({
  event,
  isSelected,
  onToggleSelect,
  onEdit,
  statusLabel,
  selectEventLabel = 'Event auswaehlen',
  editEventLabel = 'Event bearbeiten',
}: EventRowProps) {
  const clubName = (event.clubs as { name: string; slug: string } | null)?.name ?? 'Global';

  return (
    <Card
      className={cn('p-3 md:p-4 transition-colors', isSelected && 'border-gold/30 bg-gold/[0.03]')}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <label className="flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`${selectEventLabel}: ${event.name}`}
            className="size-4 accent-gold cursor-pointer"
          />
        </label>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold truncate">{event.name}</span>
            <span className="text-xs text-white/30">{clubName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
            {event.gameweek != null && (
              <span className="font-mono tabular-nums">GW {event.gameweek}</span>
            )}
            <span className="font-mono tabular-nums">
              {event.current_entries}/{event.max_entries ?? '\u221E'}
            </span>
            <span className="font-mono tabular-nums text-gold/70">
              {fmtScout(centsToBsd(event.prize_pool))} CR
            </span>
          </div>
        </div>

        {/* Status badge */}
        <EventStatusBadge status={event.status} label={statusLabel} />

        {/* Edit button */}
        <button
          onClick={onEdit}
          aria-label={`${editEventLabel}: ${event.name}`}
          className={cn(
            'flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl',
            INTERACTIVE,
          )}
        >
          <Pencil className="size-4 text-white/40" aria-hidden="true" />
        </button>
      </div>
    </Card>
  );
}
