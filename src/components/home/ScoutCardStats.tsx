'use client';

import { memo } from 'react';
import { Card } from '@/components/ui';
import { posTintColors } from '@/components/player/PlayerRow';
import type { DpcHolding } from '@/types';
import { cn } from '@/lib/utils';

interface ScoutCardStatsProps {
  holdings: DpcHolding[];
}

// Anil specified these German-leaning short labels in the polish-sweep
// requirements: TW / ABW / MID / ATT. Kept as literal strings for now —
// i18n for position short-labels is tracked as scope-creep.
const POS_ROWS: Array<{ pos: 'GK' | 'DEF' | 'MID' | 'ATT'; label: string }> = [
  { pos: 'GK',  label: 'TW' },
  { pos: 'DEF', label: 'ABW' },
  { pos: 'MID', label: 'MID' },
  { pos: 'ATT', label: 'ATT' },
];

function ScoutCardStatsInner({ holdings }: ScoutCardStatsProps) {
  // Sum qty per position — fastest via single pass
  const byPos: Record<'GK' | 'DEF' | 'MID' | 'ATT', number> = {
    GK: 0, DEF: 0, MID: 0, ATT: 0,
  };
  let totalSC = 0;
  for (const h of holdings) {
    const pos = (h.pos as 'GK' | 'DEF' | 'MID' | 'ATT');
    if (pos in byPos) {
      byPos[pos] += h.qty;
    }
    totalSC += h.qty;
  }

  if (totalSC === 0) return null;

  return (
    <Card className="p-4 shadow-card-md">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-0.5">
            Scout Cards
          </div>
          <div className="font-mono font-black text-3xl tabular-nums gold-glow leading-none">
            {totalSC}
          </div>
        </div>
        <div className="text-[10px] text-white/30 font-mono tabular-nums">
          {holdings.length} {holdings.length === 1 ? 'Spieler' : 'Spieler'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {POS_ROWS.map(({ pos, label }) => {
          const count = byPos[pos];
          const color = posTintColors[pos];
          const isEmpty = count === 0;
          return (
            <div
              key={pos}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-lg border transition-colors',
                'bg-surface-minimal',
                isEmpty ? 'border-white/[0.06]' : 'border-white/10',
              )}
              style={
                isEmpty
                  ? undefined
                  : {
                      borderColor: `${color}30`,
                      background: `linear-gradient(180deg, ${color}08 0%, rgba(255,255,255,0.02) 100%)`,
                    }
              }
            >
              <div
                className="text-[10px] font-black tracking-wider"
                style={{ color: isEmpty ? 'rgba(255,255,255,0.25)' : color }}
              >
                {label}
              </div>
              <div
                className={cn(
                  'font-mono font-bold tabular-nums text-base leading-none',
                  isEmpty ? 'text-white/20' : 'text-white/90',
                )}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default memo(ScoutCardStatsInner);
