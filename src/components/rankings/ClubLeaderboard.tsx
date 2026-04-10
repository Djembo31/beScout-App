'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CosmeticAvatar } from '@/components/ui';
import { RangScorePill } from '@/components/ui/RangBadge';
import { useClubLeaderboard } from '@/lib/queries/gamification';
import { getMedianScore } from '@/lib/services/scoutScores';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { Loader2, Building2 } from 'lucide-react';

export function ClubLeaderboard() {
  const { user } = useUser();
  const { activeClub } = useClub();
  const t = useTranslations('rankings');

  const { data: entries = [], isLoading } = useClubLeaderboard(activeClub?.id);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="size-4 text-white/40" />
        <h2 className="text-sm font-black text-white">{t('clubLeaderboard')}</h2>
        {activeClub && (
          <span className="text-[10px] text-white/30 ml-auto">{activeClub.name}</span>
        )}
      </div>

      {!activeClub ? (
        <p className="text-white/40 text-sm text-center py-6">{t('noClub')}</p>
      ) : isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-white/30" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-6">{t('noData')}</p>
      ) : (
        <div className="space-y-0.5 max-h-[360px] overflow-y-auto scrollbar-hide">
          {entries.map((entry, i) => {
            const score = getMedianScore(entry);
            const isSelf = entry.user_id === user?.id;

            return (
              <Link
                key={entry.user_id}
                href={`/profile/${entry.handle}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group',
                  isSelf && 'bg-gold/[0.06] border border-gold/10'
                )}
              >
                <span className={cn(
                  'w-6 text-right font-mono font-bold tabular-nums text-[12px]',
                  i < 3 ? 'text-gold' : 'text-white/40'
                )}>
                  {i + 1}
                </span>
                <CosmeticAvatar avatarUrl={entry.avatar_url} displayName={entry.display_name || entry.handle} size={28} />
                <div className="flex-1 min-w-0">
                  <span className={cn('text-[13px] font-bold truncate block', isSelf ? 'text-gold' : 'text-white group-hover:text-gold transition-colors')}>
                    {entry.display_name || entry.handle}
                  </span>
                </div>
                <RangScorePill score={score} />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
