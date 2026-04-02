'use client';

import { useUser } from '@/components/providers/AuthProvider';
import { useTranslations } from 'next-intl';

export default function ManagerContent() {
  const { user } = useUser();
  const t = useTranslations('manager');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">{t('title')}</h1>
      <p className="text-white/50">{t('comingSoon')}</p>
    </div>
  );
}
