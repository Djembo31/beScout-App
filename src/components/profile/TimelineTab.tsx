'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  CircleDollarSign, Trophy, Award, Users, Zap, FileText,
  Vote, Activity, Target, Flame, Banknote,
} from 'lucide-react';
import { Card, LoadMoreButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatScout, getTransactions } from '@/lib/services/wallet';
import { getTicketTransactions } from '@/lib/services/tickets';
import {
  getActivityIcon, getActivityColor, getActivityLabelKey, getRelativeTime,
} from '@/lib/activityHelpers';
import { useTranslations, useLocale } from 'next-intl';
import type { DbTransaction, DbTicketTransaction } from '@/types';

// ============================================
// ICON MAP
// ============================================

import { Gift, Calendar, Ticket } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  CircleDollarSign, Trophy, Award, Users, Zap, FileText,
  Vote, Activity, Target, Flame, Banknote, Gift, Calendar, Ticket,
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

const FILTER_TYPE_MAP: Record<'trades' | 'fantasy' | 'research' | 'rewards', Set<string>> = {
  trades: new Set(['buy', 'sell', 'ipo_buy']),
  fantasy: new Set(['fantasy_join', 'fantasy_reward', 'entry_fee']),
  research: new Set(['research_earning', 'mission_reward']),
  rewards: new Set([
    'bounty_reward', 'streak_bonus', 'poll_earning',
    'tip_receive', 'scout_subscription_earning', 'creator_fund_payout',
    'ad_revenue_payout', 'pbt_liquidation',
  ]),
};

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

// Unified row type for mixed timeline
type TimelineRow = {
  id: string;
  amount: number;
  created_at: string;
  description: string | null;
  currency: 'credits' | 'tickets';
  type: string; // transaction type or ticket source
};

interface TimelineTabProps {
  transactions: DbTransaction[];
  ticketTransactions: DbTicketTransaction[];
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

export default function TimelineTab({ transactions: initial, ticketTransactions: initialTickets, userId, isSelf }: TimelineTabProps) {
  const t = useTranslations('profile');
  const ta = useTranslations('activity');
  const locale = useLocale();

  const [transactions, setTransactions] = useState(initial);
  const [ticketTxs, setTicketTxs] = useState(initialTickets);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const [filter, setFilter] = useState<TimelineFilter>('all');

  // Convert to unified rows
  const creditRows: TimelineRow[] = useMemo(() =>
    transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      created_at: tx.created_at,
      description: tx.description,
      currency: 'credits' as const,
      type: tx.type,
    })),
    [transactions],
  );

  const ticketRows: TimelineRow[] = useMemo(() =>
    ticketTxs.map(tx => ({
      id: `t-${tx.id}`,
      amount: tx.amount,
      created_at: tx.created_at,
      description: tx.description,
      currency: 'tickets' as const,
      type: tx.source,
    })),
    [ticketTxs],
  );

  const filteredRows = useMemo(() => {
    if (filter === 'all') {
      return [...creditRows, ...ticketRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    if (filter === 'credits') return creditRows;
    if (filter === 'tickets') return ticketRows;
    // Sub-filters apply to credits only
    const filterSet = FILTER_TYPE_MAP[filter as keyof typeof FILTER_TYPE_MAP];
    return filterSet ? creditRows.filter(tx => filterSet.has(tx.type)) : creditRows;
  }, [filter, creditRows, ticketRows]);

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
                : 'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.07] active:scale-[0.97]',
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
                  <span className="text-[11px] text-white/30 font-bold uppercase tracking-wider whitespace-nowrap">
                    {getDayLabel(dayKey, todayKey, yesterdayKey, t('todayLabel'), t('yesterdayLabel'), dateLocale)}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Transaction Rows */}
                <div className="space-y-0.5">
                  {items.map(tx => {
                    const positive = tx.amount > 0;
                    const isTicket = tx.currency === 'tickets';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-subtle transition-colors"
                      >
                        {/* Icon */}
                        <div className={cn(
                          'flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5',
                          isTicket ? 'bg-amber-500/10 text-amber-400' : getActivityColor(tx.type),
                        )}>
                          {isTicket
                            ? (() => { const I = ICON_MAP[TICKET_ICON_MAP[tx.type] ?? 'Ticket'] ?? Ticket; return <I className="size-4" aria-hidden="true" />; })()
                            : renderActivityIcon(tx.type)
                          }
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium leading-snug">
                            {tx.description || (isTicket ? t(`ticketSource_${tx.type}`) : ta(getActivityLabelKey(tx.type)))}
                          </div>
                          <div className="text-[11px] text-white/25 mt-0.5">
                            {getRelativeTime(tx.created_at, ta('justNow'), dateLocale)}
                          </div>
                        </div>

                        {/* Amount — positive always visible, negative self only */}
                        {(isSelf || positive) && (
                          <div className="text-right shrink-0">
                            <span className={cn(
                              'text-xs font-mono font-bold tabular-nums',
                              positive ? 'text-green-500' : 'text-white/40',
                            )}>
                              {positive ? '+' : ''}{isTicket ? tx.amount : formatScout(tx.amount)}
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
