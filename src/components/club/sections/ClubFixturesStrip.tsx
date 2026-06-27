'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Calendar } from 'lucide-react';
import { useClubNextFixtures } from '@/lib/queries/fixtures';
import { usePlayers } from '@/lib/queries/players';
import { getClubAvgL5 } from '@/components/fantasy/FDRBadge';
import { cn } from '@/lib/utils';

export interface ClubFixturesStripProps {
  clubId: string;
  /** Number of upcoming fixtures to show. Default 5 (FPL standard). */
  count?: number;
  className?: string;
}

type FDR = 'easy' | 'med' | 'hard';

/**
 * Slice 197e — 5-GW-Forward FDR-Strip auf Club-Page.
 * Closes FM-Audit Finding K-01: kritischster Lineup-Helper für Wildcard-Timing.
 *
 * FDR-Heuristik (identisch zu FDRBadge.getFDR):
 * - avgL5 < 40 = easy (emerald)
 * - 40 <= avgL5 < 55 = med (status-doubtful #F59E0B)
 * - avgL5 >= 55 = hard (rose)
 */
export function ClubFixturesStrip({ clubId, count = 5, className }: ClubFixturesStripProps) {
  const t = useTranslations('club');
  const { data: fixtures = [], isLoading: fixturesLoading } = useClubNextFixtures(clubId, count);
  const { data: allPlayers = [], isLoading: playersLoading } = usePlayers(true);

  // Loading-Skeleton (Loading guard VOR Empty guard)
  if (fixturesLoading || playersLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <h3 className="text-xs font-bold uppercase text-white/40 tracking-wide flex items-center gap-1.5">
          <Calendar aria-hidden="true" className="size-3" />
          {t('next5Fixtures')}
        </h3>
        <div className="flex gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-[68px] w-14 rounded-lg bg-surface-minimal animate-pulse motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty-Guard: keine Fixtures (Saisonende, Pause)
  if (fixtures.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-xs font-bold uppercase text-white/40 tracking-wide flex items-center gap-1.5">
        <Calendar aria-hidden="true" className="size-3" />
        {t('next5Fixtures')}
      </h3>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {fixtures.map((fix, i) => {
          const opponentShort = fix.opponentShort || '?';
          // Slice 420: FDR über Gegner-Club-UUID (eindeutig), nicht Short-String (S276).
          const avgL5 = fix.opponentClubId ? getClubAvgL5(fix.opponentClubId, allPlayers) : 0;
          const fdr: FDR = avgL5 >= 55 ? 'hard' : avgL5 >= 40 ? 'med' : 'easy';

          // Static Tailwind classes (kein dynamic JIT) — siehe rule
          const colorClass: Record<FDR, string> = {
            easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            med: 'bg-status-doubtful/15 text-status-doubtful border-status-doubtful/30',
            hard: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          };

          const fdrLabel: Record<FDR, string> = {
            easy: t('fdr.easy'),
            med: t('fdr.med'),
            hard: t('fdr.hard'),
          };

          const venue = fix.isHome ? t('home') : t('away');
          const opponentLabel = fix.opponentName || opponentShort;

          return (
            <div
              key={`${fix.gameweek}-${i}`}
              className={cn(
                'flex-shrink-0 w-14 px-1.5 py-2 rounded-lg border text-center transition-colors',
                colorClass[fdr],
              )}
              role="img"
              aria-label={`${t('fixtureGameweek', { gw: fix.gameweek })}, ${venue} — ${opponentLabel} (${fdrLabel[fdr]})`}
              title={`${opponentLabel} — ${fdrLabel[fdr]}`}
            >
              <div className="text-[9px] font-bold opacity-70 tabular-nums">
                GW{fix.gameweek}
              </div>
              <div className="text-xs font-black mt-0.5 truncate">
                {fix.isHome ? opponentShort : `@${opponentShort}`}
              </div>
              {avgL5 > 0 && (
                <div className="text-[8px] opacity-60 mt-0.5 font-mono tabular-nums">
                  L5 {Math.round(avgL5)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
