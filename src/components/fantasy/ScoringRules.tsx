'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type ScoringRow = {
  key: string;
  gk: string;
  def: string;
  mid: string;
  att: string;
};

const SCORING_DATA: ScoringRow[] = [
  { key: 'appearance60',    gk: '+2',    def: '+2',    mid: '+2',    att: '+2'    },
  { key: 'appearanceSub',   gk: '+1',    def: '+1',    mid: '+1',    att: '+1'    },
  { key: 'goal',            gk: '+6',    def: '+6',    mid: '+5',    att: '+4'    },
  { key: 'assist',          gk: '+3',    def: '+3',    mid: '+3',    att: '+3'    },
  { key: 'cleanSheet',      gk: '+4',    def: '+4',    mid: '+1',    att: '—'     },
  { key: 'goalsConceded2',  gk: '-1',    def: '-1',    mid: '—',     att: '—'     },
  { key: 'gkSaves3',        gk: '+1',    def: '—',     mid: '—',     att: '—'     },
  { key: 'yellowCard',      gk: '-1',    def: '-1',    mid: '-1',    att: '-1'    },
  { key: 'redCard',         gk: '-3',    def: '-3',    mid: '-3',    att: '-3'    },
  { key: 'captainBonus',    gk: '1.5x',  def: '1.5x',  mid: '1.5x',  att: '1.5x'  },
];

function pointClass(val: string): string {
  if (val.startsWith('+')) return 'text-green-500';
  if (val.startsWith('-')) return 'text-red-400';
  if (val === '—') return 'text-white/30';
  return 'text-gold'; // captain bonus
}

export function ScoringRules() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('fantasy.scoring');

  const positions = [
    { key: 'gk' as const, color: 'bg-emerald-500/20 text-emerald-400' },
    { key: 'def' as const, color: 'bg-amber-500/20 text-amber-400' },
    { key: 'mid' as const, color: 'bg-sky-500/20 text-sky-400' },
    { key: 'att' as const, color: 'bg-rose-500/20 text-rose-400' },
  ];

  return (
    <div className="bg-surface-minimal border border-white/10 rounded-2xl overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-subtle min-h-[44px]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <Info className="size-4 text-gold flex-shrink-0" />
          {t('title')}
        </span>
        {open
          ? <ChevronUp className="size-4 text-white/40 flex-shrink-0" />
          : <ChevronDown className="size-4 text-white/40 flex-shrink-0" />
        }
      </button>

      {/* Collapsible Content */}
      {open && (
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full min-w-[360px] text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-3 text-white/50 font-medium" />
                {positions.map(pos => (
                  <th key={pos.key} className="py-2 px-1.5 text-center">
                    <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-bold', pos.color)}>
                      {t(pos.key)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCORING_DATA.map((row) => (
                <tr
                  key={row.key}
                  className={cn(
                    'border-b border-white/[0.04]',
                    row.key === 'captainBonus' && 'bg-gold/[0.05]'
                  )}
                >
                  <td className="py-2 pr-3 text-white/70 whitespace-nowrap">
                    {t(row.key)}
                  </td>
                  <td className={cn('py-2 px-1.5 text-center font-mono tabular-nums', pointClass(row.gk))}>
                    {row.gk}
                  </td>
                  <td className={cn('py-2 px-1.5 text-center font-mono tabular-nums', pointClass(row.def))}>
                    {row.def}
                  </td>
                  <td className={cn('py-2 px-1.5 text-center font-mono tabular-nums', pointClass(row.mid))}>
                    {row.mid}
                  </td>
                  <td className={cn('py-2 px-1.5 text-center font-mono tabular-nums', pointClass(row.att))}>
                    {row.att}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
