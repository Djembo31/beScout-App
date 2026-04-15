'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Receipt, Search as SearchIcon, Download, ArrowUpRight, ArrowDownRight,
  Loader2, CircleDollarSign, Trophy, Award, Users, Zap, FileText, Vote,
  Activity, Target, Flame, Banknote, Gift, Calendar, Ticket, Lock, Unlock, Coins,
} from 'lucide-react';
import { Card, Button, ErrorState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';

/** Sanitize legacy DB descriptions: replace internal "DPC"/"Cents" with user-facing terms.
 *  FIX (XC-03): Match `<N> Cents/SC` and `<N> Cents/DPC` FIRST, converting raw cents
 *  to formatted CR. Previously the `/SC` variant fell through to a literal `Cents/SC → CR`
 *  replace, leaking raw cents into user-facing TX lines (e.g. "10000 Cents/SC" → "10000 CR").
 *  Now: "10000 Cents/SC" → "100 CR".
 */
function cleanDescription(desc: string): string {
  return desc
    .replace(/\bDPCs?\b/g, 'SC')
    .replace(/(\d+)\s*Cents\/(?:SC|DPC)\b/g, (_, cents) => `${(Number(cents) / 100).toLocaleString('de-DE')} CR`)
    .replace(/Cents\/SC/g, 'CR')
    .replace(/Cents\/DPC/g, 'CR')
    .replace(/(\d+)\s*Cents\b/g, (_, cents) => `${(Number(cents) / 100).toLocaleString('de-DE')} CR`);
}
import { useTransactions } from '@/lib/queries/misc';
import { useTicketTransactions } from '@/lib/queries/tickets';
import {
  getActivityIcon, getActivityColor, getActivityLabelKey, getRelativeTime,
} from '@/lib/activityHelpers';
import { FILTER_TYPE_MAP } from '@/lib/transactionTypes';
import type { DbTransaction, DbTicketTransaction } from '@/types';

// ============================================
// ICON MAP (same as TimelineTab)
// ============================================
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

// ============================================
// CONSTANTS
// ============================================

type DateRange = '7d' | '30d' | '90d' | 'all';
type Filter = 'all' | 'credits' | 'tickets' | 'trades' | 'fantasy' | 'research' | 'rewards';

const DATE_RANGES: { id: DateRange; labelKey: string; days: number | null }[] = [
  { id: '7d', labelKey: 'range7d', days: 7 },
  { id: '30d', labelKey: 'range30d', days: 30 },
  { id: '90d', labelKey: 'range90d', days: 90 },
  { id: 'all', labelKey: 'rangeAll', days: null },
];

const FILTERS: { id: Filter; labelKey: string }[] = [
  { id: 'all', labelKey: 'filterAll' },
  { id: 'credits', labelKey: 'filterCredits' },
  { id: 'tickets', labelKey: 'filterTickets' },
  { id: 'trades', labelKey: 'filterTrades' },
  { id: 'fantasy', labelKey: 'filterFantasy' },
  { id: 'research', labelKey: 'filterResearch' },
  { id: 'rewards', labelKey: 'filterRewards' },
];

// ============================================
// HELPERS
// ============================================

function cutoffDate(range: DateRange): number | null {
  const def = DATE_RANGES.find(r => r.id === range);
  if (!def || def.days === null) return null;
  const ms = def.days * 24 * 60 * 60 * 1000;
  return Date.now() - ms;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: '2-digit',
  });
}

// ============================================
// COMPONENT
// ============================================

interface TransactionsPageContentProps {
  userId: string;
}

export default function TransactionsPageContent({ userId }: TransactionsPageContentProps) {
  const t = useTranslations('transactions');
  const tp = useTranslations('profile');
  const ta = useTranslations('activity');
  const locale = useLocale();
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';

  const [range, setRange] = useState<DateRange>('30d');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  // Load up to 200 of each to give the page room to breathe
  const txQuery = useTransactions(userId, { limit: 200 });
  const ticketTxQuery = useTicketTransactions(userId, { limit: 200 });

  const allTx: DbTransaction[] = useMemo(() => txQuery.data ?? [], [txQuery.data]);
  const allTicketTx: DbTicketTransaction[] = useMemo(() => ticketTxQuery.data ?? [], [ticketTxQuery.data]);

  const cutoff = useMemo(() => cutoffDate(range), [range]);

  // Filtered credits (date + filter + search)
  const filteredCredits = useMemo(() => {
    let rows = allTx;
    if (cutoff !== null) {
      rows = rows.filter(tx => new Date(tx.created_at).getTime() >= cutoff);
    }
    if (filter !== 'all' && filter !== 'credits' && filter !== 'tickets') {
      const filterSet = FILTER_TYPE_MAP[filter as keyof typeof FILTER_TYPE_MAP];
      if (filterSet) rows = rows.filter(tx => filterSet.has(tx.type));
    }
    if (filter === 'tickets') rows = [];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(tx => (tx.description ?? '').toLowerCase().includes(q));
    }
    return rows;
  }, [allTx, cutoff, filter, query]);

  const filteredTickets = useMemo(() => {
    let rows = allTicketTx;
    if (cutoff !== null) {
      rows = rows.filter(tx => new Date(tx.created_at).getTime() >= cutoff);
    }
    if (filter === 'credits' || filter === 'trades' || filter === 'fantasy' || filter === 'research' || filter === 'rewards') {
      rows = [];
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(tx => (tx.description ?? '').toLowerCase().includes(q));
    }
    return rows;
  }, [allTicketTx, cutoff, filter, query]);

  // Aggregations (credits only — tickets counted separately)
  const aggregations = useMemo(() => {
    let earned = 0;
    let spent = 0;
    for (const tx of filteredCredits) {
      if (tx.amount > 0) earned += tx.amount;
      else spent += Math.abs(tx.amount);
    }
    return { earned, spent, net: earned - spent, count: filteredCredits.length + filteredTickets.length };
  }, [filteredCredits, filteredTickets]);

  // Unified list for rendering, sorted by date desc
  type Row =
    | { kind: 'credit'; tx: DbTransaction }
    | { kind: 'ticket'; tx: DbTicketTransaction };

  const rows: Row[] = useMemo(() => {
    const all: Row[] = [
      ...filteredCredits.map<Row>(tx => ({ kind: 'credit', tx })),
      ...filteredTickets.map<Row>(tx => ({ kind: 'ticket', tx })),
    ];
    all.sort((a, b) => new Date(b.tx.created_at).getTime() - new Date(a.tx.created_at).getTime());
    return all;
  }, [filteredCredits, filteredTickets]);

  const handleExport = useCallback(async () => {
    const { exportTransactionsToCsv } = await import('@/lib/exportTransactions');
    exportTransactionsToCsv(filteredCredits, filteredTickets, 'bescout-transactions.csv');
  }, [filteredCredits, filteredTickets]);

  const isLoading = txQuery.isLoading || ticketTxQuery.isLoading;
  const isError = txQuery.isError || ticketTxQuery.isError;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-[900px] mx-auto p-4">
        <ErrorState onRetry={() => { void txQuery.refetch(); void ticketTxQuery.refetch(); }} />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 space-y-6">
      {/* ===== Header ===== */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-gold" aria-hidden="true" />
            <h1 className="text-xl font-black text-balance">{t('title')}</h1>
          </div>
          <Link
            href="/profile?tab=timeline"
            className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
          >
            {t('backToProfile')}
          </Link>
        </div>
        <p className="text-sm text-white/50 text-pretty">{t('subtitle')}</p>
      </div>

      {/* ===== Aggregations ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="size-4 text-green-500" aria-hidden="true" />
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t('totalEarned')}</span>
          </div>
          <div className="text-lg font-mono font-black tabular-nums text-green-500">
            +{formatScout(aggregations.earned)} <span className="text-[10px] text-white/40 font-normal">CR</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="size-4 text-red-400" aria-hidden="true" />
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t('totalSpent')}</span>
          </div>
          <div className="text-lg font-mono font-black tabular-nums text-red-400">
            −{formatScout(aggregations.spent)} <span className="text-[10px] text-white/40 font-normal">CR</span>
          </div>
        </Card>
        <Card className="p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <CircleDollarSign className="size-4 text-gold" aria-hidden="true" />
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t('net')}</span>
          </div>
          <div className={cn(
            'text-lg font-mono font-black tabular-nums',
            aggregations.net >= 0 ? 'text-green-500' : 'text-red-400',
          )}>
            {aggregations.net >= 0 ? '+' : '−'}{formatScout(Math.abs(aggregations.net))}
            <span className="text-[10px] text-white/40 font-normal"> CR</span>
          </div>
        </Card>
      </div>

      {/* ===== Controls: Range + Search + Export ===== */}
      <Card className="p-4 space-y-3">
        {/* Date range chips */}
        <div
          role="radiogroup"
          aria-label={t('rangeLabel')}
          className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1"
        >
          {DATE_RANGES.map(def => (
            <button
              key={def.id}
              role="radio"
              aria-checked={range === def.id}
              onClick={() => setRange(def.id)}
              className={cn(
                'px-3 py-2.5 min-h-[44px] rounded-lg text-[13px] font-medium whitespace-nowrap flex-shrink-0',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]',
                range === def.id
                  ? 'bg-gold/10 text-gold'
                  : 'bg-surface-base text-white/40 hover:text-white/60 hover:bg-white/[0.07] active:scale-[0.97]',
              )}
            >
              {t(def.labelKey)}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div
          role="radiogroup"
          aria-label={tp('filterAll')}
          className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1"
        >
          {FILTERS.map(f => (
            <button
              key={f.id}
              role="radio"
              aria-checked={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-2 min-h-[40px] rounded-lg text-[12px] font-medium whitespace-nowrap flex-shrink-0',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]',
                filter === f.id
                  ? 'bg-gold/10 text-gold'
                  : 'bg-surface-base text-white/40 hover:text-white/60 hover:bg-white/[0.07] active:scale-[0.97]',
              )}
            >
              {tp(f.labelKey)}
            </button>
          ))}
        </div>

        {/* Search + Export */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-[13px] bg-surface-base rounded-lg border border-white/[0.06] text-white/80 placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={rows.length === 0}
            aria-label={t('exportCsv')}
          >
            <Download className="size-4 mr-1" aria-hidden="true" />
            <span className="hidden sm:inline">{t('exportCsv')}</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>
      </Card>

      {/* ===== Rows ===== */}
      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <Activity className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
          <div className="text-white/40 font-semibold text-sm">
            {t('emptyTitle')}
          </div>
          <div className="text-xs text-white/25 mt-1">
            {t('emptyHint')}
          </div>
        </Card>
      ) : (
        <Card className="p-2 md:p-3">
          <div className="divide-y divide-white/[0.04]">
            {rows.map(row => {
              const tx = row.tx;
              const positive = tx.amount > 0;
              const isTicket = row.kind === 'ticket';
              const type = isTicket ? (tx as DbTicketTransaction).source : (tx as DbTransaction).type;
              return (
                <div key={`${row.kind}-${tx.id}`} className="flex items-start gap-3 p-3 hover:bg-surface-subtle transition-colors rounded-lg">
                  {/* Icon */}
                  <div className={cn(
                    'flex items-center justify-center size-9 rounded-lg shrink-0 mt-0.5',
                    isTicket ? 'bg-amber-500/10 text-amber-400' : getActivityColor(type),
                  )}>
                    {isTicket
                      ? (() => {
                          const I = ICON_MAP[TICKET_ICON_MAP[type] ?? 'Ticket'] ?? Ticket;
                          return <I className="size-4" aria-hidden="true" />;
                        })()
                      : renderActivityIcon(type)
                    }
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">
                      {tx.description ? cleanDescription(tx.description) : (isTicket ? tp(`ticketSource_${type}`) : ta(getActivityLabelKey(type)))}
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5 flex items-center gap-2">
                      <span>{formatDate(tx.created_at, dateLocale)}</span>
                      <span>·</span>
                      <span>{getRelativeTime(tx.created_at, ta('justNow'), dateLocale)}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <span className={cn(
                      'text-sm font-mono font-bold tabular-nums',
                      positive ? 'text-green-500' : 'text-white/60',
                    )}>
                      {positive ? '+' : '−'}{isTicket ? Math.abs(tx.amount) : formatScout(Math.abs(tx.amount))}
                    </span>
                    <div className="text-[10px] text-white/20 mt-0.5">
                      {isTicket ? 'Tickets' : 'CR'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Footer count */}
      <div className="text-center text-[10px] text-white/30 pb-4">
        {t('showingCount', { count: rows.length })}
      </div>
    </div>
  );
}
