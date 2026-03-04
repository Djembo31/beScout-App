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
  const simulated = fixtures.filter(f => f.status === 'simulated' || f.status === 'finished').length;
  const totalGoals = fixtures.reduce((sum, f) => sum + (f.home_score ?? 0) + (f.away_score ?? 0), 0);

  if (total === 0) return null;

  return (
    <Card surface="elevated" className="rounded-2xl overflow-hidden">
      <div className="grid grid-cols-4 gap-0 divide-x divide-white/[0.06]">
        {/* Fixtures */}
        <div className="p-2.5 text-center">
          <Swords className="size-3.5 text-white/40 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-black tabular-nums">{total}</div>
          <div className="text-[9px] text-white/40">{ts('pulsePaarungen')}</div>
        </div>

        {/* Simulated */}
        <div className="p-2.5 text-center">
          <CheckCircle2 className="size-3.5 text-green-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-black tabular-nums text-green-500">{simulated}</div>
          <div className="text-[9px] text-white/40">{ts('pulseBeendet')}</div>
        </div>

        {/* Goals */}
        <div className="p-2.5 text-center">
          <Goal className="size-3.5 text-gold mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-black tabular-nums text-gold">{totalGoals}</div>
          <div className="text-[9px] text-white/40">{ts('pulseTore')}</div>
        </div>

        {/* Status */}
        <div className="p-2.5 text-center">
          <Activity className="size-3.5 text-sky-400 mx-auto mb-1" aria-hidden="true" />
          <div className={cn(
            'text-[11px] font-black mt-1',
            gwStatus === 'simulated' ? 'text-green-500' : gwStatus === 'open' ? 'text-sky-400' : 'text-white/30',
          )}>
            {gwStatus === 'simulated' ? ts('pulseStatusDone') : gwStatus === 'open' ? ts('pulseStatusLive') : '—'}
          </div>
          <div className="text-[9px] text-white/40">{ts('pulseStatus')}</div>
        </div>
      </div>

      <div className="floodlight-divider" />
    </Card>
  );
}
