'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { equipToSlot } from '@/lib/services/equipment';
import { useToast } from '@/components/providers/ToastProvider';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import { logSilentRejects } from '@/lib/observability/silentRejects';
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
  // Slice 195d — Bench + Auto-Sub
  benchGk?: string | null;
  benchO1?: string | null;
  benchO2?: string | null;
  benchO3?: string | null;
  benchOrder?: number[];
  // ── Action handlers from caller ──
  onJoin: (event: FantasyEvent) => void | Promise<void>;
  onSubmitLineup: (
    event: FantasyEvent,
    lineup: LineupPlayer[],
    formation: string,
    captainSlot: string | null,
    wildcardSlots?: string[],
    bench?: {
      benchGk?: string | null;
      benchO1?: string | null;
      benchO2?: string | null;
      benchO3?: string | null;
      benchOrder?: number[];
    },
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
 * submits lineup, then persists equipment assignments. Validation errors
 * surface as toasts (not native alerts) via the fantasy i18n namespace.
 * Service errors resolved via mapErrorToKey → errors-namespace
 * (i18n-Key-Leak-Schutz, J3-Pattern).
 */
export function useLineupSave(opts: UseLineupSaveOpts): UseLineupSaveReturn {
  const tFantasy = useTranslations('fantasy');
  const te = useTranslations('errors');
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [joining, setJoining] = useState(false);

  const {
    event, userId, isLineupComplete, reqCheck,
    selectedPlayers, selectedFormation, captainSlot, wildcardSlots, equipmentMap,
    benchGk, benchO1, benchO2, benchO3, benchOrder,
    onJoin, onSubmitLineup, onAfterJoin,
  } = opts;

  const handleSaveLineup = useCallback(async () => {
    if (!event) return;
    if (!isLineupComplete) {
      addToast(tFantasy('incompleteLineupAlert'), 'error');
      return;
    }
    if (!reqCheck.ok) {
      // reqCheck.message ist bereits eine user-facing String (kein Raw-Key).
      addToast(reqCheck.message, 'error');
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
        {
          benchGk: benchGk ?? null,
          benchO1: benchO1 ?? null,
          benchO2: benchO2 ?? null,
          benchO3: benchO3 ?? null,
          benchOrder: benchOrder ?? [1, 2, 3],
        },
      );

      // Persist equipment assignments after lineup save (best-effort).
      // J11 Healer — FIX-05 + FIX-06: equipToSlot throws on error (i18n-key),
      // failed slots → User-visible Toast (nicht nur console.error).
      const eqEntries = Object.entries(equipmentMap);
      if (eqEntries.length > 0 && userId) {
        const results = await Promise.allSettled(
          eqEntries.map(([slotKey, eq]) => equipToSlot(event.id, eq.id, slotKey)),
        );
        logSilentRejects('useLineupSave.equipToSlot', results);
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.error('[useLineupSave] Some equip calls failed:', failed);
          // FIX-06: Toast an User — Lineup war OK, aber Equipment nicht persistiert.
          addToast(te('equipmentSaveFailed', { count: failed.length }), 'error');
        }
        queryClient.invalidateQueries({ queryKey: qk.equipment.inventory(userId) });
      }
    } catch (err) {
      console.error('[useLineupSave] handleSaveLineup failed:', err);
      // i18n-Key-Leak-Schutz: err.message ist ggf. Raw-Key → via mapErrorToKey resolven
      const msg = te(mapErrorToKey(normalizeError(err)));
      addToast(tFantasy('errorShort', { msg }), 'error');
    } finally {
      setJoining(false);
    }
  }, [
    event, userId, isLineupComplete, reqCheck,
    selectedPlayers, selectedFormation, captainSlot, wildcardSlots, equipmentMap,
    benchGk, benchO1, benchO2, benchO3, benchOrder,
    onJoin, onSubmitLineup, onAfterJoin,
    tFantasy, te, queryClient, addToast,
  ]);

  return { joining, handleSaveLineup };
}
