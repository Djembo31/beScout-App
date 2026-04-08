'use client';

import { useTranslations } from 'next-intl';
import { Trophy, Award, Target, History } from 'lucide-react';
import { fmtScout } from '@/lib/utils';
import type { UserFantasyResult } from '@/types';

type StatPillProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
};

function StatPill({ icon, label, value, color = 'text-white' }: StatPillProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex-shrink-0 min-h-[52px]"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      {icon}
      <div className="flex flex-col">
        <span className="text-[8px] text-white/40 uppercase font-bold leading-none">{label}</span>
        <span className={`text-base font-mono font-black tabular-nums leading-tight ${color}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

export type HistoryStatsProps = {
  results: UserFantasyResult[];
};

export default function HistoryStats({ results }: HistoryStatsProps) {
  const t = useTranslations('manager');

  const events = results.length;
  const wins = results.filter((r) => r.rank === 1).length;
  const top10 = results.filter((r) => r.rank > 0 && r.rank <= 10).length;
  const totalReward = results.reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <StatPill
        icon={<History className="size-4 text-white/60" aria-hidden="true" />}
        label={t('historyEventsLabel', { defaultValue: 'Events' })}
        value={events}
      />
      <StatPill
        icon={<Trophy className="size-4 text-gold" aria-hidden="true" />}
        label={t('historyWinsLabel', { defaultValue: 'Siege' })}
        value={wins}
        color="text-gold"
      />
      <StatPill
        icon={<Award className="size-4 text-emerald-400" aria-hidden="true" />}
        label={t('historyTop10Label', { defaultValue: 'Top 10' })}
        value={top10}
        color="text-emerald-400"
      />
      <StatPill
        icon={<Target className="size-4 text-gold" aria-hidden="true" />}
        label={t('historyRewardLabel', { defaultValue: 'Belohnung' })}
        value={`+${fmtScout(Math.round(totalReward / 100))}`}
        color="text-gold"
      />
    </div>
  );
}
