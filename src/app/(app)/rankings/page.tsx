'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import { CountryBar, LeagueBar } from '@/components/ui/index';
import { getCountries } from '@/lib/leagues';
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

  const [filterCountry, setFilterCountry] = useState('');
  const [filterLeague, setFilterLeague] = useState('');
  const countries = useMemo(() => getCountries(), []);

  // When country changes, reset league (Smart Collapse)
  const handleCountryChange = useCallback((country: string) => {
    setFilterCountry(country);
    setFilterLeague('');
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="size-6 text-gold" />
        <h1 className="text-2xl font-black text-white">{t('title')}</h1>
      </div>

      {/* Country + League Filter */}
      <div className="space-y-2">
        <CountryBar countries={countries} selected={filterCountry} onSelect={handleCountryChange} />
        <LeagueBar
          selected={filterLeague}
          onSelect={setFilterLeague}
          country={filterCountry || undefined}
        />
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
          <PlayerRankings filterCountry={filterCountry} filterLeague={filterLeague} />
        </div>
      </div>

      {/* FIX-16 (J9Biz-02): Disclaimer — page shows $SCOUT rewards (MonthlyWinners) */}
      <TradingDisclaimer variant="card" />
    </div>
  );
}
