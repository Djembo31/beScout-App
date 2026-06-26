'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { invalidateWallet } from '@/lib/hooks/useWallet';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { cancelUserEvent, type CancelUserEventResult } from '../services/events.mutations';
import { qk } from '@/lib/queries/keys';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';

/**
 * Slice 399 (E-4b Teil 2) — useCancelUserEvent
 *
 * Verkabelt `cancel_user_event` (D108). Der Ersteller (oder ein Admin) sagt sein
 * User-Event ab → Teilnehmer-Eintritte werden refundet (locked_balance), status='cancelled'.
 *
 * Pattern-Anker = useCreateUserEvent (Slice 397):
 * - `useSafeMutation` (synchroner isPending-Guard, Money-Race-Schutz S149-151).
 * - onError: alle Reject-Codes → `te(mapErrorToKey(...))` (S393).
 * - onSuccess: Cache-Bust (`/api/events?bust=1`) + `qk.events.all`-Invalidate (cancelled-Event
 *   verschwindet/aktualisiert) + `invalidateWallet` (S371 — Refund berührt die Wallet → Header
 *   sofort frisch, falls der Absagende selbst Teilnehmer war).
 */
export function useCancelUserEvent(onCancelled?: () => void) {
  const { user } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('fantasy');
  const te = useTranslations('errors');
  const qc = useQueryClient();

  const mut = useSafeMutation<CancelUserEventResult, Error, string>({
    mutationFn: async (eventId) => {
      if (!user?.id) throw new Error('notAuthenticated');
      const result = await cancelUserEvent(eventId);
      if (!result.ok) throw new Error(result.error ?? 'cancel_user_event_failed');
      return result;
    },
    onError: (err) => {
      addToast(t('errorGeneric', { error: te(mapErrorToKey(normalizeError(err))) }), 'error');
    },
    onSuccess: async () => {
      await fetch('/api/events?bust=1').catch((e) =>
        console.error('[UserEvent] cache bust failed:', e),
      );
      qc.invalidateQueries({ queryKey: qk.events.all });
      // S371: Refund berührt die Wallet (locked_balance) → Header-Credits sofort aktualisieren.
      invalidateWallet(qc);
      addToast(t('userEventCancelled'), 'success');
      onCancelled?.();
    },
    onSettled: () => {
      invalidateWallet(qc);
    },
    errorTag: 'fantasy.cancelUserEvent',
  });

  const cancel = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (mut.isPending) return false;
      try {
        await mut.mutateAsync(eventId);
        return true;
      } catch {
        return false;
      }
    },
    [mut],
  );

  return { cancel, isPending: mut.isPending };
}
