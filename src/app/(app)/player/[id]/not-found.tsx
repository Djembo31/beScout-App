'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { UserX } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function PlayerNotFound() {
  const t = useTranslations('player');

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="size-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <UserX className="size-6 text-white/40" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-balance">{t('notFoundTitle')}</h2>
        <p className="text-sm text-white/50 text-pretty">
          {t('notFoundDesc')}
        </p>
        <Link href="/market">
          <Button variant="gold">{t('toMarket')}</Button>
        </Link>
      </Card>
    </div>
  );
}
