'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { Skeleton } from '@/components/ui';

const TransactionsSkeleton = () => (
  <div className="max-w-[800px] mx-auto px-4 py-6 space-y-4">
    <div>
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-64" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-9 w-20 rounded-xl shrink-0" />
      <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
      <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
    </div>
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  </div>
);

const TransactionsPageContent = dynamic(
  () => import('@/components/transactions/TransactionsPageContent'),
  {
    ssr: false,
    loading: () => <TransactionsSkeleton />,
  },
);

export default function TransactionsPage() {
  const { user, loading } = useUser();
  const t = useTranslations('transactions');

  if (loading) {
    return <TransactionsSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-24 text-white/40 text-sm">
        {t('signInPrompt')}
      </div>
    );
  }

  return <TransactionsPageContent userId={user.id} />;
}
