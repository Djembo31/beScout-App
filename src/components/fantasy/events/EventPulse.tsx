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
      <div className="grid grid-cols-4 gap-0 divide-x divide-white/[0.06]">
        {/* Total */}
        <div className="p-2.5 text-center">
          <Calendar className="size-3.5 text-white/40 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-black tabular-nums">{total}</div>
          <div className="text-[9px] text-white/40">{tf('eventsTotal')}</div>
        </div>

        {/* Open */}
        <div className="p-2.5 text-center">
          <DoorOpen className="size-3.5 text-sky-400 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-black tabular-nums text-sky-400">{openCount}</div>
          <div className="text-[9px] text-white/40">{tf('eventsOpenCount')}</div>
        </div>

        {/* LIVE */}
        <div className="p-2.5 text-center">
          <Radio className="size-3.5 text-green-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-black tabular-nums text-green-500">{liveCount}</div>
          <div className="text-[9px] text-white/40">LIVE</div>
        </div>

        {/* Joined */}
        <div className="p-2.5 text-center">
          <CheckCircle2 className="size-3.5 text-gold mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-black tabular-nums text-gold">{joinedCount}</div>
          <div className="text-[9px] text-white/40">{tf('eventsJoinedCount')}</div>
        </div>
      </div>

      <div className="floodlight-divider" />
    </Card>
  );
}
