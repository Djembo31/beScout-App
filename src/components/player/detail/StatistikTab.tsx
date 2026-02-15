'use client';

import React from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui';
import { ScoreCircle, MiniSparkline } from '@/components/player';
import type { Player } from '@/types';
import type { PlayerGameweekScore } from '@/lib/services/scoring';
import GameweekScoreBar from './GameweekScoreBar';

interface StatistikTabProps {
  player: Player;
  gwScores: PlayerGameweekScore[];
}

export default function StatistikTab({ player, gwScores }: StatistikTabProps) {
  // Compute average from GW scores
  const avgScore = gwScores.length > 0
    ? Math.round(gwScores.reduce((s, g) => s + g.score, 0) / gwScores.length)
    : 0;
  const scoreColor = avgScore >= 100 ? 'text-[#FFD700]' : avgScore >= 70 ? 'text-white' : avgScore > 0 ? 'text-red-400' : 'text-white/30';

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Score Overview */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#FFD700]" />
          Performance-Übersicht
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* L5 vs L15 */}
          <div>
            <div className="text-xs text-white/50 mb-3">Letzte Bewertungen</div>
            <div className="flex items-center gap-4">
              <ScoreCircle label="L5" value={player.perf.l5} size={64} />
              <ScoreCircle label="L15" value={player.perf.l15} size={56} />
              <div className="text-sm">
                <div className={`font-bold flex items-center gap-1 ${player.perf.trend === 'UP' ? 'text-[#22C55E]' : player.perf.trend === 'DOWN' ? 'text-red-300' : 'text-white/60'}`}>
                  {player.perf.trend === 'UP' ? <TrendingUp className="w-4 h-4" /> : player.perf.trend === 'DOWN' ? <TrendingDown className="w-4 h-4" /> : null}
                  {player.perf.trend === 'UP' ? 'Hot' : player.perf.trend === 'DOWN' ? 'Cold' : 'Stable'}
                </div>
                <div className="text-white/50 text-xs">Form Trend</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="text-xs text-white/50 mb-3">Saison-Statistiken</div>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="text-center bg-black/20 rounded-xl py-3">
                <div className="text-2xl font-mono font-black">{player.stats.matches}</div>
                <div className="text-[10px] text-white/50">Spiele</div>
              </div>
              <div className="text-center bg-black/20 rounded-xl py-3">
                <div className="text-2xl font-mono font-black text-[#22C55E]">{player.stats.goals}</div>
                <div className="text-[10px] text-white/50">Tore</div>
              </div>
              <div className="text-center bg-black/20 rounded-xl py-3">
                <div className="text-2xl font-mono font-black text-sky-300">{player.stats.assists}</div>
                <div className="text-[10px] text-white/50">Assists</div>
              </div>
            </div>
          </div>
        </div>

        {/* Season Sparkline */}
        {gwScores.length >= 3 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white/50">Saison-Verlauf</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">&empty;</span>
                <span className={`font-mono font-bold text-sm ${scoreColor}`}>{avgScore}</span>
              </div>
            </div>
            <MiniSparkline
              values={gwScores.map(g => g.score)}
              width={400}
              height={48}
            />
          </div>
        )}
      </Card>

      {/* Gameweek Score Bars */}
      <GameweekScoreBar scores={gwScores} maxDisplay={15} />
    </div>
  );
}
