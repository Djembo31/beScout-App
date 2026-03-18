'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, TrendingUp, TrendingDown, Loader2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getL5Hex } from '@/components/player';
import { useNumTick } from '@/lib/hooks/useNumTick';
import { usePositionPercentile } from '@/lib/hooks/usePositionPercentile';
import { posTintColors } from '@/components/player/PlayerRow';
import type { MatchTimelineEntry } from '@/lib/services/scoring';
import type { Player } from '@/types';

interface MatchTimelineProps {
  player: Player;
  entries: MatchTimelineEntry[];
  allPlayers?: Player[];
  loading?: boolean;
  className?: string;
}

type ViewMode = 'L5' | 'L15';

/** 6-tier score color */
function scoreColor(score: number): string {
  if (score >= 100) return 'var(--gold)';
  if (score >= 85) return '#22d3ee';
  if (score >= 65) return '#34d399';
  if (score >= 51) return '#fbbf24';
  if (score >= 31) return '#f97316';
  return '#f43f5e';
}

function scoreTextClass(score: number): string {
  if (score >= 100) return 'text-gold';
  if (score >= 85) return 'text-cyan-400';
  if (score >= 65) return 'text-emerald-400';
  if (score >= 51) return 'text-amber-400';
  if (score >= 31) return 'text-orange-400';
  return 'text-rose-400';
}

export default function MatchTimeline({
  player, entries, allPlayers = [], loading, className = '',
}: MatchTimelineProps) {
  const t = useTranslations('playerDetail');
  const tp = useTranslations('player');
  const [mode, setMode] = useState<ViewMode>('L5');

  const displayed = useMemo(() => {
    const limit = mode === 'L5' ? 5 : 15;
    return entries.slice(0, limit);
  }, [entries, mode]);

  // Aggregates
  const agg = useMemo(() => {
    const played = displayed.filter(e => e.status === 'played');
    if (played.length === 0) return null;
    return {
      avgScore: Math.round(played.reduce((s, e) => s + e.score, 0) / played.length),
      avgMin: Math.round(played.reduce((s, e) => s + e.minutesPlayed, 0) / played.length),
      totalGoals: played.reduce((s, e) => s + e.goals, 0),
      totalAssists: played.reduce((s, e) => s + e.assists, 0),
      totalCS: player.pos === 'GK' ? played.filter(e => e.cleanSheet).length : 0,
      gamesPlayed: played.length,
    };
  }, [displayed]);

  // Form dots: W/D/L from matchScore (format: "teamScore-opponentScore")
  const formDots = useMemo(() => {
    const played = displayed.filter(e => e.status === 'played' && e.matchScore);
    return played.map(e => {
      const parts = e.matchScore.split('-').map(Number);
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return 'gray';
      if (parts[0] > parts[1]) return 'W';
      if (parts[0] === parts[1]) return 'D';
      return 'L';
    });
  }, [displayed]);

  const perfValue = mode === 'L5' ? player.perf.l5 : player.perf.l15;
  const l5Hex = getL5Hex(perfValue);
  const posTint = posTintColors[player.pos];
  const percentile = usePositionPercentile(player.pos, player.perf.l5, allPlayers);
  const scoreTick = useNumTick(perfValue);

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* ── Hero Strip: L5/L15 + Trend + Percentile ── */}
      <div
        className="relative p-4 md:px-6 border-b border-white/[0.06] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${posTint}12 0%, transparent 60%)`,
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="size-5 text-gold" aria-hidden="true" />
            {/* Toggle L5 / L15 */}
            <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5">
              {(['L5', 'L15'] as ViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-bold transition-colors min-h-[28px]',
                    mode === m
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            {/* Score number — hero size */}
            <span
              className={cn('font-mono font-black text-3xl tabular-nums', scoreTick)}
              style={{ color: scoreColor(perfValue) }}
            >
              {perfValue || '\u2013'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Trend */}
            <div className={cn(
              'flex items-center gap-1 text-xs font-bold',
              player.perf.trend === 'UP' ? 'text-green-500' :
                player.perf.trend === 'DOWN' ? 'text-red-300' : 'text-white/40'
            )}>
              {player.perf.trend === 'UP' && <TrendingUp className="size-3.5" aria-hidden="true" />}
              {player.perf.trend === 'DOWN' && <TrendingDown className="size-3.5" aria-hidden="true" />}
              {player.perf.trend === 'UP' ? t('trendHot') : player.perf.trend === 'DOWN' ? t('trendCold') : t('trendStable')}
            </div>
            {/* Percentile */}
            {percentile && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: posTint, backgroundColor: `${posTint}15` }}
              >
                Top {100 - percentile.percentile}% {player.pos}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Form Dots ── */}
      {formDots.length > 0 && (
        <div className="px-4 md:px-6 py-2 border-b border-white/[0.04] flex items-center gap-2">
          <span className="text-[10px] text-white/30 shrink-0">{t('formLabel')}</span>
          <div className="flex items-center gap-1.5">
            {formDots.map((result, i) => (
              <span
                key={i}
                className={cn(
                  'size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  result === 'W' && 'bg-emerald-500/25 text-emerald-400',
                  result === 'D' && 'bg-amber-500/25 text-amber-400',
                  result === 'L' && 'bg-red-500/25 text-red-400',
                  result === 'gray' && 'bg-white/[0.06] text-white/30',
                )}
                title={result === 'W' ? t('formWin') : result === 'D' ? t('formDraw') : result === 'L' ? t('formLoss') : '?'}
              >
                {result === 'gray' ? '?' : result}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Data Freshness Info ── */}
      {player.lastAppearanceGw > 0 && (
        <div className="px-4 md:px-6 py-1.5 border-b border-white/[0.04]">
          <span className="text-[11px] text-white/40">
            {tp('dataUntilGw', { gw: player.lastAppearanceGw, matches: player.stats.matches })}
          </span>
        </div>
      )}

      {/* ── Match Rows ── */}
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-white/30" aria-hidden="true" />
          </div>
        ) : displayed.length === 0 || displayed.every(e => e.status === 'not_in_squad') ? (
          <div className="flex items-center justify-center gap-2 py-8 px-4 text-center text-white/30 text-sm">
            {player.status === 'injured' ? (
              <>
                <AlertTriangle className="size-4 text-red-400 shrink-0" aria-hidden="true" />
                <span>{tp('explainInjured', { gw: player.lastAppearanceGw })}</span>
              </>
            ) : player.status === 'suspended' ? (
              <span>{tp('explainSuspended')}</span>
            ) : player.status === 'doubtful' && player.lastAppearanceGw > 0 ? (
              <span>{tp('explainInactive', { gw: player.lastAppearanceGw })}</span>
            ) : player.stats.matches === 0 ? (
              <span>{tp('explainNoAppearances')}</span>
            ) : (
              <span>{tp('explainNoData')}</span>
            )}
          </div>
        ) : (
          displayed.map((entry) => {
            const isPlayed = entry.status === 'played';
            const isBench = entry.status === 'bench';
            const isAbsent = entry.status === 'not_in_squad';
            const barPct = entry.score > 0 ? Math.min(100, Math.max(5, ((entry.score - 40) / 110) * 100)) : 0;

            return (
              <div
                key={`${entry.gameweek}-${entry.fixtureId}`}
                className={cn(
                  'flex items-center gap-2 px-4 md:px-6 py-2.5 text-sm',
                  !isPlayed && 'opacity-40'
                )}
              >
                {/* GW */}
                <span className="text-[10px] font-mono text-white/30 w-8 shrink-0 tabular-nums">
                  GW{entry.gameweek}
                </span>

                {/* Opponent */}
                <span className="flex items-center gap-1 text-xs font-bold w-[72px] shrink-0">
                  <span className="text-white/30 text-[9px]">{entry.isHome ? 'H' : 'A'}</span>
                  {entry.opponentLogoUrl ? (
                    <img
                      src={entry.opponentLogoUrl}
                      alt=""
                      className="size-4 shrink-0 object-contain"
                    />
                  ) : null}
                  <span className="truncate">{entry.opponent}</span>
                </span>

                {/* Bench / Not in Squad — short-circuit render */}
                {!isPlayed ? (
                  <span className="flex-1 text-xs text-white/25 italic">
                    {isBench ? t('statusBench') : t('statusNotInSquad')}
                  </span>
                ) : (
                  <>
                    {/* Minutes + Starter/Sub */}
                    <span className="font-mono tabular-nums text-xs w-12 shrink-0 text-right text-white/50 flex items-center justify-end gap-0.5">
                      <span className={cn(
                        'text-[8px] font-bold px-1 rounded',
                        entry.isStarter
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      )}>
                        {entry.isStarter ? t('starterLabel') : t('subLabel')}
                      </span>
                      {entry.minutesPlayed}&apos;
                    </span>

                    {/* Events */}
                    <div className="flex items-center gap-0.5 w-16 shrink-0">
                      {entry.goals > 0 && Array.from({ length: entry.goals }).map((_, i) => (
                        <span key={`g${i}`} className="text-[11px]" title={t('goals')}>&#9917;</span>
                      ))}
                      {entry.assists > 0 && Array.from({ length: entry.assists }).map((_, i) => (
                        <span key={`a${i}`} className="text-[11px] text-sky-400" title={t('assists')}>&#127380;</span>
                      ))}
                      {entry.cleanSheet && player.pos === 'GK' && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1 rounded" title={t('statCS')}>CS</span>
                      )}
                      {entry.yellowCard && (
                        <span className="w-2 h-3 bg-yellow-400 rounded-sm inline-block" title={t('yellowCard')} />
                      )}
                      {entry.redCard && (
                        <span className="w-2 h-3 bg-red-500 rounded-sm inline-block" title={t('redCard')} />
                      )}
                    </div>

                    {/* Score + Bar */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={cn(
                        'font-mono font-black text-sm w-8 text-right tabular-nums shrink-0',
                        scoreTextClass(entry.score)
                      )}>
                        {entry.score}
                      </span>
                      <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${barPct}%`, backgroundColor: scoreColor(entry.score) }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Match Result (desktop) */}
                {entry.matchScore && (
                  <span className="hidden md:inline font-mono text-[10px] text-white/30 tabular-nums w-8 text-right shrink-0">
                    {entry.matchScore}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Aggregate Footer ── */}
      {agg && (
        <div className="border-t border-white/[0.06] px-4 md:px-6 py-3 flex items-center gap-4 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <span className="text-white/30">&empty;</span>
            <span className={cn('font-mono font-bold tabular-nums', scoreTextClass(agg.avgScore))}>{agg.avgScore}</span>
          </span>
          <span className="font-mono tabular-nums">{agg.avgMin}&apos; avg</span>
          {agg.totalGoals > 0 && (
            <span className="font-mono tabular-nums">{agg.totalGoals} {t('goalsShort')}</span>
          )}
          {agg.totalAssists > 0 && (
            <span className="font-mono tabular-nums">{agg.totalAssists} {t('assistsShort')}</span>
          )}
          {agg.totalCS > 0 && player.pos === 'GK' && (
            <span className="font-mono tabular-nums">{agg.totalCS} CS</span>
          )}
          <span className="text-white/25">{agg.gamesPlayed}/{displayed.length} {t('played')}</span>
        </div>
      )}
    </Card>
  );
}
