'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { CircleDollarSign, Trophy, Award, Users, Zap, FileText, Vote, Activity } from 'lucide-react';
import { Card, Button, LoadMoreButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatScout, getTransactions } from '@/lib/services/wallet';
import { getActivityIcon, getActivityColor, getActivityLabel, getRelativeTime } from '@/lib/activityHelpers';
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
  const [transactions, setTransactions] = useState(initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);

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
      <h3 className="font-black mb-4">Letzte Aktivität</h3>
      {transactions.length === 0 ? (
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
            {transactions.map((tx) => {
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
                    <div className="text-sm font-medium leading-snug">{getActivityLabel(tx)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'text-xs font-mono font-bold',
                        positive ? 'text-green-500' : 'text-white/40'
                      )}>
                        {positive ? '+' : ''}{formatScout(tx.amount)} $SCOUT
                      </span>
                      <span className="text-[10px] text-white/25">· {getRelativeTime(tx.created_at)}</span>
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
