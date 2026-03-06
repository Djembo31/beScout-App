'use client';

import React, { useMemo } from 'react';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import type { IpoDisplayData } from '@/components/player';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo } from '@/types';

interface PlayerIPORowProps {
  player: Player;
  ipo: DbIpo;
  onBuy?: (playerId: string) => void;
  buying: boolean;
}

export default function PlayerIPORow({ player, ipo, onBuy, buying }: PlayerIPORowProps) {
  const ipoData: IpoDisplayData = useMemo(() => ({
    status: ipo.status,
    progress: ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0,
    price: centsToBsd(ipo.price),
    remaining: ipo.total_offered - ipo.sold,
    totalOffered: ipo.total_offered,
    endsAt: new Date(ipo.ends_at).getTime(),
  }), [ipo]);

  return (
    <PlayerDisplay
      player={player}
      variant="compact"
      context="ipo"
      ipoData={ipoData}
      onBuy={onBuy}
      buying={buying}
      showActions={!!onBuy}
    />
  );
}
