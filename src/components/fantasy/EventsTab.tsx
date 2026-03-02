'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy, Sparkles, Building2, Gift, UserPlus, Star, Globe,
  CheckCircle2, ChevronRight, Lock, LayoutGrid, List,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, EventType, ViewMode } from './types';
import { getTypeStyle, formatCountdown } from './helpers';
import { EventCard } from './EventCard';

type EventCategory = 'all' | EventType;

const CATEGORIES: { id: EventCategory; labelKey: string; icon: typeof Trophy }[] = [
  { id: 'all', labelKey: 'all', icon: Globe },
  { id: 'bescout', labelKey: 'bescout', icon: Sparkles },
  { id: 'sponsor', labelKey: 'sponsor', icon: Gift },
  { id: 'club', labelKey: 'club', icon: Building2 },
  { id: 'creator', labelKey: 'creator', icon: UserPlus },
  { id: 'special', labelKey: 'special', icon: Star },
];

type EventsTabProps = {
  events: FantasyEvent[];
  onEventClick: (event: FantasyEvent) => void;
  onToggleInterest?: (eventId: string) => void;
};

/** Event row — same density as Kader FullPlayerRow (gap-2.5, px-3, py-2.5) */
function EventRow({ event, onClick }: { event: FantasyEvent; onClick: () => void }) {
  const t = useTranslations('fantasy');
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors text-left active:scale-[0.98]',
        event.isJoined
          ? 'bg-green-500/[0.04] border-green-500/20'
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
      )}
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
          <span>{event.buyIn === 0 ? t('freeEntry') : `${event.buyIn} $SCOUT`}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {event.isJoined ? (
          <CheckCircle2 className="size-4 text-green-500" aria-hidden="true" />
        ) : event.status === 'running' ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15">
            <div className="size-1.5 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
            <span className="text-[9px] font-bold text-green-500">LIVE</span>
          </div>
        ) : event.status === 'ended' ? (
          <Lock className="size-3.5 text-white/25" aria-hidden="true" />
        ) : (
          <span className="text-[10px] font-medium text-white/30">{formatCountdown(event.lockTime)}</span>
        )}
        <ChevronRight className="size-3.5 text-white/15" aria-hidden="true" />
      </div>
    </button>
  );
}

export function EventsTab({
  events,
  onEventClick,
  onToggleInterest,
}: EventsTabProps) {
  const t = useTranslations('fantasy');
  const [category, setCategory] = useState<EventCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    if (category !== 'all') {
      filtered = filtered.filter(e => e.type === category);
    }
    const statusOrder: Record<string, number> = { 'late-reg': 0, 'running': 1, 'registering': 2, 'upcoming': 3, 'ended': 4 };
    filtered.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));
    return filtered;
  }, [events, category]);

  const counts = useMemo(() => {
    const map: Record<EventCategory, number> = {
      all: events.length,
      bescout: 0,
      sponsor: 0,
      club: 0,
      creator: 0,
      special: 0,
    };
    for (const e of events) {
      if (e.type in map) map[e.type as EventType]++;
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-3">
      {/* Header: Category pills + View toggle */}
      <div className="flex items-center gap-2">
        {/* Category filter pills — scrollable */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
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

        {/* View mode toggle */}
        <div className="flex-shrink-0 flex items-center bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('table')}
            aria-label="Listenansicht"
            className={cn('p-1.5 rounded transition-colors', viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
          >
            <List className="size-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            aria-label="Kartenansicht"
            className={cn('p-1.5 rounded transition-colors', viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
          >
            <LayoutGrid className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Event list or cards */}
      {filteredEvents.length > 0 ? (
        viewMode === 'table' ? (
          <div className="space-y-1.5">
            {filteredEvents.map(event => (
              <EventRow
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onView={() => onEventClick(event)}
                onToggleInterest={() => onToggleInterest?.(event.id)}
              />
            ))}
          </div>
        )
      ) : (
        <Card className="p-10 text-center">
          <Trophy className="size-10 mx-auto mb-3 text-white/15" aria-hidden="true" />
          <div className="text-sm text-white/40">{t('noEventsForCategory')}</div>
        </Card>
      )}
    </div>
  );
}
