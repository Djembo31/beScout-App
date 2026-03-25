'use client';

import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import type { FantasyEvent } from './types';
import type { EventType } from './types';
import { EventPulse } from './events/EventPulse';
import { EventSpotlight } from './events/EventSpotlight';
import { EventCategoryCards } from './events/EventCategoryCards';
import { EventBrowser } from './events/EventBrowser';

type EventsTabProps = {
  events: FantasyEvent[];
  onEventClick: (event: FantasyEvent) => void;
  onToggleInterest?: (eventId: string) => void;
};

export function EventsTab({
  events,
  onEventClick,
}: EventsTabProps) {
  const t = useTranslations('fantasy');
  const [selectedCategory, setSelectedCategory] = useState<EventType | null>(null);

  if (events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Trophy className="size-12 mx-auto mb-4 text-white/20" aria-hidden="true" />
        <div className="text-sm font-semibold text-white/40">{t('noEventsForGameweek', { gw: '' })}</div>
        <div className="text-xs text-white/25 mt-1 max-w-[240px] mx-auto">{t('noEventsHint')}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone 1: Pulse — GW event stats at a glance */}
      <EventPulse events={events} />

      {/* Zone 2: Spotlight — LIVE + Late-Reg horizontal cards */}
      <EventSpotlight events={events} onEventClick={onEventClick} />

      {/* Zone 3: Category Cards — visual type filter */}
      <EventCategoryCards
        events={events}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Zone 4: Browser — status-grouped event list */}
      <EventBrowser events={events} onEventClick={onEventClick} categoryFilter={selectedCategory} />
    </div>
  );
}
