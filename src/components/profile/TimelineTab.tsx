'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  CircleDollarSign, Trophy, Award, Users, Zap, FileText,
  Vote, Activity, Target, Flame, Banknote, Lock, Unlock, Coins,
} from 'lucide-react';
import { Card, LoadMoreButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatScout, getTransactions } from '@/lib/services/wallet';
import { getTicketTransactions } from '@/lib/services/tickets';
import {
  getActivityIcon, getActivityColor, getActivityLabelKey, getRelativeTime,
} from '@/lib/activityHelpers';
import { FILTER_TYPE_MAP } from '@/lib/transactionTypes';
import { useTranslations, useLocale } from 'next-intl';
import type { DbTransaction, DbTicketTransaction, UserFantasyResult } from '@/types';

// ============================================
// ICON MAP
// ============================================

import { Gift, Calendar, Ticket } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  CircleDollarSign, Trophy, Award, Users, Zap, FileText,
  Vote, Activity, Target, Flame, Banknote, Gift, Calendar, Ticket,
  Lock, Unlock, Coins,
};

function renderActivityIcon(type: string) {
  const iconName = getActivityIcon(type);
  const Icon = ICON_MAP[iconName] ?? Activity;
  return <Icon className="size-4" aria-hidden="true" />;
}

// ============================================
// TYPES & CONSTANTS
// ============================================

const PAGE_SIZE = 20;

type TimelineFilter = 'all' | 'credits' | 'tickets' | 'trades' | 'fantasy' | 'rewards';

// Filter definitions — trades/fantasy/research/rewards use FILTER_TYPE_MAP from SSOT
const FILTERS: { id: TimelineFilter; labelKey: string }[] = [
  { id: 'all', labelKey: 'filterAll' },
  { id: 'credits', labelKey: 'filterCredits' },
  { id: 'tickets', labelKey: 'filterTickets' },
  { id: 'trades', labelKey: 'filterTrades' },
  { id: 'fantasy', labelKey: 'filterFantasy' },
  { id: 'rewards', labelKey: 'filterRewards' },
];

// Ticket source → icon name mapping
const TICKET_ICON_MAP: Record<string, string> = {
  daily_login: 'Flame',
  mission: 'Target',
  daily_challenge: 'Target',
  achievement: 'Award',
  mystery_box: 'Gift',
  event_entry: 'Calendar',
  event_entry_refund: 'Calendar',
  chip_use: 'Zap',
  chip_refund: 'Zap',
  admin_grant: 'CircleDollarSign',
  post_create: 'FileText',
  research_publish: 'FileText',
  research_rating: 'FileText',
};

// Unified row type for mixed timeline (credits + tickets + fantasy results)
type TimelineRow =
  | {
      kind: 'credit';
      id: string;
      amount: number;
      created_at: string;
      description: string | null;
      type: string; // transaction type
      reference_id?: string | null;
    }
  | {
      kind: 'ticket';
      id: string;
      amount: number;
      created_at: string;
      description: string | null;
      type: string; // ticket source
    }
  | {
      kind: 'fantasy';
      id: string;
      created_at: string;
      eventId: string;
      eventName: string;
      gameweek: number | null;
      rank: number;
      totalScore: number;
      rewardAmount: number;
    };

interface TimelineTabProps {
  transactions: DbTransaction[];
  ticketTransactions: DbTicketTransaction[];
  fantasyResults?: UserFantasyResult[];
  userId: string;
  isSelf: boolean;
}

// ============================================
// DAY GROUPING HELPERS
// ============================================

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayLabel(
  dayKey: string,
  todayKey: string,
  yesterdayKey: string,
  todayLabel: string,
  yesterdayLabel: string,
  locale: string,
): string {
  if (dayKey === todayKey) return todayLabel;
  if (dayKey === yesterdayKey) return yesterdayLabel;
  const [year, month, day] = dayKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'long' });
}

function groupByDay(txs: TimelineRow[]): { dayKey: string; items: TimelineRow[] }[] {
  const map = new Map<string, TimelineRow[]>();
  for (const tx of txs) {
    const key = getDayKey(tx.created_at);
    const arr = map.get(key);
    if (arr) {
      arr.push(tx);
    } else {
      map.set(key, [tx]);
    }
  }
  return Array.from(map.entries()).map(([dayKey, items]) => ({ dayKey, items }));
}

// ============================================
// COMPONENT
// ============================================

export default function TimelineTab({
  transactions: initial,
  ticketTransactions: initialTickets,
  fantasyResults = [],
  userId,
  isSelf,
}: TimelineTabProps) {
  const t = useTranslations('profile');
  const ta = useTranslations('activity');
  const locale = useLocale();

  const [transactions, setTransactions] = useState(initial);
  const [ticketTxs, setTicketTxs] = useState(initialTickets);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const [filter, setFilter] = useState<TimelineFilter>('all');

  // Build a set of event_ids from fantasyResults so we can dedupe
  // credit transactions of type `fantasy_reward` that share the same
  // reference_id (i.e. the lineup reward RPC writes both a lineup record
  // with rank+score AND a tx — we keep the richer fantasy row).
  const fantasyEventIds = useMemo(
    () => new Set(fantasyResults.map(f => f.eventId)),
    [fantasyResults],
  );

  // Convert to unified rows
  const creditRows: TimelineRow[] = useMemo(() =>
    transactions
      // Drop fantasy_reward txs that already have a richer fantasy row for the same event
      .filter(tx => !(tx.type === 'fantasy_reward' && tx.reference_id && fantasyEventIds.has(tx.reference_id)))
      .map(tx => ({
        kind: 'credit' as const,
        id: tx.id,
        amount: tx.amount,
        created_at: tx.created_at,
        description: tx.description,
        type: tx.type,
        reference_id: tx.reference_id,
      })),
    [transactions, fantasyEventIds],
  );

  const ticketRows: TimelineRow[] = useMemo(() =>
    ticketTxs.map(tx => ({
      kind: 'ticket' as const,
      id: `t-${tx.id}`,
      amount: tx.amount,
      created_at: tx.created_at,
      description: tx.description,
      type: tx.source,
    })),
    [ticketTxs],
  );

  const fantasyRows: TimelineRow[] = useMemo(() =>
    fantasyResults.map(fr => ({
      kind: 'fantasy' as const,
      id: `f-${fr.eventId}`,
      created_at: fr.eventDate || new Date().toISOString(),
      eventId: fr.eventId,
      eventName: fr.eventName,
      gameweek: fr.gameweek,
      rank: fr.rank,
      totalScore: fr.totalScore,
      rewardAmount: fr.rewardAmount,
    })),
    [fantasyResults],
  );

  const filteredRows = useMemo(() => {
    if (filter === 'all') {
      return [...creditRows, ...ticketRows, ...fantasyRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    if (filter === 'credits') return creditRows;
    if (filter === 'tickets') return ticketRows;
    // Sub-filters
    if (filter === 'fantasy') {
      const filterSet = FILTER_TYPE_MAP.fantasy;
      const matchingCredits = creditRows.filter(r => r.kind === 'credit' && filterSet.has(r.type));
      return [...matchingCredits, ...fantasyRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    const filterSet = FILTER_TYPE_MAP[filter as keyof typeof FILTER_TYPE_MAP];
    return filterSet ? creditRows.filter(r => r.kind === 'credit' && filterSet.has(r.type)) : creditRows;
  }, [filter, creditRows, ticketRows, fantasyRows]);

  // Date keys for today / yesterday
  const { todayKey, yesterdayKey } = useMemo(() => {
    const now = new Date();
    const tk = getDayKey(now.toISOString());
    const yd = new Date(now);
    yd.setDate(yd.getDate() - 1);
    const yk = getDayKey(yd.toISOString());
    return { todayKey: tk, yesterdayKey: yk };
  }, []);

  const dayGroups = useMemo(
    () => groupByDay(filteredRows),
    [filteredRows],
  );

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const [moreTx, moreTickets] = await Promise.all([
        getTransactions(userId, PAGE_SIZE, transactions.length),
        getTicketTransactions(userId, PAGE_SIZE + ticketTxs.length).then(all => all.slice(ticketTxs.length)),
      ]);
      setTransactions(prev => [...prev, ...moreTx]);
      setTicketTxs(prev => [...prev, ...moreTickets]);
      setHasMore(moreTx.length >= PAGE_SIZE || moreTickets.length > 0);
    } catch (err) {
      console.error('TimelineTab: failed to load more', err);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, transactions.length, ticketTxs.length]);

  const dateLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';

  return (
    <Card className="p-4 md:p-6">
      {/* Filter Chips */}
      <div
        role="radiogroup"
        aria-label={t('filterAll')}
        className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1"
      >
        {FILTERS.map(f => (
          <button
            key={f.id}
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-2.5 min-h-[44px] rounded-lg text-[13px] font-medium whitespace-nowrap flex-shrink-0',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]',
              filter === f.id
                ? 'bg-gold/10 text-gold'
                : 'bg-surface-base text-white/40 hover:text-white/60 hover:bg-white/[0.07] active:scale-[0.97]',
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      {filteredRows.length === 0 ? (
        <div className="text-center py-10">
          <Activity className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
          <div className="text-white/40 font-semibold text-sm">
            {t('timelineEmpty')}
          </div>
          <div className="text-xs text-white/25 mt-1">
            {t('timelineEmptyHint')}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {dayGroups.map(({ dayKey, items }) => (
              <div key={dayKey}>
                {/* Day Header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider whitespace-nowrap">
                    {getDayLabel(dayKey, todayKey, yesterdayKey, t('todayLabel'), t('yesterdayLabel'), dateLocale)}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Transaction Rows */}
                <div className="space-y-0.5">
                  {items.map(row => {
                    if (row.kind === 'fantasy') {
                      return (
                        <div
                          key={row.id}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-subtle transition-colors"
                        >
                          {/* Fantasy Icon */}
                          <div className="flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5 bg-emerald-400/10 text-emerald-400">
                            <Trophy className="size-4" aria-hidden="true" />
                          </div>

                          {/* Fantasy content: Event name + rank badge + score */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium leading-snug truncate">
                                {row.eventName}
                              </span>
                              {/* Rank Badge */}
                              <span className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 tabular-nums',
                                row.rank === 1 ? 'bg-gold/15 text-gold' :
                                row.rank === 2 ? 'bg-white/10 text-white/80' :
                                row.rank === 3 ? 'bg-orange-500/15 text-orange-400' :
                                'bg-surface-base text-white/40',
                              )}>
                                {row.rank === 1 ? '🥇 ' : row.rank === 2 ? '🥈 ' : row.rank === 3 ? '🥉 ' : '#'}
                                {row.rank}
                              </span>
                            </div>
                            <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-2">
                              {row.gameweek !== null && (
                                <span>GW {row.gameweek}</span>
                              )}
                              <span className="tabular-nums">{row.totalScore.toFixed(0)} {t('pointsAbbr')}</span>
                              <span>·</span>
                              <span>{getRelativeTime(row.created_at, ta('justNow'), dateLocale)}</span>
                            </div>
                          </div>

                          {/* Reward */}
                          {row.rewardAmount > 0 && (
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-bold tabular-nums text-green-500">
                                +{formatScout(row.rewardAmount)}
                              </span>
                              <div className="text-[10px] text-white/20 mt-0.5">CR</div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Credit or ticket row
                    const positive = row.amount > 0;
                    const isTicket = row.kind === 'ticket';
                    return (
                      <div
                        key={row.id}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-subtle transition-colors"
                      >
                        {/* Icon */}
                        <div className={cn(
                          'flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5',
                          isTicket ? 'bg-amber-500/10 text-amber-400' : getActivityColor(row.type),
                        )}>
                          {isTicket
                            ? (() => { const I = ICON_MAP[TICKET_ICON_MAP[row.type] ?? 'Ticket'] ?? Ticket; return <I className="size-4" aria-hidden="true" />; })()
                            : renderActivityIcon(row.type)
                          }
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium leading-snug">
                            {row.description || (isTicket ? t(`ticketSource_${row.type}`) : ta(getActivityLabelKey(row.type)))}
                          </div>
                          <div className="text-[10px] text-white/25 mt-0.5">
                            {getRelativeTime(row.created_at, ta('justNow'), dateLocale)}
                          </div>
                        </div>

                        {/* Amount — positive always visible, negative self only */}
                        {(isSelf || positive) && (
                          <div className="text-right shrink-0">
                            <span className={cn(
                              'text-xs font-mono font-bold tabular-nums',
                              positive ? 'text-green-500' : 'text-white/40',
                            )}>
                              {positive ? '+' : ''}{isTicket ? row.amount : formatScout(row.amount)}
                            </span>
                            <div className="text-[10px] text-white/20 mt-0.5">
                              {isTicket ? 'Tickets' : 'CR'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <LoadMoreButton loading={loadingMore} hasMore={hasMore} onLoadMore={handleLoadMore} />
        </>
      )}
    </Card>
  );
}
