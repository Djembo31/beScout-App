'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useWildcardBalance } from '@/lib/queries/events';

// ============================================
// WildcardsSection Component
// ============================================
export default function WildcardsSection() {
  const t = useTranslations('inventory');
  const { user } = useUser();
  const uid = user?.id;

  const { data: balance = 0, isLoading } = useWildcardBalance(uid);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (balance <= 0) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title={t('wildcardsEmpty')}
        description={t('wildcardsEmptyDesc')}
        action={{ label: t('wildcardsCta'), href: '/fantasy' }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-black text-balance">{t('wildcardsTitle')}</h2>
        <p className="text-xs text-white/50 text-pretty mt-0.5">{t('wildcardsSubtitle')}</p>
      </div>

      <Card className="p-6 flex flex-col items-center text-center gap-4">
        <div className="size-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
          <Sparkles className="size-8 text-gold" aria-hidden="true" />
        </div>

        <div>
          <div className="text-4xl font-black text-gold font-mono tabular-nums">{balance}</div>
          <div className="text-xs text-white/50 mt-1">{t('wildcardsBalance')}</div>
        </div>

        <Link
          href="/fantasy"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gradient-to-r from-[#FFE44D] to-[#E6B800] text-black rounded-xl hover:opacity-90 transition-opacity active:scale-[0.97] min-h-[44px]"
        >
          {t('wildcardsCta')}
        </Link>
      </Card>
    </div>
  );
}
