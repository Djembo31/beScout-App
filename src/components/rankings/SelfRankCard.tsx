'use client';

import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, ErrorState } from '@/components/ui';
import { RangBadge, DimensionRangStack } from '@/components/ui/RangBadge';
import { RadarChart } from '@/components/profile/RadarChart';
import { useScoutScores, useCurrentLigaSeason } from '@/lib/queries/gamification';
import { useUser } from '@/components/providers/AuthProvider';
import { Loader2, TrendingUp, ChevronUp } from 'lucide-react';
import type { DimensionScores } from '@/lib/gamification';
import { getMedianScore, getNextRang, getPointsToNextRang, getRang } from '@/lib/gamification';

export function SelfRankCard() {
  const { user } = useUser();
  const t = useTranslations('rankings');
  const tRang = useTranslations('gamification.rang');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';

  const { data: scores, isLoading: scoresLoading, isError: scoresError, refetch: refetchScores } = useScoutScores(user?.id);
  const { data: season } = useCurrentLigaSeason();

  if (scoresLoading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="size-5 animate-spin text-white/30" />
      </Card>
    );
  }

  if (scoresError) {
    return <ErrorState onRetry={() => refetchScores()} />;
  }

  if (!scores) {
    return (
      <Card className="p-6 text-center">
        <p className="text-white/40 text-sm">{t('noData')}</p>
      </Card>
    );
  }

  const dimScores: DimensionScores = {
    trader_score: scores.trader_score,
    manager_score: scores.manager_score,
    analyst_score: scores.analyst_score,
  };

  // Season delta
  const traderDelta = scores.trader_score - scores.season_start_trader;
  const managerDelta = scores.manager_score - scores.season_start_manager;
  const analystDelta = scores.analyst_score - scores.season_start_analyst;
  const sorted = [traderDelta, managerDelta, analystDelta].sort((a, b) => a - b);
  const medianDelta = sorted[1];

  // Season progress (months since start)
  const seasonProgress = getSeasonProgress(season?.start_date, season?.end_date);

  // Slice 198d R-04: Tier-Promotion-CTA — zeige "noch X Punkte bis [naechster Rang]".
  // Compliance-clean (kein "gewinne", "Sieg") — neutrale Promotion-Sprache.
  const medianScore = getMedianScore(dimScores);
  const currentRang = getRang(medianScore);
  const nextRang = getNextRang(medianScore);
  const pointsToNext = getPointsToNextRang(medianScore);
  const tierProgressPct = currentRang.maxScore !== null
    ? Math.min(100, Math.max(0, ((medianScore - currentRang.minScore) / (currentRang.maxScore + 1 - currentRang.minScore)) * 100))
    : 100;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-white">{t('yourRank')}</h2>
        {season && (
          <span className="text-[10px] font-mono text-white/40">
            {t('season')} {season.name}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Radar + Badge */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <RadarChart
            scores={{ manager: scores.manager_score, trader: scores.trader_score, analyst: scores.analyst_score }}
            size={140}
          />
          <RangBadge scores={dimScores} size="lg" showScore />
        </div>

        {/* Dimensions + Season Delta */}
        <div className="flex-1 w-full space-y-4">
          <DimensionRangStack scores={dimScores} />

          {/* Season Delta — FIX-15 (J9F-16): flex-wrap so DeltaPill siblings don't overflow on 393px */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <TrendingUp className={cn('size-4 shrink-0', medianDelta >= 0 ? 'text-emerald-400' : 'text-rose-400')} aria-hidden="true" />
            <div className="flex-1 min-w-[80px]">
              <span className="text-[10px] text-white/40 block">{t('seasonDelta')}</span>
              <span className={cn('text-sm font-mono font-bold tabular-nums', medianDelta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {medianDelta >= 0 ? '+' : ''}{medianDelta.toLocaleString(numLocale)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DeltaPill label={t('trader')} delta={traderDelta} numLocale={numLocale} />
              <DeltaPill label={t('manager')} delta={managerDelta} numLocale={numLocale} />
              <DeltaPill label={t('analyst')} delta={analystDelta} numLocale={numLocale} />
            </div>
          </div>

          {/* Season Progress Bar */}
          {season && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/40">{t('seasonProgress')}</span>
                <span className="text-[10px] font-mono text-white/40">{Math.round(seasonProgress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold/60 transition-[width]"
                  style={{ width: `${seasonProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Slice 198d R-04: Tier-Promotion-CTA — neutral, kein "gewinne"/"Sieg"-Vokabel.
               Versteckt bei Top-Tier (Legendaer). */}
          {nextRang && pointsToNext > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <ChevronUp className={cn('size-4 shrink-0', nextRang.color)} aria-hidden="true" />
                <span className="text-xs text-white/60 flex-1">
                  {t('tierPromotion', {
                    points: pointsToNext.toLocaleString(numLocale),
                    nextTier: tRang(nextRang.i18nKey),
                  })}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-[width]', nextRang.bgColor)}
                  style={{ width: `${tierProgressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-mono text-white/30">{currentRang.fullName}</span>
                <span className={cn('text-[10px] font-mono font-bold', nextRang.color)}>{tRang(nextRang.i18nKey)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function DeltaPill({ label, delta, numLocale }: { label: string; delta: number; numLocale: string }) {
  return (
    <div className="text-center">
      <span className="text-[8px] text-white/30 block">{label}</span>
      <span className={cn('text-[10px] font-mono tabular-nums', delta >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70')}>
        {delta >= 0 ? '+' : ''}{delta.toLocaleString(numLocale)}
      </span>
    </div>
  );
}

function getSeasonProgress(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return ((now - start) / (end - start)) * 100;
}
