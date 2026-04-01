'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import type { Player } from '@/types';

interface StatsBreakdownProps {
  player: Player;
  percentiles: Record<string, number>;
  className?: string;
}

interface StatRow {
  label: string;
  value: number;
  percentile: number; // 0-100
}

export default function StatsBreakdown({ player, percentiles, className = '' }: StatsBreakdownProps) {
  const t = useTranslations('playerDetail');

  const stats = useMemo(() => {
    const pct = (key: string) => Math.round((percentiles[key] ?? 0) * 100);

    const makeRow = (label: string, value: number, pctKey: string): StatRow => ({
      label, value, percentile: pct(pctKey),
    });

    const common = [
      makeRow(t('matches'), player.stats.matches, 'pos_matches_pct'),
      makeRow(t('goals'), player.stats.goals, 'pos_goals_pct'),
      makeRow(t('assists'), player.stats.assists, 'pos_assists_pct'),
    ];

    switch (player.pos) {
      case 'GK':
        return [
          makeRow(t('statSaves'), player.stats.saves, 'pos_saves_pct'),
          makeRow(t('statCS'), player.stats.cleanSheets, 'pos_clean_sheets_pct'),
          ...common,
          makeRow(t('statMinutes'), player.stats.minutes, 'pos_minutes_pct'),
        ];
      case 'DEF':
        return [
          ...common,
          makeRow(t('statMinutes'), player.stats.minutes, 'pos_minutes_pct'),
        ];
      case 'MID':
        return [
          ...common,
          makeRow(t('statMinutes'), player.stats.minutes, 'pos_minutes_pct'),
        ];
      case 'ATT':
      default:
        return [
          makeRow(t('goals'), player.stats.goals, 'pos_goals_pct'),
          makeRow(t('assists'), player.stats.assists, 'pos_assists_pct'),
          makeRow(t('matches'), player.stats.matches, 'pos_matches_pct'),
          makeRow(t('statMinutes'), player.stats.minutes, 'pos_minutes_pct'),
        ];
    }
  }, [player, percentiles, t]);

  const posColor = player.pos === 'GK' ? '#34d399' : player.pos === 'DEF' ? '#fbbf24' : player.pos === 'MID' ? '#38bdf8' : '#fb7185';

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
                className="h-full rounded-full transition-colors duration-500"
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
