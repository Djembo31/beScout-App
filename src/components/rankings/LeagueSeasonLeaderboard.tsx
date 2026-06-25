'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CosmeticAvatar, ErrorState } from '@/components/ui';
import { LeagueScopeHeader } from '@/components/layout/LeagueScopeHeader';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
import { useSeasonRanking } from '@/lib/queries/gamification';
import { Loader2, Trophy } from 'lucide-react';

type Scope = 'overall' | 'league';

/**
 * BeScout-Saison leaderboard (E-2a / Slice 381). Ranks users by season points
 * (sum of lineup scores on BeScout-Saison events). Toggle:
 *  - "Gesamt": across all leagues (populated from existing data today).
 *  - "Pro Liga": only the league scoped via useLeagueScope (E-1 events.league_id).
 * Read-only, no money. Trader/Analyst stay global; this is the manager/event axis.
 */
export function LeagueSeasonLeaderboard() {
  const t = useTranslations('rankings');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const [scope, setScope] = useState<Scope>('overall');

  const leagueId = useLeagueScope((s) => s.leagueId);
  const leagueName = useLeagueScope((s) => s.leagueName);

  // Pro-Liga mode without a chosen league: skip the RPC and show a hint instead.
  const isLeagueScope = scope === 'league';
  const effectiveLeagueId = isLeagueScope ? leagueId : null;
  const queryEnabled = !isLeagueScope || !!leagueId;

  const { data: entries = [], isLoading, isError, refetch } = useSeasonRanking(
    effectiveLeagueId,
    queryEnabled,
  );

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="size-4 text-gold" aria-hidden="true" />
        <h2 className="text-sm font-black text-white">{t('seasonTitle')}</h2>
      </div>

      {/* Scope toggle */}
      <div className="flex gap-1 mb-4" role="tablist" aria-label={t('seasonTitle')}>
        {(['overall', 'league'] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            role="tab"
            aria-selected={scope === s}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition-colors',
              scope === s
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70',
            )}
          >
            {s === 'overall' ? t('scopeOverall') : t('scopePerLeague')}
          </button>
        ))}
      </div>

      {/* Pro-Liga: inline league selector (bound to the shared league SSOT) */}
      {isLeagueScope && (
        <div className="mb-3">
          <LeagueScopeHeader leagueBarSize="sm" nonSticky />
        </div>
      )}

      {isLeagueScope && !leagueId ? (
        <p className="text-white/40 text-sm text-center py-6">{t('seasonPickLeague')}</p>
      ) : isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-white/30" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : entries.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-6">
          {isLeagueScope ? t('seasonPerLeagueEmpty', { league: leagueName || '' }) : t('noData')}
        </p>
      ) : (
        <div className="space-y-0.5 max-h-[480px] overflow-y-auto scrollbar-hide">
          {entries.map((entry) => (
            <Link
              key={entry.user_id}
              href={`/profile/${entry.handle}`}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
            >
              <span
                className={cn(
                  'w-7 text-right font-mono font-bold tabular-nums text-[12px]',
                  entry.rank <= 3 ? 'text-gold' : 'text-white/40',
                )}
              >
                {entry.rank}
              </span>

              <CosmeticAvatar
                avatarUrl={entry.avatar_url}
                displayName={entry.display_name || entry.handle}
                size={28}
              />

              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-bold text-white truncate block group-hover:text-gold transition-colors">
                  {entry.display_name || entry.handle}
                </span>
                <span className="text-[10px] text-white/30 truncate block">@{entry.handle}</span>
              </div>

              {/* Season points (NOT Elo — sum of lineup scores) */}
              <div className="text-right">
                <span className="text-[13px] font-mono font-black tabular-nums text-white block">
                  {Math.round(entry.season_score).toLocaleString(numLocale)}
                </span>
                <span className="text-[9px] text-white/30 block">
                  {t('seasonEventCount', { count: entry.event_count })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
