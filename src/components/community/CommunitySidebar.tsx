'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Trophy, FileText, Plus, Star } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getRang } from '@/lib/gamification';
import type { LeaderboardUser, ResearchPostWithAuthor, TopScout } from '@/types';
import { useTranslations } from 'next-intl';
import { useGlobalTopScouts } from '@/lib/queries/scouting';

interface CommunitySidebarProps {
  leaderboard: LeaderboardUser[];
  researchPosts: ResearchPostWithAuthor[];
  userId: string;
  onCreateResearch: () => void;
}

const callColor: Record<string, string> = {
  Bullish: 'bg-green-500/20 text-green-500',
  Bearish: 'bg-red-500/20 text-red-400',
  Neutral: 'bg-zinc-500/20 text-zinc-300',
};

function CommunitySidebarInner({
  leaderboard,
  researchPosts,
  userId,
  onCreateResearch,
}: CommunitySidebarProps) {
  const t = useTranslations('community');
  const tg = useTranslations('gamification');
  const topResearch = researchPosts.slice(0, 3);
  const { data: globalScouts = [] } = useGlobalTopScouts(5);

  return (
    <div className="space-y-6">
      {/* Research Highlights */}
      {topResearch.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm">{t('sidebar.topResearch')}</span>
            </div>
            <Link href="/community?tab=research" className="text-xs text-purple-400 hover:underline">
              {t('sidebar.showAll')}
            </Link>
          </div>
          <div className="space-y-2">
            {topResearch.map(post => (
              <div key={post.id} className="p-2.5 rounded-xl bg-surface-minimal border border-divider">
                <div className="flex items-center gap-2 mb-1">
                  {post.call && (
                    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', callColor[post.call] ?? 'bg-white/10 text-white/50')}>
                      {post.call}
                    </span>
                  )}
                  <span className="text-[10px] text-white/30 truncate">{post.author_handle}</span>
                  {post.avg_rating > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 ml-auto">
                      <Star className="w-2.5 h-2.5" />
                      {post.avg_rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold line-clamp-1">{post.title}</div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {post.price > 0 ? `${fmtScout(centsToBsd(post.price))} CR` : t('sidebar.free')}
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onCreateResearch} className="w-full mt-3">
            <Plus className="w-3.5 h-3.5" />
            {t('sidebar.writeReport')}
          </Button>
        </Card>
      )}

      {/* Top Scouts — analyst-ranked */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="font-bold text-sm">Top Scouts</span>
          </div>
          <Link href="/community?tab=ranking" className="text-xs text-gold hover:underline">
            {t('sidebar.showAll')}
          </Link>
        </div>
        <div className="space-y-2">
          {(globalScouts.length > 0 ? globalScouts : leaderboard.slice(0, 5).map(u => ({
            userId: u.userId,
            handle: u.handle,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            reportCount: 0,
            approvedBounties: 0,
            avgRating: 0,
            analystScore: u.totalScore,
          } as TopScout))).map((scout, i) => {
            const rang = getRang(scout.analystScore);
            return (
              <Link key={scout.userId} href={`/profile/${scout.handle}`} className="flex items-center gap-3 py-1.5 hover:bg-surface-subtle rounded-lg px-1 -mx-1 transition-colors">
                <span className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                  i === 0 ? 'bg-gold/20 text-gold' : 'bg-white/5 text-white/50'
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {scout.displayName || scout.handle}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className={cn('px-1 py-0.5 rounded font-bold border', rang.bgColor, rang.borderColor, rang.color)}>
                      {tg(`rang.${rang.i18nKey}`)}
                    </span>
                    {scout.reportCount > 0 && (
                      <span className="text-white/30">{scout.reportCount} <FileText className="w-2.5 h-2.5 inline" /></span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono text-gold">{scout.analystScore}</span>
              </Link>
            );
          })}
        </div>
      </Card>

    </div>
  );
}

export default memo(CommunitySidebarInner);
