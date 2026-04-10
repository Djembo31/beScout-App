'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { fmtScout, cn } from '@/lib/utils';
import { Briefcase } from 'lucide-react';
import { posTintColors } from '@/components/player/positionColors';
import type { Pos } from '@/types';
import type { ClubLookup } from '@/lib/clubs';

// ── Position labels (German, matching Home ScoutCardStats) ──
const POS_ROWS: Array<{ pos: Pos; label: string }> = [
  { pos: 'GK', label: 'TW' },
  { pos: 'DEF', label: 'ABW' },
  { pos: 'MID', label: 'MID' },
  { pos: 'ATT', label: 'ATT' },
];

export type ClubCount = { club: ClubLookup; count: number };

interface BestandHeaderProps {
  totalValueBsd: number;
  totalCostBsd: number;
  scCount: number;
  posCounts: Record<Pos, number>;
  clubCounts: ClubCount[];
}

export default function BestandHeader({ totalValueBsd, totalCostBsd, scCount, posCounts, clubCounts }: BestandHeaderProps) {
  const t = useTranslations('market');
  const pnlBsd = totalValueBsd - totalCostBsd;
  const pnlPct = totalCostBsd > 0 ? (pnlBsd / totalCostBsd) * 100 : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      {/* Row 1: Portfolio value + P&L */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Briefcase className="size-5 text-gold" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs text-white/40">{t('bestandPortfolioValue')}</div>
            <div className="font-mono font-black text-lg tabular-nums text-gold">
              {fmtScout(totalValueBsd)} CR
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/40">
            {scCount} Scout Cards
          </div>
          <div className={cn(
            'font-mono font-bold text-sm tabular-nums',
            pnlBsd >= 0 ? 'text-green-500' : 'text-red-400'
          )}>
            {pnlBsd >= 0 ? '+' : ''}{fmtScout(pnlBsd)} CR ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Row 2: Position breakdown (grid-cols-4, matching Home ScoutCardStats) */}
      <div className="grid grid-cols-4 gap-2">
        {POS_ROWS.map(({ pos, label }) => {
          const count = posCounts[pos] ?? 0;
          const color = posTintColors[pos];
          const isEmpty = count === 0;
          return (
            <div
              key={pos}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border transition-colors',
                'bg-surface-minimal',
                isEmpty ? 'border-white/[0.06]' : 'border-white/10',
              )}
              style={
                isEmpty
                  ? undefined
                  : { borderColor: `${color}30`, background: `linear-gradient(180deg, ${color}08 0%, rgba(255,255,255,0.02) 100%)` }
              }
            >
              <div className="text-[10px] font-black tracking-wider" style={{ color: isEmpty ? 'rgba(255,255,255,0.25)' : color }}>
                {label}
              </div>
              <div className={cn('font-mono font-bold tabular-nums text-sm leading-none', isEmpty ? 'text-white/20' : 'text-white/90')}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 3: Club breakdown — horizontal scroll chips */}
      {clubCounts.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {clubCounts.map(({ club, count }) => (
            <div key={club.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-minimal border border-white/[0.06] shrink-0">
              {club.logo ? (
                <Image src={club.logo} alt="" width={14} height={14} className="size-3.5 rounded-full object-cover" />
              ) : (
                <span className="size-3.5 rounded-full" style={{ backgroundColor: club.colors.primary }} />
              )}
              <span className="text-[10px] text-white/50 font-medium truncate max-w-[80px]">{club.name}</span>
              <span className="text-[10px] font-mono font-bold tabular-nums text-white/70">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
