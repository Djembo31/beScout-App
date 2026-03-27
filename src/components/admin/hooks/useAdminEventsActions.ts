import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import { createEvent, updateEvent, bulkUpdateStatus } from '@/lib/services/events';
import type { DbEvent, EventCurrency, RewardTier } from '@/types';

// -- AdminEvent type (extended with club join) --------------------------------
export type AdminEvent = DbEvent & { clubs?: { name: string; slug: string } | null };

// -- Form shape contract (matches useEventForm output) ------------------------
// This interface describes the shape that useEventForm will provide.
// Defined here so this hook compiles independently of the form hook.
interface EventFormShape {
  form: {
    name: string;
    clubId: string;
    type: string;
    format: string;
    eventTier: 'arena' | 'club' | 'user';
    minSubTier: string;
    salaryCap: string;
    minScPerSlot: string;
    wildcardsAllowed: boolean;
    maxWildcards: string;
    gameweek: string;
    maxEntries: string;
    entryFee: string;
    prizePool: string;
    rewardStructure: RewardTier[] | null;
    startsAt: string;
    locksAt: string;
    endsAt: string;
    sponsorName: string;
    sponsorLogo: string;
    currency: EventCurrency;
  };
  reset: (defaults?: Partial<EventFormShape['form']>) => void;
  populate: (ev: AdminEvent) => void;
  buildCreatePayload: (extra: { clubId?: string; createdBy: string }) => Parameters<typeof createEvent>[0];
  buildUpdatePayload: (ev: AdminEvent) => Record<string, unknown>;
}

// -- Params -------------------------------------------------------------------
interface UseAdminEventsActionsParams {
  adminId: string;
  form: EventFormShape;
  selected: Set<string>;
  bulkStatus: string;
  clearSelection: () => void;
  refreshAll: () => Promise<void>;
}

// -- Hook ---------------------------------------------------------------------
export function useAdminEventsActions({
  adminId,
  form,
  selected,
  bulkStatus,
  clearSelection,
  refreshAll,
}: UseAdminEventsActionsParams) {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();

  // Internal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // -- Modal controls ---------------------------------------------------------
  const openCreateModal = useCallback(() => {
    form.reset();
    setEditingEvent(null);
    setModalOpen(true);
  }, [form]);

  const openEditModal = useCallback((ev: AdminEvent) => {
    setEditingEvent(ev);
    form.populate(ev);
    setModalOpen(true);
  }, [form]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEvent(null);
    form.reset();
  }, [form]);

  // -- Submit (create or update) ----------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!form.form.name || !form.form.startsAt || !form.form.locksAt || !form.form.endsAt) return;
    setSaving(true);
    try {
      if (editingEvent) {
        const payload = form.buildUpdatePayload(editingEvent);
        const result = await updateEvent(editingEvent.id, payload);
        if (!result.success) {
          addToast(result.error ?? t('eventsSaveError'), 'error');
          return;
        }
        addToast(t('eventsUpdated'), 'success');
      } else {
        const payload = form.buildCreatePayload({ createdBy: adminId });
        const result = await createEvent(payload);
        if (!result.success) {
          addToast(result.error ?? t('eventsCreateError'), 'error');
          return;
        }
        addToast(t('eventsCreated'), 'success');
      }
      await refreshAll();
      closeModal();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('error'), 'error');
    } finally {
      setSaving(false);
    }
  }, [form, editingEvent, adminId, addToast, t, refreshAll, closeModal]);

  // -- Bulk status update -----------------------------------------------------
  const handleBulk = useCallback(async () => {
    if (selected.size === 0 || !bulkStatus) return;
    setBulkLoading(true);
    try {
      const result = await bulkUpdateStatus(Array.from(selected), bulkStatus);
      const ok = result.results.filter((r) => r.ok).length;
      const fail = result.results.filter((r) => !r.ok).length;
      if (fail > 0) {
        addToast(t('eventsBulkOk', { ok, fail }), 'error');
      } else {
        addToast(t('eventsBulkSuccess', { ok }), 'success');
      }
      clearSelection();
      await refreshAll();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('error'), 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [selected, bulkStatus, addToast, t, clearSelection, refreshAll]);

  return {
    modalOpen,
    setModalOpen,
    editingEvent,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    saving,
    handleBulk,
    bulkLoading,
  };
}
