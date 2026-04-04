'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function ClubNotFound() {
  const t = useTranslations('club');

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="size-12 mx-auto rounded-full bg-surface-base border border-white/10 flex items-center justify-center">
          <Shield className="size-6 text-white/40" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-balance">{t('notFoundTitle')}</h2>
        <p className="text-sm text-white/50 text-pretty">
          {t('notFoundDescGeneric')}
        </p>
        <Link href="/clubs">
          <Button variant="gold">{t('discoverClubs')}</Button>
        </Link>
      </Card>
    </div>
  );
}
