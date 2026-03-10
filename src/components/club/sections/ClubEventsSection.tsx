'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EventCardView } from '@/components/fantasy/events/EventCardView';
import type { FantasyEvent } from '@/components/fantasy/types';

type Props = {
  events: FantasyEvent[];
  clubColor: string;
  onEventClick: (event: FantasyEvent) => void;
};

export function ClubEventsSection({ events, clubColor, onEventClick }: Props) {
  const t = useTranslations('club');

  const openEvents = events
    .filter(e => e.status === 'registering' || e.status === 'upcoming' || e.status === 'running' || e.status === 'late-reg')
    .slice(0, 3);

  if (openEvents.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="size-5" style={{ color: clubColor }} />
        <h2 className="font-black text-balance">{t('clubEvents')}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {openEvents.map(event => (
          <EventCardView key={event.id} event={event} onClick={() => onEventClick(event)} />
        ))}
      </div>
    </section>
  );
}
