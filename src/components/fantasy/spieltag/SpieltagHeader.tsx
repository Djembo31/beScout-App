'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Play, ArrowRight, Loader2,
} from 'lucide-react';

type Props = {
  gameweek: number;
  isCurrentGw: boolean;
  isPast: boolean;
  gwStatus: 'open' | 'simulated' | 'empty';
  simulatedCount: number;
  fixtureCount: number;
  totalGoals: number;
  eventCount: number;
  isAdmin: boolean;
  simulating: boolean;
  apiAvailable: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSimulate: () => void;
  onAdvance: () => void;
};

export function SpieltagHeader({
  gameweek, isCurrentGw, isPast, gwStatus, simulatedCount, fixtureCount,
  totalGoals, eventCount, isAdmin, simulating, apiAvailable,
  onPrev, onNext, onSimulate, onAdvance,
}: Props) {
  const t = useTranslations('fantasy');
  const isActive = isCurrentGw && gwStatus === 'open';
  const isFinished = gwStatus === 'simulated';

  // Color scheme
  const numberColor = isActive
    ? 'text-gold'
    : isFinished
    ? 'text-green-500'
    : 'text-white/30';

  const numberShadow = isActive
    ? '0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,215,0,0.15)'
    : isFinished
    ? '0 0 12px rgba(34,197,94,0.3)'
    : 'none';

  const bgGradient = isActive
    ? 'from-gold/[0.06] via-transparent to-transparent'
    : isFinished
    ? 'from-green-500/[0.04] via-transparent to-transparent'
    : 'from-white/[0.02] via-transparent to-transparent';

  const progressPct = Math.round((gameweek / 38) * 100);
  const progressColor = isActive ? 'bg-gold' : isFinished ? 'bg-green-500' : 'bg-white/20';

  return (
    <div className={`relative rounded-2xl border border-white/[0.08] overflow-hidden bg-gradient-to-br ${bgGradient}`}>
      {/* Nav row */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={onPrev}
          disabled={gameweek <= 1}
          aria-label={t('prevGameweek')}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-20 transition-colors active:scale-[0.95]"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>

        {isActive ? (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-gold bg-gold/10 border border-gold/20 animate-pulse motion-reduce:animate-none">
            {t('headerCurrent')}
          </span>
        ) : isFinished ? (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-green-500 bg-green-500/10 border border-green-500/20">
            {t('ended')}
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-white/30 bg-white/[0.04] border border-white/[0.06]">
            {isPast ? t('headerPast') : t('upcoming')}
          </span>
        )}

        <button
          onClick={onNext}
          disabled={gameweek >= 38}
          aria-label={t('nextGameweek')}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-20 transition-colors active:scale-[0.95]"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Big GW Number */}
      <div className="text-center py-3">
        <div className="flex items-baseline justify-center gap-1.5">
          <span
            className={`text-3xl md:text-5xl font-black tabular-nums ${numberColor}`}
            style={{ textShadow: numberShadow }}
          >
            {String(gameweek).padStart(2, '0')}
          </span>
          <span className="text-xs md:text-sm text-white/20 font-medium">{t('ofTotal', { total: 38 })}</span>
        </div>

        {/* Status line */}
        <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs">
          {isFinished ? (
            <>
              <CheckCircle2 className="size-3.5 text-green-500" aria-hidden="true" />
              <span className="text-green-500 font-semibold">{t('ended')}</span>
              {totalGoals > 0 && <span className="text-white/30">· {t('goalsAndGames', { goals: totalGoals, games: fixtureCount })}</span>}
            </>
          ) : isActive ? (
            <>
              <div className="size-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
              <span className="text-green-500 font-bold">{t('statusOpen')}</span>
              <span className="text-white/30">· {t('eventsAndGames', { events: eventCount, games: fixtureCount })}</span>
            </>
          ) : isPast ? (
            <>
              <Clock className="size-3.5 text-white/30" aria-hidden="true" />
              <span className="text-white/30">
                {simulatedCount > 0 ? t('simulatedCount', { done: simulatedCount, total: fixtureCount }) : t('pastGameweek')}
              </span>
            </>
          ) : (
            <>
              <Clock className="size-3.5 text-white/20" aria-hidden="true" />
              <span className="text-white/20">{t('upcomingGameweek')}</span>
            </>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && isActive && eventCount > 0 && (
        <div className="flex justify-center pb-3 px-4">
          <button
            onClick={onSimulate}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gold/10 border border-gold/30 rounded-xl text-sm font-bold text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors active:scale-[0.97]"
          >
            {simulating ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {simulating ? t('simulating') : apiAvailable ? t('importData') : t('startGameweek')}
          </button>
        </div>
      )}
      {isAdmin && isFinished && isCurrentGw && (
        <div className="flex justify-center pb-3 px-4">
          <button
            onClick={onAdvance}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-green-500/10 border border-green-500/30 rounded-xl text-sm font-bold text-green-500 hover:bg-green-500/20 transition-colors active:scale-[0.97]"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            {t('nextGameweek')}
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs text-white/20 mb-1">
          <span>{t('seasonProgress')}</span>
          <span className="tabular-nums">{progressPct}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-colors duration-500 ${progressColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
