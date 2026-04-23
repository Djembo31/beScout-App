'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { setWalletBalance, invalidateWallet } from '@/lib/hooks/useWallet';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { useFantasyStore } from '../store/fantasyStore';
import {
  lockEventEntry,
  unlockEventEntry,
  type LockEventEntryResult,
  type UnlockEventEntryResult,
} from '../services/events.mutations';
import { submitLineup as submitLineupService } from '../services/lineups.mutations';
import { invalidateAfterLineupSave } from '../queries/invalidation';
import { getFormationsForFormat, buildSlotDbKeys } from '../constants';
import { qk } from '@/lib/queries/keys';
import { fmtScout } from '@/lib/utils';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { FantasyEvent, LineupPlayer } from '../types';

/**
 * Slice 156 — Ferrari-Refactor (analog trading.ts 153a).
 *
 * 3 Handler als useSafeMutation:
 * - `useJoinEventMutation`   → lockEventEntry   (Money-Path, Wallet-Touch)
 * - `useLeaveEventMutation`  → unlockEventEntry (Money-Path, Refund)
 * - `useSubmitLineupMutation` → submitLineupService (Data-Write, kein Geld)
 *
 * Blueprint: `src/features/market/mutations/trading.ts` (153a):
 * - `useSafeMutation` mit synchronem `isPending`-Guard (Slice 151a Primitive).
 * - `useQueryClient()` statt Singleton-Import (P2.2-Konvention, Slice 160).
 * - `onMutate`: Snapshot + Optimistic (nur deterministische Felder).
 * - `onError`: Rollback aus Snapshot, Phantom-Rollback-Fix
 *   (undefined-snapshot → removeQueries).
 * - `onSuccess`: Server-Truth (balance, invalidates, fire-and-forget side-effects).
 * - `onSettled`: `invalidateWallet(qc)` pgBouncer-safe (Slice 152c HIGH-1).
 * - `errorTag`: Sentry-Observability pro Handler.
 *
 * Slice 156 P2.3: RPC gibt `balance_after=NULL` bei Free-Events zurueck.
 * Consumer-Check hier: `result.balanceAfter != null`. Kein `> 0`-Heuristik mehr.
 *
 * Consumer-API unveraendert: `{ joinEvent, leaveEvent, submitLineup,
 * joiningEventId, leavingEventId }`. `joiningEventId`/`leavingEventId`
 * abgeleitet aus `mut.isPending` + `mut.variables` (React Query v5).
 *
 * Wrapper-Methoden (joinEvent/leaveEvent/submitLineup) bleiben async + void-return,
 * damit `useLineupSave` sie `await`en kann ohne Breaking-Change.
 * Errors werden im `onError`-Callback per Toast/Rollback gehandhabt; der Wrapper
 * schluckt das Promise-Reject still, weil existing Callers (useLineupSave)
 * onSubmitLineup nach await onJoin weiterlaufen liessen und keinen Throw erwarten.
 */

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type JoinEventVariables = { event: FantasyEvent };
type JoinEventContext = {
  prevJoinedIds: string[] | undefined;
  prevEventsAll: unknown[] | undefined;
};

type LeaveEventVariables = { event: FantasyEvent };
type LeaveEventContext = {
  prevJoinedIds: string[] | undefined;
  prevEventsAll: unknown[] | undefined;
};

type SubmitLineupVariables = {
  event: FantasyEvent;
  lineup: LineupPlayer[];
  formation: string;
  captainSlot: string | null;
  wildcardSlots: string[];
};

// ────────────────────────────────────────────────────────────
// useEventActions — composes 3 useSafeMutation hooks + wrappers
// ────────────────────────────────────────────────────────────

export function useEventActions(clubId: string) {
  const { user } = useUser();
  const { addToast } = useToast();
  const { closeEvent } = useFantasyStore();
  const t = useTranslations('fantasy');
  const te = useTranslations('errors');
  const qc = useQueryClient();

  // ── Join Event ─────────────────────────────────────────────
  const joinMut = useSafeMutation<
    LockEventEntryResult,
    Error,
    JoinEventVariables,
    JoinEventContext
  >({
    mutationFn: async ({ event }) => {
      const result = await lockEventEntry(event.id);
      // already_entered ist kein Error — Consumer-Idempotent-Path.
      if (!result.ok && !result.alreadyEntered) {
        throw new Error(result.error ?? 'join_failed');
      }
      return result;
    },
    onMutate: async ({ event }) => {
      if (!user) return { prevJoinedIds: undefined, prevEventsAll: undefined };
      const joinedKey = qk.events.joinedIds(user.id);
      const eventsAllKey = qk.events.all;
      await Promise.all([
        qc.cancelQueries({ queryKey: joinedKey }),
        qc.cancelQueries({ queryKey: eventsAllKey }),
      ]);
      const prevJoinedIds = qc.getQueryData<string[]>(joinedKey);
      const prevEventsAll = qc.getQueryData<unknown[]>(eventsAllKey);

      // Optimistic: joinedIds += eventId, events.all current_entries += 1
      qc.setQueryData<string[]>(joinedKey, (old) => [...(old ?? []), event.id]);
      qc.setQueryData(eventsAllKey, (old: unknown[] | undefined) => {
        if (!old) return old;
        return (old as Record<string, unknown>[]).map((e) =>
          e.id === event.id
            ? { ...e, current_entries: ((e.current_entries as number) ?? 0) + 1 }
            : e,
        );
      });

      return { prevJoinedIds, prevEventsAll };
    },
    onError: (err, { event }, ctx) => {
      // Phantom-Rollback-Fix (153a Finding #1): removeQueries bei undefined-Snapshot.
      if (user) {
        const joinedKey = qk.events.joinedIds(user.id);
        const eventsAllKey = qk.events.all;
        if (ctx && ctx.prevJoinedIds !== undefined) {
          qc.setQueryData(joinedKey, ctx.prevJoinedIds);
        } else {
          qc.removeQueries({ queryKey: joinedKey });
        }
        if (ctx && ctx.prevEventsAll !== undefined) {
          qc.setQueryData(eventsAllKey, ctx.prevEventsAll);
        } else {
          qc.removeQueries({ queryKey: eventsAllKey });
        }
      }

      // Toast-Routing (Error-Key → i18n-resolved String).
      const key = err.message;
      switch (key) {
        case 'insufficient_tickets':
          addToast(
            t('notEnoughTickets', { have: 0, need: event.ticketCost }),
            'error',
          );
          break;
        case 'insufficient_balance':
          addToast(
            t('notEnoughScout', { needed: event.buyIn, balance: fmtScout(0) }),
            'error',
          );
          break;
        case 'event_full':
          addToast(t('eventFullError'), 'error');
          break;
        case 'event_not_open':
          addToast(t('eventEndedError'), 'error');
          break;
        case 'scout_events_disabled':
          addToast(t('scoutEventsDisabled'), 'error');
          break;
        case 'subscription_required':
          addToast(t('subscriptionRequired', { tier: '' }), 'error');
          break;
        case 'tier_required':
          addToast(t('tierRequired', { need: '', have: 'Rookie' }), 'error');
          break;
        default:
          addToast(
            t('errorGeneric', { error: te(mapErrorToKey(normalizeError(err))) }),
            'error',
          );
      }
    },
    onSuccess: (result, { event }) => {
      if (!user) return;

      // already_entered: cache-update ran in onMutate; skip toast + wallet-update.
      if (result.alreadyEntered) return;

      // Slice 156: setWalletBalance nur wenn balance_after echt (null = Free-Event skip).
      if (result.balanceAfter != null) {
        setWalletBalance(qc, user.id, result.balanceAfter);
      }

      // Invalidate related — NICHT events.all (optimistic bleibt, siehe
      // invalidation.ts:39 "server replication lag").
      qc.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
      qc.invalidateQueries({ queryKey: qk.events.usage(user.id) });
      qc.invalidateQueries({ queryKey: qk.events.holdingLocks(user.id) });
      qc.invalidateQueries({ queryKey: qk.holdings.byUser(user.id) });

      // Cache-Bust (fire-and-forget).
      fetch('/api/events?bust=1').catch((err) =>
        console.error('[Fantasy] Event cache bust failed:', err),
      );

      // Mission + Activity (fire-and-forget).
      import('@/lib/services/missions')
        .then(({ triggerMissionProgress }) => {
          triggerMissionProgress(user.id, ['weekly_fantasy', 'daily_fantasy_entry']);
        })
        .catch((err) => console.error('[Fantasy] Mission tracking failed:', err));

      import('@/lib/services/activityLog')
        .then(({ logActivity }) => {
          logActivity(user.id, 'fantasy_event_joined', 'fantasy', {
            eventId: event.id,
            eventName: event.name,
          });
        })
        .catch((err) => console.error('[Fantasy] Activity log failed:', err));

      addToast(t('joinedSuccess', { name: event.name }), 'success');
    },
    onSettled: () => {
      // pgBouncer-safe Wallet-Invalidate (Slice 152c HIGH-1).
      invalidateWallet(qc);
    },
    errorTag: 'fantasy.joinEvent',
  });

  // ── Leave Event ────────────────────────────────────────────
  const leaveMut = useSafeMutation<
    UnlockEventEntryResult,
    Error,
    LeaveEventVariables,
    LeaveEventContext
  >({
    mutationFn: async ({ event }) => {
      const result = await unlockEventEntry(event.id);
      if (!result.ok) {
        // Slice 156 Finding #7: not_entered = stale cache, User-Intent "weg aus Event"
        // bereits erreicht. Als Success-path behandeln, kein Toast-Error.
        // Optimistic filter-out in onMutate bleibt bestehen (richtig).
        if (result.error === 'not_entered') {
          return { ok: true, balanceAfter: null } as UnlockEventEntryResult;
        }
        throw new Error(result.error ?? 'leave_failed');
      }
      return result;
    },
    onMutate: async ({ event }) => {
      if (!user) return { prevJoinedIds: undefined, prevEventsAll: undefined };
      const joinedKey = qk.events.joinedIds(user.id);
      const eventsAllKey = qk.events.all;
      await Promise.all([
        qc.cancelQueries({ queryKey: joinedKey }),
        qc.cancelQueries({ queryKey: eventsAllKey }),
      ]);
      const prevJoinedIds = qc.getQueryData<string[]>(joinedKey);
      const prevEventsAll = qc.getQueryData<unknown[]>(eventsAllKey);

      // Optimistic: joinedIds filter-out, events.all current_entries -= 1
      qc.setQueryData<string[]>(joinedKey, (old) =>
        (old ?? []).filter((id) => id !== event.id),
      );
      qc.setQueryData(eventsAllKey, (old: unknown[] | undefined) => {
        if (!old) return old;
        return (old as Record<string, unknown>[]).map((e) =>
          e.id === event.id
            ? {
                ...e,
                current_entries: Math.max(0, ((e.current_entries as number) ?? 0) - 1),
              }
            : e,
        );
      });

      return { prevJoinedIds, prevEventsAll };
    },
    onError: (err, _vars, ctx) => {
      if (user) {
        const joinedKey = qk.events.joinedIds(user.id);
        const eventsAllKey = qk.events.all;
        if (ctx && ctx.prevJoinedIds !== undefined) {
          qc.setQueryData(joinedKey, ctx.prevJoinedIds);
        } else {
          qc.removeQueries({ queryKey: joinedKey });
        }
        if (ctx && ctx.prevEventsAll !== undefined) {
          qc.setQueryData(eventsAllKey, ctx.prevEventsAll);
        } else {
          qc.removeQueries({ queryKey: eventsAllKey });
        }
      }

      const key = err.message;
      if (key === 'event_locked') {
        addToast(t('eventLockedError'), 'error');
      } else {
        addToast(
          t('unregisterFailed', { error: te(mapErrorToKey(normalizeError(err))) }),
          'error',
        );
      }
    },
    onSuccess: (result, { event }) => {
      if (!user) return;

      // Slice 156: setWalletBalance nur wenn balance_after echt (null = amount_locked=0).
      if (result.balanceAfter != null) {
        setWalletBalance(qc, user.id, result.balanceAfter);
      }

      closeEvent();

      fetch('/api/events?bust=1').catch((err) =>
        console.error('[Fantasy] Event cache bust failed:', err),
      );

      qc.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
      qc.invalidateQueries({ queryKey: qk.events.usage(user.id) });
      qc.invalidateQueries({ queryKey: qk.events.holdingLocks(user.id) });
      qc.invalidateQueries({ queryKey: qk.holdings.byUser(user.id) });

      import('@/lib/services/activityLog')
        .then(({ logActivity }) => {
          logActivity(user.id, 'fantasy_event_left', 'fantasy', {
            eventId: event.id,
            eventName: event.name,
          });
        })
        .catch((err) => console.error('[Fantasy] Activity log failed:', err));

      addToast(
        `${t('leftEvent')}${event.buyIn > 0 ? ` ${t('refundNote', { amount: event.buyIn })}` : ''}`,
        'success',
      );
    },
    onSettled: () => {
      invalidateWallet(qc);
    },
    errorTag: 'fantasy.leaveEvent',
  });

  // ── Submit Lineup ──────────────────────────────────────────
  const submitLineupMut = useSafeMutation<
    void,
    Error,
    SubmitLineupVariables
  >({
    mutationFn: async ({ event, lineup, formation, captainSlot, wildcardSlots }) => {
      if (!user?.id) throw new Error('notAuthenticated');
      const formations = getFormationsForFormat(event.format);
      const resolvedFormation = formations.find((f) => f.id === formation) || formations[0];
      const dbKeys = buildSlotDbKeys(resolvedFormation);
      const slotMap = new Map(lineup.map((p) => [p.slot, p.playerId]));
      const slots: Record<string, string | null> = {};
      dbKeys.forEach((key, idx) => {
        slots[key] = slotMap.get(idx) || null;
      });

      await submitLineupService({
        eventId: event.id,
        userId: user.id,
        formation: resolvedFormation.id,
        slots,
        captainSlot,
        wildcardSlots,
      });
    },
    onError: (err, { event }) => {
      const msg = err instanceof Error ? err.message : '';
      switch (msg) {
        case 'insufficient_sc':
          addToast(t('insufficientSc', { min: event.minScPerSlot ?? 1 }), 'error');
          break;
        case 'duplicate_player':
          addToast(t('duplicatePlayer'), 'error');
          break;
        case 'insufficient_wildcards':
          addToast(t('insufficientWildcards'), 'error');
          break;
        case 'wildcards_not_allowed':
          addToast(t('wildcardsNotAllowed'), 'error');
          break;
        case 'too_many_wildcards':
          addToast(t('tooManyWildcards', { max: event.maxWildcardsPerLineup ?? 0 }), 'error');
          break;
        case 'salary_cap_exceeded':
          addToast(t('salaryCapExceeded'), 'error');
          break;
        case 'holding_lock_failed':
          addToast(t('holdingLockFailed'), 'error');
          break;
        case 'lineup_save_failed':
          addToast(t('lineupSaveFailed'), 'error');
          break;
        default:
          addToast(
            t('errorGeneric', { error: te(mapErrorToKey(normalizeError(err))) }),
            'error',
          );
      }
    },
    onSuccess: async (_result, { event }) => {
      if (!user?.id) return;

      try {
        qc.invalidateQueries({ queryKey: qk.events.wildcardBalance(user.id) });
        await invalidateAfterLineupSave(user.id, clubId);
      } catch (err) {
        console.error('[Fantasy] Post-save cache invalidation failed:', err);
      }

      import('@/lib/services/activityLog')
        .then(({ logActivity }) => {
          logActivity(user.id, 'lineup_submit', 'fantasy', {
            eventId: event.id,
            formation: event.format,
          });
        })
        .catch((err) => console.error('[Fantasy] Activity log failed:', err));

      import('@/lib/services/missions')
        .then(({ triggerMissionProgress }) => {
          triggerMissionProgress(user.id, ['weekly_3_lineups']);
        })
        .catch((err) => console.error('[Fantasy] Mission tracking failed:', err));

      closeEvent();
      addToast(t('lineupSaved'), 'success');
    },
    errorTag: 'fantasy.submitLineup',
  });

  // ────────────────────────────────────────────────────────────
  // Wrapper-Methoden — Consumer-API Kompat (async + void return).
  // ────────────────────────────────────────────────────────────

  const joinEvent = useCallback(
    async (event: FantasyEvent) => {
      if (!user) return;
      if (event.status === 'ended') {
        addToast(t('eventEndedError'), 'error');
        return;
      }
      if (event.maxParticipants && event.participants >= event.maxParticipants) {
        addToast(t('eventFullError'), 'error');
        return;
      }
      if (joinMut.isPending) return;
      try {
        await joinMut.mutateAsync({ event });
      } catch {
        // onError handled toast + rollback. Existing-Behavior: void-return on failure.
      }
    },
    [joinMut, user, addToast, t],
  );

  const leaveEvent = useCallback(
    async (event: FantasyEvent) => {
      if (!user) return;
      if (leaveMut.isPending) return;
      try {
        await leaveMut.mutateAsync({ event });
      } catch {
        // onError handled.
      }
    },
    [leaveMut, user],
  );

  const submitLineup = useCallback(
    async (
      event: FantasyEvent,
      lineup: LineupPlayer[],
      formation: string,
      captainSlot: string | null = null,
      wildcardSlots: string[] = [],
    ) => {
      if (!user?.id) {
        addToast(t('errorGeneric', { error: te('notAuthenticated') }), 'error');
        return;
      }
      if (submitLineupMut.isPending) return;
      try {
        await submitLineupMut.mutateAsync({
          event,
          lineup,
          formation,
          captainSlot,
          wildcardSlots,
        });
      } catch {
        // onError handled.
      }
    },
    [submitLineupMut, user?.id, addToast, t, te],
  );

  // Derived: joiningEventId/leavingEventId from mutation-state (React Query v5 exposes
  // `variables` during in-flight mutation, `isPending` as sync flag).
  const joiningEventId = joinMut.isPending ? joinMut.variables?.event?.id ?? null : null;
  const leavingEventId = leaveMut.isPending ? leaveMut.variables?.event?.id ?? null : null;

  return {
    joinEvent,
    leaveEvent,
    submitLineup,
    joiningEventId,
    leavingEventId,
  };
}
