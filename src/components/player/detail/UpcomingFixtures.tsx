'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { useClubFixtures } from '@/lib/queries/fixtures';
import type { Fixture } from '@/types';

interface UpcomingFixturesProps {
  clubId: string;
}

function getDifficultyColor(opponentPosition?: number): string {
  if (!opponentPosition || opponentPosition <= 0) return 'border-white/20';
  if (opponentPosition <= 6) return 'border-red-400/60';
  if (opponentPosition <= 13) return 'border-amber-400/60';
  return 'border-green-400/60';
}

function getDifficultyBg(opponentPosition?: number): string {
  if (!opponentPosition || opponentPosition <= 0) return 'bg-white/[0.03]';
  if (opponentPosition <= 6) return 'bg-red-500/10';
  if (opponentPosition <= 13) return 'bg-amber-500/10';
  return 'bg-green-500/10';
}

export default function UpcomingFixtures({ clubId }: UpcomingFixturesProps) {
  const t = useTranslations('playerDetail');
  const { data: fixtures } = useClubFixtures(clubId);

  const upcoming = React.useMemo(() => {
    if (!fixtures) return [];
    return fixtures
      .filter((f: Fixture) => f.status === 'scheduled')
      .sort((a: Fixture, b: Fixture) => a.gameweek - b.gameweek)
      .slice(0, 5);
  }, [fixtures]);

  if (upcoming.length === 0) return null;

  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-black text-base mb-3 flex items-center gap-2 text-balance">
        <Calendar className="size-4 text-sky-400" aria-hidden="true" />
        {t('upcomingFixtures')}
      </h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-touch pb-1">
        {upcoming.map((fixture: Fixture) => {
          const isHome = fixture.home_club_id === clubId;
          const opponentShort = isHome ? fixture.away_club_short : fixture.home_club_short;
          const venueLabel = isHome ? 'H' : 'A';
          const diffColor = getDifficultyColor(undefined);
          const diffBg = getDifficultyBg(undefined);
          return (
            <div key={fixture.id} className={`flex flex-col items-center shrink-0 rounded-xl border-2 px-3 py-2 min-w-[64px] ${diffColor} ${diffBg}`}>
              <span className="text-[9px] font-mono text-white/40 mb-0.5">GW{fixture.gameweek}</span>
              <span className="font-bold text-sm text-white/90 truncate max-w-[56px]">{opponentShort || '???'}</span>
              <span className={`text-[10px] font-bold mt-0.5 ${isHome ? 'text-green-400' : 'text-white/50'}`}>{venueLabel}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
