'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';

const TransactionsPageContent = dynamic(
  () => import('@/components/transactions/TransactionsPageContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    ),
  },
);

export default function TransactionsPage() {
  const { user, loading } = useUser();
  const t = useTranslations('transactions');

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
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
