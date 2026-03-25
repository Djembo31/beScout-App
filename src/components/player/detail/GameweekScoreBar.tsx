'use client';

import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { PlayerGameweekScore } from '@/lib/services/scoring';

interface GameweekScoreBarProps {
  scores: PlayerGameweekScore[];
  maxDisplay?: number;
  className?: string;
}

import { getScoreHex, getScoreTextClass } from '@/components/player/scoreColor';

export default function GameweekScoreBar({ scores, maxDisplay = 15, className = '' }: GameweekScoreBarProps) {
  const tp = useTranslations('player');
  const t = useTranslations('playerDetail');
  const [selectedGw, setSelectedGw] = useState<PlayerGameweekScore | null>(null);

  if (scores.length === 0) {
    return (
      <Card className={`p-4 md:p-6 ${className}`}>
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-gold" aria-hidden="true" />
          {tp('gwScores')}
        </h3>
        <div className="text-center py-6">
          <Star className="w-8 h-8 text-white/10 mx-auto mb-2" aria-hidden="true" />
          <div className="text-sm text-white/30">{tp('noGwScores')}</div>
        </div>
      </Card>
    );
  }

  // Sort ascending by gameweek (left = oldest, right = newest)
  const displayed = scores.slice(0, maxDisplay).sort((a, b) => a.gameweek - b.gameweek);

  // Fill in DNP gaps
  const minGw = displayed[0].gameweek;
  const maxGw = displayed[displayed.length - 1].gameweek;
  const scoreMap = new Map(displayed.map(s => [s.gameweek, s]));

  const bars: { gameweek: number; score: number | null; data?: PlayerGameweekScore }[] = [];
  for (let gw = minGw; gw <= maxGw; gw++) {
    const entry = scoreMap.get(gw);
    bars.push({ gameweek: gw, score: entry ? entry.score : null, data: entry });
  }

  const MAX_BAR_HEIGHT = 120;
  const getBarHeight = (score: number) => Math.max(8, ((score - 40) / 110) * MAX_BAR_HEIGHT);

  return (
    <>
      <Card className={`p-4 md:p-6 ${className}`}>
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-gold" aria-hidden="true" />
          {tp('gwScores')}
        </h3>

        <div className="relative">
          {/* Threshold lines */}
          <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: `${getBarHeight(100) + 28}px` }}>
            <div className="border-t border-dashed border-gold/20 w-full" />
            <span className="absolute -top-3 right-0 text-[8px] font-mono text-gold/30">100</span>
          </div>
          <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: `${getBarHeight(65) + 28}px` }}>
            <div className="border-t border-dashed border-white/10 w-full" />
            <span className="absolute -top-3 right-0 text-[8px] font-mono text-white/20">65</span>
          </div>

          {/* Scrollable bars */}
          <div className="flex items-end gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide scroll-touch pb-1 pt-6">
            {bars.map((bar) => (
              <button
                key={bar.gameweek}
                type="button"
                onClick={() => bar.data && setSelectedGw(bar.data)}
                disabled={!bar.data}
                className={cn(
                  'flex flex-col items-center gap-1 shrink-0 group',
                  bar.data && 'cursor-pointer'
                )}
              >
                {/* Score number */}
                {bar.score !== null ? (
                  <span className={cn('font-mono font-black text-sm', getScoreTextClass(bar.score))}>
                    {bar.score}
                  </span>
                ) : (
                  <span className="font-mono font-bold text-[10px] text-white/20">DNP</span>
                )}

                {/* Vertical bar */}
                <div
                  className={cn(
                    'w-10 md:w-12 rounded-t-lg transition-all',
                    bar.data && 'group-hover:opacity-80'
                  )}
                  style={{
                    height: bar.score !== null ? `${getBarHeight(bar.score)}px` : '8px',
                    backgroundColor: bar.score !== null ? getScoreHex(bar.score) : 'rgba(255,255,255,0.06)',
                  }}
                />

                {/* GW label */}
                <span className="text-[9px] font-mono text-white/30 mt-0.5">
                  GW{bar.gameweek}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-white/[0.06]">
          {[
            { min: 100, label: '100+', color: 'bg-gold' },
            { min: 90, label: '90\u201399', color: 'bg-[#374DF5]' },
            { min: 80, label: '80\u201389', color: 'bg-[#00ADC4]' },
            { min: 70, label: '70\u201379', color: 'bg-[#00C424]' },
            { min: 60, label: '60\u201369', color: 'bg-[#D9AF00]' },
            { min: 45, label: '45\u201359', color: 'bg-[#ED7E07]' },
            { min: 0, label: '<45', color: 'bg-[#DC0C00]' },
          ].map(tier => (
            <div key={tier.min} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-sm', tier.color)} />
              <span className="text-[9px] text-white/30 font-mono">{tier.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tap-to-expand detail modal */}
      <Modal
        open={!!selectedGw}
        title={selectedGw ? `${t('gwDetail')} ${selectedGw.gameweek}` : ''}
        onClose={() => setSelectedGw(null)}
      >
        {selectedGw && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: getScoreHex(selectedGw.score) + '20' }}
              >
                <span
                  className="font-mono font-black text-3xl tabular-nums"
                  style={{ color: getScoreHex(selectedGw.score) }}
                >
                  {selectedGw.score}
                </span>
              </div>
            </div>
            <div className="text-center text-sm text-white/50">
              {t('gwScoreLabel', { gw: selectedGw.gameweek })}
            </div>
            <div className="text-center text-xs text-white/30">
              {selectedGw.date}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
