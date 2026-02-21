'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Vote, BadgeCheck, FileText, Plus, Star } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { LeaderboardUser, DbClubVote, ResearchPostWithAuthor } from '@/types';
import { useTranslations } from 'next-intl';

interface CommunitySidebarProps {
  leaderboard: LeaderboardUser[];
  researchPosts: ResearchPostWithAuthor[];
  clubVotes: DbClubVote[];
  userId: string;
  onCreateResearch: () => void;
}

const callColor: Record<string, string> = {
  Bullish: 'bg-[#22C55E]/20 text-[#22C55E]',
  Bearish: 'bg-red-500/20 text-red-400',
  Neutral: 'bg-zinc-500/20 text-zinc-300',
};

export default function CommunitySidebar({
  leaderboard,
  researchPosts,
  clubVotes,
  userId,
  onCreateResearch,
}: CommunitySidebarProps) {
  const t = useTranslations('community');
  const activeVotes = clubVotes.filter(v => v.status === 'active');
  const topResearch = researchPosts.slice(0, 3);

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
              <div key={post.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
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
                  {post.price > 0 ? `${fmtScout(centsToBsd(post.price))} $SCOUT` : t('sidebar.free')}
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

      {/* Top Scouts */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFD700]" />
            <span className="font-bold text-sm">Top Scouts</span>
          </div>
          <Link href="/community?tab=ranking" className="text-xs text-[#FFD700] hover:underline">
            {t('sidebar.showAll')}
          </Link>
        </div>
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((u, i) => (
            <Link key={u.userId} href={`/profile/${u.handle}`} className="flex items-center gap-3 py-1.5 hover:bg-white/[0.03] rounded-lg px-1 -mx-1 transition-colors">
              <span className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/50'
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate flex items-center gap-1">
                  {u.displayName || u.handle}
                  {u.verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
                </div>
              </div>
              <span className="text-xs font-mono text-[#FFD700]">{u.totalScore}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Active Votes */}
      {activeVotes.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm">{t('sidebar.activeVotes')}</span>
            </div>
          </div>
          <div className="space-y-2">
            {activeVotes.slice(0, 3).map(v => (
              <div
                key={v.id}
                className="w-full text-left p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="text-sm font-medium line-clamp-1">{v.question}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{v.total_votes} Stimmen</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
