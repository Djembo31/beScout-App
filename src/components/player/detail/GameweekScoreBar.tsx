'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { Card } from '@/components/ui';
import type { PlayerGameweekScore } from '@/lib/services/scoring';

interface GameweekScoreBarProps {
  scores: PlayerGameweekScore[];
  maxDisplay?: number;
  className?: string;
}

/** Get bar color based on score thresholds */
function getBarColor(score: number): string {
  if (score >= 100) return 'var(--gold)';
  if (score >= 70) return 'rgba(255,255,255,0.30)';
  return 'var(--vivid-red)';
}

function getScoreTextClass(score: number): string {
  if (score >= 100) return 'text-gold';
  if (score >= 70) return 'text-white';
  return 'text-red-400';
}

export default function GameweekScoreBar({ scores, maxDisplay = 10, className = '' }: GameweekScoreBarProps) {
  if (scores.length === 0) {
    return (
      <Card className={`p-4 md:p-6 ${className}`}>
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-gold" />
          Spieltag-Bewertungen
        </h3>
        <div className="text-center py-6">
          <Star className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <div className="text-sm text-white/30">Noch keine Spieltag-Bewertungen</div>
        </div>
      </Card>
    );
  }

  // Sort ascending by gameweek for display (left = oldest, right = newest)
  const displayed = scores.slice(0, maxDisplay).sort((a, b) => a.gameweek - b.gameweek);

  // Detect DNP gaps in the gameweek sequence
  const minGw = displayed[0].gameweek;
  const maxGw = displayed[displayed.length - 1].gameweek;
  const scoreMap = new Map(displayed.map(s => [s.gameweek, s]));

  const bars: { gameweek: number; score: number | null }[] = [];
  for (let gw = minGw; gw <= maxGw; gw++) {
    const entry = scoreMap.get(gw);
    bars.push({ gameweek: gw, score: entry ? entry.score : null });
  }

  const MAX_BAR_HEIGHT = 120;
  const getBarHeight = (score: number) => Math.max(8, ((score - 40) / 110) * MAX_BAR_HEIGHT);

  return (
    <Card className={`p-4 md:p-6 ${className}`}>
      <h3 className="font-black text-lg mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-gold" />
        Spieltag-Bewertungen
      </h3>

      <div className="relative">
        {/* Threshold lines */}
        <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: `${getBarHeight(100) + 28}px` }}>
          <div className="border-t border-dashed border-gold/20 w-full" />
          <span className="absolute -top-3 right-0 text-[8px] font-mono text-gold/30">100</span>
        </div>
        <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: `${getBarHeight(70) + 28}px` }}>
          <div className="border-t border-dashed border-white/10 w-full" />
          <span className="absolute -top-3 right-0 text-[8px] font-mono text-white/20">70</span>
        </div>

        {/* Scrollable bars container */}
        <div className="flex items-end gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide scroll-touch pb-1 pt-6">
          {bars.map((bar) => (
            <div key={bar.gameweek} className="flex flex-col items-center gap-1 shrink-0">
              {/* Score number on top */}
              {bar.score !== null ? (
                <span className={`font-mono font-black text-sm ${getScoreTextClass(bar.score)}`}>
                  {bar.score}
                </span>
              ) : (
                <span className="font-mono font-bold text-[10px] text-white/20">DNP</span>
              )}

              {/* Vertical bar */}
              <div
                className="w-10 md:w-12 rounded-t-lg transition-all"
                style={{
                  height: bar.score !== null ? `${getBarHeight(bar.score)}px` : '8px',
                  backgroundColor: bar.score !== null ? getBarColor(bar.score) : 'rgba(255,255,255,0.06)',
                }}
              />

              {/* Gameweek label */}
              <span className="text-[9px] font-mono text-white/30 mt-0.5">GW{bar.gameweek}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
