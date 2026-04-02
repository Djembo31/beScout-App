'use client';

import { cn } from '@/lib/utils';

interface StatsTabProps {
  matchesPlayed: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  status?: string;
  nextFixture: { opponent: string; isHome: boolean; date: string } | null;
  age: number | null;
}

function StatRow({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-white/50 text-sm">{label}</span>
      <span className={cn('text-white text-sm', mono && 'font-mono tabular-nums')}>{value}</span>
    </div>
  );
}

export default function StatsTab({
  matchesPlayed,
  goals,
  assists,
  minutesPlayed,
  status,
  nextFixture,
  age,
}: StatsTabProps) {
  const statusColor = status === 'injured'
    ? 'bg-red-400'
    : status === 'suspended'
      ? 'bg-purple-400'
      : status === 'doubtful'
        ? 'bg-yellow-400'
        : 'bg-green-400';

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-black text-white/40 uppercase tracking-wider mb-3">
        Saison-Statistiken
      </h3>

      <StatRow label="Spiele" value={matchesPlayed} />
      <StatRow label="Tore" value={goals} />
      <StatRow label="Assists" value={assists} />
      <StatRow label="Minuten" value={minutesPlayed.toLocaleString('de-DE')} />

      <div className="border-t border-white/[0.06] my-3" />

      <div className="flex items-center justify-between py-2">
        <span className="text-white/50 text-sm">Fitness</span>
        <span className="flex items-center gap-2 text-sm text-white">
          <span className={cn('size-2 rounded-full', statusColor)} aria-hidden="true" />
          {status === 'fit' || !status ? 'Fit' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {nextFixture && (
        <div className="flex items-center justify-between py-2">
          <span className="text-white/50 text-sm">Gegner</span>
          <span className="text-white text-sm">
            {nextFixture.opponent} ({nextFixture.isHome ? 'H' : 'A'})
          </span>
        </div>
      )}

      {age != null && (
        <StatRow label="Alter" value={age} />
      )}
    </div>
  );
}
