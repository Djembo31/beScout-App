'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { equipToSlot } from '@/lib/services/equipment';
import type { FantasyEvent, LineupPlayer } from '../types';
import type { EquipmentSlotState } from './useLineupBuilder';

type UseLineupSaveOpts = {
  /** The event being saved (or null = no-op). */
  event: FantasyEvent | null;
  /** Current user id (skip equipment persistence if undefined). */
  userId: string | undefined;
  // ── From useLineupBuilder ──
  isLineupComplete: boolean;
  reqCheck: { ok: boolean; message: string };
  selectedPlayers: LineupPlayer[];
  selectedFormation: string;
  captainSlot: string | null;
  wildcardSlots: Set<string>;
  equipmentMap: Record<string, EquipmentSlotState>;
  // ── Action handlers from caller ──
  onJoin: (event: FantasyEvent) => void | Promise<void>;
  onSubmitLineup: (
    event: FantasyEvent,
    lineup: LineupPlayer[],
    formation: string,
    captainSlot: string | null,
    wildcardSlots?: string[],
  ) => void | Promise<void>;
  /** Optional callback fired after successful join (before submit). */
  onAfterJoin?: () => void;
};

type UseLineupSaveReturn = {
  joining: boolean;
  handleSaveLineup: () => Promise<void>;
};

/**
 * Shared join + submit + equipment-persist flow used by both
 * /fantasy EventDetailModal and /manager AufstellenTab.
 *
 * Validates completeness + requirement check, joins (if not joined),
 * submits lineup, then persists equipment assignments. All errors
 * surface as user-facing alerts via the fantasy i18n namespace.
 */
export function useLineupSave(opts: UseLineupSaveOpts): UseLineupSaveReturn {
  const tFantasy = useTranslations('fantasy');
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(false);

  const {
    event, userId, isLineupComplete, reqCheck,
    selectedPlayers, selectedFormation, captainSlot, wildcardSlots, equipmentMap,
    onJoin, onSubmitLineup, onAfterJoin,
  } = opts;

  const handleSaveLineup = useCallback(async () => {
    if (!event) return;
    if (!isLineupComplete) {
      alert(tFantasy('incompleteLineupAlert'));
      return;
    }
    if (!reqCheck.ok) {
      alert(reqCheck.message);
      return;
    }

    setJoining(true);
    try {
      if (!event.isJoined) {
        await onJoin(event);
        onAfterJoin?.();
      }
      await onSubmitLineup(
        event,
        selectedPlayers,
        selectedFormation,
        captainSlot,
        Array.from(wildcardSlots),
      );

      // Persist equipment assignments after lineup save (best-effort)
      const eqEntries = Object.entries(equipmentMap);
      if (eqEntries.length > 0 && userId) {
        const results = await Promise.allSettled(
          eqEntries.map(([slotKey, eq]) => equipToSlot(event.id, eq.id, slotKey)),
        );
        const failed = results.filter(
          (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok),
        );
        if (failed.length > 0) {
          console.error('[useLineupSave] Some equip calls failed:', failed);
        }
        queryClient.invalidateQueries({ queryKey: qk.equipment.inventory(userId) });
      }
    } catch (err) {
      console.error('[useLineupSave] handleSaveLineup failed:', err);
      alert(tFantasy('errorShort', { msg: err instanceof Error ? err.message : 'Lineup save failed' }));
    } finally {
      setJoining(false);
    }
  }, [
    event, userId, isLineupComplete, reqCheck,
    selectedPlayers, selectedFormation, captainSlot, wildcardSlots, equipmentMap,
    onJoin, onSubmitLineup, onAfterJoin,
    tFantasy, queryClient,
  ]);

  return { joining, handleSaveLineup };
}
