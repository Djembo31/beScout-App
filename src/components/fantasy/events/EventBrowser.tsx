'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy, Sparkles, Building2, Gift, UserPlus, Star, Globe, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, EventType } from '../types';
import { EventCompactRow } from './EventCompactRow';

type EventCategory = 'all' | EventType;

const CATEGORIES: { id: EventCategory; labelKey: string; icon: typeof Trophy }[] = [
  { id: 'all', labelKey: 'all', icon: Globe },
  { id: 'bescout', labelKey: 'bescout', icon: Sparkles },
  { id: 'sponsor', labelKey: 'sponsor', icon: Gift },
  { id: 'club', labelKey: 'club', icon: Building2 },
  { id: 'creator', labelKey: 'creator', icon: UserPlus },
  { id: 'special', labelKey: 'special', icon: Star },
];

type Props = {
  events: FantasyEvent[];
  onEventClick: (event: FantasyEvent) => void;
};

export function EventBrowser({ events, onEventClick }: Props) {
  const t = useTranslations('fantasy');
  const [category, setCategory] = useState<EventCategory>('all');
  const [showEnded, setShowEnded] = useState(false);

  const filtered = useMemo(() => {
    if (category === 'all') return events;
    return events.filter(e => e.type === category);
  }, [events, category]);

  const counts = useMemo(() => {
    const map: Record<EventCategory, number> = { all: events.length, bescout: 0, sponsor: 0, club: 0, creator: 0, special: 0 };
    for (const e of events) {
      if (e.type in map) map[e.type as EventType]++;
    }
    return map;
  }, [events]);

  // Group by status
  const activeEvents = useMemo(() =>
    filtered.filter(e => e.status === 'running' || e.status === 'late-reg')
      .sort((a, b) => (a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1)),
    [filtered]
  );
  const openEvents = useMemo(() =>
    filtered.filter(e => e.status === 'registering' || e.status === 'upcoming')
      .sort((a, b) => a.lockTime - b.lockTime),
    [filtered]
  );
  const endedEvents = useMemo(() =>
    filtered.filter(e => e.status === 'ended'),
    [filtered]
  );

  return (
    <section className="space-y-3">
      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
        {CATEGORIES.map(cat => {
          const count = counts[cat.id];
          const isActive = category === cat.id;
          const Icon = cat.icon;
          if (cat.id !== 'all' && count === 0) return null;

          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-gold/15 text-gold border border-gold/20'
                  : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70'
              )}
            >
              <Icon className="size-3" aria-hidden="true" />
              <span>{t(`eventCategories.${cat.labelKey}`)}</span>
              <span className={cn('text-[9px] font-mono', isActive ? 'text-gold/60' : 'text-white/20')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Trophy className="size-10 mx-auto mb-3 text-white/15" aria-hidden="true" />
          <div className="text-sm text-white/40">{t('noEventsForCategory')}</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Active (LIVE + Late-Reg) — highlighted group */}
          {activeEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <div className="size-1.5 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">{t('eventsActiveGroup')}</span>
              </div>
              <div className="rounded-xl border border-green-500/15 bg-green-500/[0.02] divide-y divide-white/[0.04] overflow-hidden">
                {activeEvents.map(event => (
                  <EventCompactRow key={event.id} event={event} onClick={() => onEventClick(event)} />
                ))}
              </div>
            </div>
          )}

          {/* Open registration */}
          {openEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{t('eventsOpenGroup')}</span>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04] overflow-hidden">
                {openEvents.map(event => (
                  <EventCompactRow key={event.id} event={event} onClick={() => onEventClick(event)} />
                ))}
              </div>
            </div>
          )}

          {/* Ended — collapsed by default */}
          {endedEvents.length > 0 && (
            <div>
              <button
                onClick={() => setShowEnded(!showEnded)}
                className="flex items-center gap-1.5 px-1 pb-1.5 w-full text-left"
              >
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{t('eventsEndedGroup')}</span>
                <span className="text-[9px] text-white/20 font-mono tabular-nums">{endedEvents.length}</span>
                {showEnded ? (
                  <ChevronUp className="size-3 text-white/20 ml-auto" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-3 text-white/20 ml-auto" aria-hidden="true" />
                )}
              </button>
              {showEnded && (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] divide-y divide-white/[0.04] overflow-hidden opacity-60">
                  {endedEvents.map(event => (
                    <EventCompactRow key={event.id} event={event} onClick={() => onEventClick(event)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
