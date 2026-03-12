'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { CircleDollarSign, Trophy, Award, Users, Zap, FileText, Vote, Activity } from 'lucide-react';
import { Card, Button, LoadMoreButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatScout, getTransactions } from '@/lib/services/wallet';
import { getActivityIcon, getActivityColor, getActivityLabelKey, getRelativeTime } from '@/lib/activityHelpers';
import { useTranslations } from 'next-intl';
import type { DbTransaction } from '@/types';

// ============================================
// ICON HELPER
// ============================================

const ICON_MAP: Record<string, React.ElementType> = { CircleDollarSign, Trophy, Award, Users, Zap, FileText, Vote, Activity };

function renderActivityIcon(type: string) {
  const iconName = getActivityIcon(type);
  const Icon = ICON_MAP[iconName] ?? Activity;
  return <Icon className="size-4" aria-hidden="true" />;
}

// ============================================
// TYPES
// ============================================

const PAGE_SIZE = 20;

type ActivityFilter = 'all' | 'trades' | 'fantasy' | 'missions' | 'rewards';

const FILTER_TYPE_MAP: Record<Exclude<ActivityFilter, 'all'>, Set<string>> = {
  trades: new Set(['buy', 'sell', 'ipo_buy']),
  fantasy: new Set(['fantasy_join', 'fantasy_reward', 'entry_fee']),
  missions: new Set(['mission_reward']),
  rewards: new Set(['bounty_reward', 'research_earning', 'streak_reward', 'poll_revenue', 'tip_receive', 'scout_subscription_earning', 'creator_fund_payout', 'ad_revenue_payout', 'pbt_liquidation']),
};

interface ProfileActivityTabProps {
  transactions: DbTransaction[];
  userId: string;
  isSelf?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function ProfileActivityTab({ transactions: initial, userId, isSelf = false }: ProfileActivityTabProps) {
  const t = useTranslations('profile');
  const ta = useTranslations('activity');
  const [transactions, setTransactions] = useState(initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => FILTER_TYPE_MAP[filter].has(tx.type));

  const FILTERS: { id: ActivityFilter; labelKey: string }[] = [
    { id: 'all', labelKey: 'filterAll' },
    { id: 'trades', labelKey: 'filterTrades' },
    { id: 'fantasy', labelKey: 'filterFantasy' },
    { id: 'missions', labelKey: 'filterMissions' },
    { id: 'rewards', labelKey: 'filterRewards' },
  ];

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const more = await getTransactions(userId, PAGE_SIZE, transactions.length);
      setTransactions(prev => [...prev, ...more]);
      setHasMore(more.length >= PAGE_SIZE);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [userId, transactions.length]);

  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-black mb-3">{t('recentActivity')}</h3>

      {/* Filter Chips */}
      <div role="radiogroup" aria-label={t('filterAll')} className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
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
                : 'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.07] active:scale-[0.97]'
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-10">
          <Activity className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
          <div className="text-white/40 font-semibold text-sm mb-1">
            {isSelf ? t('activityEmptyTitle') : t('activityEmptyOther')}
          </div>
          {isSelf && (
            <>
              <div className="text-xs text-white/30 mb-3">{t('activityEmptyDesc')}</div>
              <Link href="/market?tab=kaufen">
                <Button variant="gold" size="sm">{t('activityStartTrading')}</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-0.5">
            {filteredTransactions.map((tx) => {
              const positive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                >
                  <div className={cn(
                    'flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5',
                    getActivityColor(tx.type)
                  )}>
                    {renderActivityIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">{tx.description || ta(getActivityLabelKey(tx.type))}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'text-xs font-mono font-bold',
                        positive ? 'text-green-500' : 'text-white/40'
                      )}>
                        {positive ? '+' : ''}{formatScout(tx.amount)} bCredits
                      </span>
                      <span className="text-[11px] text-white/25">· {getRelativeTime(tx.created_at, ta('justNow'))}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <LoadMoreButton loading={loadingMore} hasMore={hasMore} onLoadMore={handleLoadMore} />
        </>
      )}
    </Card>
  );
}
