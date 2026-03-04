'use client';

import React from 'react';
import { Radio, Play, Plus, Edit3, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { FantasyEvent } from '../types';
import { getTypeStyle } from '../helpers';

type Props = {
  events: FantasyEvent[];
  onEventClick: (event: FantasyEvent) => void;
};

export function EventSpotlight({ events, onEventClick }: Props) {
  const t = useTranslations('fantasy');

  // Only LIVE + late-reg events
  const activeEvents = events.filter(e => e.status === 'running' || e.status === 'late-reg');

  if (activeEvents.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Radio className="size-4 text-green-500" aria-hidden="true" />
        <h2 className="text-sm font-black uppercase tracking-wider text-balance">{t('eventsLiveNow')}</h2>
        <div className="size-1.5 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {activeEvents.map(event => {
          const typeStyle = getTypeStyle(event.type);
          const TypeIcon = typeStyle.icon;
          const isLive = event.status === 'running';
          const isLateReg = event.status === 'late-reg';

          return (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className={cn(
                'flex-shrink-0 w-[200px] snap-start rounded-xl p-3 card-carbon-mini border transition-colors text-left active:scale-[0.98]',
                isLive ? 'border-green-500/30 live-glow' : 'border-orange-500/30',
                event.isJoined && 'bg-green-500/[0.03]'
              )}
            >
              {/* Header: type + status */}
              <div className="flex items-center justify-between mb-2">
                <div className={cn('size-7 rounded-lg flex items-center justify-center', typeStyle.bg)}>
                  <TypeIcon className={cn('size-3.5', typeStyle.color)} aria-hidden="true" />
                </div>
                <div className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded',
                  isLive ? 'bg-green-500/15' : 'bg-orange-500/15'
                )}>
                  <div className={cn(
                    'size-1.5 rounded-full animate-pulse motion-reduce:animate-none',
                    isLive ? 'bg-green-500' : 'bg-orange-500'
                  )} />
                  <span className={cn(
                    'text-[9px] font-bold',
                    isLive ? 'text-green-500' : 'text-orange-400'
                  )}>
                    {isLive ? 'LIVE' : 'Late Reg'}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div className="font-bold text-xs truncate mb-1">{event.name}</div>

              {/* Meta */}
              <div className="flex items-center gap-1.5 text-[9px] text-white/40 mb-3">
                <span>{event.format}</span>
                <span className="text-white/15">·</span>
                <span>{event.participants} {t('playersCountLabel')}</span>
                <span className="text-white/15">·</span>
                <span className={event.buyIn === 0 ? 'text-green-500' : 'text-gold'}>
                  {event.buyIn === 0 ? t('freeEntry') : `${event.buyIn}`}
                </span>
              </div>

              {/* Rank or CTA */}
              {event.isJoined && event.userRank ? (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-green-500">{t('yourRank')}</span>
                  <span className="font-mono font-bold text-green-500 text-xs tabular-nums">#{event.userRank}</span>
                </div>
              ) : event.isJoined ? (
                <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold">
                  {event.status === 'running' ? (
                    <><Lock className="size-3" aria-hidden="true" /> {t('eventJoined')}</>
                  ) : (
                    <><Edit3 className="size-3" aria-hidden="true" /> {t('lineupBtn')}</>
                  )}
                </div>
              ) : isLateReg ? (
                <div className="flex items-center gap-1.5 text-[10px] text-gold font-bold">
                  <Plus className="size-3" aria-hidden="true" />
                  {event.buyIn === 0 ? t('joinBtn') : `${event.buyIn} $SCOUT`}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold">
                  <Play className="size-3" aria-hidden="true" /> {t('runningBtn')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
