'use client';

import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Player, Pos } from '@/types';
import { useUser } from '@/components/providers/AuthProvider';
import { useMarketData } from '@/features/market/hooks/useMarketData';
import { useManagerStore } from '../store/managerStore';
import StatusBar from './StatusBar';
import TacticalBoard from './TacticalBoard';
import IntelPanel from './IntelPanel';
import SquadStrip from './SquadStrip';

// ============================================
// HELPERS — map Player to component prop shapes
// ============================================

function toTacticalPlayer(p: Player) {
  return {
    id: p.id,
    first_name: p.first,
    last_name: p.last,
    position: p.pos,
    perf_l5: p.perf.l5,
    status: p.status,
    isLocked: false, // TODO: wire from usePlayerEventUsage
  };
}

function toStripPlayer(p: Player, floorMap: Map<string, number>, assignedIds: Set<string>) {
  return {
    id: p.id,
    first_name: p.first,
    last_name: p.last,
    position: p.pos,
    perf_l5: p.perf.l5,
    floor_price_scout: Math.round((floorMap.get(p.id) ?? 0) / 100),
    status: p.status,
    isLocked: false, // TODO: wire from usePlayerEventUsage
    isOnPitch: assignedIds.has(p.id),
  };
}

function toIntelPlayer(p: Player, floorMap: Map<string, number>, holdings: Array<{ player_id: string; quantity: number; avg_buy_price: number }>) {
  const holding = holdings.find(h => h.player_id === p.id);
  const floor = floorMap.get(p.id) ?? 0;
  const avgBuy = holding?.avg_buy_price ?? 0;
  const changePct = avgBuy > 0 ? ((floor - avgBuy) / avgBuy) * 100 : 0;

  return {
    id: p.id,
    first_name: p.first,
    last_name: p.last,
    position: p.pos,
    perf_l5: p.perf.l5,
    perf_l15: p.perf.l15,
    age: p.age,
    shirt_number: null as number | null, // not on Player type
    club_name: p.club,
    status: p.status,
    matches_played: p.stats.matches,
    goals: p.stats.goals,
    assists: p.stats.assists,
    minutes_played: p.stats.minutes,
    floor_price: floor,
    avg_buy_price: avgBuy,
    quantity_held: holding?.quantity ?? 0,
    price_change_7d_pct: changePct,
  };
}

// ============================================
// MAIN
// ============================================

export default function ManagerContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { mySquadPlayers, playersLoading, playerMap, floorMap, holdings } = useMarketData(user?.id);

  const {
    selectedPlayerId, selectPlayer,
    intelTab, setIntelTab,
    stripSort, setStripSort,
    stripFilterPos, setStripFilterPos,
    assignments,
  } = useManagerStore();

  // Deep-link: ?player=ID or ?assign=ID
  const urlPlayerId = searchParams.get('player') ?? searchParams.get('assign');
  useMemo(() => {
    if (urlPlayerId && playerMap.has(urlPlayerId) && !selectedPlayerId) {
      selectPlayer(urlPlayerId);
    }
  }, [urlPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Assigned player IDs (for on-pitch badge in strip)
  const assignedIds = useMemo(() => new Set(Object.values(assignments)), [assignments]);

  // Squad health
  const squadHealth = useMemo(() => {
    let fit = 0, doubtful = 0, injured = 0;
    for (const p of mySquadPlayers) {
      if (p.status === 'injured') injured++;
      else if (p.status === 'doubtful') doubtful++;
      else fit++;
    }
    return { fit, doubtful, injured };
  }, [mySquadPlayers]);

  // Portfolio value + trend (simplified — sum of floor * owned)
  const portfolioStats = useMemo(() => {
    let totalValue = 0;
    for (const p of mySquadPlayers) {
      const floor = floorMap.get(p.id) ?? 0;
      totalValue += (floor / 100) * p.dpc.owned;
    }
    return { valueScout: Math.round(totalValue), trendPct: 0 }; // TODO: compute real 7d trend
  }, [mySquadPlayers, floorMap]);

  // Tactical board players
  const tacticalPlayers = useMemo(() => mySquadPlayers.map(toTacticalPlayer), [mySquadPlayers]);

  // Squad strip players
  const stripPlayers = useMemo(
    () => mySquadPlayers.map(p => toStripPlayer(p, floorMap, assignedIds)),
    [mySquadPlayers, floorMap, assignedIds],
  );

  // Selected player data for Intel Panel
  const selectedPlayer = selectedPlayerId ? playerMap.get(selectedPlayerId) ?? null : null;
  const intelPlayer = useMemo(
    () => selectedPlayer ? toIntelPlayer(selectedPlayer, floorMap, holdings) : null,
    [selectedPlayer, floorMap, holdings],
  );

  // Recent scores for sparkline (placeholder — needs usePlayerScoreHistory)
  const recentScores: number[] = []; // TODO: wire from player_gameweek_scores

  const handlePlayerClick = useCallback((playerId: string) => {
    selectPlayer(playerId);
  }, [selectPlayer]);

  const handleEmptySlotClick = useCallback((pos: Pos) => {
    setStripFilterPos(pos);
    selectPlayer(null);
  }, [setStripFilterPos, selectPlayer]);

  const handleCloseIntel = useCallback(() => {
    selectPlayer(null);
  }, [selectPlayer]);

  if (playersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status Bar */}
      <StatusBar
        squadHealth={squadHealth}
        nextEvent={null} // TODO: wire from useUpcomingEvents
        portfolioTrendPct={portfolioStats.trendPct}
        portfolioValueScout={portfolioStats.valueScout}
      />

      {/* Main Content: Tactical Board + Intel Panel */}
      <div className="flex gap-4">
        {/* Tactical Board */}
        <div className="flex-1 min-w-0">
          <TacticalBoard
            players={tacticalPlayers}
            onPlayerClick={handlePlayerClick}
            onEmptySlotClick={handleEmptySlotClick}
          />
        </div>

        {/* Intel Panel — desktop only (mobile uses bottom sheet inside IntelPanel) */}
        <div className="hidden lg:block flex-shrink-0">
          <IntelPanel
            player={intelPlayer}
            nextFixture={null} // TODO: wire from useNextFixtures
            recentScores={recentScores}
            activeTab={intelTab}
            onTabChange={setIntelTab}
            onClose={handleCloseIntel}
          />
        </div>
      </div>

      {/* Intel Panel — mobile bottom sheet */}
      <div className="lg:hidden">
        <IntelPanel
          player={intelPlayer}
          nextFixture={null}
          recentScores={recentScores}
          activeTab={intelTab}
          onTabChange={setIntelTab}
          onClose={handleCloseIntel}
        />
      </div>

      {/* Squad Strip */}
      <SquadStrip
        players={stripPlayers}
        selectedPlayerId={selectedPlayerId}
        onPlayerSelect={handlePlayerClick}
        sort={stripSort}
        onSortChange={setStripSort}
        filterPos={stripFilterPos}
        onFilterPosChange={setStripFilterPos}
      />
    </div>
  );
}
