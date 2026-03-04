'use client';

import React from 'react';
import { Star, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FixturePlayerStat } from '@/types';
import { BestElevenShowcase } from '../spieltag';
import { Top3Cards } from './Top3Cards';

type Props = {
  topScorers: FixturePlayerStat[];
  gameweek: number;
};

export function VisualShowcase({ topScorers, gameweek }: Props) {
  const t = useTranslations('fantasy');

  return (
    <div className="space-y-4">
      {/* Best XI / VI */}
      {topScorers.length >= 6 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Star className="size-4 text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black uppercase tracking-wider text-balance">{t('ergebnisse.bestFormation')}</h2>
          </div>
          <BestElevenShowcase scorers={topScorers} gameweek={gameweek} />
        </section>
      )}

      {/* Top 3 Trading Cards */}
      {topScorers.length >= 3 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="size-4 text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black uppercase tracking-wider text-balance">{t('topScorer')}</h2>
          </div>
          <Top3Cards scorers={topScorers} />
        </section>
      )}
    </div>
  );
}
