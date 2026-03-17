'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Search, Users, UserPlus, UserMinus, Shield, Compass, Calendar } from 'lucide-react';
import { Card, Button, ErrorState, SearchInput, EmptyState, Skeleton, SkeletonCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { getClubsWithStats } from '@/lib/services/club';
import { getNextFixturesByClub } from '@/lib/services/fixtures';
import type { NextFixtureInfo } from '@/lib/services/fixtures';
import type { DbClub } from '@/types';

type ClubWithStats = DbClub & { follower_count: number; player_count: number };

export default function ClubsDiscoveryPage() {
  const { user } = useUser();
  const { isFollowing, toggleFollow, activeClub, setActiveClub } = useClub();
  const t = useTranslations('clubs');
  const [clubs, setClubs] = useState<ClubWithStats[]>([]);
  const [nextFixtures, setNextFixtures] = useState<Map<string, NextFixtureInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    Promise.all([getClubsWithStats(), getNextFixturesByClub()])
      .then(([clubData, fixtureData]) => {
        if (!cancelled) {
          setClubs(clubData);
          setNextFixtures(fixtureData);
        }
      })
      .catch(err => {
        console.error('[Clubs] Failed to load:', err);
        if (!cancelled) setDataError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retryCount]);

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.league.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by league
  const grouped = new Map<string, ClubWithStats[]>();
  for (const club of filtered) {
    const league = club.league || t('other');
    if (!grouped.has(league)) grouped.set(league, []);
    grouped.get(league)!.push(club);
  }

  const handleToggleFollow = async (club: ClubWithStats) => {
    if (!user) return;
    setTogglingId(club.id);
    const wasFollowing = isFollowing(club.id);
    try {
      await toggleFollow(club.id, club.name);
      // Update local count after toggle
      setClubs(prev => prev.map(c => {
        if (c.id !== club.id) return c;
        return { ...c, follower_count: c.follower_count + (wasFollowing ? -1 : 1) };
      }));
    } catch (err) {
      console.error('[Clubs] Toggle follow failed:', err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Compass className="size-6 text-gold" aria-hidden="true" />
          <h1 className="text-2xl font-black text-balance">{t('discoverTitle')}</h1>
        </div>
        <p className="text-sm text-white/50 text-pretty">{t('discoverDesc')}</p>
      </div>

      {/* Search */}
      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('searchPlaceholder')} />

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} className="h-40" />)}
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && dataError && (
        <ErrorState onRetry={() => { setLoading(true); setRetryCount(c => c + 1); }} />
      )}

      {/* Empty */}
      {!loading && !dataError && filtered.length === 0 && (
        <EmptyState
          icon={<Search />}
          title={searchQuery ? t('noClubsSearch', { query: searchQuery }) : t('noClubsAvailable')}
          action={searchQuery ? { label: t('resetSearch'), onClick: () => setSearchQuery('') } : undefined}
        />
      )}

      {/* Deine Vereine (followed clubs, horizontal scroll) */}
      {!loading && !dataError && (() => {
        const followedClubs = clubs.filter(c => isFollowing(c.id));
        if (followedClubs.length === 0) return null;
        return (
          <section>
            <h2 className="text-sm font-bold text-white/60 uppercase text-balance mb-3">{t('yourClubs')}</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
              {followedClubs.map(club => {
                const color = club.primary_color ?? '#FFD700';
                return (
                  <Link
                    key={club.id}
                    href={`/club/${club.slug}`}
                    className={cn(
                      'flex-shrink-0 w-[160px] snap-start rounded-2xl p-3 border transition-colors',
                      'bg-surface-minimal border-white/10 hover:border-white/20 active:scale-[0.98]',
                      'shadow-card-sm hover:shadow-card-md',
                      activeClub?.id === club.id && 'ring-1 ring-gold/30'
                    )}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div
                        className="size-10 rounded-xl flex items-center justify-center text-xs font-black"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        {club.logo_url ? (
                          <Image src={club.logo_url} alt="" width={28} height={28} className="size-7 object-contain" />
                        ) : (
                          club.short?.slice(0, 3)
                        )}
                      </div>
                      <div className="text-xs font-bold truncate w-full">{club.name}</div>
                      <div className="text-[10px] text-white/40">{club.follower_count} {t('fans')}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Club Grid by League */}
      {!loading && Array.from(grouped.entries()).map(([league, leagueClubs]) => (
        <div key={league}>
          <h2 className="text-sm font-bold text-white/60 uppercase text-balance mb-3">{league}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagueClubs.map((club) => {
              const color = club.primary_color ?? '#FFD700';
              const following = isFollowing(club.id);
              const isActive = activeClub?.id === club.id;
              const toggling = togglingId === club.id;

              return (
                <Card
                  key={club.id}
                  className={cn(
                    'p-4 transition-colors hover:border-white/20',
                    isActive && 'ring-1 ring-gold/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Club Logo */}
                    <div
                      className="size-12 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {club.logo_url ? (
                        <Image src={club.logo_url} alt="" width={32} height={32} className="size-8 object-contain" />
                      ) : (
                        club.short?.slice(0, 3)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/club/${club.slug}`}
                        className="text-sm font-bold text-white hover:text-gold transition-colors truncate block"
                      >
                        {club.name}
                      </Link>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                        {club.city && <span>{club.city}</span>}
                        {club.is_verified && (
                          <span className="flex items-center gap-0.5 text-gold">
                            <Shield className="size-3" aria-hidden="true" /> {t('verified')}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Users className="size-3" aria-hidden="true" />
                          {club.follower_count} {t('fans')}
                        </span>
                        <span>{club.player_count} {t('players')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Next Fixture */}
                  {nextFixtures.get(club.id) && (() => {
                    const nf = nextFixtures.get(club.id)!;
                    return (
                      <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-surface-minimal rounded-lg text-xs text-white/50">
                        <Calendar className="size-3 text-green-500 flex-shrink-0" />
                        <span className="font-mono tabular-nums text-white/30">GW {nf.gameweek}</span>
                        <span className={cn('px-1 py-0.5 rounded text-[9px] font-bold', nf.isHome ? 'bg-green-500/10 text-green-500' : 'bg-sky-500/10 text-sky-400')}>
                          {nf.isHome ? 'H' : 'A'}
                        </span>
                        <span className="truncate">vs {nf.opponentShort || nf.opponentName}</span>
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant={following ? 'outline' : 'gold'}
                      size="sm"
                      fullWidth
                      loading={toggling}
                      onClick={() => handleToggleFollow(club)}
                    >
                      {following ? (
                        <><UserMinus className="size-3.5" aria-hidden="true" /> {t('unfollow')}</>
                      ) : (
                        <><UserPlus className="size-3.5" aria-hidden="true" /> {t('follow')}</>
                      )}
                    </Button>
                    {following && !isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveClub(club)}
                        title={t('setActiveTitle')}
                      >
                        {t('activate')}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
