'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { useUser } from '@/components/providers/AuthProvider';
import { getFullGameweekStatus, simulateGameweekFlow, type FullGameweekStatus } from '@/lib/services/scoring';

export function AdminGameweeksTab() {
  const { addToast } = useToast();
  const { activeClub } = useClub();
  const { user } = useUser();
  const selectedClubId = activeClub?.id ?? '';
  const [gwStatus, setGwStatus] = useState<FullGameweekStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<number | null>(null);
  const [activeGw, setActiveGw] = useState<number>(11);

  useEffect(() => {
    if (!selectedClubId) return;
    Promise.allSettled([
      getFullGameweekStatus(),
      import('@/lib/services/club').then(({ getActiveGameweek }) =>
        getActiveGameweek(selectedClubId)
      ),
    ]).then(([gwRes, clubRes]) => {
      if (gwRes.status === 'fulfilled') setGwStatus(gwRes.value);
      if (clubRes.status === 'fulfilled') {
        setActiveGw(clubRes.value ?? 11);
      }
      setLoading(false);
    });
  }, [selectedClubId]);

  const handleSimAndScore = async (gw: number) => {
    setSimulating(gw);
    try {
      const result = await simulateGameweekFlow(selectedClubId, gw, user?.id);
      if (result.success) {
        addToast(`GW ${gw}: ${result.fixturesSimulated} Fixtures, ${result.eventsScored} Events gescort`, 'success');
        setActiveGw(result.nextGameweek);
      } else {
        addToast(`Fehler: ${result.errors.join(', ')}`, 'error');
      }
      // Reload status
      const updated = await getFullGameweekStatus();
      setGwStatus(updated);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setSimulating(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/60">Aktiver Spieltag:</span>
        <span className="font-bold text-gold text-lg">GW {activeGw}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {gwStatus.map(gw => {
          const isCurrent = gw.gameweek === activeGw;
          const isPast = gw.gameweek < activeGw;
          return (
            <Card
              key={gw.gameweek}
              className={cn(
                'p-3 text-center',
                isCurrent && 'border-gold/30 bg-gold/5',
                isPast && gw.isFullyScored && 'border-green-500/20'
              )}
            >
              <div className={cn('text-xs font-bold mb-1', isCurrent ? 'text-gold' : 'text-white/60')}>
                GW {gw.gameweek}
              </div>
              <div className="space-y-0.5 text-[10px] text-white/40">
                <div>{gw.simulatedFixtures}/{gw.totalFixtures} Fixtures</div>
                <div>{gw.scoredEvents}/{gw.eventCount} Events</div>
              </div>
              <div className="mt-1.5 flex justify-center gap-1">
                {gw.isSimulated && <span className="size-2 rounded-full bg-green-500" title="Simuliert" aria-label="Simuliert" aria-hidden="true" />}
                {gw.isFullyScored && <span className="size-2 rounded-full bg-gold" title="Gescort" aria-label="Gescort" aria-hidden="true" />}
              </div>
              {isCurrent && (
                <button
                  onClick={() => handleSimAndScore(gw.gameweek)}
                  disabled={simulating !== null}
                  className="mt-2 w-full text-[10px] px-2 py-1 rounded bg-gold/20 text-gold hover:bg-gold/30 disabled:opacity-50"
                >
                  {simulating === gw.gameweek ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none mx-auto" aria-hidden="true" /> : 'Sim & Score'}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
