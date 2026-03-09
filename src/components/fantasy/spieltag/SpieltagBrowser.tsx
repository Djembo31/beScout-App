'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Fixture } from '@/types';
import { FixtureCard } from './FixtureCard';

type Props = {
  fixtures: Fixture[];
  onSelect: (fixture: Fixture) => void;
};

export function SpieltagBrowser({ fixtures, onSelect }: Props) {
  const ts = useTranslations('spieltag');
  const now = useMemo(() => new Date(), []);

  const finished = useMemo(() =>
    fixtures
      .filter(f => f.status === 'simulated' || f.status === 'finished')
      .sort((a, b) => new Date(b.played_at ?? 0).getTime() - new Date(a.played_at ?? 0).getTime()),
    [fixtures]
  );

  const pendingResult = useMemo(() =>
    fixtures
      .filter(f => f.status !== 'simulated' && f.status !== 'finished' && f.played_at && new Date(f.played_at) < now)
      .sort((a, b) => new Date(b.played_at ?? 0).getTime() - new Date(a.played_at ?? 0).getTime()),
    [fixtures, now]
  );

  const upcoming = useMemo(() =>
    fixtures
      .filter(f => f.status !== 'simulated' && f.status !== 'finished' && (!f.played_at || new Date(f.played_at) >= now))
      .sort((a, b) => new Date(a.played_at ?? '9999').getTime() - new Date(b.played_at ?? '9999').getTime()),
    [fixtures, now]
  );

  // Default collapsed when >4 finished matches to avoid dominating the view
  const [showFinished, setShowFinished] = useState(finished.length <= 4);
  const [showPending, setShowPending] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);

  if (fixtures.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Finished group */}
      {finished.length > 0 && (
        <div>
          <button
            onClick={() => setShowFinished(!showFinished)}
            aria-expanded={showFinished}
            aria-label={`${ts('browserFinished')} (${finished.length})`}
            className="flex items-center gap-1.5 px-1 pb-1.5 w-full min-h-[44px] text-left hover:opacity-80 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 rounded-lg transition-all"
          >
            <div className="size-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-500 uppercase tracking-wider">{ts('browserFinished')}</span>
            <span className="text-xs text-white/20 font-mono tabular-nums">{finished.length}</span>
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

      {/* Pending result group */}
      {pendingResult.length > 0 && (
        <div>
          <button
            onClick={() => setShowPending(!showPending)}
            aria-expanded={showPending}
            aria-label={`${ts('browserPending')} (${pendingResult.length})`}
            className="flex items-center gap-1.5 px-1 pb-1.5 w-full min-h-[44px] text-left hover:opacity-80 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 rounded-lg transition-all"
          >
            <Clock className="size-3 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{ts('browserPending')}</span>
            <span className="text-xs text-white/20 font-mono tabular-nums">{pendingResult.length}</span>
            {showPending ? (
              <ChevronUp className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            )}
          </button>
          {showPending && (
            <div className="space-y-2">
              {pendingResult.map(f => (
                <FixtureCard key={f.id} fixture={f} onSelect={() => onSelect(f)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming group */}
      {upcoming.length > 0 && (
        <div>
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            aria-expanded={showUpcoming}
            aria-label={`${ts('browserUpcoming')} (${upcoming.length})`}
            className="flex items-center gap-1.5 px-1 pb-1.5 w-full min-h-[44px] text-left hover:opacity-80 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 rounded-lg transition-all"
          >
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{ts('browserUpcoming')}</span>
            <span className="text-xs text-white/20 font-mono tabular-nums">{upcoming.length}</span>
            {showUpcoming ? (
              <ChevronUp className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            )}
          </button>
          {showUpcoming && (
            <div className="space-y-2">
              {upcoming.map(f => (
                <FixtureCard key={f.id} fixture={f} onSelect={() => onSelect(f)} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
