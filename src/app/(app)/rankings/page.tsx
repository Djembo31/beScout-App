'use client';

import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import { LeagueScopeHeader } from '@/components/layout/LeagueScopeHeader';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
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

  // Slice 251 Wave 3 — Liga-Scope SSOT (replaces local useState).
  const filterCountry = useLeagueScope((s) => s.countryCode);
  const filterLeague = useLeagueScope((s) => s.leagueName);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24 lg:pb-8">
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
          {/* FM-06 (Slice 285): Liga-Header direkt über Spieler-Rankings — er filtert
              NUR diese Card (Country+League), nicht die Leaderboards. Vorher Page-Top
              = irreführend (suggerierte seitenweite Wirkung). Anil-Decision Option 1. */}
          <div className="space-y-3">
            <LeagueScopeHeader leagueBarSize="md" nonSticky />
            <PlayerRankings filterCountry={filterCountry} filterLeague={filterLeague} />
          </div>
        </div>
      </div>

      {/* FIX-16 (J9Biz-02): Disclaimer — page shows $SCOUT rewards (MonthlyWinners) */}
      <TradingDisclaimer variant="card" />
    </div>
  );
}
