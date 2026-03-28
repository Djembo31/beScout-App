'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useFantasyStore } from '../store/fantasyStore';
import { lockEventEntry, unlockEventEntry } from '../services/events.mutations';
import { submitLineup as submitLineupService } from '../services/lineups.mutations';
import { invalidateAfterJoin, invalidateAfterLeave, invalidateAfterLineupSave } from '../queries/invalidation';
import { getFormationsForFormat, buildSlotDbKeys } from '../constants';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { fmtScout } from '@/lib/utils';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { FantasyEvent, LineupPlayer } from '../types';

/**
 * All event mutation handlers: join, leave, submit lineup.
 * Source: FantasyContent.tsx lines 294-483
 *
 * CRITICAL: All error handling is copied VERBATIM from the source.
 */
export function useEventActions(clubId: string) {
  const { user } = useUser();
  const { addToast } = useToast();
  const { setBalanceCents } = useWallet();
  const { closeEvent } = useFantasyStore();
  const t = useTranslations('fantasy');
  const te = useTranslations('errors');

  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [leavingEventId, setLeavingEventId] = useState<string | null>(null);

  // ── Join Event (entry/payment only -- no lineup required) ──
  const joinEvent = useCallback(async (event: FantasyEvent) => {
    if (!user) return;

    if (event.status === 'ended') {
      addToast(t('eventEndedError'), 'error');
      return;
    }

    if (event.maxParticipants && event.participants >= event.maxParticipants) {
      addToast(t('eventFullError'), 'error');
      return;
    }

    setJoiningEventId(event.id);

    try {
      const result = await lockEventEntry(event.id);

      if (!result.ok) {
        switch (result.error) {
          case 'insufficient_tickets':
            addToast(t('notEnoughTickets', { have: result.have ?? 0, need: result.need ?? event.ticketCost }), 'error');
            break;
          case 'insufficient_balance':
            addToast(t('notEnoughScout', { needed: event.buyIn, balance: fmtScout((result.have ?? 0) / 100) }), 'error');
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
            addToast(t('subscriptionRequired', { tier: result.need ?? '' }), 'error');
            break;
          case 'tier_required':
            addToast(t('tierRequired', { need: result.need ?? '', have: result.have ?? 'Rookie' }), 'error');
            break;
          default:
            if (!result.alreadyEntered) {
              addToast(t('errorGeneric', { error: result.error ?? 'Unknown error' }), 'error');
            }
        }

        // Already entered is not an error -- just refresh
        if (!result.alreadyEntered) return;
      }

      // Update wallet balance if returned (skip 0 -- free events return 0 instead of actual balance)
      if (result.balanceAfter != null && result.balanceAfter > 0) {
        setBalanceCents(result.balanceAfter);
      }

      // INSTANT cache update -- UI reacts immediately
      queryClient.setQueryData<string[]>(qk.events.joinedIds(user.id), (old) => [
        ...(old ?? []), event.id,
      ]);

      // Invalidate related caches -- but NOT joinedIds (we just set it, refetch would overwrite)
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
      queryClient.invalidateQueries({ queryKey: qk.events.all });
      queryClient.invalidateQueries({ queryKey: qk.events.usage(user.id) });
      queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(user.id) });
      queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(user.id) });
      fetch('/api/events?bust=1').catch(err => console.error('[Fantasy] Event cache bust failed:', err));

      // Mission tracking (fire-and-forget)
      import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
        triggerMissionProgress(user.id, ['weekly_fantasy']);
      }).catch(err => console.error('[Fantasy] Mission tracking failed:', err));

      addToast(t('joinedSuccess', { name: event.name }), 'success');
    } catch (e: unknown) {
      addToast(t('errorGeneric', { error: te(mapErrorToKey(normalizeError(e))) }), 'error');
    } finally {
      setJoiningEventId(null);
    }
  }, [user, addToast, setBalanceCents, t, te]);

  // ── Submit Lineup (no payment -- user must already be entered) ──
  const submitLineup = useCallback(async (
    event: FantasyEvent,
    lineup: LineupPlayer[],
    formation: string,
    captainSlot: string | null = null,
    wildcardSlots: string[] = [],
  ) => {
    if (!user?.id) {
      addToast(t('errorGeneric', { error: 'Not authenticated' }), 'error');
      return;
    }

    try {
      // Build dynamic slot mapping based on event format + formation
      const formations = getFormationsForFormat(event.format);
      const resolvedFormation = formations.find(f => f.id === formation) || formations[0];
      const dbKeys = buildSlotDbKeys(resolvedFormation);
      const slotMap = new Map(lineup.map(p => [p.slot, p.playerId]));
      const slots: Record<string, string | null> = {};
      dbKeys.forEach((key, idx) => { slots[key] = slotMap.get(idx) || null; });

      await submitLineupService({
        eventId: event.id,
        userId: user.id,
        formation: resolvedFormation.id,
        slots,
        captainSlot,
        wildcardSlots,
      });

    } catch (e: unknown) {
      console.error('[Fantasy] submitLineup FAILED:', e);
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'insufficient_sc') {
        addToast(t('insufficientSc', { min: event.minScPerSlot ?? 1 }), 'error');
      } else if (msg === 'duplicate_player') {
        addToast(t('duplicatePlayer'), 'error');
      } else if (msg === 'insufficient_wildcards') {
        addToast(t('insufficientWildcards'), 'error');
      } else if (msg === 'wildcards_not_allowed') {
        addToast(t('wildcardsNotAllowed'), 'error');
      } else if (msg === 'too_many_wildcards') {
        addToast(t('tooManyWildcards', { max: event.maxWildcardsPerLineup ?? 0 }), 'error');
      } else if (msg === 'salary_cap_exceeded') {
        addToast(t('salaryCapExceeded'), 'error');
      } else if (msg === 'holding_lock_failed') {
        addToast(t('holdingLockFailed'), 'error');
      } else if (msg === 'lineup_save_failed') {
        addToast(t('errorGeneric', { error: 'Lineup konnte nicht gespeichert werden. Bitte erneut versuchen.' }), 'error');
      } else {
        addToast(t('errorGeneric', { error: te(mapErrorToKey(normalizeError(e))) }), 'error');
      }
      return;
    }

    // Post-save: invalidate caches (non-critical -- lineup is already saved)
    try {
      queryClient.invalidateQueries({ queryKey: qk.events.wildcardBalance(user.id) });
      await invalidateAfterLineupSave(user.id, clubId);
    } catch (err) {
      console.error('[Fantasy] Post-save cache invalidation failed:', err);
    }
    closeEvent();
    addToast(t('lineupSaved'), 'success');
  }, [user, addToast, clubId, closeEvent, t, te]);

  // ── Leave Event (atomic refund via unlockEventEntry RPC) ──
  const leaveEvent = useCallback(async (event: FantasyEvent) => {
    if (!user) return;

    setLeavingEventId(event.id);

    try {
      const result = await unlockEventEntry(event.id);

      if (!result.ok) {
        if (result.error === 'event_locked') {
          addToast(t('eventLockedError'), 'error');
        } else {
          addToast(t('unregisterFailed', { error: result.error ?? 'Unknown error' }), 'error');
        }
        return;
      }

      // Update wallet balance if returned
      if (result.balanceAfter != null) {
        setBalanceCents(result.balanceAfter);
      }

      // INSTANT cache update -- UI reacts immediately
      queryClient.setQueryData<string[]>(qk.events.joinedIds(user.id), (old) =>
        (old ?? []).filter(id => id !== event.id)
      );
      closeEvent(); // close modal

      // Invalidate related caches -- but NOT joinedIds (we just set it)
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
      queryClient.invalidateQueries({ queryKey: qk.events.all });
      queryClient.invalidateQueries({ queryKey: qk.events.usage(user.id) });
      queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(user.id) });
      queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(user.id) });
      fetch('/api/events?bust=1').catch(err => console.error('[Fantasy] Event cache bust failed:', err));

      addToast(`${t('leftEvent')}${event.buyIn > 0 ? ` ${t('refundNote', { amount: event.buyIn })}` : ''}`, 'success');
    } catch (e: unknown) {
      addToast(t('unregisterFailed', { error: te(mapErrorToKey(normalizeError(e))) }), 'error');
    } finally {
      setLeavingEventId(null);
    }
  }, [user, setBalanceCents, addToast, closeEvent, t, te]);

  return {
    joinEvent,
    leaveEvent,
    submitLineup,
    joiningEventId,
    leavingEventId,
  };
}
