'use client';

import React from 'react';
import { Target, Trophy, Vote, Users, Medal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import { useScoutingStats, useTopScouts } from '@/lib/queries/scouting';
import { useActiveBounties } from '@/lib/queries/bounties';
import { useClubVotes } from '@/lib/queries/votes';
import { useCommunityPolls } from '@/lib/queries/polls';

type Props = {
  clubId: string;
  userId: string | undefined;
  clubColor: string;
};

export function MitmachenSection({ clubId, userId, clubColor }: Props) {
  const t = useTranslations('club');

  const { data: scoutingStats } = useScoutingStats(userId);
  const { data: topScouts } = useTopScouts(clubId, 3);
  const { data: bounties } = useActiveBounties(userId, clubId);
  const { data: clubVotes } = useClubVotes(clubId);
  const { data: communityPolls } = useCommunityPolls(clubId);

  const displayBounties = (bounties ?? []).slice(0, 3);
  const allVotes = [
    ...(clubVotes ?? []).map(v => ({ id: v.id, question: v.question, options: v.options, total_votes: v.total_votes })),
    ...(communityPolls ?? []).map(p => ({ id: p.id, question: p.question, options: p.options, total_votes: p.total_votes })),
  ].slice(0, 2);
  const displayScouts = topScouts ?? [];

  const hasProfile = !!userId && !!scoutingStats;
  const hasBounties = displayBounties.length > 0;
  const hasVotes = allVotes.length > 0;
  const hasScouts = displayScouts.length > 0;

  if (!hasProfile && !hasBounties && !hasVotes && !hasScouts) return null;

  const medalColor = (rank: number) => {
    if (rank === 1) return 'text-gold';
    if (rank === 2) return 'text-gray-300';
    return 'text-orange-300';
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Target className="size-5" style={{ color: clubColor }} />
        <h2 className="font-black text-balance">{t('mitmachenTitle')}</h2>
      </div>

      {/* Scout Profile Card */}
      {hasProfile && (
        <div
          className={cn(
            'rounded-xl p-4 border',
            'bg-white/[0.03] border-white/10',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          )}
        >
          <h3 className="text-sm font-bold text-white/70 mb-3">{t('scoutProfile')}</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-mono font-bold text-lg tabular-nums" style={{ color: clubColor }}>
                {(scoutingStats.avgRating ?? 0).toFixed(1)}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{t('analystScore')}</div>
            </div>
            <div>
              <div className="font-mono font-bold text-lg tabular-nums text-white/80">
                {scoutingStats.reportCount}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{t('reportsCount')}</div>
            </div>
            <div>
              <div className="font-mono font-bold text-lg tabular-nums text-gold">
                {scoutingStats.approvedBounties}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{t('earnedScout')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Offene Auftraege / Bounties */}
      {hasBounties && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Trophy className="size-4" style={{ color: clubColor }} />
            <h3 className="text-sm font-bold text-white/70">{t('openBounties')}</h3>
          </div>
          <div className="space-y-2">
            {displayBounties.map(b => {
              const deadline = new Date(b.deadline_at);
              const diff = deadline.getTime() - Date.now();
              const daysLeft = Math.max(0, Math.ceil(diff / 86400000));

              return (
                <div
                  key={b.id}
                  className={cn(
                    'rounded-xl p-3 border',
                    'bg-white/[0.02] border-white/10',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{b.title}</div>
                      {b.player_name && (
                        <div className="text-[10px] text-white/40 mt-0.5">{b.player_name}</div>
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-gold tabular-nums flex-shrink-0">
                      {fmtScout(b.reward_cents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/40">
                    <span>
                      {t('submissions')}: {b.submission_count}/{b.max_submissions}
                    </span>
                    <span className={cn(
                      'font-mono tabular-nums',
                      daysLeft <= 1 ? 'text-red-400 font-bold' : daysLeft <= 3 ? 'text-amber-400' : ''
                    )}>
                      {daysLeft}d
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abstimmungen / Votes */}
      {hasVotes && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Vote className="size-4" style={{ color: clubColor }} />
            <h3 className="text-sm font-bold text-white/70">{t('activeVotes')}</h3>
          </div>
          <div className="space-y-2">
            {allVotes.map(v => (
              <div
                key={v.id}
                className={cn(
                  'rounded-xl p-3 border',
                  'bg-white/[0.02] border-white/10',
                  'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                )}
              >
                <div className="text-sm font-bold mb-2">{v.question}</div>
                <div className="space-y-1.5">
                  {(v.options ?? []).map((opt, i) => {
                    const pct = v.total_votes > 0 ? Math.round(((opt.votes ?? 0) / v.total_votes) * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="text-white/60 truncate mr-2">{opt.label}</span>
                          <span className="font-mono tabular-nums text-white/40">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: clubColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-white/40 mt-2 font-mono tabular-nums">
                  {v.total_votes} {t('votes')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Scouts Leaderboard */}
      {hasScouts && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Users className="size-4" style={{ color: clubColor }} />
            <h3 className="text-sm font-bold text-white/70">{t('topScouts')}</h3>
          </div>
          <div className="space-y-1.5">
            {displayScouts.map((s, idx) => (
              <div
                key={s.userId}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 border',
                  'bg-white/[0.02] border-white/10',
                  'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                )}
              >
                <Medal className={cn('size-4 flex-shrink-0', medalColor(idx + 1))} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">
                    {s.displayName ?? s.handle}
                  </div>
                  <div className="text-[10px] text-white/40">
                    {s.reportCount} {t('reportsCount')}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-sm tabular-nums" style={{ color: clubColor }}>
                    {s.analystScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
