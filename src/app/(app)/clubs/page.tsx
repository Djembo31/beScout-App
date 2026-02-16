'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Users, UserPlus, UserMinus, Loader2, Shield, Compass } from 'lucide-react';
import { Card, Button, ErrorState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { getClubsWithStats } from '@/lib/services/club';
import type { DbClub } from '@/types';

type ClubWithStats = DbClub & { follower_count: number; player_count: number };

export default function ClubsDiscoveryPage() {
  const { user } = useUser();
  const { isFollowing, toggleFollow, activeClub, setActiveClub } = useClub();
  const [clubs, setClubs] = useState<ClubWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    getClubsWithStats()
      .then(data => { if (!cancelled) setClubs(data); })
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
    const league = club.league || 'Sonstige';
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
          <Compass className="w-6 h-6 text-[#FFD700]" />
          <h1 className="text-2xl font-black">Clubs entdecken</h1>
        </div>
        <p className="text-sm text-white/50">Folge Clubs um ihre Spieler zu traden, an Events teilzunehmen und in der Community mitzureden.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Club, Stadt oder Liga suchen..."
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 transition-all"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && dataError && (
        <ErrorState onRetry={() => { setLoading(true); setRetryCount(c => c + 1); }} />
      )}

      {/* Empty */}
      {!loading && !dataError && filtered.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">
            {searchQuery ? `Keine Clubs für "${searchQuery}" gefunden.` : 'Keine Clubs verfügbar.'}
          </p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-[#FFD700]/70 hover:text-[#FFD700]">
              Suche zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Club Grid by League */}
      {!loading && Array.from(grouped.entries()).map(([league, leagueClubs]) => (
        <div key={league}>
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">{league}</h2>
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
                    'p-4 transition-all hover:border-white/20',
                    isActive && 'ring-1 ring-[#FFD700]/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Club Logo */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {club.logo_url ? (
                        <img src={club.logo_url} alt="" className="w-8 h-8 object-contain" />
                      ) : (
                        club.short?.slice(0, 3)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/club/${club.slug}`}
                        className="text-sm font-bold text-white hover:text-[#FFD700] transition-colors truncate block"
                      >
                        {club.name}
                      </Link>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                        {club.city && <span>{club.city}</span>}
                        {club.is_verified && (
                          <span className="flex items-center gap-0.5 text-[#FFD700]">
                            <Shield className="w-3 h-3" /> Verifiziert
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {club.follower_count} Fans
                        </span>
                        <span>{club.player_count} Spieler</span>
                      </div>
                    </div>
                  </div>

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
                        <><UserMinus className="w-3.5 h-3.5" /> Entfolgen</>
                      ) : (
                        <><UserPlus className="w-3.5 h-3.5" /> Folgen</>
                      )}
                    </Button>
                    {following && !isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveClub(club)}
                        title="Als aktiven Club setzen"
                      >
                        Aktivieren
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
