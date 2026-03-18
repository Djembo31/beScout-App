'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Player, Pos } from '@/types';

export function SquadOverviewWidget({ players }: { players: Player[] }) {
  const t = useTranslations('club');
  const breakdown = useMemo(() => {
    const counts: Record<Pos, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    players.forEach((p) => { counts[p.pos]++; });
    return counts;
  }, [players]);

  const total = players.length;
  const posColors: Record<Pos, string> = { GK: 'bg-emerald-500', DEF: 'bg-amber-500', MID: 'bg-sky-500', ATT: 'bg-rose-500' };
  const posLabels: Record<Pos, string> = { GK: t('posGK'), DEF: t('posDEF'), MID: t('posMID'), ATT: t('posATT') };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="size-5 text-white/50" />
        <h2 className="font-black text-balance text-lg">{t('squadOverview')}</h2>
      </div>
      <div className="h-4 bg-white/5 rounded-full overflow-hidden flex mb-4">
        {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map((pos) => (
          breakdown[pos] > 0 ? (
            <div key={pos} className={cn('h-full', posColors[pos])} style={{ width: `${(breakdown[pos] / total) * 100}%` }} />
          ) : null
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map((pos) => (
          <div key={pos} className="flex items-center justify-between p-2 bg-surface-base rounded-lg">
            <div className="flex items-center gap-2">
              <div className={cn('size-3 rounded-full', posColors[pos])} />
              <span className="text-sm text-white/70">{posLabels[pos]}</span>
            </div>
            <span className="font-mono tabular-nums text-sm font-bold">{breakdown[pos]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
