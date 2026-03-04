'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Fixture } from '@/types';
import { FixtureCard } from './FixtureCard';

type Props = {
  fixtures: Fixture[];
  onSelect: (fixture: Fixture) => void;
};

export function SpieltagBrowser({ fixtures, onSelect }: Props) {
  const ts = useTranslations('spieltag');
  const [showFinished, setShowFinished] = useState(true);

  const finished = useMemo(() =>
    fixtures.filter(f => f.status === 'simulated' || f.status === 'finished'),
    [fixtures]
  );
  const upcoming = useMemo(() =>
    fixtures.filter(f => f.status !== 'simulated' && f.status !== 'finished'),
    [fixtures]
  );

  if (fixtures.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Finished / Simulated group */}
      {finished.length > 0 && (
        <div>
          <button
            onClick={() => setShowFinished(!showFinished)}
            className="flex items-center gap-1.5 px-1 pb-1.5 w-full text-left"
          >
            <div className="size-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">{ts('browserFinished')}</span>
            <span className="text-[9px] text-white/20 font-mono tabular-nums">{finished.length}</span>
            {showFinished ? (
              <ChevronUp className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            )}
          </button>
          {showFinished && (
            <div className="space-y-2">
              {finished.map(f => (
                <FixtureCard key={f.id} fixture={f} onSelect={() => onSelect(f)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming / Pending group */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 pb-1.5">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{ts('browserUpcoming')}</span>
            <span className="text-[9px] text-white/20 font-mono tabular-nums">{upcoming.length}</span>
          </div>
          <div className="space-y-2">
            {upcoming.map(f => (
              <FixtureCard key={f.id} fixture={f} onSelect={() => onSelect(f)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
