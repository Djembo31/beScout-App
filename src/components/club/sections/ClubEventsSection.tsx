'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import { FillBar } from '@/components/fantasy/events/FillBar';
import type { DbEvent } from '@/types';

type Props = {
  events: DbEvent[];
  clubColor: string;
};

export function ClubEventsSection({ events, clubColor }: Props) {
  const t = useTranslations('club');

  const openEvents = events
    .filter(e => e.status === 'registering' || e.status === 'upcoming' || e.status === 'running' || e.status === 'late-reg')
    .slice(0, 3);

  if (openEvents.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-5" style={{ color: clubColor }} />
          <h2 className="font-black text-balance">{t('clubEvents')}</h2>
        </div>
        <Link href="/fantasy" className="text-xs text-gold font-semibold hover:text-gold/80 transition-colors">
          {t('viewAll')}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {openEvents.map(event => {
          const isFree = event.entry_fee === 0;
          return (
            <Link
              key={event.id}
              href="/fantasy"
              className={cn(
                'rounded-2xl p-3 border transition-colors',
                'bg-surface-minimal border-white/10 hover:border-white/20 active:scale-[0.98]',
                'shadow-card-sm hover:shadow-card-md'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                  event.status === 'running' || event.status === 'late-reg'
                    ? 'bg-green-500/15 text-green-500'
                    : 'bg-white/[0.06] text-white/50'
                )}>
                  {event.status === 'running' ? t('statusLive') : event.status === 'registering' ? t('statusOpen') : event.status === 'upcoming' ? t('statusUpcoming') : event.status === 'late-reg' ? t('statusLateReg') : event.status.toUpperCase()}
                </span>
                {event.gameweek && (
                  <span className="text-[10px] text-white/40 font-mono">GW {event.gameweek}</span>
                )}
              </div>
              <div className="font-bold text-sm line-clamp-2 mb-2">{event.name}</div>
              <div className="flex items-center gap-3 text-xs text-white/50 mb-2">
                <span className={isFree ? 'text-green-500 font-bold' : 'text-gold font-mono tabular-nums'}>
                  {isFree ? t('freeEntry') : fmtScout(event.entry_fee)}
                </span>
                <span className="text-white/30">|</span>
                <span className="font-mono tabular-nums">{fmtScout(event.prize_pool)} bCredits</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                <Users className="size-3" />
                <span className="font-mono tabular-nums">
                  {event.current_entries}{event.max_entries ? ` / ${event.max_entries}` : ''}
                </span>
              </div>
              {event.max_entries && (
                <div className="mt-2">
                  <FillBar current={event.current_entries} max={event.max_entries} variant="mini" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
