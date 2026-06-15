'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
import type { Player } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';
import DiscoveryCard from '../shared/DiscoveryCard';

type Props = {
  trending: TrendingPlayer[];
  playerMap: Map<string, Player>;
};

export default function TrendingSection({ trending, playerMap }: Props) {
  const t = useTranslations('market');
  // Slice 251 Wave 3 — Liga-Scope SSOT. Slice 326: leagueId statt leagueName.
  const selectedLeagueId = useLeagueScope((s) => s.leagueId);

  // Filter trending by global league selection
  const filtered = useMemo(() => {
    if (!selectedLeagueId) return trending;
    return trending.filter(tp => {
      const player = playerMap.get(tp.playerId);
      return player?.leagueId === selectedLeagueId;
    });
  }, [trending, playerMap, selectedLeagueId]);

  if (filtered.length === 0) {
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
      {filtered.map(tp => {
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
