'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Search, Users, UserPlus, UserMinus, Shield, Compass, Calendar, Sparkles, Flame } from 'lucide-react';
import { Card, Button, ErrorState, SearchInput, EmptyState, Skeleton, SkeletonCard } from '@/components/ui';
import { LeagueScopeHeader } from '@/components/layout/LeagueScopeHeader';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { useFollowedClubs } from '@/lib/hooks/useFollowedClubs';
import { useToggleFollowClub } from '@/lib/hooks/useToggleFollowClub';
import { getClubsWithStats } from '@/lib/services/club';
import { getNextFixturesByClub } from '@/lib/services/fixtures';
import { useMostOwnedPlayersPerClubBatch } from '@/lib/queries/trades';
import { getLeaguesByCountry } from '@/lib/leagues';
import type { NextFixtureInfo } from '@/lib/services/fixtures';
import type { DbClub } from '@/types';
import { FanWishModal } from '@/components/fan-wishes/FanWishModal';

// Slice 207 — Threshold consistent mit K-03 PickRateBadge (Slice 204).
const MOST_OWNED_HINT_MIN_PCT = 5;

type ClubWithStats = DbClub & { follower_count: number; player_count: number };

export default function ClubsDiscoveryPage() {
  const { user } = useUser();
  const { activeClub, setActiveClub } = useClub();
  const { data: followedClubs = [] } = useFollowedClubs();
  const { toggleAsync } = useToggleFollowClub();
  const followedIds = useMemo(() => new Set(followedClubs.map((c) => c.id)), [followedClubs]);
  const isFollowing = useCallback((clubId: string) => followedIds.has(clubId), [followedIds]);
  const t = useTranslations('clubs');
  const [clubs, setClubs] = useState<ClubWithStats[]>([]);
  const [nextFixtures, setNextFixtures] = useState<Map<string, NextFixtureInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [wishOpen, setWishOpen] = useState(false);
  // Slice 251 Wave 3 — Liga-Scope SSOT (replaces local useState filterCountry/filterLeague).
  const filterCountry = useLeagueScope((s) => s.countryCode);
  const filterLeague = useLeagueScope((s) => s.leagueName);
  // Slice 326: leagueId für den Liga-Filter (Name bleibt für Smart-Auto-Select-Guards).
  const filterLeagueId = useLeagueScope((s) => s.leagueId);
  const setLeagueScope = useLeagueScope((s) => s.setLeagueScope);
  const tw = useTranslations('fanWishes');

  // Smart auto-select kept page-local (per Spec V1 — auto-select can move to
  // store in V2). Without locale-side league lookup we resolve via library.
  useEffect(() => {
    if (!filterCountry || filterLeague) return;
    const countryLeagues = getLeaguesByCountry(filterCountry);
    if (countryLeagues.length === 1) {
      const single = countryLeagues[0];
      setLeagueScope({ id: single.id, name: single.name, country: single.country });
    }
  }, [filterCountry, filterLeague, setLeagueScope]);

  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    Promise.all([getClubsWithStats({ activeOnly: true }), getNextFixturesByClub()])
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

  const filtered = clubs.filter(c => {
    // Search text filter
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.league.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    // League filter takes precedence over country (league implies country)
    // Slice 326: c.league_id statt c.league.
    if (filterLeagueId) return c.league_id === filterLeagueId;
    if (filterCountry) return c.country === filterCountry;
    return true;
  });

  // Slice 207 — Most-Owned Hint pro ClubCard. 1 Batch-RPC fuer alle filtered
  // Clubs (statt N parallele RPCs). useMemo stabilisiert das Array damit der
  // Hook-Key nicht jedes Render churnt.
  const filteredClubIds = useMemo(() => filtered.map(c => c.id), [filtered]);
  const { data: mostOwnedByClub } = useMostOwnedPlayersPerClubBatch(filteredClubIds, 1);

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

    // Optimistic follower-count bump auf der Discovery-Karte. Die
    // followedClubs-Liste + isFollowing + Follower-Count-Caches werden von
    // useToggleFollowClub.onMutate deterministisch geupdated; hier nur der
    // page-lokale `ClubWithStats.follower_count` auf der Scroll-Liste.
    setClubs(prev => prev.map(c => {
      if (c.id !== club.id) return c;
      return { ...c, follower_count: c.follower_count + (wasFollowing ? -1 : 1) };
    }));

    try {
      await toggleAsync({ club, follow: !wasFollowing });
    } catch (err) {
      console.error('[Clubs] Toggle follow failed:', err);
      setClubs(prev => prev.map(c => {
        if (c.id !== club.id) return c;
        return { ...c, follower_count: c.follower_count + (wasFollowing ? 1 : -1) };
      }));
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
          <button
            onClick={() => setWishOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gold bg-gold/10 hover:bg-gold/20 rounded-lg transition-colors min-h-[44px] ml-auto"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            {tw('clubMissing')}
          </button>
        </div>
        <p className="text-sm text-white/50 text-pretty">{t('discoverDesc')}</p>
      </div>

      {/* Country + League Filter (Slice 251 Wave 3 — global SSOT) */}
      <LeagueScopeHeader nonSticky />

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
          action={searchQuery
            ? { label: tw('wishHere'), onClick: () => setWishOpen(true) }
            : undefined
          }
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
                        <Calendar className="size-3 text-green-500 flex-shrink-0" aria-hidden="true" />
                        <span className="font-mono tabular-nums text-white/30">GW {nf.gameweek}</span>
                        <span className={cn('px-1 py-0.5 rounded-full text-[9px] font-bold', nf.isHome ? 'bg-green-500/10 text-green-500' : 'bg-sky-500/10 text-sky-400')}>
                          {nf.isHome ? 'H' : 'A'}
                        </span>
                        <span className="flex items-center gap-1 truncate min-w-0">
                          <span className="text-white/40 flex-shrink-0">vs</span>
                          {nf.opponentLogoUrl && (
                            <Image
                              src={nf.opponentLogoUrl}
                              alt=""
                              width={14}
                              height={14}
                              className="size-3.5 object-contain flex-shrink-0"
                            />
                          )}
                          <span className="truncate">{nf.opponentShort || nf.opponentName}</span>
                        </span>
                      </div>
                    );
                  })()}

                  {/* Slice 207 — Most-Owned Hint (Top-1, anonymized aggregate). */}
                  {(() => {
                    const top = mostOwnedByClub?.get(club.id)?.[0];
                    if (!top || top.holders_pct < MOST_OWNED_HINT_MIN_PCT) return null;
                    const pct = Math.round(top.holders_pct);
                    const initial = (top.first_name?.trim()?.[0] ?? '').toUpperCase();
                    const lastName = (top.last_name ?? '').trim();
                    const playerLabel = initial
                      ? `${initial}. ${lastName}`.trim()
                      : lastName || top.player_id.slice(0, 6);
                    return (
                      <div
                        className="flex items-center gap-1.5 mt-2 px-2 py-1.5 bg-amber-400/5 border border-amber-400/20 rounded-lg text-xs text-amber-300 truncate"
                        aria-label={t('mostOwned.ariaLabel', { pct, name: playerLabel })}
                      >
                        <Flame className="size-3 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate tabular-nums">
                          {t('mostOwned.label', { pct, name: playerLabel })}
                        </span>
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

      <FanWishModal open={wishOpen} onClose={() => setWishOpen(false)} defaultClubName={searchQuery} />
    </div>
  );
}
