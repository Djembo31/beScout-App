import React from 'react';
import { useTranslations } from 'next-intl';
import { Home, Plane, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FixtureRow, SeasonSummary } from '@/components/club/FixtureCards';
import type { FixtureFilter } from '@/components/club/FixtureCards';
import type { Fixture } from '@/types';

interface SpielplanTabProps {
  clubFixtures: Fixture[];
  clubId: string;
  clubColor: string;
  fixtureFilter: FixtureFilter;
  setFixtureFilter: (f: FixtureFilter) => void;
  expandedGw: Set<number>;
  setExpandedGw: React.Dispatch<React.SetStateAction<Set<number>>>;
  autoExpandedGw: boolean;
  setAutoExpandedGw: (v: boolean) => void;
}

export function SpielplanTab({
  clubFixtures, clubId, clubColor,
  fixtureFilter, setFixtureFilter,
  expandedGw, setExpandedGw, autoExpandedGw, setAutoExpandedGw,
}: SpielplanTabProps) {
  const t = useTranslations('club');

  const filtered = clubFixtures.filter(f => {
    const isHome = f.home_club_id === clubId;
    const isPlayed = f.status === 'simulated' || f.status === 'finished';
    if (fixtureFilter === 'home') return isHome;
    if (fixtureFilter === 'away') return !isHome;
    if (fixtureFilter === 'results') return isPlayed;
    if (fixtureFilter === 'upcoming') return !isPlayed;
    return true;
  });

  // Group by gameweek
  const gwMap = new Map<number, Fixture[]>();
  for (const f of filtered) {
    const arr = gwMap.get(f.gameweek) ?? [];
    arr.push(f);
    gwMap.set(f.gameweek, arr);
  }
  const gameweeks = Array.from(gwMap.keys()).sort((a, b) => a - b);

  // Auto-expand the first upcoming GW
  const firstUpcomingGw = clubFixtures.find(f => f.status === 'scheduled')?.gameweek;

  return (
    <div className="space-y-4">
      {/* Season Summary */}
      <SeasonSummary fixtures={clubFixtures} clubId={clubId} />

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { id: 'all', label: t('fixturesAll') },
          { id: 'home', label: t('fixturesHome'), icon: Home },
          { id: 'away', label: t('fixturesAway'), icon: Plane },
          { id: 'results', label: t('fixturesResults') },
          { id: 'upcoming', label: t('fixturesUpcoming') },
        ] as { id: FixtureFilter; label: string; icon?: typeof Home }[]).map(chip => (
          <button
            key={chip.id}
            onClick={() => setFixtureFilter(chip.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors flex items-center gap-1.5',
              fixtureFilter === chip.id
                ? 'bg-gold/15 text-gold border-gold/30'
                : 'bg-surface-base text-white/50 border-white/10 hover:border-white/20'
            )}
          >
            {chip.icon && <chip.icon className="size-3" />}
            {chip.label}
          </button>
        ))}
      </div>

      {/* Gameweek Groups */}
      {gameweeks.length === 0 ? (
        <div className="text-center text-white/30 py-12">{t('noFixtures')}</div>
      ) : (
        <div className="space-y-2">
          {gameweeks.map(gw => {
            const gwFixtures = gwMap.get(gw)!;
            const isExpanded = expandedGw.has(gw) || (autoExpandedGw && gw === firstUpcomingGw);
            const gwPlayed = gwFixtures.some(f => f.status === 'simulated' || f.status === 'finished');

            return (
              <div key={gw} className="rounded-xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => {
                    if (autoExpandedGw && gw === firstUpcomingGw) setAutoExpandedGw(false);
                    setExpandedGw(prev => {
                      const next = new Set(prev);
                      if (next.has(gw)) next.delete(gw); else next.add(gw);
                      return next;
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface-base hover:bg-surface-subtle transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">{t('fixtureGameweek', { gw })}</span>
                    {gwPlayed && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/15 text-green-500">{t('fixturePlayed')}</span>
                    )}
                  </div>
                  <ChevronDown className={cn('size-4 text-white/30 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="p-3 space-y-2 border-t border-divider">
                    {gwFixtures.map(f => (
                      <FixtureRow key={f.id} fixture={f} clubId={clubId} accent={clubColor} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
