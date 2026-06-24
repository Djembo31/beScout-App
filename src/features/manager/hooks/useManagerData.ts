'use client';

import { useMemo } from 'react';
import type { Player, PlayerStatus } from '@/types';
import { useMarketData } from '@/features/market/hooks/useMarketData';
import { useRecentMinutes, useRecentScores, useNextFixtures, usePlayerEventUsage } from '@/lib/queries/managerData';
import { useUserEquipment, useEquipmentDefinitions, useEquipmentRanks } from '@/lib/queries/equipment';
import { useIncomingOffers } from '@/features/market/queries/offers';
import { useActiveIpos } from '@/features/market/queries/ipos';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

export interface HealthCounts {
  fit: number;
  doubtful: number;
  injured: number;
}

export interface PortfolioTrend {
  totalValue: number;
  pctChange: number | null;
}

export interface NextEventInfo {
  name: string;
  daysUntil: number;
  format: string;
}

export function useManagerData(userId: string | undefined) {
  // ── Core player data (shared cache with Market) ──
  // Slice 283: Manager ist Kader-zentrisch (Lineups nur aus Holdings) — Quelle ist
  // das Portfolio-Subset (byIds), NICHT mehr die volle 4,2-MB-Liste. Externe API
  // (players/playersLoading/playersError) bleibt stabil für die Konsumenten.
  // Lineup-HISTORIE kann verkaufte Spieler enthalten → HistoryEventCard holt die
  // per eigenem usePlayersByIds (282-LastGameweekWidget-Pattern).
  const {
    portfolioPlayers: players,
    mySquadPlayers,
    portfolioLoading: playersLoading,
    portfolioPlayersError: playersError,
    holdings,
    getFloor,
  } = useMarketData(userId);

  // ── Trading data needed by Kader Tab (shared cache with Market) ──
  const { data: ipoList = [] } = useActiveIpos();
  const { data: incomingOffers = [] } = useIncomingOffers(userId);

  // ── Manager-specific queries ──
  const { data: minutesMap } = useRecentMinutes();
  const { data: scoresMap } = useRecentScores();
  const { data: nextFixturesMap } = useNextFixtures();
  const { data: eventUsageMap } = usePlayerEventUsage(userId);

  // ── Equipment queries ──
  const { data: userEquipment } = useUserEquipment(userId);
  const { data: equipDefs } = useEquipmentDefinitions();
  const { data: equipRanks } = useEquipmentRanks();

  // ── Derived: player map ──
  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  // ── Derived: health counts ──
  const healthCounts = useMemo<HealthCounts>(() => {
    const counts = { fit: 0, doubtful: 0, injured: 0 };
    for (const p of mySquadPlayers) {
      const s: PlayerStatus = p.status;
      if (s === 'fit') counts.fit++;
      else if (s === 'doubtful') counts.doubtful++;
      else counts.injured++; // injured + suspended
    }
    return counts;
  }, [mySquadPlayers]);

  // ── Derived: portfolio trend ──
  const portfolioTrend = useMemo<PortfolioTrend>(() => {
    const totalValue = mySquadPlayers.reduce((sum, p) => sum + (getFloor(p)), 0);
    // Slice 368e / §7-#1: Wertentwicklung gegen den echten Einstand (holdings.avg_buy_price,
    // Cents→Credits), nicht gegen den Markteintritt — ehrliches User-P&L statt Markt-Trajektorie.
    const avgBuyBsd = new Map<string, number>();
    for (const h of holdings) avgBuyBsd.set(h.player_id, (h.avg_buy_price ?? 0) / 100);
    const withCost = mySquadPlayers.filter(p => (avgBuyBsd.get(p.id) ?? 0) > 0);
    if (withCost.length === 0) return { totalValue, pctChange: null };

    const totalCost = withCost.reduce((sum, p) => sum + (avgBuyBsd.get(p.id) ?? 0), 0);
    const totalCurrent = withCost.reduce((sum, p) => sum + getFloor(p), 0);
    const pctChange = totalCost > 0 ? ((totalCurrent - totalCost) / totalCost * 100) : null;
    return { totalValue, pctChange };
  }, [mySquadPlayers, getFloor, holdings]);

  // ── Derived: fitness map for pitch dots ──
  const fitnessMap = useMemo(() => {
    const m = new Map<string, PlayerStatus>();
    for (const p of mySquadPlayers) {
      if (p.status !== 'fit') m.set(p.id, p.status);
    }
    return m;
  }, [mySquadPlayers]);

  // ── Derived: event locks set ──
  const eventLocks = useMemo(() => {
    const s = new Set<string>();
    if (!eventUsageMap) return s;
    Array.from(eventUsageMap.entries()).forEach(([pid, usage]) => {
      if (usage && (usage as unknown[]).length > 0) s.add(pid);
    });
    return s;
  }, [eventUsageMap]);

  // ── Derived: valid equipment IDs (for pruning stale plans) ──
  const validEquipmentIds = useMemo(() => {
    if (!userEquipment) return new Set<string>();
    return new Set(userEquipment.map(e => e.id));
  }, [userEquipment]);

  // ── Helpers ──
  function getScores(playerId: string): (number | null)[] | undefined {
    return scoresMap?.get(playerId);
  }

  function getNextFixture(clubId: string): NextFixtureInfo | undefined {
    return nextFixturesMap?.get(clubId);
  }

  function getEventCount(playerId: string): number {
    if (!eventUsageMap) return 0;
    const usage = eventUsageMap.get(playerId);
    return usage ? (usage as unknown[]).length : 0;
  }

  return {
    // Core data
    players,
    mySquadPlayers,
    playerMap,
    holdings,
    playersLoading,
    playersError,

    // Trading data (for Kader Tab)
    ipoList,
    incomingOffers,

    // Manager queries
    minutesMap,
    scoresMap,
    nextFixturesMap,
    eventUsageMap,

    // Equipment
    userEquipment,
    equipDefs,
    equipRanks,
    validEquipmentIds,

    // Derived
    healthCounts,
    portfolioTrend,
    fitnessMap,
    eventLocks,

    // Helpers
    getScores,
    getNextFixture,
    getEventCount,
    getFloor,
  };
}
