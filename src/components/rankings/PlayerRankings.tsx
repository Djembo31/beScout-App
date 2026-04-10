'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';
import { PlayerPhoto } from '@/components/player';
import { supabase } from '@/lib/supabaseClient';
import { fmtScout } from '@/lib/utils';
import { Loader2, Users } from 'lucide-react';
import type { Pos } from '@/types';

type SortMode = 'floor' | 'volume' | 'change';

type PlayerRankEntry = {
  id: string;
  first_name: string;
  last_name: string;
  position: Pos;
  floor_price: number;
  volume_24h: number;
  price_change_24h: number;
};

const SORT_TABS: { key: SortMode; labelKey: string }[] = [
  { key: 'floor', labelKey: 'sortFloor' },
  { key: 'volume', labelKey: 'sortVolume' },
  { key: 'change', labelKey: 'sortChange' },
];

export function PlayerRankings() {
  const t = useTranslations('rankings');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const [sort, setSort] = useState<SortMode>('floor');

  const orderCol = sort === 'floor' ? 'floor_price' : sort === 'volume' ? 'volume_24h' : 'price_change_24h';

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['rankings', 'players', sort],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, floor_price, volume_24h, price_change_24h')
        .eq('is_liquidated', false)
        .gt('floor_price', 0)
        .order(orderCol, { ascending: false })
        .limit(20);

      if (error) {
        console.error('[PlayerRankings] error:', error);
        return [];
      }
      return (data ?? []) as PlayerRankEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="size-4 text-white/40" />
        <h2 className="text-sm font-black text-white">{t('playerRankings')}</h2>
      </div>

      {/* Sort Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {SORT_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSort(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition-colors',
              sort === tab.key
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70'
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-white/30" />
        </div>
      ) : players.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-6">{t('noData')}</p>
      ) : (
        <div className="space-y-0.5 max-h-[400px] overflow-y-auto scrollbar-hide">
          {players.map((player, i) => (
            <Link
              key={player.id}
              href={`/player/${player.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
            >
              <span className={cn(
                'w-6 text-right font-mono font-bold tabular-nums text-[12px]',
                i < 3 ? 'text-gold' : 'text-white/40'
              )}>
                {i + 1}
              </span>
              <PlayerPhoto first={player.first_name} last={player.last_name} pos={player.position} size={28} />
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-bold text-white truncate block group-hover:text-gold transition-colors">
                  {player.first_name} {player.last_name}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                {sort === 'floor' && (
                  <span className="text-[11px] font-mono tabular-nums text-white/60">
                    {fmtScout(player.floor_price)}
                  </span>
                )}
                {sort === 'volume' && (
                  <span className="text-[11px] font-mono tabular-nums text-white/60">
                    {fmtScout(player.volume_24h)}
                  </span>
                )}
                {sort === 'change' && (
                  <span className={cn(
                    'text-[11px] font-mono tabular-nums',
                    player.price_change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {player.price_change_24h >= 0 ? '+' : ''}{player.price_change_24h.toLocaleString(numLocale)}%
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
