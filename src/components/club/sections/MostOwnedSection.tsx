'use client';

import React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { PlayerPhoto } from '@/components/player';
import { useMostOwnedPlayersPerClub } from '@/lib/queries/trades';
import { cn } from '@/lib/utils';
import type { Pos } from '@/types';

type Props = {
  clubId: string;
  clubColor: string;
};

/**
 * Slice 199 K-02 — Most-Owned-Players-per-Club Section.
 * Top-5 Spieler nach `holders_count` (anonymized aggregate).
 * Mobile 393px: stacked rows, Touch-Targets >= 44px via padding.
 */
export function MostOwnedSection({ clubId, clubColor }: Props) {
  const t = useTranslations('club');
  const { data: rows = [], isLoading } = useMostOwnedPlayersPerClub(clubId, 5);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-5" style={{ color: clubColor }} aria-hidden="true" />
          <h3 className="font-black text-balance">{t('mostOwnedTitle')}</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      </Card>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-5" style={{ color: clubColor }} aria-hidden="true" />
        <h3 className="font-black text-balance">{t('mostOwnedTitle')}</h3>
        <span className="text-[10px] text-white/40 ml-auto">{t('mostOwnedHint')}</span>
      </div>
      <ol className="space-y-1.5">
        {rows.map(row => (
          <li key={row.player_id}>
            <Link
              href={`/player/${row.player_id}`}
              className="flex items-center gap-3 px-2 py-2 min-h-[44px] rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <span
                className={cn(
                  'flex-shrink-0 size-6 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums',
                  row.rank === 1
                    ? 'bg-gold text-black'
                    : 'bg-surface-base text-white/60',
                )}
              >
                {row.rank}
              </span>
              <PlayerPhoto
                first={row.first_name}
                last={row.last_name}
                pos={(row.position ?? 'MID') as Pos}
                imageUrl={row.image_url ?? null}
                size={32}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">
                  {row.first_name} {row.last_name}
                </div>
                <div className="text-[10px] text-white/40 font-mono tabular-nums">
                  {row.shirt_number != null ? `#${row.shirt_number} · ` : ''}
                  {row.position}
                </div>
              </div>
              <span
                className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold tabular-nums bg-white/[0.05] text-white/70"
                title={t('mostOwnedHoldersTooltip', { count: row.holders_count })}
              >
                <Users className="size-3" aria-hidden="true" />
                {row.holders_count}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
