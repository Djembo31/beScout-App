'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { invalidateWallet } from '@/lib/hooks/useWallet';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { createUserEvent, type CreateUserEventResult } from '../services/events.mutations';
import { qk } from '@/lib/queries/keys';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';

/**
 * Slice 397 (E-4b) — useCreateUserEvent
 *
 * Verkabelt `create_user_event` (D108 V3). User erstellt ein Event:
 * Pot = Σ Eintritte (virtuell), Ersteller zahlt nur die Erstell-Gebühr (→ Plattform-Topf).
 *
 * Pattern-Anker = useEventActions (Slice 156):
 * - `useSafeMutation` (synchroner isPending-Guard, Money-Race-Schutz S149-151).
 * - onError: alle Reject-Codes → `te(mapErrorToKey(...))` (S393, jeder Code hat errors-Eintrag).
 * - onSuccess: Cache-Bust (`/api/events?bust=1`) + `qk.events.all`-Invalidate (neues Event
 *   erscheint) + `invalidateWallet` (S371 — Erstell-Gebühr belastet Wallet → Header sofort frisch).
 */

export interface CreateUserEventVars {
  name: string;
  /** Eintritt in CENTS (Builder rechnet Credits × 100). */
  entryFeeCents: number;
  gameweek: number;
  /** ISO-Timestamp; muss in der Zukunft liegen. */
  locksAt: string;
  rewardStructure: Array<{ rank: number; pct: number }>;
  minEntries?: number | null;
  maxEntries?: number | null;
  leagueId?: string | null;
}

export function useCreateUserEvent(onCreated?: (eventId: string) => void) {
  const { user } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('fantasy');
  const te = useTranslations('errors');
  const qc = useQueryClient();

  const mut = useSafeMutation<CreateUserEventResult, Error, CreateUserEventVars>({
    mutationFn: async (vars) => {
      if (!user?.id) throw new Error('notAuthenticated');
      const result = await createUserEvent({ userId: user.id, ...vars });
      if (!result.ok) throw new Error(result.error ?? 'create_user_event_failed');
      return result;
    },
    onError: (err) => {
      // Alle Reject-Codes (Form + State) → spezifischer i18n-String (S393).
      addToast(t('errorGeneric', { error: te(mapErrorToKey(normalizeError(err))) }), 'error');
    },
    onSuccess: async (result, vars) => {
      if (!user) return;
      // Server-Cache busten, DANN react-query refetchen → neues Event sichtbar.
      await fetch('/api/events?bust=1').catch((e) =>
        console.error('[UserEvent] cache bust failed:', e),
      );
      qc.invalidateQueries({ queryKey: qk.events.all });
      // S371: Erstell-Gebühr belastet die Wallet → Header-Credits sofort aktualisieren.
      invalidateWallet(qc);
      addToast(t('eventCreated', { name: vars.name }), 'success');
      if (result.eventId) onCreated?.(result.eventId);
    },
    onSettled: () => {
      invalidateWallet(qc);
    },
    errorTag: 'fantasy.createUserEvent',
  });

  const create = useCallback(
    async (vars: CreateUserEventVars): Promise<boolean> => {
      if (mut.isPending) return false;
      try {
        await mut.mutateAsync(vars);
        return true;
      } catch {
        // onError hat Toast gezeigt.
        return false;
      }
    },
    [mut],
  );

  return { create, isPending: mut.isPending };
}
