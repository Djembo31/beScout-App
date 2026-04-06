'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getL5Color, PositionBadge } from '@/components/player';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

interface StatsTabProps {
  player: Player;
  scores: (number | null)[] | undefined;
  nextFixture: NextFixtureInfo | undefined;
  eventCount: number;
}

const STATUS_DOT: Record<string, string> = {
  fit: 'bg-green-400',
  doubtful: 'bg-yellow-400',
  injured: 'bg-red-400',
  suspended: 'bg-purple-400',
};

const STATUS_TEXT: Record<string, string> = {
  fit: 'text-green-300',
  doubtful: 'text-yellow-300',
  injured: 'text-red-300',
  suspended: 'text-purple-300',
};

function barColor(score: number): string {
  if (score >= 80) return 'bg-gold';
  if (score >= 60) return 'bg-white';
  return 'bg-red-400';
}

/** Clamp bar height between 4px (minimum visible) and a proportional max */
function barHeight(score: number | null): number {
  if (score === null || score <= 0) return 4;
  return Math.max(4, Math.round((score / 120) * 56));
}

export default function StatsTab({ player, scores, nextFixture, eventCount }: StatsTabProps) {
  const t = useTranslations('player');
  const tm = useTranslations('manager');

  const l5 = player.perf.l5;
  const l5Color = getL5Color(l5);

  return (
    <div className="space-y-4 p-4">
      {/* L5 Score + Trend */}
      <div className="bg-white/[0.04] rounded-xl p-3">
        <p className="text-xs text-white/50 mb-1">L5 Score</p>
        <div className="flex items-center gap-2">
          <span className={cn('text-3xl font-black font-mono tabular-nums', l5Color)}>
            {l5 > 0 ? l5 : '—'}
          </span>
          {player.perf.trend === 'UP' && (
            <TrendingUp className="size-5 text-green-400" aria-hidden="true" />
          )}
          {player.perf.trend === 'DOWN' && (
            <TrendingDown className="size-5 text-red-400" aria-hidden="true" />
          )}
          {player.perf.trend === 'FLAT' && (
            <Minus className="size-5 text-white/30" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Last 5 Scores — Mini Bar Chart */}
      <div className="bg-white/[0.04] rounded-xl p-3">
        <p className="text-xs text-white/50 mb-2">{tm('intelLast5')}</p>
        <div className="flex items-end gap-1.5 h-[60px]">
          {(scores ?? [null, null, null, null, null]).slice(-5).map((score, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-colors',
                score !== null && score > 0 ? barColor(score) : 'bg-white/10'
              )}
              style={{ height: `${barHeight(score)}px` }}
              title={score !== null ? String(score) : '—'}
            />
          ))}
        </div>
      </div>

      {/* Season Stats */}
      <div className="bg-white/[0.04] rounded-xl p-3">
        <p className="text-xs text-white/50 mb-2">{tm('intelSeasonStats')}</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCell label={t('matches')} value={player.stats.matches} />
          <StatCell label={t('goals')} value={player.stats.goals} />
          <StatCell label={t('assists')} value={player.stats.assists} />
          <StatCell label={tm('intelMinutes')} value={player.stats.minutes} />
        </div>
      </div>

      {/* Fitness */}
      <div className="bg-white/[0.04] rounded-xl p-3">
        <p className="text-xs text-white/50 mb-1">{tm('intelFitness')}</p>
        <div className="flex items-center gap-2">
          <span className={cn('size-2.5 rounded-full', STATUS_DOT[player.status] ?? 'bg-white/20')} />
          <span className={cn('text-sm font-bold capitalize', STATUS_TEXT[player.status] ?? 'text-white/50')}>
            {tm(`intelStatus_${player.status}` as 'intelStatus_fit')}
          </span>
        </div>
      </div>

      {/* Next Fixture */}
      <div className="bg-white/[0.04] rounded-xl p-3">
        <p className="text-xs text-white/50 mb-1">{tm('intelNextFixture')}</p>
        {nextFixture ? (
          <div>
            <p className="text-sm font-bold text-white">
              {nextFixture.opponentName}{' '}
              <span className="text-white/50">
                ({nextFixture.isHome ? 'H' : 'A'})
              </span>
            </p>
            {nextFixture.playedAt && (
              <p className="text-xs text-white/40 mt-0.5">
                {new Date(nextFixture.playedAt).toLocaleDateString('de-DE', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/30">{tm('intelNoFixture')}</p>
        )}
      </div>

      {/* Meta: Age, Contract, Position */}
      <div className="bg-white/[0.04] rounded-xl p-3">
        <p className="text-xs text-white/50 mb-2">{tm('intelMeta')}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <p className="text-xs text-white/40">{tm('intelAge')}</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums">{player.age}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">{tm('intelContract')}</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums">
              {player.contractMonthsLeft > 0
                ? tm('intelContractMonths', { count: player.contractMonthsLeft })
                : tm('intelContractExpired')}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">{tm('intelPosition')}</p>
            <div className="mt-0.5">
              <PositionBadge pos={player.pos} size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-sm font-bold text-white font-mono tabular-nums">{value}</p>
    </div>
  );
}
