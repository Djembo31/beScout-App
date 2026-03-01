'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getRang, getGesamtRang, getMedianScore } from '@/lib/gamification';
import type { DimensionScores } from '@/lib/gamification';
import type { DbUserStats } from '@/types';
import type { ScoutScoreRow } from '@/lib/services/scoutScores';
import { Card } from '@/components/ui';

// ============================================
// Dimension mini-bar
// ============================================

const DIM_COLORS: Record<string, { bar: string; text: string; label: string }> = {
  trader: { bar: 'bg-sky-400', text: 'text-sky-400', label: 'Trader' },
  manager: { bar: 'bg-purple-400', text: 'text-purple-400', label: 'Manager' },
  analyst: { bar: 'bg-emerald-400', text: 'text-emerald-400', label: 'Analyst' },
};

function DimBar({ dimension, score }: { dimension: string; score: number }) {
  const c = DIM_COLORS[dimension];
  const rang = getRang(score);
  const progress = rang.maxScore
    ? Math.min(100, ((score - rang.minScore) / (rang.maxScore - rang.minScore + 1)) * 100)
    : 100;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-[10px] font-bold ${c.text} w-16 shrink-0`}>{c.label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] font-mono text-white/50 w-8 text-right shrink-0">{score}</span>
    </div>
  );
}

// ============================================
// HomeHero
// ============================================

export default function HomeHero({
  userStats,
  scoutScores,
}: {
  userStats: DbUserStats | null;
  scoutScores: ScoutScoreRow | null;
}) {
  const t = useTranslations('home');
  const tg = useTranslations('gamification');

  // No stats yet → show CTA
  if (!scoutScores && !userStats) {
    return (
      <Link href="/market?tab=kaufen" className="block">
        <Card className="p-4 border-gold/15 hover:border-gold/30 transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/40 mb-0.5">{t('hero.startTitle')}</div>
              <div className="text-sm font-bold">{t('hero.startCta')}</div>
            </div>
            <ArrowUpRight className="size-5 text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Card>
      </Link>
    );
  }

  const scores: DimensionScores = scoutScores ?? { trader_score: 500, manager_score: 500, analyst_score: 500 };
  const gesamtRang = getGesamtRang(scores);
  const medianScore = getMedianScore(scores);

  // Progress to next tier
  const nextThreshold = gesamtRang.maxScore ? gesamtRang.maxScore + 1 : medianScore;
  const progressPct = gesamtRang.maxScore
    ? Math.min(100, ((medianScore - gesamtRang.minScore) / (gesamtRang.maxScore - gesamtRang.minScore + 1)) * 100)
    : 100;

  return (
    <Link href="/profile" className="block group">
      <Card className="p-4 hover:border-white/15 transition-all relative overflow-hidden">
        {/* Subtle glow from rang color */}
        <div className={`absolute -top-10 -right-10 size-32 rounded-full ${gesamtRang.bgColor} blur-3xl opacity-50`} />

        <div className="relative">
          {/* Header: Rang + Profil link */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded-lg ${gesamtRang.bgColor} ${gesamtRang.borderColor} border`}>
                <span className={`text-xs font-black ${gesamtRang.color}`}>
                  {tg(`rang.${gesamtRang.i18nKey}`)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-white/30 group-hover:text-white/50 transition-colors">
              {t('hero.profile')}
              <ArrowUpRight className="size-3.5" />
            </div>
          </div>

          {/* Progress bar to next tier */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/40">{t('hero.progress')}</span>
              <span className="text-[10px] font-mono text-white/50">
                {medianScore} / {nextThreshold}
              </span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${gesamtRang.gradientFrom} to-transparent rounded-full transition-all`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* 3 Dimension bars */}
          <div className="space-y-1.5 mb-3">
            <DimBar dimension="trader" score={scores.trader_score} />
            <DimBar dimension="manager" score={scores.manager_score} />
            <DimBar dimension="analyst" score={scores.analyst_score} />
          </div>

          {/* Quick stats */}
          {userStats && (
            <div className="flex items-center gap-4 text-[10px] text-white/40 pt-2 border-t border-white/[0.06]">
              <span>{userStats.trades_count} {t('hero.trades')}</span>
              <span>{userStats.events_count} {t('hero.events')}</span>
              <span>{userStats.achievements_count} {t('hero.achievements')}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
