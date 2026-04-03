'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { useMarketData } from '@/features/market/hooks/useMarketData';
import dynamic from 'next/dynamic';

const KaderTab = dynamic(
  () => import('@/features/market/components/portfolio/KaderTab'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    ),
  }
);

export default function ManagerContent() {
  const { user } = useUser();
  const t = useTranslations('manager');
  const { players, mySquadPlayers, playersLoading } = useMarketData(user?.id);

  if (playersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black mb-4">{t('title')}</h1>
      <KaderTab players={players} ownedPlayers={mySquadPlayers} />
    </div>
  );
}
