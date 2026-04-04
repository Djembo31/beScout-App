'use client';

import React from 'react';
import { Calendar, Radio, DoorOpen, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import type { FantasyEvent } from '../types';

type Props = {
  events: FantasyEvent[];
};

export function EventPulse({ events }: Props) {
  const tf = useTranslations('fantasy');

  const total = events.length;
  const liveCount = events.filter(e => e.status === 'running' || e.status === 'late-reg').length;
  const openCount = events.filter(e => e.status === 'registering' || e.status === 'upcoming').length;
  const joinedCount = events.filter(e => e.isJoined).length;

  if (total === 0) return null;

  return (
    <Card surface="elevated" className="rounded-2xl overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {/* Total */}
        <div className="p-3 text-center border-r border-divider">
          <Calendar className="size-4 text-white/40 mx-auto mb-1" aria-hidden="true" />
          <div className="text-xl font-black tabular-nums">{total}</div>
          <div className="text-xs text-white/40">{tf('eventsTotal')}</div>
        </div>

        {/* Open */}
        <div className="p-3 text-center sm:border-r sm:border-divider">
          <DoorOpen className="size-4 text-sky-400 mx-auto mb-1" aria-hidden="true" />
          <div className="text-xl font-black tabular-nums text-sky-400">{openCount}</div>
          <div className="text-xs text-white/40">{tf('eventsOpenCount')}</div>
        </div>

        {/* LIVE */}
        <div className={`p-3 text-center border-t border-r border-divider sm:border-t-0 ${liveCount > 0 ? 'status-live' : ''}`}>
          <Radio className="size-4 text-green-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-xl font-black tabular-nums text-green-500">{liveCount}</div>
          <div className="text-xs text-white/40">LIVE</div>
        </div>

        {/* Joined */}
        <div className={`p-3 text-center border-t border-divider sm:border-t-0 ${joinedCount > 0 ? 'bg-gold/[0.03]' : ''}`}>
          <CheckCircle2 className="size-4 text-gold mx-auto mb-1" aria-hidden="true" />
          <div className="text-xl font-black tabular-nums text-gold">{joinedCount}</div>
          <div className="text-xs text-white/40">{tf('eventsJoinedCount')}</div>
        </div>
      </div>

      <div className="floodlight-divider" />
    </Card>
  );
}
