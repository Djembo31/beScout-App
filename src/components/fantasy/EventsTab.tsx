'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy, Sparkles, Building2, Gift, UserPlus, Star, Globe,
  Users, CheckCircle2, ChevronRight, Lock, Play,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, EventType } from './types';
import { getStatusStyle, getTypeStyle, formatCountdown } from './helpers';

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
};

/** Compact event row — matches visual density of FixtureCards */
function EventRow({ event, onClick }: { event: FantasyEvent; onClick: () => void }) {
  const typeStyle = getTypeStyle(event.type);
  const statusStyle = getStatusStyle(event.status);
  const TypeIcon = typeStyle.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 min-h-[56px] rounded-xl border transition-all text-left ${
        event.isJoined
          ? 'bg-[#22C55E]/[0.04] border-[#22C55E]/20 hover:border-[#22C55E]/30'
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      {/* Type icon */}
      <div className={`flex-shrink-0 p-1.5 rounded-lg ${typeStyle.bg}`}>
        <TypeIcon className={`w-4 h-4 ${typeStyle.color}`} />
      </div>

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{event.name}</span>
          {event.sponsorName && (
            <span className="text-[9px] text-sky-400/60 font-medium truncate hidden sm:inline">
              {event.sponsorName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/35 mt-0.5">
          <span>{event.format}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" />
            {event.participants}{event.maxParticipants ? `/${event.maxParticipants}` : ''}
          </span>
          <span>·</span>
          <span>{event.buyIn === 0 ? 'Kostenlos' : `${event.buyIn} $SCOUT`}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {event.isJoined ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#22C55E]/15">
            <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
            <span className="text-[10px] font-bold text-[#22C55E] hidden sm:inline">Dabei</span>
          </div>
        ) : event.status === 'running' ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#22C55E]/15">
            <Play className="w-3 h-3 text-[#22C55E]" />
            <span className="text-[10px] font-bold text-[#22C55E]">LIVE</span>
          </div>
        ) : event.status === 'ended' ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10">
            <Lock className="w-3 h-3 text-white/40" />
          </div>
        ) : (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${statusStyle.bg}/15`}>
            {statusStyle.pulse && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            <span className="text-[10px] font-bold text-white/50">{formatCountdown(event.lockTime)}</span>
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>
    </button>
  );
}

export function EventsTab({
  events,
  onEventClick,
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
    <div className="space-y-3">
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

      {/* Event list — compact rows */}
      {filteredEvents.length > 0 ? (
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
        <Card className="p-10 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-white/15" />
          <div className="text-sm text-white/40">{t('noEventsForCategory')}</div>
        </Card>
      )}
    </div>
  );
}
