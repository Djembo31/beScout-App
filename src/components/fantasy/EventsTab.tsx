'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { FantasyEvent } from './types';
import { EventPulse } from './events/EventPulse';
import { EventSpotlight } from './events/EventSpotlight';
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

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">🏆</div>
        <div className="text-sm font-semibold text-white/40">{t('noEventsForGameweek', { gw: '' })}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone 1: Pulse — GW event stats at a glance */}
      <EventPulse events={events} />

      {/* Zone 2: Spotlight — LIVE + Late-Reg horizontal cards */}
      <EventSpotlight events={events} onEventClick={onEventClick} />

      {/* Zone 3: Browser — Category filter + status-grouped list */}
      <EventBrowser events={events} onEventClick={onEventClick} />
    </div>
  );
}
