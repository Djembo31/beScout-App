'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';

/**
 * Hook that returns a `showError(err)` function.
 * Normalizes the error → regex-matches to an i18n key → shows a translated toast.
 */
export function useErrorToast() {
  const { addToast } = useToast();
  const t = useTranslations('errors');

  const showError = useCallback((err: unknown) => {
    const raw = normalizeError(err);
    const key = mapErrorToKey(raw);
    const message = t(key);
    addToast(message, 'error');
  }, [addToast, t]);

  return { showError };
}
