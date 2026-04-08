'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Calendar, Trophy, Users, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { formatCountdown } from '@/features/fantasy/helpers';
import { useManagerStore } from '../../store/managerStore';
import { useOpenEvents, pickDefaultEvent } from '../../queries/eventQueries';
import type { FantasyEvent } from '@/features/fantasy/types';

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  running: { label: 'LIVE', bg: 'bg-rose-500/15', text: 'text-rose-300' },
  registering: { label: 'REG', bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  'late-reg': { label: 'LATE', bg: 'bg-amber-500/15', text: 'text-amber-300' },
  upcoming: { label: 'SOON', bg: 'bg-sky-500/15', text: 'text-sky-300' },
  ended: { label: 'END', bg: 'bg-white/10', text: 'text-white/40' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.upcoming;
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

function EventRow({ event, selected, onSelect }: {
  event: FantasyEvent;
  selected: boolean;
  onSelect: () => void;
}) {
  const fillPct = event.maxParticipants ? Math.round((event.participants / event.maxParticipants) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-3 min-h-[64px] border-b border-white/[0.06] transition-colors',
        selected ? 'bg-gold/[0.08] border-l-2 border-l-gold' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusBadge status={event.status} />
        {event.gameweek != null && (
          <span className="text-[10px] font-mono tabular-nums text-white/40">
            GW {event.gameweek}
          </span>
        )}
        <span className="text-sm font-bold text-white truncate flex-1">{event.name}</span>
        {event.isJoined && (
          <span className="text-[9px] font-bold text-emerald-400">DABEI</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-white/50 font-mono tabular-nums">
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden="true" />
          {formatCountdown(event.startTime)}
        </span>
        {event.prizePool > 0 && (
          <span className="flex items-center gap-1 text-gold/80">
            <Trophy className="size-3" aria-hidden="true" />
            {fmtScout(event.prizePool)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="size-3" aria-hidden="true" />
          {event.participants}
          {event.maxParticipants ? `/${event.maxParticipants}` : ''}
          {event.maxParticipants && (
            <span className="text-white/30">· {fillPct}%</span>
          )}
        </span>
      </div>
    </button>
  );
}

export default function EventSelector() {
  const t = useTranslations('manager');
  const [open, setOpen] = useState(false);
  const selectedEventId = useManagerStore((s) => s.selectedEventId);
  const setSelectedEventId = useManagerStore((s) => s.setSelectedEventId);

  const { events, isLoading } = useOpenEvents();

  // Resolve selected event with auto-pick fallback. Single useMemo —
  // returning the event object is enough; consumers derive id from event.id.
  const selectedEvent = useMemo<FantasyEvent | null>(() => {
    if (selectedEventId) {
      const found = events.find((e) => e.id === selectedEventId);
      if (found) return found;
    }
    return pickDefaultEvent(events);
  }, [selectedEventId, events]);

  const effectiveSelectedId = selectedEvent?.id ?? null;

  const handleSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="h-14 w-full rounded-xl bg-white/[0.02] border border-white/10 animate-pulse motion-reduce:animate-none" />
    );
  }

  if (events.length === 0) {
    return (
      <div className="px-4 py-4 rounded-xl bg-white/[0.02] border border-white/10 text-center text-sm text-white/40">
        {t('noOpenEvents')}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors min-h-[56px] active:scale-[0.99]"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
        aria-label={t('selectEvent')}
      >
        <Calendar className="size-4 text-gold flex-shrink-0" aria-hidden="true" />
        {selectedEvent ? (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-0.5">
                <StatusBadge status={selectedEvent.status} />
                <span className="text-sm font-bold text-white truncate">{selectedEvent.name}</span>
              </div>
              <div className="text-[10px] text-white/40 font-mono tabular-nums">
                {selectedEvent.gameweek != null ? `GW ${selectedEvent.gameweek} · ` : ''}
                {formatCountdown(selectedEvent.startTime)}
              </div>
            </div>
          </>
        ) : (
          <span className="flex-1 text-sm text-white/50">
            {t('selectEvent')}
          </span>
        )}
        <ChevronDown className="size-4 text-white/40 flex-shrink-0" aria-hidden="true" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('selectEvent')}
        size="md"
      >
        <div className="-mx-4 md:-mx-5 max-h-[60vh] overflow-y-auto">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              selected={event.id === effectiveSelectedId}
              onSelect={() => handleSelect(event.id)}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
