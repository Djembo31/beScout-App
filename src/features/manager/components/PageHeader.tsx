'use client';

import { Briefcase, Heart, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatCountdown } from '@/features/fantasy/helpers';
import type { HealthCounts } from '../hooks/useManagerData';
import { useManagerStore } from '../store/managerStore';

export type NextEventInfo = {
  id: string;
  name: string;
  startTime: number;
} | null;

export type PageHeaderProps = {
  squadCount: number;
  healthCounts: HealthCounts;
  nextEvent: NextEventInfo;
  loading?: boolean;
};

export default function PageHeader({ squadCount, healthCounts, nextEvent, loading }: PageHeaderProps) {
  const t = useTranslations('manager');
  const setSelectedEventId = useManagerStore((s) => s.setSelectedEventId);
  const setActiveTab = useManagerStore((s) => s.setActiveTab);

  const handleEventTap = () => {
    if (!nextEvent) return;
    setSelectedEventId(nextEvent.id);
    setActiveTab('aufstellen');
  };

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-black text-white text-balance">
        {t('teamCenterTitle')}
      </h1>

      {loading ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <div className="h-12 w-32 rounded-xl bg-white/[0.04] animate-pulse motion-reduce:animate-none flex-shrink-0" />
          <div className="h-12 w-40 rounded-xl bg-white/[0.04] animate-pulse motion-reduce:animate-none flex-shrink-0" />
          <div className="h-12 w-44 rounded-xl bg-white/[0.04] animate-pulse motion-reduce:animate-none flex-shrink-0" />
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {/* Pill 1: Squad count */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex-shrink-0 min-h-[44px]"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
          >
            <Briefcase className="size-4 text-gold" aria-hidden="true" />
            <span className="font-mono tabular-nums text-sm text-white">{squadCount}</span>
            <span className="text-xs text-white/50">
              {t('squadPlayers')}
            </span>
          </div>

          {/* Pill 2: Health counts */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex-shrink-0 min-h-[44px]"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
          >
            <Heart className="size-4 text-emerald-400" aria-hidden="true" />
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
              <span className="text-emerald-400">{healthCounts.fit}</span>
              <span className="text-white/20">·</span>
              <span className="text-amber-400">{healthCounts.doubtful}</span>
              <span className="text-white/20">·</span>
              <span className="text-rose-400">{healthCounts.injured}</span>
            </div>
          </div>

          {/* Pill 3: Next event (or placeholder) */}
          {nextEvent ? (
            <button
              type="button"
              onClick={handleEventTap}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gold/10 border border-gold/30 flex-shrink-0 min-h-[44px] hover:bg-gold/15 transition-colors active:scale-[0.97]"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
            >
              <Calendar className="size-4 text-gold" aria-hidden="true" />
              <span className="text-xs text-white truncate max-w-[120px]">{nextEvent.name}</span>
              <span className="text-xs font-mono tabular-nums text-gold">
                {formatCountdown(nextEvent.startTime)}
              </span>
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex-shrink-0 min-h-[44px]"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
            >
              <Calendar className="size-4 text-white/30" aria-hidden="true" />
              <span className="text-xs text-white/50">
                {t('noEvent')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
