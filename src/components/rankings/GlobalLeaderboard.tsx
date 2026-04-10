'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';
import { RangScorePill } from '@/components/ui/RangBadge';
import { CosmeticAvatar } from '@/components/ui';
import { qk } from '@/lib/queries/keys';
import { getScoutLeaderboard } from '@/lib/services/gamification';
import { getMedianScore } from '@/lib/services/scoutScores';
import { Loader2 } from 'lucide-react';
import type { Dimension } from '@/lib/gamification';

type DimTab = 'overall' | Dimension;

const TABS: DimTab[] = ['overall', 'trader', 'manager', 'analyst'];

export function GlobalLeaderboard() {
  const t = useTranslations('rankings');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const [activeDim, setActiveDim] = useState<DimTab>('overall');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: qk.gamification.leaderboardByDim(activeDim, 100),
    queryFn: () => getScoutLeaderboard(activeDim === 'overall' ? 'overall' : activeDim, 100),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="p-5">
      <h2 className="text-sm font-black text-white mb-4">{t('globalTop')}</h2>

      {/* Dimension Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {TABS.map(dim => (
          <button
            key={dim}
            onClick={() => setActiveDim(dim)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition-colors',
              activeDim === dim
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70'
            )}
          >
            {t(dim)}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-white/30" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-6">{t('noData')}</p>
      ) : (
        <div className="space-y-0.5 max-h-[480px] overflow-y-auto scrollbar-hide">
          {entries.map((entry, i) => {
            const score = activeDim === 'overall'
              ? getMedianScore(entry)
              : entry[`${activeDim}_score` as keyof typeof entry] as number;

            return (
              <Link
                key={entry.user_id}
                href={`/profile/${entry.handle}`}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
              >
                {/* Rank */}
                <span className={cn(
                  'w-7 text-right font-mono font-bold tabular-nums text-[12px]',
                  i < 3 ? 'text-gold' : 'text-white/40'
                )}>
                  {i + 1}
                </span>

                {/* Avatar */}
                <CosmeticAvatar
                  avatarUrl={entry.avatar_url}
                  displayName={entry.display_name || entry.handle}
                  size={28}
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-bold text-white truncate block group-hover:text-gold transition-colors">
                    {entry.display_name || entry.handle}
                  </span>
                  <span className="text-[10px] text-white/30 truncate block">@{entry.handle}</span>
                </div>

                {/* Score */}
                <RangScorePill score={score} />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
