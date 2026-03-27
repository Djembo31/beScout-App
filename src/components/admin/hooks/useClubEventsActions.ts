import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createEvent, updateEventStatus } from '@/lib/services/events';
import { simulateGameweek } from '@/lib/services/fixtures';
import type { DbEvent } from '@/types';
import type { useEventForm } from './useEventForm';

// -- Params -------------------------------------------------------------------
interface UseClubEventsActionsParams {
  clubId: string;
  userId: string | undefined;
  form: ReturnType<typeof useEventForm>;
  refreshEvents: () => Promise<void>;
  refreshGwStatuses: () => Promise<void>;
}

// -- Hook ---------------------------------------------------------------------
export function useClubEventsActions({
  clubId,
  userId,
  form,
  refreshEvents,
  refreshGwStatuses,
}: UseClubEventsActionsParams) {
  const t = useTranslations('admin');

  // Internal state — Club Admin uses inline alerts, NOT toast
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // -- Create event -----------------------------------------------------------
  const handleCreate = useCallback(async () => {
    if (!userId || !form.form.name || !form.form.startsAt || !form.form.locksAt || !form.form.endsAt) return;
    setSaving(true);
    setError(null);
    try {
      const payload = form.buildCreatePayload({ clubId, createdBy: userId });
      const result = await createEvent(payload);
      if (!result.success) {
        setError(result.error || t('eventCreateError'));
      } else {
        setSuccess(t('eventCreateSuccess'));
        await refreshEvents();
        form.reset({ type: 'club', eventTier: 'club' });
        setModalOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setSaving(false);
    }
  }, [userId, form, clubId, refreshEvents, t]);

  // -- Status change (with mutex) ---------------------------------------------
  const handleStatusChange = useCallback(async (eventId: string, newStatus: string) => {
    if (changingId) return;
    setChangingId(eventId);
    setError(null);
    try {
      const result = await updateEventStatus(eventId, newStatus);
      if (!result.success) {
        setError(result.error || t('statusChangeError'));
      } else {
        await refreshEvents();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setChangingId(null);
    }
  }, [changingId, refreshEvents, t]);

  // -- Simulate gameweek ------------------------------------------------------
  const handleSimulate = useCallback(async (gw: number) => {
    setSimulating(true);
    setError(null);
    try {
      const result = await simulateGameweek(gw);
      if (!result.success) {
        setError(result.error || t('simulationFailed'));
      } else {
        setSuccess(t('simulationResult', {
          gw,
          fixtures: result.fixtures_simulated ?? 0,
          stats: result.player_stats_created ?? 0,
        }));
        setTimeout(() => setSuccess(null), 5000);
        await refreshGwStatuses();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setSimulating(false);
    }
  }, [refreshGwStatuses, t]);

  // -- Clone event ------------------------------------------------------------
  const handleClone = useCallback((event: DbEvent) => {
    form.clone(event, t('clone'));
    setModalOpen(true);
  }, [form, t]);

  return {
    modalOpen,
    setModalOpen,
    handleCreate,
    saving,
    handleStatusChange,
    changingId,
    handleSimulate,
    simulating,
    handleClone,
    error,
    setError,
    success,
  };
}
