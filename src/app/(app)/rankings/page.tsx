'use client';

import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import {
  SelfRankCard,
  GlobalLeaderboard,
  FriendsLeaderboard,
  ClubLeaderboard,
  LastEventResults,
  MonthlyWinners,
  PlayerRankings,
} from '@/components/rankings';

export default function RankingsPage() {
  const t = useTranslations('rankings');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="size-6 text-gold" />
        <h1 className="text-2xl font-black text-white">{t('title')}</h1>
      </div>

      {/* Self Rank */}
      <SelfRankCard />

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <GlobalLeaderboard />
          <MonthlyWinners />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <FriendsLeaderboard />
          <ClubLeaderboard />
          <LastEventResults />
          <PlayerRankings />
        </div>
      </div>
    </div>
  );
}
