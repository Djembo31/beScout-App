import { useState, useEffect, useCallback, useRef } from 'react';

const AUTOSAVE_MS = 30_000;

/**
 * localStorage-based draft system for modals.
 * Auto-saves every 30s while active. Clears on publish.
 */
export function useDraft<T extends Record<string, unknown>>(
  key: string,
  open: boolean,
  getData: () => T,
  setData: (draft: T) => void,
  isEmpty: (data: T) => boolean,
) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const getDataRef = useRef(getData);
  getDataRef.current = getData;

  // Check for existing draft when modal opens
  useEffect(() => {
    if (!open) { setDraftRestored(false); return; }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        if (!isEmpty(parsed)) {
          setHasDraft(true);
        }
      }
    } catch { /* ignore corrupt drafts */ }
  }, [open, key, isEmpty]);

  // Auto-save interval
  useEffect(() => {
    if (!open || hasDraft) return;
    const timer = setInterval(() => {
      const data = getDataRef.current();
      if (!isEmpty(data)) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
      }
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [open, hasDraft, key, isEmpty]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setData(JSON.parse(raw) as T);
      }
    } catch { /* ignore */ }
    setHasDraft(false);
    setDraftRestored(true);
  }, [key, setData]);

  const dismissDraft = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  const saveDraft = useCallback(() => {
    const data = getDataRef.current();
    if (!isEmpty(data)) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
    }
  }, [key, isEmpty]);

  return { hasDraft, draftRestored, restoreDraft, dismissDraft, clearDraft, saveDraft };
}
