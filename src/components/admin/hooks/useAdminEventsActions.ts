import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import { createEvent, updateEvent, bulkUpdateStatus } from '@/lib/services/events';
import type { AdminEvent } from './types';
import type { useEventForm } from './useEventForm';

// -- Params -------------------------------------------------------------------
interface UseAdminEventsActionsParams {
  adminId: string;
  form: ReturnType<typeof useEventForm>;
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
