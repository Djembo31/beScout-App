'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Fixture } from '@/types';
import type { ClubLookup } from '@/lib/clubs';
import { getClub } from '@/lib/clubs';
import { ClubLogo } from './ClubLogo';

type Props = {
  fixture: Fixture;
  userClubId?: string;
  onSelect: (fixture: Fixture) => void;
};

export function TopspielCard({ fixture, onSelect }: Props) {
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
  const homeColor = homeClub?.colors.primary ?? '#22C55E';
  const awayColor = awayClub?.colors.primary ?? '#3B82F6';

  return (
    <button
      onClick={() => onSelect(fixture)}
      className="w-full rounded-2xl border border-white/[0.12] overflow-hidden transition-all active:scale-[0.98] group relative"
      style={{
        background: `linear-gradient(135deg, ${homeColor}12 0%, rgba(13,13,15,0.95) 50%, ${awayColor}12 100%)`,
      }}
    >
      {/* Topspiel label */}
      <div className="flex items-center justify-center pt-3 pb-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700]/70">
          Topspiel
        </span>
      </div>

      {/* Match content */}
      <div className="flex items-center justify-center gap-3 px-4 pb-4">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <ClubLogo club={homeClub} size={44} short={fixture.home_club_short} />
          <span className="text-xs font-bold truncate max-w-[80px] text-center">{fixture.home_club_short || fixture.home_club_name}</span>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-center px-2">
          {isSimulated ? (
            <div className="font-mono font-black text-3xl" style={{ textShadow: '0 0 12px rgba(255,215,0,0.25)' }}>
              {fixture.home_score} <span className="text-white/20">-</span> {fixture.away_score}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/20 text-lg font-bold">vs</span>
              <span className="text-[10px] text-white/20">Kommend</span>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <ClubLogo club={awayClub} size={44} short={fixture.away_club_short} />
          <span className="text-xs font-bold truncate max-w-[80px] text-center">{fixture.away_club_short || fixture.away_club_name}</span>
        </div>
      </div>

      {/* Subtle chevron hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>

      {/* Bottom glow line */}
      <div className="h-[2px]" style={{
        background: `linear-gradient(90deg, ${homeColor}40, #FFD70040, ${awayColor}40)`,
      }} />
    </button>
  );
}

/** Pick the top fixture: (1) user club match, (2) highest score, (3) first fixture */
export function pickTopspiel(fixtures: Fixture[], userClubId?: string): Fixture | null {
  if (fixtures.length === 0) return null;

  // 1. User club match
  if (userClubId) {
    const clubMatch = fixtures.find(
      f => f.home_club_id === userClubId || f.away_club_id === userClubId
    );
    if (clubMatch) return clubMatch;
  }

  // 2. Highest total score
  const simulated = fixtures.filter(f => f.status === 'simulated' || f.status === 'finished');
  if (simulated.length > 0) {
    return simulated.reduce((best, f) => {
      const total = (f.home_score ?? 0) + (f.away_score ?? 0);
      const bestTotal = (best.home_score ?? 0) + (best.away_score ?? 0);
      return total > bestTotal ? f : best;
    });
  }

  // 3. First fixture
  return fixtures[0];
}
