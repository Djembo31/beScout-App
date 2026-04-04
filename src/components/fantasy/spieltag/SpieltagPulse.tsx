'use client';

import React from 'react';
import { Swords, CheckCircle2, Goal, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Fixture } from '@/types';

type Props = {
  fixtures: Fixture[];
  gwStatus: 'open' | 'simulated' | 'empty';
};

export function SpieltagPulse({ fixtures, gwStatus }: Props) {
  const ts = useTranslations('spieltag');

  const total = fixtures.length;
  const finished = fixtures.filter(f => f.status === 'simulated' || f.status === 'finished');
  const simulated = finished.length;
  const totalGoals = finished.reduce((sum, f) => sum + (f.home_score ?? 0) + (f.away_score ?? 0), 0);

  if (total === 0) return null;

  return (
    <Card surface="elevated" className="rounded-2xl overflow-hidden">
      <div className="grid grid-cols-3 sm:grid-cols-4">
        {/* Fixtures */}
        <div className="p-3 text-center border-r border-divider">
          <Swords className="size-4 text-white/40 mx-auto mb-1" aria-hidden="true" />
          <div className="text-xl font-black tabular-nums">{total}</div>
          <div className="text-xs text-white/40">{ts('pulsePaarungen')}</div>
        </div>

        {/* Simulated */}
        <div className="p-3 text-center border-r border-divider">
          <CheckCircle2 className="size-4 text-green-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-xl font-black tabular-nums text-green-500">{simulated}</div>
          <div className="text-xs text-white/40">{ts('pulseBeendet')}</div>
        </div>

        {/* Goals — hero stat on mobile */}
        <div className="col-span-1 sm:col-span-1 p-3 text-center bg-gold/[0.03] sm:border-r sm:border-divider">
          <Goal className="size-4 text-gold mx-auto mb-1" aria-hidden="true" />
          <div className="text-2xl font-black tabular-nums text-gold gold-glow">{totalGoals}</div>
          <div className="text-xs text-white/40">{ts('pulseTore')}</div>
        </div>

        {/* Status — pill with dot */}
        <div className="col-span-3 sm:col-span-1 p-3 flex items-center justify-center gap-2 border-t border-divider sm:border-t-0">
          <div className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black',
            gwStatus === 'simulated'
              ? 'bg-gold/10 text-gold status-ended'
              : gwStatus === 'open'
                ? 'bg-vivid-green/10 text-vivid-green status-live'
                : 'bg-surface-subtle text-white/30',
          )}>
            <div className={cn(
              'size-1.5 rounded-full',
              gwStatus === 'simulated' ? 'bg-gold' : gwStatus === 'open' ? 'bg-vivid-green' : 'bg-white/20',
            )} />
            {gwStatus === 'simulated' ? ts('pulseStatusDone') : gwStatus === 'open' ? ts('pulseStatusLive') : '—'}
          </div>
        </div>
      </div>

      <div className="floodlight-divider" />
    </Card>
  );
}
