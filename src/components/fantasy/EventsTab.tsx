'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy, Sparkles, Building2, Gift, UserPlus, Star, Globe,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, EventType } from './types';
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
  onToggleInterest: (eventId: string) => void;
};

export function EventsTab({
  events,
  onEventClick,
  onToggleInterest,
}: EventsTabProps) {
  const t = useTranslations('fantasy');
  const [category, setCategory] = useState<EventCategory>('all');

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    if (category !== 'all') {
      filtered = filtered.filter(e => e.type === category);
    }
    // Sort: running/late-reg first, then registering, then upcoming, then ended
    const statusOrder: Record<string, number> = { 'late-reg': 0, 'running': 1, 'registering': 2, 'upcoming': 3, 'ended': 4 };
    filtered.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));
    return filtered;
  }, [events, category]);

  // Counts per category
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
    <div className="space-y-4">
      {/* Category filter pills — scrollable */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {CATEGORIES.map(cat => {
          const count = counts[cat.id];
          const isActive = category === cat.id;
          const Icon = cat.icon;
          // Hide categories with 0 events (except 'all')
          if (cat.id !== 'all' && count === 0) return null;

          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/20'
                  : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t(`eventCategories.${cat.labelKey}`)}</span>
              <span className={`text-[10px] font-mono ${isActive ? 'text-[#FFD700]/60' : 'text-white/25'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Event grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onView={() => onEventClick(event)}
              onToggleInterest={() => onToggleInterest(event.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-white/15" />
          <div className="text-sm text-white/40">{t('noEventsForCategory')}</div>
        </Card>
      )}
    </div>
  );
}
