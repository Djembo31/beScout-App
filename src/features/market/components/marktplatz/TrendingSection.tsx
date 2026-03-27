'use client';

import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { Player } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';
import DiscoveryCard from '../shared/DiscoveryCard';

type Props = {
  trending: TrendingPlayer[];
  playerMap: Map<string, Player>;
};

export default function TrendingSection({ trending, playerMap }: Props) {
  const t = useTranslations('market');

  if (trending.length === 0) {
    return (
      <EmptyState
        icon={<Zap className="size-5" />}
        title={t('trendingEmpty', { defaultMessage: 'Noch keine Trends' })}
        description={t('trendingEmptyDesc', { defaultMessage: 'Sobald gehandelt wird, siehst du hier die meistgehandelten Spieler.' })}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {trending.map(tp => {
        const player = playerMap.get(tp.playerId);
        if (!player) return null;
        return (
          <DiscoveryCard
            key={player.id}
            player={player}
            variant="trending"
            tradeCount={tp.tradeCount}
            change24h={tp.change24h}
          />
        );
      })}
    </div>
  );
}
