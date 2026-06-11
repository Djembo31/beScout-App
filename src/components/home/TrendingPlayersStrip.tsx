'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { PlayerPhoto, PositionBadge } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Player } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';

// Slice 269 (D63 Phase 4) — Trending-Strip für Markt-Puls trending-Tab.
//
// Zeigt 5 Top-Trades-Players horizontal als Strip mit Trade-Count-Badge.
// Style angelehnt an TopMoversStrip (Slice 261-Pattern), aber ohne
// 24h-change-color-tint (trending ist activity-driven, nicht price-driven).

interface TrendingPlayersStripProps {
  /** Slice 282: vorgejointe Items (tp + resolved Player) — ersetzt das volle players-Array. */
  trendingWithPlayers: Array<{ tp: TrendingPlayer; player: Player }>;
}

function TrendingPlayersStripInner({ trendingWithPlayers }: TrendingPlayersStripProps) {
  const t = useTranslations('home');

  if (trendingWithPlayers.length === 0) return null;

  const enriched = trendingWithPlayers.slice(0, 5);

  return (
    <div
      className="flex gap-3 mt-2 overflow-x-auto scrollbar-hide pb-2"
      style={{ WebkitOverflowScrolling: 'touch' }}
      aria-label={t('spotlightTrending')}
    >
      {enriched.map(({ tp, player }, i) => {
        const posColor = posTintColors[tp.position];
        const href = player ? `/player/${player.id}` : '/market';
        const up = tp.change24h >= 0;
        return (
          <Link
            key={tp.playerId}
            href={href}
            aria-label={`${tp.firstName} ${tp.lastName}, ${tp.club}, ${t('tradeCount', { count: tp.tradeCount })}`}
            className={cn(
              'flex items-center gap-3 px-3.5 py-3 rounded-2xl border card-showcase shrink-0 min-w-[210px] shadow-card-md card-entrance focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
              `card-stagger-${Math.min(i + 1, 6)}`,
            )}
            style={{
              borderColor: `${posColor}25`,
              background: `linear-gradient(135deg, ${posColor}0d 0%, rgba(255,255,255,0.02) 100%)`,
            }}
          >
            {player && (
              <PlayerPhoto imageUrl={player.imageUrl} first={player.first} last={player.last} pos={player.pos} size={40} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Flame className="size-3 text-orange-400" aria-hidden="true" />
                <PositionBadge pos={tp.position} size="sm" />
              </div>
              <div className="text-sm font-bold truncate">{tp.lastName}</div>
              <div className="text-[10px] text-white/30 truncate">{tp.club}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-black text-gold tabular-nums">
                {fmtScout(tp.floorPrice)}
              </div>
              <div className={cn('flex items-center justify-end text-[10px] font-mono font-bold tabular-nums', up ? 'text-vivid-green' : 'text-vivid-red')}>
                {up ? '+' : ''}{tp.change24h.toFixed(1)}%
              </div>
              <div className="text-[10px] text-white/40 font-mono tabular-nums mt-0.5">{tp.tradeCount}× </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default memo(TrendingPlayersStripInner);
