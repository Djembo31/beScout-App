'use client';

import React from 'react';
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { FantasyEvent } from '../types';
import { getTypeStyle, formatCountdown } from '../helpers';

type Props = {
  event: FantasyEvent;
  onClick: () => void;
};

export function EventCompactRow({ event, onClick }: Props) {
  const t = useTranslations('fantasy');
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left active:scale-[0.98]',
        event.isJoined && 'bg-green-500/[0.03]'
      )}
      style={{ borderLeftWidth: '2px', borderLeftColor: typeStyle.color === 'text-gold' ? '#FFD700' : typeStyle.color === 'text-green-500' ? '#22c55e' : typeStyle.color === 'text-sky-400' ? '#38bdf8' : typeStyle.color === 'text-orange-400' ? '#fb923c' : typeStyle.color === 'text-purple-400' ? '#c084fc' : 'rgba(255,255,255,0.1)' }}
    >
      {/* Type icon */}
      <div className={cn('flex-shrink-0 size-8 rounded-lg flex items-center justify-center', typeStyle.bg)}>
        <TypeIcon className={cn('size-4', typeStyle.color)} aria-hidden="true" />
      </div>

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold">{event.name}</div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-0.5 flex-wrap">
          <span>{event.format}</span>
          <span className="text-white/15">·</span>
          <span>{event.participants}/{event.maxParticipants ?? '∞'}</span>
          <span className="text-white/15">·</span>
          <span className={event.buyIn === 0 ? 'text-green-500' : 'text-gold'}>
            {event.buyIn === 0 ? t('freeEntry') : `${event.buyIn} $SCOUT`}
          </span>
          {event.prizePool > 0 && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-purple-400 font-mono tabular-nums">
                {event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool} Prize
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status + arrow */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {event.isJoined ? (
          <CheckCircle2 className="size-4 text-green-500" aria-hidden="true" />
        ) : event.status === 'running' ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15">
            <div className="size-1.5 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
            <span className="text-[9px] font-bold text-green-500">LIVE</span>
          </div>
        ) : event.status === 'late-reg' ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/15">
            <div className="size-1.5 rounded-full bg-orange-500 animate-pulse motion-reduce:animate-none" />
            <span className="text-[9px] font-bold text-orange-400">Late</span>
          </div>
        ) : event.status === 'ended' ? (
          <Lock className="size-3.5 text-white/25" aria-hidden="true" />
        ) : (
          <span className="text-[10px] font-medium text-white/30 tabular-nums">{formatCountdown(event.lockTime)}</span>
        )}
        <ChevronRight className="size-3.5 text-white/15" aria-hidden="true" />
      </div>
    </button>
  );
}
