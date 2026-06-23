'use client';

import Link from 'next/link';
import { Trophy, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CosmeticAvatar, ErrorState } from '@/components/ui';
import FanRankBadge from '@/components/ui/FanRankBadge';
import { useClubFanLeaderboard } from '@/lib/queries/fanRanking';

// ============================================
// CLUB FAN LEADERBOARD (W2-B / Slice 349)
// Top loyal fans of a club, ranked by fan-rank total_score.
// Mounts the previously-orphan useClubFanLeaderboard hook.
// ============================================

interface ClubFanLeaderboardProps {
  clubId: string;
  /** Highlights the current user's own row when present + in the board. */
  currentUserId?: string;
}

export default function ClubFanLeaderboard({ clubId, currentUserId }: ClubFanLeaderboardProps) {
  const t = useTranslations('gamification');
  const { data: entries = [], isLoading, isError, refetch } = useClubFanLeaderboard(clubId);

  // Empty (and not loading/error) → render nothing. Most clubs have 0 fans;
  // an empty card would just be noise. The board appears only where it has content.
  if (!isLoading && !isError && entries.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-4 text-gold" aria-hidden="true" />
        <h2 className="text-sm font-black text-white">{t('clubFanLeaderboardTitle')}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-white/30" aria-hidden="true" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="space-y-0.5 max-h-[360px] overflow-y-auto scrollbar-hide">
          {entries.map((entry, i) => {
            const isSelf = entry.user_id === currentUserId;
            const handle = entry.profile.handle;

            return (
              <Link
                key={entry.user_id}
                href={`/profile/${handle}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-xl hover:bg-white/[0.04] transition-colors group',
                  isSelf && 'bg-gold/[0.06] border border-gold/10',
                )}
              >
                <span className={cn(
                  'w-6 text-right font-mono font-bold tabular-nums text-[12px]',
                  i < 3 ? 'text-gold' : 'text-white/40',
                )}>
                  {i + 1}
                </span>
                <CosmeticAvatar avatarUrl={entry.profile.avatar_url} displayName={handle} size={28} />
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'text-[13px] font-bold truncate block',
                    isSelf ? 'text-gold' : 'text-white group-hover:text-gold transition-colors',
                  )}>
                    {handle}
                  </span>
                </div>
                <FanRankBadge tier={entry.rank_tier} size="sm" />
                <span className="w-10 text-right text-[12px] font-mono font-black tabular-nums text-white/80">
                  {entry.total_score}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
