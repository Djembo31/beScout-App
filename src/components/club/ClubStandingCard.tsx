'use client';

import { useTranslations } from 'next-intl';
import { Trophy, Target } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ClubStanding } from '@/lib/services/club';

type Props = {
  standing: ClubStanding;
  clubColor: string;
};

/**
 * Slice 149 — Liga-Tabellenposition als Info-Kachel.
 * Rendert nur wenn standing-Daten existieren (null → parent hides).
 * Form-Pills nur wenn form-String vorhanden.
 */
export function ClubStandingCard({ standing, clubColor }: Props) {
  const t = useTranslations('club');
  const formChars = standing.form ? standing.form.split('').slice(-5) : [];
  const rankTone =
    standing.rank === 1 ? 'text-gold' :
    standing.rank <= 4 ? 'text-green-400' :
    standing.rank <= 6 ? 'text-sky-400' :
    'text-white/80';

  return (
    <Card className="p-4 md:p-6" style={{ borderColor: `${clubColor}25` }}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-5" style={{ color: clubColor }} />
        <h2 className="font-black text-balance">{t('standingTitle')}</h2>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-4xl md:text-5xl font-black font-mono tabular-nums', rankTone)}>
            {standing.rank}.
          </span>
          <span className="text-xs text-white/40">{t('standingTitle')}</span>
        </div>
        <div className="text-right">
          <div className="font-mono font-black text-2xl md:text-3xl tabular-nums text-white">
            {standing.points}
          </div>
          <div className="text-[10px] text-white/40">{t('standingPointsLabel')}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-surface-base rounded-xl p-2.5 text-center">
          <div className="font-mono font-bold tabular-nums text-sm text-white/80">
            {standing.played}
          </div>
          <div className="text-[10px] text-white/40">{t('standingPlayedLabel')}</div>
        </div>
        <div className="bg-surface-base rounded-xl p-2.5 text-center">
          <div className="font-mono font-bold tabular-nums text-sm text-white/80">
            {standing.won}–{standing.drawn}–{standing.lost}
          </div>
          <div className="text-[10px] text-white/40">{t('standingRecordLabel')}</div>
        </div>
        <div className="bg-surface-base rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 font-mono font-bold tabular-nums text-sm text-white/80">
            <Target className="size-3 text-white/40" aria-hidden="true" />
            {standing.goalsFor}:{standing.goalsAgainst}
          </div>
          <div className={cn(
            'text-[10px] font-mono tabular-nums',
            standing.goalsDiff > 0 ? 'text-green-400' : standing.goalsDiff < 0 ? 'text-red-400' : 'text-white/40'
          )}>
            {standing.goalsDiff > 0 ? '+' : ''}{standing.goalsDiff}
          </div>
        </div>
      </div>

      {formChars.length > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-divider">
          <span className="text-[10px] text-white/40 flex-shrink-0">
            {t('standingSeasonForm')}
          </span>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {formChars.map((r, i) => (
              <div
                key={i}
                className={cn(
                  'size-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black ring-1 ring-white/10',
                  r === 'W' && 'bg-green-500 text-black',
                  r === 'D' && 'bg-yellow-500 text-black',
                  r === 'L' && 'bg-red-500 text-white',
                )}
              >
                {r === 'W' ? 'S' : r === 'D' ? 'U' : 'N'}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
