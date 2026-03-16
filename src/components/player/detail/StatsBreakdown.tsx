'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import type { Player } from '@/types';

interface StatsBreakdownProps {
  player: Player;
  allPlayers: Player[];
  className?: string;
}

interface StatRow {
  label: string;
  value: number;
  percentile: number;
}

function calcPercentile(value: number, values: number[]): number {
  if (values.length === 0) return 0;
  const below = values.filter(v => v < value).length;
  return Math.round((below / values.length) * 100);
}

export default function StatsBreakdown({ player, allPlayers, className = '' }: StatsBreakdownProps) {
  const t = useTranslations('playerDetail');

  const stats = useMemo(() => {
    const samePos = allPlayers.filter(p => p.pos === player.pos);

    const getRow = (label: string, value: number, extractor: (p: Player) => number): StatRow => ({
      label,
      value,
      percentile: calcPercentile(value, samePos.map(extractor)),
    });

    const common = [
      getRow(t('matches'), player.stats.matches, p => p.stats.matches),
      getRow(t('goals'), player.stats.goals, p => p.stats.goals),
      getRow(t('assists'), player.stats.assists, p => p.stats.assists),
    ];

    switch (player.pos) {
      case 'GK':
        return [
          getRow(t('statSaves'), player.stats.saves, p => p.stats.saves),
          getRow(t('statCS'), player.stats.cleanSheets, p => p.stats.cleanSheets),
          ...common,
          getRow(t('statMinutes'), player.stats.minutes, p => p.stats.minutes),
        ];
      case 'DEF':
        return [
          getRow(t('statCS'), player.stats.cleanSheets, p => p.stats.cleanSheets),
          ...common,
          getRow(t('statMinutes'), player.stats.minutes, p => p.stats.minutes),
        ];
      case 'MID':
        return [
          ...common,
          getRow(t('statCS'), player.stats.cleanSheets, p => p.stats.cleanSheets),
          getRow(t('statMinutes'), player.stats.minutes, p => p.stats.minutes),
        ];
      case 'ATT':
      default:
        return [
          getRow(t('goals'), player.stats.goals, p => p.stats.goals),
          getRow(t('assists'), player.stats.assists, p => p.stats.assists),
          getRow(t('matches'), player.stats.matches, p => p.stats.matches),
          getRow(t('statMinutes'), player.stats.minutes, p => p.stats.minutes),
        ];
    }
  }, [player, allPlayers, t]);

  const posColor = player.pos === 'GK' ? '#34d399' : player.pos === 'DEF' ? '#fbbf24' : player.pos === 'MID' ? '#38bdf8' : '#fb7185';

  if (allPlayers.length < 5) return null;

  return (
    <Card className={`p-4 md:p-6 ${className}`}>
      <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-balance">
        <BarChart3 className="size-5" style={{ color: posColor }} aria-hidden="true" />
        {t('statsBreakdown')}
        <span className="text-xs font-normal text-white/40 ml-1">
          vs. {player.pos}
        </span>
      </h3>
      <div className="space-y-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3">
            <span className="text-xs text-white/50 w-20 shrink-0">{s.label}</span>
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(3, s.percentile)}%`, backgroundColor: posColor }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs font-bold text-white/80 w-8 text-right tabular-nums">{s.value}</span>
              <span className="text-[10px] text-white/30 w-10 text-right tabular-nums">
                {s.percentile}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
