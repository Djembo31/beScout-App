'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Fixture } from '@/types';
import { getClub } from '@/lib/clubs';
import { ClubLogo } from './ClubLogo';

type Props = {
  fixture: Fixture;
  onSelect: () => void;
};

export function FixtureCard({ fixture, onSelect }: Props) {
  const t = useTranslations('fantasy');
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
  const totalGoals = (fixture.home_score ?? 0) + (fixture.away_score ?? 0);

  const borderGlow = isSimulated
    ? 'border-green-500/15 hover:border-green-500/25'
    : 'border-white/[0.08] hover:border-gold/15';

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-2xl bg-surface-base border ${borderGlow} min-h-[88px] px-4 py-3 transition-colors active:scale-[0.98] group`}
    >
      {/* Top bar: status + label */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-1.5 rounded-full shrink-0 ${isSimulated ? 'bg-green-500' : 'bg-white/15'}`} />
        <span className="text-[10px] text-white/30 font-semibold">
          {isSimulated ? t('ended') : t('gameweekN', { gw: fixture.gameweek })}
        </span>
      </div>

      {/* Match row */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold text-xs truncate max-w-[60px]">{fixture.home_club_short || fixture.home_club_name}</span>
          <ClubLogo club={homeClub} size={36} short={fixture.home_club_short} />
        </div>

        {/* Score pill */}
        <div className="shrink-0 w-[72px] flex justify-center">
          {isSimulated ? (
            <div className="px-3 py-1.5 bg-white/[0.06] rounded-lg">
              <span className="font-mono font-black text-lg tabular-nums">
                {fixture.home_score} <span className="text-white/25">-</span> {fixture.away_score}
              </span>
            </div>
          ) : (
            <span className="text-white/20 text-sm font-bold">vs</span>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <ClubLogo club={awayClub} size={36} short={fixture.away_club_short} />
          <span className="font-semibold text-xs truncate max-w-[60px]">{fixture.away_club_short || fixture.away_club_name}</span>
        </div>
      </div>

      {/* Bottom row: goal count + chevron */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-white/20">
          {isSimulated && totalGoals > 0 ? t('goalsCount', { count: totalGoals }) : ''}
        </span>
        <ChevronRight className="size-3.5 text-white/0 group-hover:text-white/30 transition-colors" aria-hidden="true" />
      </div>
    </button>
  );
}
