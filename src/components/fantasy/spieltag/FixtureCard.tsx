'use client';

import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Fixture } from '@/types';
import { getClub } from '@/lib/clubs';
import { ClubLogo } from './ClubLogo';
import { getStatusAccent } from './helpers';

type Props = {
  fixture: Fixture;
  onSelect: () => void;
};

/** Format played_at into short date + time: "Sa 08.03. · 14:00" */
function formatKickoff(playedAt: string | null): { date: string; time: string } | null {
  if (!playedAt) return null;
  const d = new Date(playedAt);
  if (isNaN(d.getTime())) return null;
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const day = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return { date: `${day} ${dd}.${mm}.`, time: `${hh}:${min}` };
}

export function FixtureCard({ fixture, onSelect }: Props) {
  const t = useTranslations('spieltag');
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isFinished = fixture.status === 'simulated' || fixture.status === 'finished';
  const totalGoals = (fixture.home_score ?? 0) + (fixture.away_score ?? 0);

  const kickoff = formatKickoff(fixture.played_at);
  const isPast = kickoff ? new Date(fixture.played_at!) < new Date() : false;
  const isPendingResult = !isFinished && isPast;

  const accent = getStatusAccent(fixture.status);
  const matchLabel = `${fixture.home_club_short || fixture.home_club_name} ${isFinished ? `${fixture.home_score} - ${fixture.away_score}` : 'vs'} ${fixture.away_club_short || fixture.away_club_name}`;

  return (
    <button
      onClick={onSelect}
      aria-label={matchLabel}
      className={`w-full rounded-2xl bg-surface-base border ${accent.border} min-h-[88px] px-4 py-3 transition-colors hover:bg-surface-base active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 group ${accent.glow}`}
    >
      {/* Top bar: status + kickoff time */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-1.5 rounded-full shrink-0 ${accent.dot}`} />
        <span className="text-xs text-white/30 font-semibold">
          {isFinished
            ? t('browserFinished')
            : isPendingResult
            ? t('resultPending')
            : kickoff
            ? `${kickoff.date} · ${kickoff.time}`
            : t('browserUpcoming')}
        </span>
        {isPendingResult && (
          <Clock className="size-3 text-amber-400/60" aria-hidden="true" />
        )}
      </div>

      {/* Match row */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold text-xs truncate max-w-[48px] sm:max-w-[72px]">{fixture.home_club_short || fixture.home_club_name}</span>
          <ClubLogo club={homeClub} size={36} short={fixture.home_club_short} />
        </div>

        {/* Score pill or kickoff */}
        <div className="shrink-0 w-[68px] sm:w-[72px] flex justify-center">
          {isFinished ? (
            <div className="px-2.5 py-1.5 bg-gold/[0.06] border border-gold/10 rounded-lg" aria-hidden="true">
              <span className="font-mono font-black text-lg sm:text-xl tabular-nums score-glow">
                {fixture.home_score} <span className="text-white/25">-</span> {fixture.away_score}
              </span>
            </div>
          ) : isPendingResult ? (
            <div className="px-2.5 py-1.5 bg-amber-500/[0.06] border border-amber-500/10 rounded-lg" aria-hidden="true">
              <span className="font-mono font-bold text-sm tabular-nums text-amber-400/70">? - ?</span>
            </div>
          ) : kickoff ? (
            <div className="px-2.5 py-1.5 bg-surface-subtle border border-divider rounded-lg" aria-hidden="true">
              <span className="font-mono font-bold text-sm tabular-nums text-white/40">{kickoff.time}</span>
            </div>
          ) : (
            <span className="text-white/20 text-sm font-bold" aria-hidden="true">vs</span>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <ClubLogo club={awayClub} size={36} short={fixture.away_club_short} />
          <span className="font-semibold text-xs truncate max-w-[48px] sm:max-w-[72px]">{fixture.away_club_short || fixture.away_club_name}</span>
        </div>
      </div>

      {/* Bottom row: goal count + chevron */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-white/20">
          {isFinished && totalGoals > 0 ? t('cardGoals', { count: totalGoals }) : ''}
        </span>
        <ChevronRight className="size-3.5 text-white/0 group-hover:text-white/30 transition-colors" aria-hidden="true" />
      </div>
    </button>
  );
}
