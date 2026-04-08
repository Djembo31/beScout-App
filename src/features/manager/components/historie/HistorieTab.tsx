'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useManagerStore } from '../../store/managerStore';
import { useUserFantasyHistory } from '../../queries/historyQueries';
import HistoryEventCard from './HistoryEventCard';
import HistoryStats from './HistoryStats';
import type { UserFantasyResult } from '@/types';

// ============================================
// FILTER CONFIG
// ============================================

const TIME_OPTIONS = [
  { id: 'all', labelKey: 'historyFilterAll' },
  { id: '30d', labelKey: 'historyFilter30d' },
  { id: '90d', labelKey: 'historyFilter90d' },
  { id: 'season', labelKey: 'historyFilterSeason' },
] as const;

const STATUS_OPTIONS = [
  { id: 'all', labelKey: 'historyFilterAll' },
  { id: 'top3', labelKey: 'historyFilterTop3' },
  { id: 'top10', labelKey: 'historyFilterTop10' },
  { id: 'other', labelKey: 'historyFilterOther' },
] as const;

const SORT_OPTIONS = [
  { id: 'date', labelKey: 'historySortDate' },
  { id: 'score', labelKey: 'historySortScore' },
  { id: 'rank', labelKey: 'historySortRank' },
  { id: 'reward', labelKey: 'historySortReward' },
] as const;

function FilterPills<T extends string>({
  options,
  active,
  onChange,
}: {
  options: readonly { id: T; labelKey: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  const t = useTranslations('manager');
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 transition-colors min-h-[32px]',
            active === opt.id
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70',
          )}
        >
          {t(opt.labelKey, { defaultValue: opt.id })}
        </button>
      ))}
    </div>
  );
}

// ============================================
// MAIN
// ============================================

export default function HistorieTab() {
  const t = useTranslations('manager');

  const timeFilter = useManagerStore((s) => s.historyTimeFilter);
  const statusFilter = useManagerStore((s) => s.historyStatusFilter);
  const sort = useManagerStore((s) => s.historySort);
  const setTimeFilter = useManagerStore((s) => s.setHistoryTimeFilter);
  const setStatusFilter = useManagerStore((s) => s.setHistoryStatusFilter);
  const setSort = useManagerStore((s) => s.setHistorySort);

  const { data: results = [], isLoading } = useUserFantasyHistory(50);

  const filtered = useMemo<UserFantasyResult[]>(() => {
    let arr = [...results];

    // Time filter
    if (timeFilter !== 'all') {
      const now = Date.now();
      const cutoff =
        timeFilter === '30d'
          ? now - 30 * 86400000
          : timeFilter === '90d'
          ? now - 90 * 86400000
          : 0; // 'season' = no cutoff for now (would require season start date)
      if (cutoff > 0) {
        arr = arr.filter((r) => {
          if (!r.eventDate) return false;
          return new Date(r.eventDate).getTime() >= cutoff;
        });
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      arr = arr.filter((r) => {
        if (statusFilter === 'top3') return r.rank > 0 && r.rank <= 3;
        if (statusFilter === 'top10') return r.rank > 0 && r.rank <= 10;
        if (statusFilter === 'other') return r.rank > 10;
        return true;
      });
    }

    // Sort
    arr.sort((a, b) => {
      switch (sort) {
        case 'score':
          return b.totalScore - a.totalScore;
        case 'rank':
          return (a.rank || 9999) - (b.rank || 9999);
        case 'reward':
          return (b.rewardAmount ?? 0) - (a.rewardAmount ?? 0);
        case 'date':
        default:
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
      }
    });

    return arr;
  }, [results, timeFilter, statusFilter, sort]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <History className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
        <div className="text-sm font-bold text-white/60 mb-1">
          {t('historyEmptyTitle', { defaultValue: 'Noch keine Historie' })}
        </div>
        <div className="text-xs text-white/40">
          {t('historyEmptyDesc', { defaultValue: 'Spiele dein erstes Event, um Ergebnisse zu sehen' })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HistoryStats results={results} />

      {/* Filters */}
      <div className="space-y-2">
        <FilterPills options={TIME_OPTIONS} active={timeFilter} onChange={setTimeFilter} />
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPills options={STATUS_OPTIONS} active={statusFilter} onChange={setStatusFilter} />
          <div className="flex-1 min-w-0">
            <FilterPills options={SORT_OPTIONS} active={sort} onChange={setSort} />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-white/40">
          {t('historyFilterEmpty', { defaultValue: 'Kein Event entspricht den Filtern' })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((result) => (
            <HistoryEventCard key={result.eventId} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
