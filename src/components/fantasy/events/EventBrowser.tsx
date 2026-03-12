'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy, Sparkles, Building2, Gift, UserPlus, Star, Globe, CheckCircle2,
  ChevronDown, ChevronUp, LayoutGrid, List,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, EventType, ViewMode } from '../types';
import { EventCompactRow } from './EventCompactRow';
import { EventCardView } from './EventCardView';
import { hasRequirements } from './RequirementChips';

type EventCategory = 'all' | 'eligible' | EventType;

const CATEGORIES: { id: EventCategory; labelKey: string; icon: typeof Trophy }[] = [
  { id: 'all', labelKey: 'all', icon: Globe },
  { id: 'eligible', labelKey: 'eligible', icon: CheckCircle2 },
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
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Hydrate from localStorage in useEffect to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bescout-events-view') as ViewMode | null;
      if (saved) setViewMode(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('bescout-events-view', viewMode);
  }, [viewMode]);

  const filtered = useMemo(() => {
    if (category === 'all') return events;
    if (category === 'eligible') return events.filter(e => !hasRequirements(e));
    return events.filter(e => e.type === category);
  }, [events, category]);

  const counts = useMemo(() => {
    const map: Record<EventCategory, number> = {
      all: events.length,
      eligible: events.filter(e => !hasRequirements(e)).length,
      bescout: 0, sponsor: 0, club: 0, creator: 0, special: 0,
    };
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

  const isCard = viewMode === 'cards';

  const renderEvents = (items: FantasyEvent[]) => {
    if (isCard) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(event => (
            <EventCardView key={event.id} event={event} onClick={() => onEventClick(event)} />
          ))}
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04] overflow-hidden">
        {items.map(event => (
          <EventCompactRow key={event.id} event={event} onClick={() => onEventClick(event)} />
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-3">
      {/* Category filter pills + View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
          {CATEGORIES.map(cat => {
            const count = counts[cat.id];
            const isActive = category === cat.id;
            const Icon = cat.icon;
            if (cat.id !== 'all' && cat.id !== 'eligible' && count === 0) return null;

            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                  isActive
                    ? cat.id === 'eligible' ? 'bg-green-500/15 text-green-500 border border-green-500/20' : 'bg-gold/15 text-gold border border-gold/20'
                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70'
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
                <span>{t(`eventCategories.${cat.labelKey}`)}</span>
                <span className={cn('text-xs font-mono', isActive ? (cat.id === 'eligible' ? 'text-green-500/60' : 'text-gold/60') : 'text-white/20')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex-shrink-0 flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
          <button
            onClick={() => setViewMode('cards')}
            className={cn('p-1.5 rounded-md transition-colors', isCard ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
            aria-label="Kartenansicht"
          >
            <LayoutGrid className="size-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn('p-1.5 rounded-md transition-colors', !isCard ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
            aria-label="Listenansicht"
          >
            <List className="size-3.5" aria-hidden="true" />
          </button>
        </div>
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
                <span className="text-xs font-bold text-green-500 uppercase tracking-wider">{t('eventsActiveGroup')}</span>
              </div>
              {isCard ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeEvents.map(event => (
                    <EventCardView key={event.id} event={event} onClick={() => onEventClick(event)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-green-500/15 bg-green-500/[0.02] divide-y divide-white/[0.04] overflow-hidden">
                  {activeEvents.map(event => (
                    <EventCompactRow key={event.id} event={event} onClick={() => onEventClick(event)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Open registration */}
          {openEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{t('eventsOpenGroup')}</span>
              </div>
              {renderEvents(openEvents)}
            </div>
          )}

          {/* Ended — collapsed by default */}
          {endedEvents.length > 0 && (
            <div>
              <button
                onClick={() => setShowEnded(!showEnded)}
                className="flex items-center gap-1.5 px-1 pb-1.5 w-full text-left"
                aria-expanded={showEnded}
              >
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider">{t('eventsEndedGroup')}</span>
                <span className="text-xs text-white/20 font-mono tabular-nums">{endedEvents.length}</span>
                {showEnded ? (
                  <ChevronUp className="size-3 text-white/20 ml-auto" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-3 text-white/20 ml-auto" aria-hidden="true" />
                )}
              </button>
              {showEnded && (
                <div className="opacity-60">
                  {renderEvents(endedEvents)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
