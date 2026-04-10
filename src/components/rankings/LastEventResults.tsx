'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card, CosmeticAvatar } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getUserFantasyHistory } from '@/features/fantasy/services/lineups.queries';
import { getEventLeaderboard } from '@/features/fantasy/services/scoring.queries';
import { fmtScout } from '@/lib/utils';
import { Loader2, Swords, Trophy } from 'lucide-react';

export function LastEventResults() {
  const { user } = useUser();
  const t = useTranslations('rankings');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';

  // Step 1: Get the user's last scored event
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['rankings', 'lastEvent', user?.id],
    queryFn: () => getUserFantasyHistory(user!.id, 1),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const lastEvent = history?.[0];

  // Step 2: Get the leaderboard for that event
  const { data: leaderboard = [], isLoading: lbLoading } = useQuery({
    queryKey: ['rankings', 'eventLeaderboard', lastEvent?.eventId],
    queryFn: () => getEventLeaderboard(lastEvent!.eventId),
    enabled: !!lastEvent?.eventId,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = historyLoading || (!!lastEvent && lbLoading);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="size-4 text-white/40" />
        <h2 className="text-sm font-black text-white">{t('lastEvent')}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-white/30" />
        </div>
      ) : !lastEvent ? (
        <div className="text-center py-6">
          <Swords className="size-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">{t('noData')}</p>
        </div>
      ) : (
        <>
          {/* Event Info */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[13px] font-bold text-white truncate">{lastEvent.eventName}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-mono tabular-nums text-gold">
                #{lastEvent.rank}
              </span>
              <span className="text-[11px] font-mono tabular-nums text-white/50">
                {lastEvent.totalScore.toLocaleString(numLocale)} pts
              </span>
            </div>
          </div>

          {/* Top 10 Leaderboard */}
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-hide">
            {leaderboard.slice(0, 10).map((entry) => {
              const isSelf = entry.userId === user?.id;

              return (
                <Link
                  key={entry.userId}
                  href={`/profile/${entry.handle}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group',
                    isSelf && 'bg-gold/[0.06] border border-gold/10'
                  )}
                >
                  <span className={cn(
                    'w-6 text-right font-mono font-bold tabular-nums text-[12px]',
                    entry.rank <= 3 ? 'text-gold' : 'text-white/40'
                  )}>
                    {entry.rank}
                  </span>
                  <CosmeticAvatar avatarUrl={entry.avatarUrl} displayName={entry.displayName || entry.handle} size={28} />
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-[13px] font-bold truncate block', isSelf ? 'text-gold' : 'text-white group-hover:text-gold transition-colors')}>
                      {entry.displayName || entry.handle}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[11px] font-mono tabular-nums text-white/50 block">
                      {entry.totalScore.toLocaleString(numLocale)}
                    </span>
                    {entry.rewardAmount > 0 && (
                      <span className="text-[9px] font-mono tabular-nums text-emerald-400">
                        +{fmtScout(entry.rewardAmount)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
