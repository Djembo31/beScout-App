'use client';

import { useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { calculateSynergyPreview } from '@/types';
import { useLineupStore } from '../store/lineupStore';
import { getFormationsForFormat, buildSlotDbKeys } from '../constants';
import type { FantasyEvent, UserDpcHolding } from '../types';

/**
 * All lineup editing/building logic from EventDetailModal.
 * Accepts holdings and a fixture deadline checker to avoid circular hook deps.
 *
 * Source: EventDetailModal.tsx lines 248-408
 */
export function useLineupBuilder(
  event: FantasyEvent | null,
  holdings: UserDpcHolding[],
  fixtureDeadlineChecker: (playerId: string) => boolean,
) {
  const t = useTranslations('fantasy');
  const { selectedPlayers, selectedFormation } = useLineupStore();

  // Free up 1 DPC for players already committed to THIS event
  // (user is editing their own lineup)
  const effectiveHoldings = useMemo(() => {
    if (!event) return holdings;
    return holdings.map(h => {
      if (h.activeEventIds.includes(event.id)) {
        const newEventsUsing = h.eventsUsing - 1;
        const newAvailable = Math.max(0, h.dpcOwned - newEventsUsing);
        return { ...h, eventsUsing: newEventsUsing, dpcAvailable: newAvailable, isLocked: newAvailable <= 0 };
      }
      return h;
    });
  }, [holdings, event?.id]);

  // Formation data -- only recalculates when format or selection changes
  const availableFormations = useMemo(
    () => getFormationsForFormat(event?.format ?? '7er', event?.lineupSize),
    [event?.format, event?.lineupSize]
  );

  const currentFormation = useMemo(
    () => availableFormations.find(f => f.id === selectedFormation) || availableFormations[0],
    [availableFormations, selectedFormation]
  );

  const formationSlots = useMemo(() => {
    const slots: { pos: string; slot: number }[] = [];
    let idx = 0;
    for (const s of currentFormation.slots) {
      for (let i = 0; i < s.count; i++) slots.push({ pos: s.pos, slot: idx++ });
    }
    return slots;
  }, [currentFormation]);

  const slotDbKeys = useMemo(() => buildSlotDbKeys(currentFormation), [currentFormation]);

  // O(1) slot->player lookup (replaces O(n) find() called 44 times per render)
  const selectedPlayerMap = useMemo(() => {
    const map = new Map<number, string>();
    selectedPlayers.forEach(p => map.set(p.slot, p.playerId));
    return map;
  }, [selectedPlayers]);

  const getSelectedPlayer = useCallback((slot: number) => {
    const playerId = selectedPlayerMap.get(slot);
    if (!playerId) return null;
    return effectiveHoldings.find(h => h.id === playerId) ?? null;
  }, [selectedPlayerMap, effectiveHoldings]);

  // Synergy preview -- only recalculates when lineup changes
  const synergyPreview = useMemo(() => {
    const clubs = selectedPlayers
      .map(sp => effectiveHoldings.find(h => h.id === sp.playerId)?.club)
      .filter(Boolean) as string[];
    return calculateSynergyPreview(clubs);
  }, [selectedPlayers, effectiveHoldings]);

  // DPC Ownership Bonus -- all player IDs the user holds DPCs for
  const ownedPlayerIds = useMemo(() => {
    return new Set(effectiveHoldings.filter(h => h.dpcOwned >= 1).map(h => h.id));
  }, [effectiveHoldings]);

  const isLineupComplete = selectedPlayers.length === formationSlots.length;

  // Salary Cap check -- perfL5 as proxy "salary" (0-100 per player)
  const totalSalary = useMemo(() =>
    selectedPlayers.reduce((sum, sp) => {
      const player = effectiveHoldings.find(h => h.id === sp.playerId);
      return sum + (player?.perfL5 ?? 50);
    }, 0),
    [selectedPlayers, effectiveHoldings]
  );

  const salaryCap = event?.salaryCap ?? null;
  const overBudget = salaryCap != null && totalSalary > salaryCap;

  // Requirements check
  const reqCheck = useMemo(() => {
    if (!event) return { ok: true, message: '' };
    if (event.requirements.minClubPlayers && event.requirements.specificClub) {
      const clubPlayers = selectedPlayers.filter(sp => {
        const player = effectiveHoldings.find(h => h.id === sp.playerId);
        return player?.club.toLowerCase().includes(event.requirements.specificClub!.toLowerCase());
      });
      if (clubPlayers.length < event.requirements.minClubPlayers) {
        return { ok: false, message: t('minClubPlayersReq', { count: event.requirements.minClubPlayers, club: event.clubName ?? '' }) };
      }
    }
    return { ok: true, message: '' };
  }, [selectedPlayers, effectiveHoldings, event, t]);

  // Player picker -- expensive filter+sort, memoized per search/sort/selection change
  // When picking for a wild card slot, also show locked players (WC bypasses SC check)
  const getAvailablePlayersForPosition = useCallback((position: string, isWildcardSlot = false) => {
    const posMap: Record<string, string[]> = {
      'GK': ['GK'],
      'DEF': ['DEF', 'CB', 'LB', 'RB'],
      'MID': ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
      'ATT': ['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'],
    };
    const validPos = posMap[position] || [position];
    const usedIds = new Set(selectedPlayers.map(p => p.playerId));
    const isClubScoped = event?.scope === 'club' && event?.clubId;
    const players = effectiveHoldings.filter(h =>
      validPos.some(vp => h.pos.toUpperCase().includes(vp)) && !usedIds.has(h.id)
      && (isWildcardSlot || (!h.isLocked && !fixtureDeadlineChecker(h.id)))
      && (!isClubScoped || h.clubId === event.clubId)
    );
    return [...players].sort((a, b) => b.perfL5 - a.perfL5);
  }, [selectedPlayers, effectiveHoldings, fixtureDeadlineChecker, event?.scope, event?.clubId]);

  return {
    effectiveHoldings,
    availableFormations,
    currentFormation,
    formationSlots,
    slotDbKeys,
    isLineupComplete,
    synergyPreview,
    ownedPlayerIds,
    reqCheck,
    totalSalary,
    selectedPlayerMap,
    getSelectedPlayer,
    getAvailablePlayersForPosition,
    overBudget,
  };
}
