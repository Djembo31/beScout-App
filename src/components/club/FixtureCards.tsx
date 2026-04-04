'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import type { Fixture, ClubWithAdmin } from '@/types';

export type FixtureFilter = 'all' | 'home' | 'away' | 'results' | 'upcoming';

export function getFixtureResult(fixture: Fixture, clubId: string): 'W' | 'D' | 'L' | null {
  if (fixture.home_score === null || fixture.away_score === null) return null;
  const isHome = fixture.home_club_id === clubId;
  const ownGoals = isHome ? fixture.home_score : fixture.away_score;
  const oppGoals = isHome ? fixture.away_score : fixture.home_score;
  if (ownGoals > oppGoals) return 'W';
  if (ownGoals < oppGoals) return 'L';
  return 'D';
}

export const resultBadge: Record<'W' | 'D' | 'L', { label: string; color: string }> = {
  W: { label: 'S', color: 'bg-green-500/20 text-green-500' },
  D: { label: 'U', color: 'bg-yellow-500/20 text-yellow-400' },
  L: { label: 'N', color: 'bg-red-500/20 text-red-400' },
};

export function FixtureRow({ fixture, clubId, accent }: { fixture: Fixture; clubId: string; accent: string }) {
  const t = useTranslations('club');
  const isHome = fixture.home_club_id === clubId;
  const isPlayed = fixture.status === 'simulated' || fixture.status === 'finished';
  const result = getFixtureResult(fixture, clubId);
  const oppClub = getClub(isHome ? fixture.away_club_short : fixture.home_club_short) ||
                  getClub(isHome ? fixture.away_club_name : fixture.home_club_name);
  const oppColor = isHome ? fixture.away_club_primary_color : fixture.home_club_primary_color;
  const oppName = isHome ? fixture.away_club_name : fixture.home_club_name;
  const oppShort = isHome ? fixture.away_club_short : fixture.home_club_short;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
      isPlayed ? 'bg-surface-base border-white/10' : 'bg-white/[0.01] border-divider',
    )}>
      {/* H/A Badge */}
      <div className={cn(
        'size-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0',
        isHome ? 'bg-green-500/15 text-green-500' : 'bg-sky-500/15 text-sky-400',
      )}>
        {isHome ? 'H' : 'A'}
      </div>

      {/* Opponent */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="size-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
          style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
        >
          {oppClub?.logo ? (
            <Image src={oppClub.logo} alt="" width={20} height={20} className="size-5 object-contain" />
          ) : (
            oppShort.slice(0, 2)
          )}
        </div>
        <span className="text-sm font-semibold truncate">{oppName}</span>
      </div>

      {/* Score or Status */}
      {isPlayed ? (
        <div className="flex items-center gap-2">
          <span className="font-mono font-black tabular-nums text-sm">
            {fixture.home_score} - {fixture.away_score}
          </span>
          {result && (
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-black', resultBadge[result].color)}>
              {resultBadge[result].label}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-white/30">{t('scheduled')}</span>
      )}
    </div>
  );
}

export function SeasonSummary({ fixtures, clubId }: { fixtures: Fixture[]; clubId: string }) {
  const t = useTranslations('club');
  let w = 0, d = 0, l = 0;
  for (const f of fixtures) {
    const r = getFixtureResult(f, clubId);
    if (r === 'W') w++;
    else if (r === 'D') d++;
    else if (r === 'L') l++;
  }
  const played = w + d + l;
  const points = w * 3 + d;

  if (played === 0) return null;

  return (
    <div className="flex items-center gap-4 p-3 bg-surface-base rounded-xl border border-white/10">
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-white">{played}</div>
        <div className="text-[10px] text-white/40">{t('played')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-green-500">{w}</div>
        <div className="text-[10px] text-white/40">{t('wins')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-yellow-400">{d}</div>
        <div className="text-[10px] text-white/40">{t('draws')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-red-400">{l}</div>
        <div className="text-[10px] text-white/40">{t('losses')}</div>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-gold">{points}</div>
        <div className="text-[10px] text-white/40">{t('seasonPoints')}</div>
      </div>
    </div>
  );
}

export function NextMatchCard({ fixtures, clubId, club }: { fixtures: Fixture[]; clubId: string; club?: ClubWithAdmin }) {
  const t = useTranslations('club');
  const next = fixtures.find(f => f.status === 'scheduled');
  if (!next) return null;

  const isHome = next.home_club_id === clubId;
  const oppName = isHome ? next.away_club_name : next.home_club_name;
  const oppShort = isHome ? next.away_club_short : next.home_club_short;
  const oppColor = isHome ? next.away_club_primary_color : next.home_club_primary_color;
  const oppClub = getClub(oppShort) || getClub(oppName);

  // Countdown: show "In X Tagen" if played_at < 7 days away
  const kickoff = next.played_at ? new Date(next.played_at) : null;
  const daysAway = kickoff ? Math.ceil((kickoff.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const showCountdown = daysAway !== null && daysAway > 0 && daysAway <= 7;

  return (
    <Card className="p-5 md:p-6 overflow-hidden" style={{
      background: `linear-gradient(135deg, var(--club-primary, #006633)10 0%, transparent 50%, ${oppColor ?? '#666'}10 100%)`,
      borderColor: 'var(--club-primary, #006633)25'
    }}>
      <div className="text-xs text-white/40 mb-3 text-center">
        {t('nextMatch', { gw: next.gameweek })}
        {showCountdown && (
          <span className="ml-2 text-green-500 font-bold">
            {daysAway === 1 ? t('inOneDay') : t('inDays', { days: daysAway })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 md:gap-8">
        {/* Own club */}
        <div className="flex flex-col items-center gap-2">
          <div className="size-12 md:size-16 rounded-full bg-white/10 p-1.5 border border-white/20">
            {club?.logo_url ? (
              <Image src={club.logo_url} alt={club.name} width={64} height={64} className="object-contain w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-black text-white/50">{club?.short ?? ''}</div>
            )}
          </div>
          <span className="text-xs font-bold truncate max-w-[80px]">{club?.short ?? ''}</span>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-black',
            isHome ? 'bg-green-500/15 text-green-500' : 'bg-sky-500/15 text-sky-400'
          )}>
            {isHome ? t('home') : t('away')}
          </span>
          <span className="text-lg md:text-xl font-black text-white/20">VS</span>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative size-12 md:size-16 rounded-full p-1.5 border border-white/20"
            style={{ backgroundColor: (oppColor ?? '#666') + '15' }}>
            {oppClub?.logo ? (
              <Image src={oppClub.logo} alt="" fill className="object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-black" style={{ color: oppColor ?? '#aaa' }}>
                {oppShort.slice(0, 3)}
              </div>
            )}
          </div>
          <span className="text-xs font-bold truncate max-w-[80px]">{oppName}</span>
        </div>
      </div>
    </Card>
  );
}

export function LastResultsCard({ fixtures, clubId }: { fixtures: Fixture[]; clubId: string }) {
  const t = useTranslations('club');
  const played = fixtures
    .filter(f => f.status === 'simulated' || f.status === 'finished')
    .slice(-5)
    .reverse();

  if (played.length === 0) return null;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="size-5 text-white/50" />
        <h2 className="font-black text-balance">{t('lastResults')}</h2>
      </div>
      <div className="space-y-2">
        {played.map(f => {
          const isHome = f.home_club_id === clubId;
          const oppName = isHome ? f.away_club_short : f.home_club_short;
          const oppColor = isHome ? f.away_club_primary_color : f.home_club_primary_color;
          const oppClub = getClub(oppName);
          const result = getFixtureResult(f, clubId);

          return (
            <div key={f.id} className="flex items-center gap-3 text-sm">
              <span className="text-xs text-white/30 font-mono tabular-nums w-8 text-right flex-shrink-0">GW {f.gameweek}</span>
              <div
                className="size-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
              >
                {oppClub?.logo ? (
                  <Image src={oppClub.logo} alt="" width={14} height={14} className="size-3.5 object-contain" />
                ) : (
                  oppName.slice(0, 2)
                )}
              </div>
              <span className={cn(
                'text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0',
                isHome ? 'bg-green-500/15 text-green-500' : 'bg-sky-500/15 text-sky-400'
              )}>
                {isHome ? 'H' : 'A'}
              </span>
              <span className="flex-1 truncate text-white/70">{isHome ? f.away_club_name : f.home_club_name}</span>
              <span className="font-mono font-bold tabular-nums text-sm">{f.home_score} - {f.away_score}</span>
              {result && (
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black text-center', resultBadge[result].color)}>
                  {resultBadge[result].label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
