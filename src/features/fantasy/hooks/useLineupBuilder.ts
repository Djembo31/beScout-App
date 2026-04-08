'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { calculateSynergyPreview } from '@/types';
import { useLineupStore } from '../store/lineupStore';
import { getFormationsForFormat, getDefaultFormation, buildSlotDbKeys } from '../constants';
import { getLineup } from '@/lib/services/lineups';
import { getProgressiveScores } from '@/lib/services/scoring';
import { useEquipmentDefinitions, useUserEquipment } from '@/lib/queries/equipment';
import { mapPlayerPosition } from '@/components/gamification/EquipmentPicker';
import type { FantasyEvent, UserDpcHolding, LineupPlayer } from '../types';
import type { FixtureDeadline } from '@/lib/services/fixtures';
import type { EquipmentPosition } from '@/types';

export type EquipmentSlotState = {
  id: string;
  key: string;
  rank: number;
  position: string;
};

export type EquipmentPickerSlot = {
  slotKey: string;
  playerPosition: EquipmentPosition;
  playerName: string;
};

type UseLineupBuilderParams = {
  event: FantasyEvent | null;
  userId: string | undefined;
  isOpen: boolean;
  holdings: UserDpcHolding[];
  fixtureDeadlines?: Map<string, FixtureDeadline>;
};

/**
 * All lineup editing/building logic extracted from EventDetailModal.
 * Owns: lineup state (via lineupStore), scoring state, equipment map, picker state.
 * Single source of truth for anything that builds/edits a lineup.
 *
 * Source: EventDetailModal.tsx lines 51-489 (Wave 0 extraction 2026-04-07).
 */
export function useLineupBuilder({
  event,
  userId,
  isOpen,
  holdings,
  fixtureDeadlines,
}: UseLineupBuilderParams) {
  const t = useTranslations('fantasy');

  // ==================== Lineup state (store-backed) ====================
  const selectedPlayers = useLineupStore((s) => s.selectedPlayers);
  const selectedFormation = useLineupStore((s) => s.selectedFormation);
  const captainSlot = useLineupStore((s) => s.captainSlot);
  const wildcardSlots = useLineupStore((s) => s.wildcardSlots);
  const storeSelectPlayer = useLineupStore((s) => s.selectPlayer);
  const storeRemovePlayer = useLineupStore((s) => s.removePlayer);
  const storeSetFormation = useLineupStore((s) => s.setFormation);
  const storeSetCaptain = useLineupStore((s) => s.setCaptain);
  const storeToggleWildcard = useLineupStore((s) => s.toggleWildcard);
  const storeResetLineup = useLineupStore((s) => s.resetLineup);
  const storeLoadFromDb = useLineupStore((s) => s.loadFromDb);

  // ==================== Local scoring state ====================
  const [slotScores, setSlotScores] = useState<Record<string, number> | null>(null);
  const [myTotalScore, setMyTotalScore] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [progressiveScores, setProgressiveScores] = useState<Map<string, number>>(new Map());

  // ==================== Local equipment state ====================
  const [equipmentMap, setEquipmentMap] = useState<Record<string, EquipmentSlotState>>({});
  const [equipPickerOpen, setEquipPickerOpen] = useState(false);
  const [equipPickerSlot, setEquipPickerSlot] = useState<EquipmentPickerSlot | null>(null);

  // Raw equipment_map from DB, deferred until equipDefs/userEquipment queries resolve.
  // Set by load effect, consumed by population effect once both queries are ready.
  const [dbEquipmentRaw, setDbEquipmentRaw] = useState<Record<string, string> | null>(null);

  // ==================== External data ====================
  const { data: equipDefs } = useEquipmentDefinitions();
  const { data: userEquipment } = useUserEquipment(userId);

  // ==================== Reset transient state on open ====================
  useEffect(() => {
    if (isOpen && event) {
      storeResetLineup(getDefaultFormation(event.format, event.lineupSize));
      setSlotScores(null);
      setMyTotalScore(null);
      setMyRank(null);
      setEquipmentMap({});
      setDbEquipmentRaw(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, event?.id]);

  // ==================== Populate equipmentMap from DB once queries are ready ====================
  // Decoupled from getLineup() callback to fix closure-race: getLineup resolves
  // before useEquipmentDefinitions/useUserEquipment, so the closure captured
  // undefined and the equipmentMap stayed empty until a 2nd modal open.
  useEffect(() => {
    if (!dbEquipmentRaw) return;
    if (!userEquipment || !equipDefs) return; // wait for queries

    const eMap: Record<string, EquipmentSlotState> = {};
    for (const [slotKey, eqId] of Object.entries(dbEquipmentRaw)) {
      const eq = userEquipment.find((e) => e.id === eqId);
      const def = equipDefs.find((d) => d.key === eq?.equipment_key);
      if (eq && def) {
        eMap[slotKey] = {
          id: eqId,
          key: eq.equipment_key,
          rank: eq.rank,
          position: def.position,
        };
      }
    }
    setEquipmentMap(eMap);
    setDbEquipmentRaw(null); // consumed
  }, [dbEquipmentRaw, userEquipment, equipDefs]);

  // ==================== Effective holdings (unlocks current event's DPCs) ====================
  const effectiveHoldings = useMemo(() => {
    if (!event) return holdings;
    return holdings.map((h) => {
      if (h.activeEventIds.includes(event.id)) {
        const newEventsUsing = h.eventsUsing - 1;
        const newAvailable = Math.max(0, h.dpcOwned - newEventsUsing);
        return {
          ...h,
          eventsUsing: newEventsUsing,
          dpcAvailable: newAvailable,
          isLocked: newAvailable <= 0,
        };
      }
      return h;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- event nur via event.id als stabiler Key; volles Objekt wuerde bei unrelated Field-Updates neu berechnen
  }, [holdings, event?.id]);

  // ==================== Formation data ====================
  const availableFormations = useMemo(
    () => getFormationsForFormat(event?.format ?? '7er', event?.lineupSize),
    [event?.format, event?.lineupSize],
  );

  const currentFormation = useMemo(
    () => availableFormations.find((f) => f.id === selectedFormation) || availableFormations[0],
    [availableFormations, selectedFormation],
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

  // ==================== Fixture locking ====================
  const isPlayerLocked = useCallback(
    (playerId: string): boolean => {
      if (!fixtureDeadlines?.size || event?.status !== 'running') return false;
      const holding = effectiveHoldings.find((h) => h.id === playerId);
      if (!holding?.clubId) return false;
      return fixtureDeadlines.get(holding.clubId)?.isLocked ?? false;
    },
    [fixtureDeadlines, effectiveHoldings, event?.status],
  );

  const isPartiallyLocked = useMemo(() => {
    if (event?.status !== 'running' || !fixtureDeadlines?.size) return false;
    const deadlineValues = Array.from(fixtureDeadlines.values());
    const lockedCount = deadlineValues.filter((d) => d.isLocked).length;
    return lockedCount > 0 && lockedCount < deadlineValues.length;
  }, [event?.status, fixtureDeadlines]);

  const hasUnlockedFixtures = useMemo(() => {
    if (event?.status !== 'running' || !fixtureDeadlines?.size) return false;
    return Array.from(fixtureDeadlines.values()).some((d) => !d.isLocked);
  }, [event?.status, fixtureDeadlines]);

  const nextKickoff = useMemo(() => {
    if (!fixtureDeadlines?.size) return null;
    const now = Date.now();
    let earliest: number | null = null;
    fixtureDeadlines.forEach((d) => {
      if (d.playedAt && !d.isLocked) {
        const ts = new Date(d.playedAt).getTime();
        if (ts > now && (earliest === null || ts < earliest)) earliest = ts;
      }
    });
    return earliest;
  }, [fixtureDeadlines]);

  // ==================== Lookup helpers ====================
  const selectedPlayerMap = useMemo(() => {
    const map = new Map<number, string>();
    selectedPlayers.forEach((p) => map.set(p.slot, p.playerId));
    return map;
  }, [selectedPlayers]);

  const getSelectedPlayer = useCallback(
    (slot: number) => {
      const playerId = selectedPlayerMap.get(slot);
      if (!playerId) return null;
      return effectiveHoldings.find((h) => h.id === playerId) ?? null;
    },
    [selectedPlayerMap, effectiveHoldings],
  );

  const synergyPreview = useMemo(() => {
    const clubs = selectedPlayers
      .map((sp) => effectiveHoldings.find((h) => h.id === sp.playerId)?.club)
      .filter(Boolean) as string[];
    return calculateSynergyPreview(clubs);
  }, [selectedPlayers, effectiveHoldings]);

  const ownedPlayerIds = useMemo(() => {
    return new Set(effectiveHoldings.filter((h) => h.dpcOwned >= 1).map((h) => h.id));
  }, [effectiveHoldings]);

  const getAvailablePlayersForPosition = useCallback(
    (position: string, isWildcardSlot = false) => {
      const posMap: Record<string, string[]> = {
        GK: ['GK'],
        DEF: ['DEF', 'CB', 'LB', 'RB'],
        MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
        ATT: ['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'],
      };
      const validPos = posMap[position] || [position];
      const usedIds = new Set(selectedPlayers.map((p) => p.playerId));
      const isClubScoped = event?.scope === 'club' && event?.clubId;
      const players = effectiveHoldings.filter(
        (h) =>
          validPos.some((vp) => h.pos.toUpperCase().includes(vp)) &&
          !usedIds.has(h.id) &&
          (isWildcardSlot || (!h.isLocked && !isPlayerLocked(h.id))) &&
          (!isClubScoped || h.clubId === event.clubId),
      );
      return [...players].sort((a, b) => b.perfL5 - a.perfL5);
    },
    [selectedPlayers, effectiveHoldings, isPlayerLocked, event?.scope, event?.clubId],
  );

  // ==================== Derived ====================
  const isLineupComplete = selectedPlayers.length === formationSlots.length;

  const totalSalary = useMemo(
    () =>
      selectedPlayers.reduce((sum, sp) => {
        const player = effectiveHoldings.find((h) => h.id === sp.playerId);
        return sum + (player?.perfL5 ?? 50);
      }, 0),
    [selectedPlayers, effectiveHoldings],
  );

  const salaryCap = event?.salaryCap ?? null;
  const overBudget = salaryCap != null && totalSalary > salaryCap;

  const reqCheck = useMemo(() => {
    if (!event) return { ok: true, message: '' };
    if (event.requirements.minClubPlayers && event.requirements.specificClub) {
      const clubPlayers = selectedPlayers.filter((sp) => {
        const player = effectiveHoldings.find((h) => h.id === sp.playerId);
        return player?.club
          .toLowerCase()
          .includes(event.requirements.specificClub!.toLowerCase());
      });
      if (clubPlayers.length < event.requirements.minClubPlayers) {
        return {
          ok: false,
          message: t('minClubPlayersReq', {
            count: event.requirements.minClubPlayers,
            club: event.clubName ?? '',
          }),
        };
      }
    }
    return { ok: true, message: '' };
  }, [selectedPlayers, effectiveHoldings, event, t]);

  // ==================== Load lineup from DB on open ====================
  useEffect(() => {
    if (!isOpen || !event) return;
    let cancelled = false;

    if (event.isJoined && userId) {
      getLineup(event.id, userId)
        .then((dbLineup) => {
          if (cancelled) return;
          if (dbLineup) {
            const savedFormation = dbLineup.formation || getDefaultFormation(event.format);
            const fmtFormations = getFormationsForFormat(event.format);
            const formation = fmtFormations.find((f) => f.id === savedFormation) || fmtFormations[0];
            const fSlots: { pos: string; slot: number }[] = [];
            let si = 0;
            for (const s of formation.slots) {
              for (let i = 0; i < s.count; i++) fSlots.push({ pos: s.pos, slot: si++ });
            }

            const dbKeys = buildSlotDbKeys(formation);
            const finalLineup: LineupPlayer[] = [];
            fSlots.forEach((slot, i) => {
              const colKey = `slot_${dbKeys[i]}` as keyof typeof dbLineup;
              const playerId = dbLineup[colKey] as string | null;
              if (playerId) {
                finalLineup.push({
                  playerId,
                  position: slot.pos,
                  slot: slot.slot,
                  isLocked: isPlayerLocked(playerId),
                });
              }
            });

            storeLoadFromDb(finalLineup, savedFormation, dbLineup.captain_slot ?? null);
            setSlotScores(dbLineup.slot_scores ?? null);
            setMyTotalScore(dbLineup.total_score);
            setMyRank(dbLineup.rank);

            // Defer equipment population until equipDefs/userEquipment queries resolve.
            // Population effect above watches dbEquipmentRaw + queries.
            if (dbLineup.equipment_map && typeof dbLineup.equipment_map === 'object') {
              setDbEquipmentRaw(dbLineup.equipment_map as Record<string, string>);
            } else {
              setEquipmentMap({});
              setDbEquipmentRaw(null);
            }
          } else {
            storeResetLineup(getDefaultFormation(event.format, event.lineupSize));
            setSlotScores(null);
            setEquipmentMap({});
            setDbEquipmentRaw(null);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('[useLineupBuilder] Failed to load lineup:', err);
          storeResetLineup(getDefaultFormation(event.format, event.lineupSize));
          setSlotScores(null);
        });
    } else {
      storeResetLineup(getDefaultFormation(event.format, event.lineupSize));
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isJoined excluded (mid-session reset), user->userId (stable)
  }, [isOpen, event?.id, userId]);

  // ==================== Progressive scores polling ====================
  useEffect(() => {
    if (!isOpen || !event || event.status !== 'running' || !event.isJoined || !event.gameweek) return;
    if (selectedPlayers.length === 0) return;
    let cancelled = false;

    const loadScores = () => {
      const playerIds = selectedPlayers.map((p) => p.playerId).filter(Boolean);
      if (playerIds.length === 0) return;
      getProgressiveScores(event.gameweek!, playerIds)
        .then((data) => {
          if (!cancelled) setProgressiveScores(data);
        })
        .catch((err) => console.error('[useLineupBuilder] Progressive scores failed:', err));
    };

    loadScores();
    const interval = setInterval(loadScores, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- event fields used as individual stable keys (full object would re-poll on unrelated updates); selectedPlayers.length is intentional (only re-trigger on count change, not slot edits)
  }, [isOpen, event?.id, event?.status, event?.gameweek, event?.isJoined, selectedPlayers.length]);

  // ==================== Lineup handlers ====================
  const handleSelectPlayer = useCallback(
    (playerId: string, position: string, slot: number) => {
      storeSelectPlayer(playerId, position, slot);
    },
    [storeSelectPlayer],
  );

  const handleRemovePlayer = useCallback(
    (slot: number) => {
      storeRemovePlayer(slot);
    },
    [storeRemovePlayer],
  );

  const handleFormationChange = useCallback(
    (fId: string) => {
      storeSetFormation(fId);
    },
    [storeSetFormation],
  );

  const handleApplyPreset = useCallback(
    (formation: string, lineup: LineupPlayer[]) => {
      storeLoadFromDb(lineup, formation, null);
    },
    [storeLoadFromDb],
  );

  const handleToggleWildcard = useCallback(
    (slotKey: string) => storeToggleWildcard(slotKey),
    [storeToggleWildcard],
  );

  const setCaptainSlot = useCallback(
    (slot: string | null) => storeSetCaptain(slot),
    [storeSetCaptain],
  );

  // ==================== Equipment handlers ====================
  const handleEquipmentTap = useCallback(
    (slotKey: string, playerPosition: string, playerName: string) => {
      setEquipPickerSlot({
        slotKey,
        playerPosition: mapPlayerPosition(playerPosition),
        playerName,
      });
      setEquipPickerOpen(true);
    },
    [],
  );

  const handleEquip = useCallback(
    (equipmentId: string) => {
      if (!equipPickerSlot) return;
      const eq = userEquipment?.find((e) => e.id === equipmentId);
      const def = equipDefs?.find((d) => d.key === eq?.equipment_key);
      if (eq && def) {
        setEquipmentMap((prev) => ({
          ...prev,
          [equipPickerSlot.slotKey]: {
            id: equipmentId,
            key: eq.equipment_key,
            rank: eq.rank,
            position: def.position,
          },
        }));
      }
      setEquipPickerOpen(false);
    },
    [equipPickerSlot, userEquipment, equipDefs],
  );

  const handleUnequip = useCallback(() => {
    if (!equipPickerSlot) return;
    setEquipmentMap((prev) => {
      const next = { ...prev };
      delete next[equipPickerSlot.slotKey];
      return next;
    });
    setEquipPickerOpen(false);
  }, [equipPickerSlot]);

  const closeEquipPicker = useCallback(() => setEquipPickerOpen(false), []);

  return {
    // ---- Lineup state ----
    selectedPlayers,
    selectedFormation,
    captainSlot,
    wildcardSlots,
    setCaptainSlot,
    onToggleWildcard: handleToggleWildcard,

    // ---- Scoring state ----
    slotScores,
    myTotalScore,
    myRank,
    progressiveScores,
    setSlotScores,
    setMyTotalScore,
    setMyRank,

    // ---- Equipment state ----
    equipmentMap,
    equipPickerOpen,
    equipPickerSlot,
    userEquipment: userEquipment ?? [],
    equipDefs: equipDefs ?? [],
    handleEquipmentTap,
    handleEquip,
    handleUnequip,
    closeEquipPicker,

    // ---- Computed ----
    effectiveHoldings,
    availableFormations,
    currentFormation,
    formationSlots,
    slotDbKeys,
    isPlayerLocked,
    isPartiallyLocked,
    hasUnlockedFixtures,
    nextKickoff,
    selectedPlayerMap,
    getSelectedPlayer,
    synergyPreview,
    ownedPlayerIds,
    getAvailablePlayersForPosition,
    isLineupComplete,
    totalSalary,
    salaryCap,
    overBudget,
    reqCheck,

    // ---- Handlers ----
    handleSelectPlayer,
    handleRemovePlayer,
    handleFormationChange,
    handleApplyPreset,
  };
}
