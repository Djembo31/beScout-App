'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { PlayerPhoto } from '@/components/player';
import { cn } from '@/lib/utils';
import { useMostWatchedPlayers } from '@/lib/queries/watchlist';
import type { Pos } from '@/types';
import { useTranslations } from 'next-intl';

interface MostWatchedStripProps {
  userId: string;
}

function MostWatchedStripInner({ userId }: MostWatchedStripProps) {
  const t = useTranslations('home');
  const { data: players = [] } = useMostWatchedPlayers(userId, 10);

  if (players.length === 0) return null;

  return (
    <div
      className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1"
      style={{ WebkitOverflowScrolling: 'touch' }}
      aria-label={t('mostWatched')}
    >
      {players.map(p => (
        <Link
          key={p.playerId}
          href={`/player/${p.playerId}`}
          aria-label={`${p.firstName} ${p.lastName}, ${p.club}, ${t('watcherCount', { count: p.watcherCount })}`}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border',
            'bg-surface-minimal hover:bg-white/[0.05]',
            'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
            'transition-colors shrink-0 min-w-[200px] shadow-card-sm',
          )}
          style={{ borderColor: 'rgba(168,85,247,0.2)' }}
        >
          <PlayerPhoto
            imageUrl={p.imageUrl}
            first={p.firstName}
            last={p.lastName}
            pos={p.position as Pos}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold truncate">{p.lastName}</div>
            <div className="text-[11px] text-white/40 truncate">{p.club}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Eye className="size-3 text-white/40" aria-hidden="true" />
            <span className="text-[11px] font-mono tabular-nums text-white/50">
              {p.watcherCount}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default memo(MostWatchedStripInner);
