import React from 'react';
import Link from 'next/link';
import { Users, ChevronRight, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { ClubHero } from '@/components/club/ClubHero';
import { ClubStatsBar } from '@/components/club/ClubStatsBar';
import { SquadOverviewWidget } from '@/components/club/SquadOverviewWidget';
import { NextMatchCard, LastResultsCard } from '@/components/club/FixtureCards';
import type { ClubWithAdmin, Player, Fixture } from '@/types';
import type { PrestigeTier } from '@/lib/services/club';

interface PublicClubViewProps {
  club: ClubWithAdmin;
  players: Player[];
  followerCount: number;
  totalVolume24h: number;
  totalDpcFloat: number;
  avgPerf: number;
  formResults: ('W' | 'D' | 'L')[];
  clubIpos: { id: string }[];
  clubFixtures: Fixture[];
  clubId: string | undefined;
  clubPrestige?: { tier: PrestigeTier } | null;
}

export function PublicClubView({
  club, players, followerCount, totalVolume24h, totalDpcFloat,
  avgPerf, formResults, clubIpos, clubFixtures, clubId, clubPrestige,
}: PublicClubViewProps) {
  const t = useTranslations('club');
  const clubColor = club.primary_color || '#006633';
  const loginUrl = club.referral_code ? `/login?club=${club.referral_code}` : '/login';

  return (
    <div
      className="max-w-[1200px] mx-auto"
      style={{
        '--club-primary': clubColor,
        '--club-secondary': club.secondary_color || '#333',
        '--club-glow': `${clubColor}4D`,
      } as React.CSSProperties}
    >
      <ClubHero
        club={club}
        followerCount={followerCount}
        isFollowing={false}
        followLoading={false}
        onFollow={() => {}}
        totalVolume24h={totalVolume24h}
        playerCount={players.length}
        buyablePlayers={clubIpos.length}
        isPublic
        loginUrl={loginUrl}
        totalDpcFloat={totalDpcFloat}
        avgPerf={avgPerf}
        formResults={formResults}
        prestigeTier={clubPrestige?.tier}
      />

      {/* CTA Banner */}
      <div className="mb-6">
        <Card className="p-6 border-gold/20 bg-gold/[0.06]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-black text-balance mb-1">{t('publicCta')}</h2>
              <p className="text-sm text-white/50 text-pretty">{t('publicCtaDesc')}</p>
            </div>
            <Link href={loginUrl}>
              <Button variant="gold">{t('publicCtaButton')}</Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <ClubStatsBar
          totalVolume24h={totalVolume24h}
          totalDpcFloat={totalDpcFloat}
          avgPerf={avgPerf}
          followerCount={followerCount}
          playerCount={players.length}
          clubColor={clubColor}
          formResults={formResults}
          prestigeTier={clubPrestige?.tier}
        />
      </div>

      {/* Next Match */}
      {clubId && (
        <div className="mb-6">
          <NextMatchCard fixtures={clubFixtures} clubId={clubId} club={club} />
        </div>
      )}

      {/* Player Preview (Top 8 by L5) */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-5" style={{ color: clubColor }} />
            <h2 className="font-black text-balance text-lg">{t('squadPreview')}</h2>
          </div>
          <Link href={loginUrl} className="text-xs text-gold hover:underline flex items-center gap-1">
            {t('publicAllPlayers', { count: players.length })} <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...players]
            .sort((a, b) => b.perf.l5 - a.perf.l5)
            .slice(0, 8)
            .map(player => (
              <div key={player.id} className="p-3 bg-surface-base rounded-xl border border-white/10">
                <PlayerIdentity player={player} size="sm" showMeta={false} showStatus={false} />
              </div>
            ))
          }
        </div>
      </Card>

      {/* Squad Overview */}
      <div className="mb-6">
        <SquadOverviewWidget players={players} />
      </div>

      {/* Last Results */}
      {clubId && (
        <div className="mb-6">
          <LastResultsCard fixtures={clubFixtures} clubId={clubId} />
        </div>
      )}

      {/* Club Info */}
      <Card className="p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="size-5 text-white/50" />
          <h2 className="font-black text-balance">{t('clubInfo')}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {club.stadium && (
            <div className="bg-surface-base rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">{t('stadium')}</div>
              <div className="font-bold text-sm">{club.stadium}</div>
            </div>
          )}
          {club.city && (
            <div className="bg-surface-base rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">{t('city')}</div>
              <div className="font-bold text-sm">{club.city}</div>
            </div>
          )}
          <div className="bg-surface-base rounded-xl p-3">
            <div className="text-xs text-white/50 mb-1">{t('league')}</div>
            <div className="font-bold text-sm">{club.league}</div>
          </div>
          <div className="bg-surface-base rounded-xl p-3">
            <div className="text-xs text-white/50 mb-1">{t('players')}</div>
            <div className="font-bold tabular-nums text-sm text-green-500">{players.length}</div>
          </div>
        </div>
      </Card>

      {/* Bottom CTA */}
      <div className="text-center py-8">
        <p className="text-white/40 text-sm text-pretty mb-3">{t('publicCtaDesc')}</p>
        <Link href={loginUrl}>
          <Button variant="gold" className="px-8">{t('publicCtaButton')}</Button>
        </Link>
      </div>
    </div>
  );
}
